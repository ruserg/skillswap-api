import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { existsSync } from "fs";
import usersRouter from "./routes/users.js";
import skillsRouter from "./routes/skills.js";
import categoriesRouter from "./routes/categories.js";
import subcategoriesRouter from "./routes/subcategories.js";
import citiesRouter from "./routes/cities.js";
import likesRouter from "./routes/likes.js";
import authRouter from "./routes/auth.js";
import { authenticateToken, AuthRequest } from "./utils/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// CORS настройка
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(",").map((origin: string) => origin.trim())
    : "*", // По умолчанию разрешены все домены
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// Rate limiting - защита от DDoS
// Отключаем в тестовом окружении для удобства тестирования
const isTestEnv = process.env.NODE_ENV === "test" || process.env.DISABLE_RATE_LIMIT === "true";

if (!isTestEnv) {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX) : 100, // лимит запросов
    message: {
      error: "Слишком много запросов с этого IP, попробуйте позже",
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Пропускаем запросы с заголовком X-Test-Request (для тестов)
    skip: (req) => req.headers["x-test-request"] === "true",
  });

  // Применяем rate limiting ко всем запросам
  app.use(limiter);

  // Более строгий лимит для авторизации
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: process.env.AUTH_RATE_LIMIT_MAX ? parseInt(process.env.AUTH_RATE_LIMIT_MAX) : 5, // 5 попыток
    message: {
      error: "Слишком много попыток авторизации, попробуйте позже",
    },
    skipSuccessfulRequests: true, // Не считаем успешные запросы
    // Пропускаем запросы с заголовком X-Test-Request (для тестов)
    skip: (req) => req.headers["x-test-request"] === "true",
  });

  // Применяем строгий лимит к эндпоинтам авторизации
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);
} else {
  console.log("[Server] Rate limiting отключен для тестового окружения");
}

// Body parser
app.use(express.json());

// Статическая раздача загруженных файлов
// Используем process.cwd() для правильного пути в production и development
let uploadsPath = path.join(process.cwd(), "public", "uploads");

// Альтернативный путь для сервера (если указан через переменную окружения)
const alternativeUploadsPath = process.env.UPLOADS_PATH;
if (alternativeUploadsPath && existsSync(alternativeUploadsPath)) {
  uploadsPath = alternativeUploadsPath;
  console.log(`[Uploads] Используется альтернативный путь из переменной окружения: ${uploadsPath}`);
} else {
  console.log(`[Uploads] Статическая раздача файлов из: ${uploadsPath}`);
}

// Проверяем существование директории
if (!existsSync(uploadsPath)) {
  console.warn(`[Uploads] Директория не существует: ${uploadsPath}`);
  console.warn(`[Uploads] Создайте директорию или проверьте путь на сервере`);
} else {
  console.log(`[Uploads] Директория существует: ${uploadsPath}`);
}

// Статическая раздача файлов из /uploads
// Express автоматически ищет файлы в uploadsPath + путь из URL
// Например: /uploads/avatars/file.jpg -> uploadsPath/avatars/file.jpg
app.use("/uploads", express.static(uploadsPath));

// Функция для генерации информации об API
function getApiInfo(includeApiPath: boolean = false) {
  const endpoints = {
    health: "/api/health",
    auth: "/api/auth",
    users: "/api/users",
    skills: "/api/skills",
    categories: "/api/categories",
    subcategories: "/api/subcategories",
    cities: "/api/cities",
    likes: "/api/likes"
  };

  return {
    message: "SkillSwap API",
    version: "1.0.0",
    ...(includeApiPath && { api: "/api" }),
    endpoints
  };
}

// Root endpoint
app.get("/", (_req: express.Request, res: express.Response) => {
  res.json(getApiInfo(true));
});

// API info endpoint
app.get("/api", (_req: express.Request, res: express.Response) => {
  res.json(getApiInfo());
});

// API info endpoint (with trailing slash)
app.get("/api/", (_req: express.Request, res: express.Response) => {
  res.json(getApiInfo());
});

// Public routes (не требуют авторизации)
app.use("/api/auth", authRouter);

// API routes (GET - публичные, POST/PUT/DELETE - требуют авторизации)
app.use("/api/users", usersRouter);
app.use("/api/skills", skillsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/subcategories", subcategoriesRouter);
app.use("/api/cities", citiesRouter);
app.use("/api/likes", likesRouter);

// Health check
app.get("/api/health", (_req: express.Request, res: express.Response) => {
  res.json({ status: "ok", message: "SkillSwap API is running" });
});

// 404 handler
app.use((_req: express.Request, res: express.Response) => {
  res.status(404).json({ 
    error: "Not Found", 
    message: "Эндпоинт не найден. Используйте /api для просмотра доступных эндпоинтов." 
  });
});

app.listen(PORT, () => {
  console.log(`[Server] API сервер запущен на http://localhost:${PORT}`);
});

