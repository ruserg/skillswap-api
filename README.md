# SkillSwap API Server

API сервер для проекта SkillSwap на Express.js и TypeScript.

Copyright (c) 2025 Sergei Denisenko

Licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Установка

```bash
cd server
npm install
```

## Запуск

### Режим разработки (с автоперезагрузкой)
```bash
npm run dev
```

**Примечание:** Для production используйте скрипт `./deploy.sh`, который автоматически установит зависимости, соберет проект и запустит через PM2.

## API Endpoints

> **[PUBLIC]** - Публичные эндпоинты (не требуют авторизации)  
> **[PRIVATE]** - Приватные эндпоинты (требуют авторизации, заголовок `Authorization: Bearer <accessToken>`)

### Users (Пользователи)
- **[PUBLIC]** `GET /api/users` - получить всех пользователей
- **[PUBLIC]** `GET /api/users/:id` - получить пользователя по ID
- **[PRIVATE]** `PUT /api/users/:id` - обновить пользователя (только свои данные)
- **[PRIVATE]** `DELETE /api/users/:id` - удалить пользователя (только свои данные)

### Skills (Навыки)
- **[PUBLIC]** `GET /api/skills` - получить все навыки
  - Query параметры: `userId`, `subcategoryId`, `type_of_proposal`
- **[PUBLIC]** `GET /api/skills/:id` - получить навык по ID
- **[PRIVATE]** `POST /api/skills` - создать новый навык
- **[PRIVATE]** `PUT /api/skills/:id` - обновить навык
- **[PRIVATE]** `DELETE /api/skills/:id` - удалить навык

### Categories (Категории)
- **[PUBLIC]** `GET /api/categories` - получить все категории
- **[PUBLIC]** `GET /api/categories/:id` - получить категорию по ID
- **[PRIVATE]** `POST /api/categories` - создать новую категорию
- **[PRIVATE]** `PUT /api/categories/:id` - обновить категорию
- **[PRIVATE]** `DELETE /api/categories/:id` - удалить категорию

### Subcategories (Подкатегории)
- **[PUBLIC]** `GET /api/subcategories` - получить все подкатегории
  - Query параметры: `categoryId`
- **[PUBLIC]** `GET /api/subcategories/:id` - получить подкатегорию по ID
- **[PRIVATE]** `POST /api/subcategories` - создать новую подкатегорию
- **[PRIVATE]** `PUT /api/subcategories/:id` - обновить подкатегорию
- **[PRIVATE]** `DELETE /api/subcategories/:id` - удалить подкатегорию

### Cities (Города)
- **[PUBLIC]** `GET /api/cities` - получить все города
- **[PUBLIC]** `GET /api/cities/:id` - получить город по ID
- **[PRIVATE]** `POST /api/cities` - создать новый город
- **[PRIVATE]** `PUT /api/cities/:id` - обновить город
- **[PRIVATE]** `DELETE /api/cities/:id` - удалить город

### Likes (Лайки)
- **[PUBLIC]** `POST /api/likes/users-info` - получить информацию о лайках для нескольких пользователей
- **[PUBLIC]** `GET /api/likes/users-info/:userId` - получить информацию о лайках одного пользователя
- **[PUBLIC]** `GET /api/likes/:id` - получить лайк по ID
- **[PRIVATE]** `POST /api/likes` - создать новый лайк (от текущего пользователя к другому)
- **[PRIVATE]** `DELETE /api/likes/:id` - удалить лайк по ID
- **[PRIVATE]** `DELETE /api/likes?toUserId=:userId` - удалить лайк по пользователю

### Auth (Авторизация)
- **[PUBLIC]** `POST /api/auth/register` - регистрация нового пользователя
- **[PUBLIC]** `POST /api/auth/login` - вход пользователя
- **[PUBLIC]** `POST /api/auth/refresh` - обновить access токен
- **[PRIVATE]** `GET /api/auth/me` - информация о текущем пользователе
- **[PRIVATE]** `POST /api/auth/logout` - выход

Подробная документация по авторизации в [AUTH.md](./doc/AUTH.md).

