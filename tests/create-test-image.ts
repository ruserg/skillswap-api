import sharp from "sharp";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Создает тестовое изображение для использования в тестах
 */
async function createTestImage(): Promise<void> {
  const testImagePath = path.join(__dirname, "test-avatar.jpg");
  
  // Создаем изображение 400x400px (рекомендуемый размер)
  await sharp({
    create: {
      width: 400,
      height: 400,
      channels: 3,
      background: { r: 100, g: 150, b: 200 },
    },
  })
    .jpeg({ quality: 90 })
    .toFile(testImagePath);

  console.log(`✅ Тестовое изображение создано: ${testImagePath}`);
}

// Запуск
createTestImage().catch(console.error);

