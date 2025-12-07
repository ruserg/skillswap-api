import { Router, Request, Response } from "express";
import { readDB, writeDB } from "../utils/db.js";
import { authenticateToken, AuthRequest } from "../utils/auth.js";
import { createSubcategorySchema, validate } from "../utils/validation.js";

const router = Router();

// GET /api/subcategories - получить все подкатегории
router.get("/", (req: Request, res: Response) => {
  try {
    const subcategories = readDB<any[]>("subcategories.json");
    
    // Фильтрация по categoryId
    let filtered = subcategories;
    if (req.query.categoryId) {
      filtered = filtered.filter(
        (s) => s.categoryId === parseInt(req.query.categoryId as string)
      );
    }
    
    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при получении подкатегорий" });
  }
});

// GET /api/subcategories/:id - получить подкатегорию по ID
router.get("/:id", (req: Request, res: Response) => {
  try {
    const subcategories = readDB<any[]>("subcategories.json");
    const subcategory = subcategories.find((s) => s.id === parseInt(req.params.id));
    
    if (!subcategory) {
      return res.status(404).json({ error: "Подкатегория не найдена" });
    }
    
    res.json(subcategory);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при получении подкатегории" });
  }
});

// POST /api/subcategories - создать новую подкатегорию (требует авторизации)
router.post("/", authenticateToken, validate(createSubcategorySchema), (req: AuthRequest, res: Response) => {
  try {
    const subcategories = readDB<any[]>("subcategories.json");
    const { categoryId } = req.body;
    
    // Проверка существования categoryId
    const categories = readDB<any[]>("categories.json");
    const category = categories.find((c) => c.id === categoryId);
    if (!category) {
      return res.status(400).json({ error: `Категория с ID ${categoryId} не найдена` });
    }
    
    // Исключаем id из req.body, чтобы гарантировать, что ID генерируется на сервере
    const { id, ...subcategoryData } = req.body;
    
    const newSubcategory = {
      id: Math.max(...subcategories.map((s) => s.id), 0) + 1,
      ...subcategoryData,
    };
    
    subcategories.push(newSubcategory);
    writeDB("subcategories.json", subcategories);
    
    res.status(201).json(newSubcategory);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при создании подкатегории" });
  }
});

// PUT /api/subcategories/:id - обновить подкатегорию (требует авторизации)
router.put("/:id", authenticateToken, validate(createSubcategorySchema), (req: AuthRequest, res: Response) => {
  try {
    const subcategories = readDB<any[]>("subcategories.json");
    const index = subcategories.findIndex((s) => s.id === parseInt(req.params.id));
    
    if (index === -1) {
      return res.status(404).json({ error: "Подкатегория не найдена" });
    }
    
    // Исключаем id из req.body, чтобы гарантировать, что ID берется только из URL
    const { id, ...updateData } = req.body;
    
    subcategories[index] = {
      ...subcategories[index],
      ...updateData,
      id: parseInt(req.params.id), // ID всегда берется из URL, а не из body
    };
    writeDB("subcategories.json", subcategories);
    
    res.json(subcategories[index]);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при обновлении подкатегории" });
  }
});

// DELETE /api/subcategories/:id - удалить подкатегорию (требует авторизации)
router.delete("/:id", authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const subcategories = readDB<any[]>("subcategories.json");
    const filtered = subcategories.filter((s) => s.id !== parseInt(req.params.id));
    
    if (subcategories.length === filtered.length) {
      return res.status(404).json({ error: "Подкатегория не найдена" });
    }
    
    writeDB("subcategories.json", filtered);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Ошибка при удалении подкатегории" });
  }
});

export default router;

