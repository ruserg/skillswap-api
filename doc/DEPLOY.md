# Деплой API сервера

Инструкции по развертыванию API сервера на production сервере.

## Вариант 1: PM2 (Рекомендуется)

PM2 - это процесс-менеджер для Node.js приложений, который обеспечивает автоматический перезапуск, логирование и мониторинг.

### Быстрый деплой (автоматический скрипт)

Используйте готовый скрипт для автоматического деплоя:

```bash
cd server
./deploy.sh
```

Скрипт автоматически:
- Проверит наличие PM2 и установит при необходимости
- Установит зависимости
- Соберет проект
- Создаст папку для логов
- Запустит приложение с PM2
- Сохранит конфигурацию

### Ручной деплой

#### Установка PM2

```bash
npm install -g pm2
```

#### Подготовка к деплою

1. Соберите проект:
```bash
cd server
npm install --production
npm run build
```

2. Создайте папку для логов:
```bash
mkdir -p logs
```

#### Запуск с PM2

```bash
# Запуск приложения
pm2 start ecosystem.config.cjs

# Или просто
pm2 start dist/index.js --name skillswap-api

# Сохранить конфигурацию для автозапуска при перезагрузке сервера
pm2 save
pm2 startup
```

### Управление процессом

```bash
# Просмотр статуса
pm2 status

# Просмотр логов
pm2 logs skillswap-api

# Перезапуск
pm2 restart skillswap-api

# Остановка
pm2 stop skillswap-api

# Удаление из PM2
pm2 delete skillswap-api

# Мониторинг
pm2 monit
```

### Обновление приложения

Подробная инструкция в [UPDATE.md](./UPDATE.md).

Быстрое обновление:

```bash
# 1. Остановите приложение
pm2 stop skillswap-api

# 2. Обновите код и пересоберите
git pull
npm install  # Устанавливает все зависимости (включая devDependencies для сборки)
npm run build

# 3. Запустите снова
pm2 start skillswap-api

# Или используйте reload для zero-downtime
pm2 reload skillswap-api
```

---

## Вариант 2: systemd (Linux)

systemd - стандартный системный менеджер для Linux дистрибутивов.

### Установка

1. Отредактируйте файл `skillswap-api.service`:
   - Измените `WorkingDirectory` на реальный путь к проекту
   - При необходимости измените `User` (по умолчанию `www-data`)

2. Скопируйте файл в systemd:
```bash
sudo cp skillswap-api.service /etc/systemd/system/
```

3. Перезагрузите systemd:
```bash
sudo systemctl daemon-reload
```

4. Включите автозапуск:
```bash
sudo systemctl enable skillswap-api
```

5. Запустите сервис:
```bash
sudo systemctl start skillswap-api
```

### Управление сервисом

```bash
# Проверка статуса
sudo systemctl status skillswap-api

# Просмотр логов
sudo journalctl -u skillswap-api -f

# Перезапуск
sudo systemctl restart skillswap-api

# Остановка
sudo systemctl stop skillswap-api

# Отключение автозапуска
sudo systemctl disable skillswap-api
```

---

## Вариант 3: Docker

### Сборка образа

```bash
cd server
docker build -t skillswap-api .
```

### Запуск контейнера

```bash
docker run -d \
  --name skillswap-api \
  --restart unless-stopped \
  -p 3001:3001 \
  -v $(pwd)/../public/db:/app/public/db \
  skillswap-api
```

### Использование docker-compose

```bash
docker-compose up -d
```

### Управление

```bash
# Просмотр логов
docker logs -f skillswap-api

# Перезапуск
docker restart skillswap-api

# Остановка
docker stop skillswap-api

# Удаление
docker rm skillswap-api
```

---

## Настройка Nginx (Reverse Proxy)

Для работы через домен и HTTPS рекомендуется использовать Nginx как reverse proxy.

### Пример конфигурации Nginx

Создайте файл `/etc/nginx/sites-available/skillswap-api`:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Активируйте конфигурацию:

```bash
sudo ln -s /etc/nginx/sites-available/skillswap-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Настройка SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

---

## Переменные окружения

### Настройка .env файла

Создайте файл `.env` в корне проекта:

```bash
cd /path/to/your/project
cp env.example .env
nano .env
```

**КРИТИЧЕСКИ ВАЖНО:** Обязательно измените JWT секретные ключи! Подробная инструкция в [SETUP.md](./SETUP.md).

Минимальный `.env` файл:

```env
JWT_SECRET=ваш-сгенерированный-ключ-1
JWT_REFRESH_SECRET=ваш-сгенерированный-ключ-2
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
PORT=3001
NODE_ENV=production
```

### Проверка переменных окружения

Переменные из `.env` загружаются автоматически через `dotenv` при запуске приложения.

**Важно:** `pm2 env 0` НЕ покажет переменные из `.env` файла! Он показывает только переменные, установленные через PM2.

Для проверки переменных:

```bash
# Способ 1: Проверьте .env файл напрямую
cat .env

# Способ 2: Проверьте логи (должны быть без ошибок)
pm2 logs skillswap-api --lines 20

# Способ 3: Проверьте работу API
curl http://localhost:3001/api/health
```

Если сервер запустился без ошибок, значит переменные загружаются корректно.

---

## Мониторинг и логирование

### PM2 Monitoring

```bash
# Установка PM2 Plus (опционально)
pm2 link <secret_key> <public_key>
```

### Логирование

Логи сохраняются в:
- PM2: `./logs/error.log` и `./logs/out.log`
- systemd: `journalctl -u skillswap-api`
- Docker: `docker logs skillswap-api`

---

## Рекомендации по безопасности

1. **Firewall**: Откройте только необходимые порты
   ```bash
   sudo ufw allow 3001/tcp
   ```

2. **Не запускайте от root**: Используйте отдельного пользователя

3. **HTTPS**: Всегда используйте HTTPS в production

4. **Rate Limiting**: Рассмотрите добавление rate limiting middleware

5. **Backup**: Регулярно делайте резервные копии JSON файлов из `public/db/`

---

## Troubleshooting

### Порт уже занят

```bash
# Найти процесс, использующий порт
sudo lsof -i :3001
# Или
sudo netstat -tulpn | grep 3001

# Убить процесс
sudo kill -9 <PID>
```

### Проверка работы API

```bash
curl http://localhost:3001/api/health
```

### Просмотр ошибок

```bash
# PM2
pm2 logs skillswap-api --err

# systemd
sudo journalctl -u skillswap-api -n 50 --no-pager

# Docker
docker logs skillswap-api 2>&1 | tail -50
```

