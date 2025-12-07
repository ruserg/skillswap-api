import { Router, Request, Response } from "express";
import { readDB, writeDB } from "../utils/db.js";
import { authenticateToken, AuthRequest } from "../utils/auth.js";
import { createSkillSchema, updateSkillSchema, validate } from "../utils/validation.js";

const router = Router();

// GET /api/skills - получить все навыки
router.get("/", (req: AuthRequest, res: Response) => {
  try {
    const skills = readDB<any[]>("skills.json");
    
    // Фильтрация по query параметрам
    let filteredSkills = skills;
    
    if (req.query.userId) {
      filteredSkills = filteredSkills.filter(
        (s) => s.userId === parseInt(req.query.userId as string)
      );
    }
    
    if (req.query.subcategoryId) {
      filteredSkills = filteredSkills.filter(
        (s) => s.subcategoryId === parseInt(req.query.subcategoryId as string)
      );
    }
    
    if (req.query.type_of_proposal) {
      filteredSkills = filteredSkills.filter(
        (s) => s.type_of_proposal === req.query.type_of_proposal
      );
    }
    
    res.json(filteredSkills);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при получении навыков" });
  }
});

// GET /api/skills/:id - получить навык по ID
router.get("/:id", (req: AuthRequest, res: Response) => {
  try {
    const skills = readDB<any[]>("skills.json");
    const skill = skills.find((s) => s.id === parseInt(req.params.id));
    
    if (!skill) {
      return res.status(404).json({ error: "Навык не найден" });
    }
    
    res.json(skill);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при получении навыка" });
  }
});

// POST /api/skills - создать новый навык (требует авторизации)
router.post("/", authenticateToken, validate(createSkillSchema), (req: AuthRequest, res: Response) => {
  try {
    const skills = readDB<any[]>("skills.json");
    const { subcategoryId } = req.body;
    
    // Проверка существования subcategoryId
    const subcategories = readDB<any[]>("subcategories.json");
    const subcategory = subcategories.find((s) => s.id === subcategoryId);
    if (!subcategory) {
      return res.status(400).json({ error: `Подкатегория с ID ${subcategoryId} не найдена` });
    }
    
    // Исключаем id из req.body, чтобы гарантировать, что ID генерируется на сервере
    const { id, ...skillData } = req.body;
    
    const newSkill = {
      id: Math.max(...skills.map((s) => s.id), 0) + 1,
      ...skillData,
      userId: req.user?.id, // Используем ID из токена
      modified_datetime: new Date().toISOString(),
      images: req.body.images || [],
    };
    
    skills.push(newSkill);
    writeDB("skills.json", skills);
    
    res.status(201).json(newSkill);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при создании навыка" });
  }
});

// PUT /api/skills/:id - обновить навык (требует авторизации)
router.put("/:id", authenticateToken, validate(updateSkillSchema), (req: AuthRequest, res: Response) => {
  try {
    const skills = readDB<any[]>("skills.json");
    const index = skills.findIndex((s) => s.id === parseInt(req.params.id));
    
    if (index === -1) {
      return res.status(404).json({ error: "Навык не найден" });
    }
    
    // Исключаем id из req.body, чтобы гарантировать, что ID берется только из URL
    const { id, ...updateData } = req.body;
    
    skills[index] = {
      ...skills[index],
      ...updateData,
      id: parseInt(req.params.id), // ID всегда берется из URL, а не из body
      modified_datetime: new Date().toISOString(),
    };
    writeDB("skills.json", skills);
    
    res.json(skills[index]);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при обновлении навыка" });
  }
});

// DELETE /api/skills/:id - удалить навык (требует авторизации)
router.delete("/:id", authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const skills = readDB<any[]>("skills.json");
    const filteredSkills = skills.filter((s) => s.id !== parseInt(req.params.id));
    
    if (skills.length === filteredSkills.length) {
      return res.status(404).json({ error: "Навык не найден" });
    }
    
    writeDB("skills.json", filteredSkills);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Ошибка при удалении навыка" });
  }
});

export default router;

