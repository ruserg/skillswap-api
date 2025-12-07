import { z } from "zod";

/**
 * Схемы валидации для API
 */

// Валидация регистрации
// Для multipart/form-data все поля приходят как строки или undefined
export const registerSchema = z.object({
  email: z.string().min(1, "Email обязателен").email("Некорректный email"),
  password: z.string().min(6, "Пароль должен быть не менее 6 символов"),
  name: z.string().min(1, "Имя обязательно"),
  firstName: z.string().min(1, "Имя обязательно"),
  lastName: z.string().min(1, "Фамилия обязательна"),
  dateOfBirth: z.string().min(1, "Дата рождения обязательна"),
  gender: z.enum(["M", "F"], { message: "Пол должен быть M или F" }),
  cityId: z.string().min(1, "ID города обязателен").transform((val) => {
    const parsed = parseInt(val);
    if (isNaN(parsed)) {
      throw new Error("ID города должен быть числом");
    }
    return parsed;
  }),
});

// Валидация входа
export const loginSchema = z.object({
  email: z.string().email("Некорректный email"),
  password: z.string().min(1, "Пароль обязателен"),
});

// Валидация создания навыка
export const createSkillSchema = z.object({
  subcategoryId: z.number().int().positive("ID подкатегории должен быть положительным числом"),
  title: z.string().min(1, "Заголовок обязателен"),
  description: z.string().min(1, "Описание обязательно"),
  type_of_proposal: z.enum(["offer", "request"]),
  images: z.array(z.string()).optional().default([]),
});

// Валидация обновления навыка
export const updateSkillSchema = createSkillSchema.partial();

// Валидация создания категории
export const createCategorySchema = z.object({
  name: z.string().min(1, "Название категории обязательно"),
});

// Валидация создания подкатегории
export const createSubcategorySchema = z.object({
  categoryId: z.number().int().positive("ID категории должен быть положительным числом"),
  name: z.string().min(1, "Название подкатегории обязательно"),
});

// Валидация создания города
export const createCitySchema = z.object({
  name: z.string().min(1, "Название города обязательно"),
});

// Валидация обновления пользователя
export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["M", "F"]).optional(),
  cityId: z.number().int().positive().optional(),
}).strict(); // Запрещает дополнительные поля

/**
 * Middleware для валидации запросов
 */
export function validate<T extends z.ZodTypeAny>(schema: T) {
  return (req: any, res: any, next: any) => {
    try {
      // Для multipart/form-data multer может не добавить отсутствующие поля в req.body
      // Zod автоматически проверит наличие обязательных полей
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }));
        return res.status(400).json({
          error: "Ошибка валидации",
          details: errors,
        });
      }
      // Если это не ZodError, но есть сообщение об ошибке (например, из transform)
      if (error instanceof Error) {
        return res.status(400).json({
          error: "Ошибка валидации",
          message: error.message,
        });
      }
      return res.status(500).json({ error: "Ошибка валидации" });
    }
  };
}

