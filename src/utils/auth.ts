import jwt, { SignOptions } from "jsonwebtoken";
import bcrypt from "bcrypt";
import { Request, Response, NextFunction } from "express";

// Секретный ключ для JWT (в production должен быть в переменных окружения)
const JWT_SECRET: string = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_REFRESH_SECRET: string = process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key-change-in-production";
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || "15m"; // Access token - короткое время жизни
const JWT_REFRESH_EXPIRES_IN: string = process.env.JWT_REFRESH_EXPIRES_IN || "30d"; // Refresh token - длинное время жизни

// Расширяем тип Request для добавления user и file (для multer)
export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    [key: string]: any;
  };
  file?: Express.Multer.File;
}

/**
 * Генерирует Access JWT токен для пользователя (короткое время жизни)
 */
export function generateAccessToken(user: { id: number; email: string }): string {
  return jwt.sign(
    { id: user.id, email: user.email, type: "access" },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN as string | number } as SignOptions
  );
}

/**
 * Генерирует Refresh JWT токен для пользователя (длинное время жизни)
 */
export function generateRefreshToken(user: { id: number; email: string }): string {
  return jwt.sign(
    { id: user.id, email: user.email, type: "refresh" },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN as string | number } as SignOptions
  );
}

/**
 * Генерирует оба токена (access и refresh)
 */
export function generateTokens(user: { id: number; email: string }): { accessToken: string; refreshToken: string } {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
  };
}

/**
 * @deprecated Используйте generateAccessToken вместо этого
 * Оставлено для обратной совместимости
 */
export function generateToken(user: { id: number; email: string }): string {
  return generateAccessToken(user);
}

/**
 * Проверяет Access JWT токен и добавляет информацию о пользователе в request
 */
export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: "Токен доступа не предоставлен" });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      res.status(403).json({ error: "Недействительный или истекший токен" });
      return;
    }

    const payload = decoded as { id: number; email: string; type?: string };
    req.user = { id: payload.id, email: payload.email };
    next();
  });
}

/**
 * Опциональная проверка токена (не требует токен, но если он есть - извлекает user)
 * Используется для публичных эндпоинтов, которые могут работать с авторизацией или без
 */
export function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    // Токен не предоставлен - продолжаем без user
    console.log("[Auth] optionalAuth: No token provided");
    next();
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      // Токен недействителен - продолжаем без user
      console.log("[Auth] optionalAuth: Token verification failed", err.message);
      next();
      return;
    }

    const payload = decoded as { id: number; email: string; type?: string };
    req.user = { id: payload.id, email: payload.email };
    console.log("[Auth] optionalAuth: User authenticated", { id: payload.id, email: payload.email });
    next();
  });
}

/**
 * Проверяет Refresh JWT токен
 */
export function verifyRefreshToken(token: string): { id: number; email: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as { id: number; email: string; type?: string };
    if (decoded.type !== "refresh") {
      return null;
    }
    return { id: decoded.id, email: decoded.email };
  } catch (error) {
    return null;
  }
}

/**
 * Хеширует пароль
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Проверяет пароль
 */
export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Middleware для проверки, что пользователь может изменять только свои данные
 */
export function authorizeSelf(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const userId = parseInt(req.params.id);
  
  if (!req.user) {
    res.status(401).json({ error: "Не авторизован" });
    return;
  }

  if (req.user.id !== userId) {
    res.status(403).json({ error: "Нет доступа к этому ресурсу" });
    return;
  }

  next();
}

