import multer, { FileFilterCallback } from "multer";
import path from "path";
import { existsSync, mkdirSync } from "fs";
import sharp from "sharp";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { Request } from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Путь для хранения загруженных файлов
// Определяем путь относительно корня проекта
const isProduction = __dirname.includes('/dist/');
const basePath = isProduction 
  ? path.join(__dirname, "../../../public/uploads/avatars")
  : path.join(process.cwd(), "public", "uploads", "avatars");

const UPLOAD_DIR = process.env.UPLOAD_DIR || basePath;

// URL для публичного доступа к файлам
// Используем API_URL или PUBLIC_URL из переменных окружения
// Если не указано, формируем из PORT (для development)
const getPublicUrl = (): string => {
  if (process.env.PUBLIC_URL) {
    return process.env.PUBLIC_URL;
  }
  if (process.env.API_URL) {
    return process.env.API_URL;
  }
  // Fallback для development (не рекомендуется для production)
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    console.warn("[Upload] ВНИМАНИЕ: API_URL или PUBLIC_URL не указаны в production!");
    console.warn("[Upload] Установите переменную окружения API_URL для корректной работы загрузки файлов");
  }
  const port = process.env.PORT || 3001;
  const host = process.env.HOST || "localhost";
  return `http://${host}:${port}`;
};

const PUBLIC_URL = getPublicUrl();
console.log(`[Upload] Публичный URL для файлов: ${PUBLIC_URL}`);

// Создаем директорию, если её нет
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log(`[Upload] Создана директория для загрузки файлов: ${UPLOAD_DIR}`);
}

// Настройка multer для сохранения файлов
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    // Генерируем уникальное имя файла
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  },
});

// Фильтр для проверки типа файла
const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Неподдерживаемый тип файла. Разрешены только JPEG, PNG и WebP"));
  }
};

// Настройка multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

/**
 * Валидация изображения
 */
export async function validateImage(filePath: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const metadata = await sharp(filePath).metadata();
    
    if (!metadata.width || !metadata.height) {
      return { valid: false, error: "Не удалось определить размеры изображения" };
    }

    if (metadata.width < 200 || metadata.height < 200) {
      return { valid: false, error: "Минимальный размер изображения: 200x200px" };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: "Ошибка при обработке изображения" };
  }
}

/**
 * Создание миниатюр
 */
export async function createThumbnails(filePath: string, userId: number): Promise<string[]> {
  const baseName = path.basename(filePath, path.extname(filePath));
  const dir = path.dirname(filePath);
  const urls: string[] = [];

  try {
    // Оригинал
    const originalUrl = `${PUBLIC_URL}/uploads/avatars/${path.basename(filePath)}`;
    urls.push(originalUrl);

    // Миниатюра 200x200
    const thumb200Path = path.join(dir, `${baseName}-200x200.jpg`);
    await sharp(filePath)
      .resize(200, 200, { fit: "cover" })
      .jpeg({ quality: 85 })
      .toFile(thumb200Path);
    urls.push(`${PUBLIC_URL}/uploads/avatars/${path.basename(thumb200Path)}`);

    // Миниатюра 100x100
    const thumb100Path = path.join(dir, `${baseName}-100x100.jpg`);
    await sharp(filePath)
      .resize(100, 100, { fit: "cover" })
      .jpeg({ quality: 85 })
      .toFile(thumb100Path);
    urls.push(`${PUBLIC_URL}/uploads/avatars/${path.basename(thumb100Path)}`);

    return urls;
  } catch (error) {
    console.error("Ошибка при создании миниатюр:", error);
    // Возвращаем хотя бы оригинал
    return [`${PUBLIC_URL}/uploads/avatars/${path.basename(filePath)}`];
  }
}

/**
 * Генерация публичного URL для аватара
 */
export function getAvatarUrl(filename: string): string {
  return `${PUBLIC_URL}/uploads/avatars/${filename}`;
}

