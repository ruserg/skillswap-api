import { Router, Request, Response } from "express";
import { readDB, writeDB } from "../utils/db.js";
import { authenticateToken, AuthRequest } from "../utils/auth.js";
import { createCategorySchema, validate } from "../utils/validation.js";

const router = Router();

// GET /api/categories - получить все категории
router.get("/", (_req: Request, res: Response) => {
  try {
    const categories = readDB<any[]>("categories.json");
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при получении категорий" });
  }
});

// GET /api/categories/:id - получить категорию по ID
router.get("/:id", (req: Request, res: Response) => {
  try {
    const categories = readDB<any[]>("categories.json");
    const category = categories.find((c) => c.id === parseInt(req.params.id));
    
    if (!category) {
      return res.status(404).json({ error: "Категория не найдена" });
    }
    
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при получении категории" });
  }
});

// POST /api/categories - создать новую категорию (требует авторизации)
router.post("/", authenticateToken, validate(createCategorySchema), (req: AuthRequest, res: Response) => {
  try {
    const categories = readDB<any[]>("categories.json");
    // Исключаем id из req.body, чтобы гарантировать, что ID генерируется на сервере
    const { id, ...categoryData } = req.body;
    
    const newCategory = {
      id: Math.max(...categories.map((c) => c.id), 0) + 1,
      ...categoryData,
    };
    
    categories.push(newCategory);
    writeDB("categories.json", categories);
    
    res.status(201).json(newCategory);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при создании категории" });
  }
});

// PUT /api/categories/:id - обновить категорию (требует авторизации)
router.put("/:id", authenticateToken, validate(createCategorySchema), (req: AuthRequest, res: Response) => {
  try {
    const categories = readDB<any[]>("categories.json");
    const index = categories.findIndex((c) => c.id === parseInt(req.params.id));
    
    if (index === -1) {
      return res.status(404).json({ error: "Категория не найдена" });
    }
    
    // Исключаем id из req.body, чтобы гарантировать, что ID берется только из URL
    const { id, ...updateData } = req.body;
    
    categories[index] = { 
      ...categories[index], 
      ...updateData, 
      id: parseInt(req.params.id) // ID всегда берется из URL, а не из body
    };
    writeDB("categories.json", categories);
    
    res.json(categories[index]);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при обновлении категории" });
  }
});

// DELETE /api/categories/:id - удалить категорию (требует авторизации)
router.delete("/:id", authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const categories = readDB<any[]>("categories.json");
    const filteredCategories = categories.filter((c) => c.id !== parseInt(req.params.id));
    
    if (categories.length === filteredCategories.length) {
      return res.status(404).json({ error: "Категория не найдена" });
    }
    
    writeDB("categories.json", filteredCategories);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Ошибка при удалении категории" });
  }
});

export default router;

