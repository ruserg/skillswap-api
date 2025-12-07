import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Путь к JSON файлам базы данных
// Определяем путь относительно корня проекта
// Если запускается из dist/utils -> ../../../public/db
// Если запускается из src/utils -> ../../public/db
// Альтернативный путь можно указать через переменную окружения DB_PATH
const isProduction = __dirname.includes('/dist/');
let DB_PATH = isProduction 
  ? join(__dirname, "../../../public/db")
  : join(process.cwd(), "public/db");

// Альтернативный путь для сервера (если указан через переменную окружения)
const alternativePath = process.env.DB_PATH || process.env.DATABASE_PATH;
if (alternativePath && existsSync(alternativePath)) {
  DB_PATH = alternativePath;
  console.log(`[DB] Используется альтернативный путь из переменной окружения: ${DB_PATH}`);
}

// Логируем путь при первом использовании
let pathLogged = false;
if (!pathLogged) {
  console.log(`[DB] Путь к базе данных: ${DB_PATH}`);
  pathLogged = true;
}

export function readDB<T>(filename: string): T {
  try {
    const filePath = join(DB_PATH, filename);
    
    // Проверяем существование файла
    if (!existsSync(filePath)) {
      console.error(`[DB] Файл не найден: ${filePath}`);
      console.error(`[DB] Проверьте, что файл существует в папке: ${DB_PATH}`);
      // Возвращаем пустой массив, если файл не найден
      return [] as T;
    }
    
    const data = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(data) as T;
    
    // Логируем количество записей (только для массивов)
    if (Array.isArray(parsed)) {
      console.log(`[DB] Загружено ${parsed.length} записей из ${filename}`);
    }
    
    return parsed;
  } catch (error) {
    console.error(`[DB] Ошибка чтения ${filename}:`, error);
    // Возвращаем пустой массив вместо выброса ошибки
    return [] as T;
  }
}

export function writeDB<T>(filename: string, data: T): void {
  const filePath = join(DB_PATH, filename);
  
  try {
    writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    
    // Логируем количество записей (только для массивов)
    if (Array.isArray(data)) {
      console.log(`[DB] Сохранено ${data.length} записей в ${filename}`);
    }
  } catch (error) {
    console.error(`[DB] Ошибка записи ${filename}:`, error);
    console.error(`   Путь: ${filePath}`);
    throw error;
  }
}

