#!/bin/bash

# Скрипт для быстрого деплоя API сервера с PM2

set -e

echo "[Deploy] Начало деплоя SkillSwap API..."

# Проверка наличия PM2
if ! command -v pm2 &> /dev/null; then
    echo "[Deploy] PM2 не установлен. Устанавливаю..."
    npm install -g pm2
fi

# Переход в директорию сервера
cd "$(dirname "$0")"

# Установка зависимостей
echo "[Deploy] Установка зависимостей..."
# Устанавливаем все зависимости (включая devDependencies для сборки TypeScript)
npm install

# Сборка проекта
echo "[Deploy] Сборка проекта..."
npm run build

# Создание папки для логов
mkdir -p logs

# Остановка существующего процесса (если есть)
if pm2 list | grep -q "skillswap-api"; then
    echo "[Deploy] Остановка существующего процесса..."
    pm2 stop skillswap-api || true
    pm2 delete skillswap-api || true
fi

# Запуск с PM2
echo "[Deploy] Запуск API сервера..."
pm2 start ecosystem.config.cjs

# Сохранение конфигурации PM2
echo "[Deploy] Сохранение конфигурации PM2..."
pm2 save

# Настройка автозапуска (требует sudo)
echo "[Deploy] Настройка автозапуска..."
echo "[Deploy] Для настройки автозапуска выполните: sudo pm2 startup"

# Показ статуса
echo ""
echo "[Deploy] Деплой завершен!"
echo ""
pm2 status
echo ""
echo "[Deploy] Просмотр логов: pm2 logs skillswap-api"
echo "[Deploy] Перезапуск: pm2 restart skillswap-api"
echo "[Deploy] Остановка: pm2 stop skillswap-api"

