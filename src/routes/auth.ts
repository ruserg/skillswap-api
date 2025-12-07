import { Router, Response } from "express";
import { readDB, writeDB } from "../utils/db.js";
import { 
  generateTokens, 
  generateAccessToken,
  hashPassword, 
  comparePassword, 
  authenticateToken, 
  verifyRefreshToken,
  AuthRequest 
} from "../utils/auth.js";
import { upload, validateImage, createThumbnails } from "../utils/upload.js";
import { loginSchema, registerSchema, validate } from "../utils/validation.js";

const router = Router();

/**
 * POST /api/auth/register - Регистрация нового пользователя с загрузкой аватара
 */
router.post("/register", upload.single("avatar"), validate(registerSchema), async (req: AuthRequest, res: Response) => {
  try {
    // Валидация файла аватара
    if (!req.file) {
      return res.status(400).json({ error: "Аватар обязателен для загрузки" });
    }

    // Парсим данные из form-data
    // Multer автоматически парсит текстовые поля в req.body
    // Валидация уже выполнена через validate(registerSchema) middleware
    const { email, password, name, firstName, lastName, dateOfBirth, gender, cityId } = req.body;
    
    // Безопасное логирование (без паролей и чувствительных данных)
    console.log("[Register] Попытка регистрации:", {
      email,
      hasPassword: !!password,
      hasName: !!name,
      hasAvatar: !!req.file,
    });

    // Валидация изображения
    const validation = await validateImage(req.file.path);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Проверка на существующего пользователя
    const users = readDB<any[]>("users.json");
    const existingUser = users.find((u) => u.email === email);

    if (existingUser) {
      return res.status(400).json({ error: "Пользователь с таким email уже существует" });
    }

    // Проверка существования cityId
    const cities = readDB<any[]>("cities.json");
    const parsedCityId = typeof cityId === "string" ? parseInt(cityId) : cityId;
    const city = cities.find((c) => c.id === parsedCityId);
    if (!city) {
      return res.status(400).json({ error: `Город с ID ${parsedCityId} не найден` });
    }

    // Хешируем пароль
    const hashedPassword = await hashPassword(password);

    // Создаем нового пользователя
    const newUserId = Math.max(...users.map((u) => u.id), 0) + 1;

    // Создаем миниатюры
    const avatarUrls = await createThumbnails(req.file.path, newUserId);

    const newUser = {
      id: newUserId,
      email,
      password: hashedPassword,
      name,
      firstName,
      lastName,
      dateOfBirth,
      gender: gender as "M" | "F",
      cityId: typeof cityId === "string" ? parseInt(cityId) : cityId,
      avatarUrl: avatarUrls[0], // Используем оригинал как основной URL
      dateOfRegistration: new Date().toISOString(),
      lastLoginDatetime: new Date().toISOString(),
    };

    users.push(newUser);
    writeDB("users.json", users);

    // Генерируем токены (access и refresh)
    const { accessToken, refreshToken } = generateTokens({ id: newUser.id, email: newUser.email });

    // Сохраняем refresh токен
    saveRefreshToken(newUser.id, refreshToken);

    // Возвращаем пользователя без пароля
    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Ошибка при регистрации:", error);
    res.status(500).json({ error: "Ошибка при регистрации пользователя" });
  }
});

/**
 * POST /api/auth/login - Вход пользователя
 */
router.post("/login", validate(loginSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    // Находим пользователя
    const users = readDB<any[]>("users.json");
    const user = users.find((u) => u.email === email);

    if (!user) {
      return res.status(401).json({ error: "Неверный email или пароль" });
    }

    // Проверяем пароль
    if (!user.password) {
      return res.status(401).json({ error: "Пароль не установлен для этого пользователя" });
    }

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Неверный email или пароль" });
    }

    // Обновляем время последнего входа
    user.lastLoginDatetime = new Date().toISOString();
    const userIndex = users.findIndex((u) => u.id === user.id);
    users[userIndex] = user;
    writeDB("users.json", users);

    // Генерируем токены (access и refresh)
    const { accessToken, refreshToken } = generateTokens({ id: user.id, email: user.email });

    // Сохраняем refresh токен
    saveRefreshToken(user.id, refreshToken);

    // Возвращаем пользователя без пароля
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Ошибка при входе:", error);
    res.status(500).json({ error: "Ошибка при входе" });
  }
});

