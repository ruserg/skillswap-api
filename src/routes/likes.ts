import { Router, Response } from "express";
import { readDB, writeDB } from "../utils/db.js";
import { authenticateToken, optionalAuth, AuthRequest } from "../utils/auth.js";

const router = Router();

interface Like {
  id: number;
  fromUserId: number;
  toUserId: number;
  skillId?: number;
  createdAt: string;
}

/**
 * Подсчитывает количество лайков для пользователя
 */
function countUserLikes(userId: number): number {
  const likes = readDB<Like[]>("likes.json");
  return likes.filter((l) => l.toUserId === userId).length;
}

/**
 * Проверяет, лайкнул ли текущий пользователь другого пользователя
 */
function isLikedByUser(fromUserId: number | undefined, toUserId: number): boolean {
  if (!fromUserId) return false;
  const likes = readDB<Like[]>("likes.json");
  return likes.some((l) => l.fromUserId === fromUserId && l.toUserId === toUserId);
}

/**
 * POST /api/likes/users-info - Получить информацию о лайках для нескольких пользователей
 * Публичный эндпоинт (не требует авторизации, но может использовать токен если он есть)
 */
router.post("/users-info", optionalAuth, (req: AuthRequest, res: Response) => {
  try {
    const { userIds } = req.body;
    const currentUserId = req.user?.id; // undefined если не авторизован
    
    // Логирование для отладки
    console.log("[Likes] POST /users-info", {
      hasToken: !!req.headers["authorization"],
      currentUserId,
      userIdsCount: userIds?.length,
      userFromReq: req.user,
    });

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: "userIds должен быть непустым массивом" });
    }

    const result = userIds.map((userId: number) => {
      const isLiked = currentUserId ? isLikedByUser(currentUserId, userId) : false;
      return {
        userId,
        likesCount: countUserLikes(userId),
        isLikedByCurrentUser: isLiked,
      };
    });
    
    // Логирование результата
    const likedCount = result.filter(r => r.isLikedByCurrentUser).length;
    console.log("[Likes] Response", {
      totalUsers: result.length,
      likedByCurrentUser: likedCount,
      currentUserId,
    });

    res.json(result);
  } catch (error) {
    console.error("Ошибка при получении информации о лайках:", error);
    res.status(500).json({ error: "Ошибка при получении информации о лайках" });
  }
});

/**
 * GET /api/likes/users-info/:userId - Получить информацию о лайках одного пользователя
 * Публичный эндпоинт (не требует авторизации, но может использовать токен если он есть)
 */
router.get("/users-info/:userId", optionalAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const currentUserId = req.user?.id; // undefined если не авторизован

    if (isNaN(userId)) {
      return res.status(400).json({ error: "Неверный userId" });
    }

    res.json({
      userId,
      likesCount: countUserLikes(userId),
      isLikedByCurrentUser: currentUserId ? isLikedByUser(currentUserId, userId) : false,
    });
  } catch (error) {
    console.error("Ошибка при получении информации о лайках:", error);
    res.status(500).json({ error: "Ошибка при получении информации о лайках" });
  }
});

/**
 * GET /api/likes/:id - получить лайк по ID
 */
router.get("/:id", (req: AuthRequest, res: Response) => {
  try {
    const likes = readDB<Like[]>("likes.json");
    const like = likes.find((l) => l.id === parseInt(req.params.id));
    
    if (!like) {
      return res.status(404).json({ error: "Лайк не найден" });
    }
    
    res.json(like);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при получении лайка" });
  }
});

/**
 * POST /api/likes - создать новый лайк (требует авторизации)
 */
router.post("/", authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const likes = readDB<Like[]>("likes.json");
    const { toUserId, skillId } = req.body;
    const fromUserId = req.user?.id; // Используем ID из токена

    if (!toUserId) {
      return res.status(400).json({ error: "toUserId обязателен" });
    }

    if (!fromUserId) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }

    // Валидация: нельзя лайкнуть самого себя
    if (fromUserId === toUserId) {
      return res.status(400).json({ error: "Нельзя поставить лайк самому себе" });
    }

    // Проверка существования toUserId
    const users = readDB<any[]>("users.json");
    const toUser = users.find((u) => u.id === toUserId);
    if (!toUser) {
      return res.status(400).json({ error: `Пользователь с ID ${toUserId} не найден` });
    }

    // Проверка на дубликат
    const existingLike = likes.find(
      (l) => l.fromUserId === fromUserId && l.toUserId === toUserId
    );

    if (existingLike) {
      // Если лайк уже существует, возвращаем ошибку
      return res.status(409).json({ error: "Лайк уже существует" });
    }

    const newLike: Like = {
      id: Math.max(...likes.map((l) => l.id), 0) + 1,
      fromUserId,
      toUserId,
      skillId: skillId ? parseInt(skillId) : undefined,
      createdAt: new Date().toISOString(),
    };

    likes.push(newLike);
    writeDB("likes.json", likes);

    res.status(201).json(newLike);
  } catch (error) {
    console.error("Ошибка при создании лайка:", error);
    res.status(500).json({ error: "Ошибка при создании лайка" });
  }
});

/**
 * DELETE /api/likes/:id - удалить лайк (требует авторизации)
 */
router.delete("/:id", authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const likes = readDB<Like[]>("likes.json");
    const like = likes.find((l) => l.id === parseInt(req.params.id));
    
    if (!like) {
      return res.status(404).json({ error: "Лайк не найден" });
    }

    // Проверка прав: можно удалять только свои лайки
    if (like.fromUserId !== req.user?.id) {
      return res.status(403).json({ error: "Нет доступа к этому ресурсу" });
    }
    
    const filtered = likes.filter((l) => l.id !== parseInt(req.params.id));
    writeDB("likes.json", filtered);
    
    res.status(204).send();
  } catch (error) {
    console.error("Ошибка при удалении лайка:", error);
    res.status(500).json({ error: "Ошибка при удалении лайка" });
  }
});

/**
 * DELETE /api/likes?toUserId=:userId - удалить лайк по пользователю (требует авторизации)
 */
router.delete("/", authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { toUserId } = req.query;
    const fromUserId = req.user?.id; // Используем ID из токена
    
    if (!fromUserId || !toUserId) {
      return res.status(400).json({ error: "Требуются авторизация и toUserId" });
    }
    
    const likes = readDB<Like[]>("likes.json");
    const like = likes.find(
      (l) => l.fromUserId === fromUserId && l.toUserId === parseInt(toUserId as string)
    );
    
    if (!like) {
      return res.status(404).json({ error: "Лайк не найден" });
    }
    
    const filtered = likes.filter((l) => l.id !== like.id);
    writeDB("likes.json", filtered);
    
    res.status(204).send();
  } catch (error) {
    console.error("Ошибка при удалении лайка:", error);
    res.status(500).json({ error: "Ошибка при удалении лайка" });
  }
});

export default router;
