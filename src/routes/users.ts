import { Router, Response } from "express";
import { readDB, writeDB } from "../utils/db.js";
import { authenticateToken, authorizeSelf, optionalAuth, AuthRequest } from "../utils/auth.js";
import { updateUserSchema, validate } from "../utils/validation.js";

const router = Router();

/**
 * Удаляет пароль из объекта пользователя
 */
function removePassword(user: any): any {
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Удаляет пароли из массива пользователей
 */
function removePasswords(users: any[]): any[] {
  return users.map(removePassword);
}

// GET /api/users - получить всех пользователей (без паролей)
// Публичный эндпоинт (не требует авторизации, но может использовать токен если он есть)
router.get("/", optionalAuth, (req: AuthRequest, res: Response) => {
  try {
    const users = readDB<any[]>("users.json");
    const currentUserId = req.user?.id; // undefined если не авторизован
    const likes = readDB<any[]>("likes.json");
    
    // Функция для подсчета лайков пользователя
    const countUserLikes = (userId: number): number => {
      return likes.filter((l: any) => l.toUserId === userId).length;
    };
    
    // Функция для проверки, лайкнул ли текущий пользователь другого пользователя
    const isLikedByUser = (fromUserId: number | undefined, toUserId: number): boolean => {
      if (!fromUserId) return false;
      return likes.some((l: any) => l.fromUserId === fromUserId && l.toUserId === toUserId);
    };
    
    const usersWithoutPasswords = removePasswords(users);
    
    // Добавляем информацию о лайках к каждому пользователю
    const usersWithLikes = usersWithoutPasswords.map((user: any) => ({
      ...user,
      likesCount: countUserLikes(user.id),
      isLikedByCurrentUser: currentUserId ? isLikedByUser(currentUserId, user.id) : false,
    }));
    
    res.json(usersWithLikes);
  } catch (error) {
    console.error("Ошибка при получении пользователей:", error);
    res.status(500).json({ error: "Ошибка при получении пользователей" });
  }
});

// GET /api/users/:id - получить пользователя по ID (без пароля)
// Публичный эндпоинт (не требует авторизации, но может использовать токен если он есть)
router.get("/:id", optionalAuth, (req: AuthRequest, res: Response) => {
  try {
    const users = readDB<any[]>("users.json");
    const user = users.find((u) => u.id === parseInt(req.params.id));
    
    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }
    
    const currentUserId = req.user?.id; // undefined если не авторизован
    const likes = readDB<any[]>("likes.json");
    
    // Функция для подсчета лайков пользователя
    const countUserLikes = (userId: number): number => {
      return likes.filter((l: any) => l.toUserId === userId).length;
    };
    
    // Функция для проверки, лайкнул ли текущий пользователь другого пользователя
    const isLikedByUser = (fromUserId: number | undefined, toUserId: number): boolean => {
      if (!fromUserId) return false;
      return likes.some((l: any) => l.fromUserId === fromUserId && l.toUserId === toUserId);
    };
    
    const userWithoutPassword = removePassword(user);
    
    // Добавляем информацию о лайках
    const userWithLikes = {
      ...userWithoutPassword,
      likesCount: countUserLikes(user.id),
      isLikedByCurrentUser: currentUserId ? isLikedByUser(currentUserId, user.id) : false,
    };
    
    res.json(userWithLikes);
  } catch (error) {
    console.error("Ошибка при получении пользователя:", error);
    res.status(500).json({ error: "Ошибка при получении пользователя" });
  }
});

// PUT /api/users/:id - обновить пользователя (требует авторизации и права изменять только свои данные)
router.put("/:id", authenticateToken, authorizeSelf, validate(updateUserSchema), (req: AuthRequest, res: Response) => {
  try {
    const users = readDB<any[]>("users.json");
    const index = users.findIndex((u) => u.id === parseInt(req.params.id));
    
    if (index === -1) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }
    
    // Удаляем password из body, если он был передан (пароль обновляется через отдельный эндпоинт)
    const { password, ...updateData } = req.body;
    
    // Обновляем пользователя, сохраняя существующий пароль
    users[index] = { 
      ...users[index], 
      ...updateData, 
      id: parseInt(req.params.id),
      // Пароль не обновляется через этот эндпоинт
    };
    writeDB("users.json", users);
    
    // Возвращаем пользователя без пароля
    const userWithoutPassword = removePassword(users[index]);
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при обновлении пользователя" });
  }
});

// DELETE /api/users/:id - удалить пользователя (требует авторизации и права удалять только свои данные)
router.delete("/:id", authenticateToken, authorizeSelf, (req: AuthRequest, res: Response) => {
  try {
    const users = readDB<any[]>("users.json");
    const filteredUsers = users.filter((u) => u.id !== parseInt(req.params.id));
    
    if (users.length === filteredUsers.length) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }
    
    writeDB("users.json", filteredUsers);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Ошибка при удалении пользователя" });
  }
});

export default router;