/**
 * GET /api/auth/me - Получить информацию о текущем пользователе
 * Требует авторизации
 */
router.get("/me", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const users = readDB<any[]>("users.json");
    const user = users.find((u) => u.id === req.user?.id);

    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    // Возвращаем пользователя без пароля
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error("Ошибка при получении информации о пользователе:", error);
    res.status(500).json({ error: "Ошибка при получении информации о пользователе" });
  }
});

/**
 * Сохраняет refresh токен в базе данных
 */
function saveRefreshToken(userId: number, refreshToken: string): void {
  try {
    let tokens: any[] = [];
    try {
      tokens = readDB<any[]>("refresh-tokens.json");
    } catch (error) {
      // Файл не существует, создадим новый
      tokens = [];
    }
    
    if (!Array.isArray(tokens)) {
      tokens = [];
    }
    
    // Удаляем старые токены этого пользователя
    const filteredTokens = tokens.filter((t: any) => t.userId !== userId);
    
    // Добавляем новый токен
    filteredTokens.push({
      userId,
      token: refreshToken,
      createdAt: new Date().toISOString(),
    });
    
    writeDB("refresh-tokens.json", filteredTokens);
  } catch (error) {
    console.error("Ошибка при сохранении refresh токена:", error);
  }
}

/**
 * Проверяет, существует ли refresh токен в базе данных
 */
function isValidRefreshToken(userId: number, refreshToken: string): boolean {
  try {
    const tokens = readDB<any[]>("refresh-tokens.json");
    if (!Array.isArray(tokens)) {
      return false;
    }
    return tokens.some((t: any) => t.userId === userId && t.token === refreshToken);
  } catch (error) {
    return false;
  }
}

/**
 * Удаляет refresh токен из базы данных
 */
function revokeRefreshToken(userId: number, refreshToken: string): void {
  try {
    const tokens = readDB<any[]>("refresh-tokens.json");
    const filteredTokens = tokens.filter(
      (t: any) => !(t.userId === userId && t.token === refreshToken)
    );
    writeDB("refresh-tokens.json", filteredTokens);
  } catch (error) {
    // Игнорируем ошибки
  }
}

/**
 * POST /api/auth/refresh - Обновить access токен используя refresh токен
 */
router.post("/refresh", async (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh токен не предоставлен" });
    }

    // Проверяем refresh токен
    const userData = verifyRefreshToken(refreshToken);

    if (!userData) {
      return res.status(403).json({ error: "Недействительный или истекший refresh токен" });
    }

    // Проверяем, что токен существует в базе данных
    if (!isValidRefreshToken(userData.id, refreshToken)) {
      return res.status(403).json({ error: "Refresh токен был отозван" });
    }

    // Генерируем новый access токен
    const newAccessToken = generateAccessToken({ id: userData.id, email: userData.email });

    res.json({
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error("Ошибка при обновлении токена:", error);
    res.status(500).json({ error: "Ошибка при обновлении токена" });
  }
});

/**
 * POST /api/auth/logout - Выход (отзыв refresh токена)
 */
router.post("/logout", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken } = req.body;
    const userId = req.user?.id;

    if (refreshToken && userId) {
      // Отзываем refresh токен
      revokeRefreshToken(userId, refreshToken);
    }

    res.json({ message: "Выход выполнен успешно" });
  } catch (error) {
    console.error("Ошибка при выходе:", error);
    res.status(500).json({ error: "Ошибка при выходе" });
  }
});

export default router;

