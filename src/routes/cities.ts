import { Router, Request, Response } from "express";
import { readDB, writeDB } from "../utils/db.js";
import { authenticateToken, AuthRequest } from "../utils/auth.js";
import { createCitySchema, validate } from "../utils/validation.js";

const router = Router();

// GET /api/cities - получить все города
router.get("/", (_req: Request, res: Response) => {
  try {
    const cities = readDB<any[]>("cities.json");
    res.json(cities);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при получении городов" });
  }
});

// GET /api/cities/:id - получить город по ID
router.get("/:id", (req: Request, res: Response) => {
  try {
    const cities = readDB<any[]>("cities.json");
    const city = cities.find((c) => c.id === parseInt(req.params.id));
    
    if (!city) {
      return res.status(404).json({ error: "Город не найден" });
    }
    
    res.json(city);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при получении города" });
  }
});

// POST /api/cities - создать новый город (требует авторизации)
router.post("/", authenticateToken, validate(createCitySchema), (req: AuthRequest, res: Response) => {
  try {
    const cities = readDB<any[]>("cities.json");
    // Исключаем id из req.body, чтобы гарантировать, что ID генерируется на сервере
    const { id, ...cityData } = req.body;
    
    const newCity = {
      id: Math.max(...cities.map((c) => c.id), 0) + 1,
      ...cityData,
    };
    
    cities.push(newCity);
    writeDB("cities.json", cities);
    
    res.status(201).json(newCity);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при создании города" });
  }
});

// PUT /api/cities/:id - обновить город (требует авторизации)
router.put("/:id", authenticateToken, validate(createCitySchema), (req: AuthRequest, res: Response) => {
  try {
    const cities = readDB<any[]>("cities.json");
    const index = cities.findIndex((c) => c.id === parseInt(req.params.id));
    
    if (index === -1) {
      return res.status(404).json({ error: "Город не найден" });
    }
    
    // Исключаем id из req.body, чтобы гарантировать, что ID берется только из URL
    const { id, ...updateData } = req.body;
    
    cities[index] = { 
      ...cities[index], 
      ...updateData, 
      id: parseInt(req.params.id) // ID всегда берется из URL, а не из body
    };
    writeDB("cities.json", cities);
    
    res.json(cities[index]);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при обновлении города" });
  }
});

// DELETE /api/cities/:id - удалить город (требует авторизации)
router.delete("/:id", authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const cities = readDB<any[]>("cities.json");
    const filtered = cities.filter((c) => c.id !== parseInt(req.params.id));
    
    if (cities.length === filtered.length) {
      return res.status(404).json({ error: "Город не найден" });
    }
    
    writeDB("cities.json", filtered);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Ошибка при удалении города" });
  }
});

export default router;