### Health Check
- **[PUBLIC]** `GET /api/health` - проверить статус API

## База данных

API использует JSON файлы из `public/db/` как базу данных.

**Инициализация базы данных:**
```bash
npm run init-db
```

Подробное описание структуры данных см. в [doc/DATABASE.md](./doc/DATABASE.md).

## Безопасность

API включает встроенные механизмы защиты:

- **Rate Limiting** - защита от DDoS атак (100 запросов/15 мин, 5 попыток авторизации/15 мин)
- **CORS** - настраиваемые разрешенные домены через `ALLOWED_ORIGINS`
- **Валидация данных** - автоматическая валидация всех входных данных с помощью Zod
- **JWT аутентификация** - защита приватных эндпоинтов

Подробнее см. [doc/PRODUCTION_CHECKLIST.md](./doc/PRODUCTION_CHECKLIST.md).

## Порт

По умолчанию сервер запускается на порту **3001**.

Можно изменить через переменную окружения:
```bash
PORT=3002 npm run dev
```

## Документация

Документация находится в папке `doc/`. Рекомендуемый порядок изучения:

### Для начинающих (первая настройка)

1. **[SETUP.md](./doc/SETUP.md)** - Настройка сервера и JWT токенов
   - Первый шаг после установки
   - Настройка секретных ключей
   - Понимание работы токенов

2. **[DEPLOY.md](./doc/DEPLOY.md)** - Развертывание на production сервере
   - Инструкции по деплою
   - Настройка PM2, systemd или Docker
   - Настройка Nginx и SSL

3. **[PRODUCTION_CHECKLIST.md](./doc/PRODUCTION_CHECKLIST.md)** - Чеклист для production
   - Проверка всех настроек безопасности
   - Список обязательных и рекомендуемых настроек

### Для работы с данными

4. **[DATABASE.md](./doc/DATABASE.md)** - Структура базы данных
   - Описание структуры JSON файлов
   - Связи между данными
   - Валидация данных

5. **[IMPORT_DATA.md](./doc/IMPORT_DATA.md)** - Импорт данных
   - Как заполнить базу данных
   - Форматы данных
   - Проверка импортированных данных

### Для разработки

6. **[AUTH.md](./doc/AUTH.md)** - Авторизация и аутентификация
   - Подробное описание работы JWT
   - Примеры использования эндпоинтов
   - Обработка токенов на клиенте

7. **[FRONTEND.md](./doc/FRONTEND.md)** - Интеграция в React + RTK приложение
   - Настройка RTK Query
   - Примеры использования API
   - Обработка авторизации

### Для поддержки

9. **[UPDATE.md](./doc/UPDATE.md)** - Обновление сервера
   - Процесс обновления кода
   - Проверка после обновления
   - Откат изменений

10. **[LOGGING.md](./doc/LOGGING.md)** - Логирование
    - Текущий подход к логированию
    - Префиксы и категории
    - Безопасность логирования

11. **[TESTS.md](./doc/TESTS.md)** - Тестирование
    - Полное покрытие тестами всех компонентов API
    - Запуск тестов и настройка
    - Структура тестов и что тестируется
## Быстрый старт

### Локальная разработка

```bash
npm install
npm run dev
```

### Production деплой

Скрипт `deploy.sh` автоматически выполнит все необходимые шаги:
- Проверит и установит PM2 (если нужно)
- Установит зависимости (`npm install`)
- Соберет проект (`npm run build`)
- Запустит сервер через PM2

```bash
./deploy.sh
```

**Важно:** После деплоя обязательно настройте JWT секреты! См. [doc/SETUP.md](./doc/SETUP.md).

Подробные инструкции в [doc/DEPLOY.md](./doc/DEPLOY.md) и [doc/SETUP.md](./doc/SETUP.md).

## Тестирование

API полностью покрыт тестами. Подробная документация по тестам в [doc/TESTS.md](./doc/TESTS.md).

**Быстрый старт:**
```bash
# Все тесты (требуют запущенного сервера)
npm test

# Только unit тесты (не требуют сервера)
npm run test:utils

# Тесты регистрации
npm run test:register
```

