# Инструкция по обновлению сервера

## Быстрое обновление (рекомендуется)

```bash
# 1. Подключитесь к серверу
ssh root@your-server

# 2. Перейдите в директорию проекта
cd /path/to/your/project

# 3. Остановите приложение
pm2 stop skillswap-api

# 4. Скопируйте новые файлы (если используете git)
git pull
# ИЛИ скопируйте файлы вручную через scp/sftp

# 5. Установите новые зависимости (ВАЖНО!)
npm install

# 6. Пересоберите проект
npm run build

# 7. Запустите приложение
pm2 start skillswap-api

# 8. Проверьте статус
pm2 status
pm2 logs skillswap-api --lines 20
```

## Обновление через скрипт deploy.sh

Если используете скрипт `deploy.sh`, обновите его, чтобы он устанавливал все зависимости (не только production):

```bash
# На сервере
cd /path/to/your/project

# Обновите файлы (git pull или копирование)

# Запустите скрипт
./deploy.sh
```

**Важно:** Скрипт использует `npm install --production`, что не установит devDependencies. Для сборки TypeScript нужны devDependencies. Используйте ручное обновление или обновите скрипт.

**Важно:** Скрипт `deploy.sh` уже обновлен и использует `npm install` (устанавливает все зависимости, включая devDependencies для сборки TypeScript).

## Проверка после обновления

1. **Проверьте, что сервер запущен:**
   ```bash
   pm2 status
   ```

2. **Проверьте логи:**
   ```bash
   pm2 logs skillswap-api --lines 50
   ```

3. **Проверьте API:**
   ```bash
   curl http://localhost:3001/api/health
   curl http://localhost:3001/api
   ```

4. **Проверьте авторизацию:**
   ```bash
   # Регистрация (с загрузкой аватара)
   curl -X POST http://localhost:3001/api/auth/register \
     -F "email=test@example.com" \
     -F "password=test123" \
     -F "name=Test User" \
     -F "avatar=@/path/to/avatar.jpg"
   ```

## Важные моменты

1. **Новые зависимости:** После обновления обязательно выполните `npm install`, чтобы установить все зависимости (включая devDependencies для сборки TypeScript).

2. **Переменные окружения:** Если вы еще не настроили `.env` файл, сделайте это после обновления. Подробная инструкция в [SETUP.md](./SETUP.md).

3. **Существующие пользователи:** Все пользователи должны иметь хешированные пароли. При регистрации через `/api/auth/register` пароли хешируются автоматически.

4. **База данных:** Файлы в `public/db/` не изменятся при обновлении, все данные сохранятся.

## Откат изменений (если что-то пошло не так)

```bash
# 1. Остановите приложение
pm2 stop skillswap-api

# 2. Вернитесь к предыдущей версии (если используете git)
git checkout <previous-commit>

# 3. Пересоберите
npm run build

# 4. Запустите
pm2 start skillswap-api
```

