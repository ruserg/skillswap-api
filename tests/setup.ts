// Setup файл для Jest тестов
// Загружает переменные окружения из .env файла

import dotenv from "dotenv";
import { resolve } from "path";
import axios from "axios";

// Загружаем .env файл из корня проекта
dotenv.config({ path: resolve(process.cwd(), ".env") });

// Отключаем rate limiting для тестов
process.env.DISABLE_RATE_LIMIT = "true";
process.env.NODE_ENV = process.env.NODE_ENV || "test";

// Настраиваем axios для тестов - добавляем заголовок для пропуска rate limiting
axios.defaults.headers.common["X-Test-Request"] = "true";

// Выводим используемый API URL для отладки
const API_URL = process.env.API_URL || process.env.API_BASE_URL || "http://localhost:3001";
console.log(`[Tests] Используется API URL: ${API_URL}`);

