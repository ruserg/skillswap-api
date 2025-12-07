import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Путь к JSON файлам базы данных
const DB_PATH = join(__dirname, "../../../public/db");

// Создаем папку, если её нет
if (!existsSync(DB_PATH)) {
  mkdirSync(DB_PATH, { recursive: true });
}

// Список файлов базы данных
const DB_FILES = [
  "users.json",
  "skills.json",
  "categories.json",
  "subcategories.json",
  "cities.json",
  "likes.json",
];

/**
 * Импортирует данные из JSON файла в базу данных
 * @param sourcePath - путь к исходному JSON файлу
 * @param targetFile - имя файла в базе данных (например, "users.json")
 */
function importData(sourcePath: string, targetFile: string): void {
  try {
    console.log(`[Import] Импорт ${targetFile} из ${sourcePath}...`);
    
    // Проверяем существование исходного файла
    if (!existsSync(sourcePath)) {
      console.error(`[Import] Файл не найден: ${sourcePath}`);
      return;
    }
    
    // Читаем исходный файл
    const data = readFileSync(sourcePath, "utf-8");
    const jsonData = JSON.parse(data);
    
    // Записываем в базу данных
    const targetPath = join(DB_PATH, targetFile);
    writeFileSync(targetPath, JSON.stringify(jsonData, null, 2), "utf-8");
    
    const itemCount = Array.isArray(jsonData) ? jsonData.length : 1;
    console.log(`[Import] Успешно импортировано ${itemCount} записей в ${targetFile}`);
  } catch (error) {
    console.error(`[Import] Ошибка при импорте ${targetFile}:`, error);
  }
}

/**
 * Инициализирует пустые файлы базы данных
 */
function initEmptyDB(): void {
  console.log("[Init] Инициализация пустых файлов базы данных...");
  
  DB_FILES.forEach((filename) => {
    const filePath = join(DB_PATH, filename);
    
    // Создаем файл только если его нет
    if (!existsSync(filePath)) {
      writeFileSync(filePath, JSON.stringify([], null, 2), "utf-8");
      console.log(`[Init] Создан пустой файл: ${filename}`);
    } else {
      console.log(`[Init] Файл уже существует: ${filename}`);
    }
  });
}

// Основная функция
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Если аргументов нет, инициализируем пустые файлы
    console.log("[Init] Инициализация базы данных...\n");
    initEmptyDB();
    console.log("\n[Init] Готово! База данных инициализирована.");
    console.log("\n[Init] Для импорта данных используйте:");
    console.log("   npm run import -- <путь_к_json_файлу> <имя_файла_в_бд>");
    console.log("   Например: npm run import -- ./data/users.json users.json");
    return;
  }
  
  if (args.length < 2) {
    console.error("[Import] Ошибка: укажите путь к JSON файлу и имя файла в БД");
    console.log("Использование: npm run import -- <путь_к_json> <имя_файла>");
    console.log("Пример: npm run import -- ./data/users.json users.json");
    process.exit(1);
  }
  
  const [sourcePath, targetFile] = args;
  
  // Проверяем, что имя файла валидно
  if (!DB_FILES.includes(targetFile)) {
    console.error(`[Import] Ошибка: неверное имя файла. Доступные файлы: ${DB_FILES.join(", ")}`);
    process.exit(1);
  }
  
  console.log("[Import] Импорт данных в базу данных...\n");
  importData(sourcePath, targetFile);
  console.log("\n[Import] Готово!");
}

main();

