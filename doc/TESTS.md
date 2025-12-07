# Тесты для SkillSwap API

Полное покрытие тестами всех компонентов API.

## Установка зависимостей

```bash
npm install
```

## Подготовка тестового изображения

Перед запуском тестов регистрации нужно создать тестовое изображение:

```bash
npm run test:create-image
```

Это создаст файл `tests/test-avatar.jpg` размером 400x400px.

## Запуск тестов

### ВАЖНО: Перед запуском интеграционных тестов

**Интеграционные тесты требуют запущенного API сервера!**

1. **Убедитесь, что в `.env` указан правильный адрес сервера:**
```bash
# Проверьте содержимое .env
cat .env | grep API_URL
# Должно быть: API_URL=http://XXX.XXX.XXX.XXX:3001
```

2. **Проверьте доступность сервера:**
```bash
# Используйте адрес из .env
curl http://XXX.XXX.XXX.XXX:3001/api/health
# Должен вернуть: {"status":"ok"}
```

3. **Если сервер не запущен, запустите его:**
```bash
# На сервере
npm run build
npm start
# или через PM2
pm2 start ecosystem.config.cjs
```

### Все тесты
```bash
npm test
```

**Примечание:** Этот команда запустит все тесты, включая интеграционные. Убедитесь, что сервер запущен!

### Тесты по категориям

**Утилиты (auth, db, validation) - НЕ требуют сервера:**
```bash
npm run test:utils
```

**API маршруты (auth, users, skills, categories, subcategories, cities, likes, index) - ТРЕБУЮТ сервера:**
```bash
npm run test:routes
```

**Только регистрация - ТРЕБУЕТ сервера:**
```bash
npm run test:register
```

### Режим наблюдения (watch mode)
```bash
npm run test:watch
```

### Покрытие кода (coverage)
```bash
npm run test:coverage
```

## Настройка

API URL настраивается через переменные окружения в файле `.env`:

```bash
# В файле .env в корне проекта
API_URL=http://XXX.XXX.XXX.XXX:3001
# или
API_BASE_URL=http://XXX.XXX.XXX.XXX:3001
```

**Важно:** 
- Тесты автоматически загружают переменные из `.env` файла
- Если переменная не установлена, используется fallback `http://localhost:3001`
- Для тестов маршрутов API сервер должен быть запущен и доступен по указанному адресу

В тестах используется:
```typescript
const API_BASE_URL = process.env.API_URL || process.env.API_BASE_URL || "http://localhost:3001";
```

При запуске тестов вы увидите в консоли:
```
[Tests] Используется API URL: http://XXX.XXX.XXX.XXX:3001
```

## Структура тестов

```
tests/
  ├── register.test.ts           # Тесты регистрации (интеграционные)
  ├── create-test-image.ts       # Скрипт создания тестового изображения
  ├── test-avatar.jpg            # Тестовое изображение (создается автоматически)
  ├── utils/                     # Тесты утилит
  │   ├── auth.test.ts          # Тесты аутентификации (hashPassword, comparePassword, generateTokens, verifyRefreshToken, authenticateToken, optionalAuth, authorizeSelf)
  │   └── validation.test.ts   # Тесты валидации (validate middleware с различными схемами)
  └── routes/                    # Тесты API маршрутов
      ├── auth.test.ts          # POST /api/auth/login, GET /api/auth/me, POST /api/auth/refresh, POST /api/auth/logout
      ├── users.test.ts         # GET /api/users, GET /api/users/:id, PUT /api/users/:id, DELETE /api/users/:id
      ├── skills.test.ts        # GET /api/skills, GET /api/skills/:id, POST /api/skills, PUT /api/skills/:id, DELETE /api/skills/:id
      ├── categories.test.ts    # GET /api/categories, GET /api/categories/:id, POST /api/categories, PUT /api/categories/:id, DELETE /api/categories/:id
      ├── subcategories.test.ts # GET /api/subcategories, GET /api/subcategories/:id, POST /api/subcategories, PUT /api/subcategories/:id, DELETE /api/subcategories/:id
      ├── cities.test.ts        # GET /api/cities, GET /api/cities/:id, POST /api/cities, PUT /api/cities/:id, DELETE /api/cities/:id
      ├── likes.test.ts         # POST /api/likes/users-info, GET /api/likes/users-info/:userId, POST /api/likes, DELETE /api/likes/:id, DELETE /api/likes?toUserId=:userId
      └── index.test.ts         # GET /, GET /api, GET /api/, GET /api/health
```

## Что тестируется

### Утилиты

**auth.test.ts:**
- Хеширование паролей (`hashPassword`)
- Сравнение паролей (`comparePassword`)
- Генерация токенов (`generateAccessToken`, `generateRefreshToken`, `generateTokens`)
- Верификация refresh токена (`verifyRefreshToken`)
- Middleware аутентификации (`authenticateToken`, `optionalAuth`, `authorizeSelf`)

**validation.test.ts:**
- Валидация через `validate` middleware
- Различные схемы валидации (`registerSchema`, `loginSchema`, `createSkillSchema`, `updateUserSchema`)
- Обработка валидных и невалидных данных

### API маршруты

**auth.test.ts:**
- POST /api/auth/login - вход пользователя
- GET /api/auth/me - получение текущего пользователя
- POST /api/auth/refresh - обновление токена
- POST /api/auth/logout - выход пользователя

**users.test.ts:**
- GET /api/users - список пользователей
- GET /api/users/:id - получение пользователя
- PUT /api/users/:id - обновление пользователя
- DELETE /api/users/:id - удаление пользователя

**skills.test.ts:**
- GET /api/skills - список навыков
- GET /api/skills/:id - получение навыка
- POST /api/skills - создание навыка
- PUT /api/skills/:id - обновление навыка
- DELETE /api/skills/:id - удаление навыка
- Проверка существования subcategoryId при создании навыка

**categories.test.ts:**
- GET /api/categories - список категорий
- GET /api/categories/:id - получение категории
- POST /api/categories - создание категории
- PUT /api/categories/:id - обновление категории
- DELETE /api/categories/:id - удаление категории

**subcategories.test.ts:**
- GET /api/subcategories - список подкатегорий
- GET /api/subcategories/:id - получение подкатегории
- POST /api/subcategories - создание подкатегории
- PUT /api/subcategories/:id - обновление подкатегории
- DELETE /api/subcategories/:id - удаление подкатегории
- Проверка существования categoryId при создании подкатегории

**cities.test.ts:**
- GET /api/cities - список городов
- GET /api/cities/:id - получение города
- POST /api/cities - создание города
- PUT /api/cities/:id - обновление города
- DELETE /api/cities/:id - удаление города

**likes.test.ts:**
- POST /api/likes/users-info - получение информации о лайках пользователей
- GET /api/likes/users-info/:userId - получение информации о лайках конкретного пользователя
- POST /api/likes - создание лайка
- DELETE /api/likes/:id - удаление лайка по ID
- DELETE /api/likes?toUserId=:userId - удаление всех лайков пользователя
- Проверка существования toUserId при создании лайка

**index.test.ts:**
- GET / - информация об API
- GET /api - информация об API
- GET /api/ - информация об API
- GET /api/health - проверка здоровья сервера

**register.test.ts (интеграционные тесты):**
- Успешная регистрация с полными данными
- Успешная регистрация с минимальными данными
- Валидация обязательных полей (email, password, firstName, lastName, dateOfBirth, gender, cityId)
- Валидация длины пароля (минимум 6 символов)
- Обязательность аватара
- Проверка дубликатов email
- Валидация типа файла аватара
- Проверка существования cityId при регистрации

## Примечания

- **Интеграционные тесты** (register.test.ts, routes/*) требуют запущенного API сервера
- **Unit тесты** (utils/*) не требуют запущенного сервера
- Каждый тест использует уникальные данные для избежания конфликтов
- Тестовое изображение создается один раз и используется во всех тестах регистрации
- После тестов тестовое изображение можно удалить вручную
- Тесты используют таймаут 30 секунд для HTTP запросов
- Тесты запускаются последовательно (maxWorkers: 1) для избежания проблем с axios и циклическими структурами

## Известные проблемы и решения

### Ошибка "AggregateError: Error" при запуске интеграционных тестов

**Симптомы:** Все интеграционные тесты падают с ошибкой:
```
AggregateError: Error
at RedirectableRequest.handleRequestError
at ClientRequest.eventHandlers.<computed>
```

**Причина:** API сервер не запущен или недоступен.

**Решение:**
1. Запустите сервер в отдельном терминале:
```bash
npm run build
npm start
# или через PM2
pm2 start ecosystem.config.cjs
```

2. Проверьте доступность сервера:
```bash
curl http://localhost:3001/api/health
# Должен вернуть: {"status":"ok"}
```

3. Если используете удаленный сервер:
```bash
export API_URL=http://XXX.XXX.XXX.XXX:3001
curl $API_URL/api/health
```

4. Запустите только unit тесты (не требуют сервера):
```bash
npm run test:utils
```

### Ошибка "Converting circular structure to JSON" в routes тестах

Если вы видите ошибку:
```
TypeError: Converting circular structure to JSON
```

**Решение:** Это связано с тем, что axios создает циклические структуры при использовании в Jest workers. В `jest.config.js` установлено `maxWorkers: 1`, что запускает тесты последовательно. Это может замедлить выполнение, но обеспечивает стабильность.

## Примеры использования

### Запуск всех тестов
```bash
npm test
```

**Важно:** Для интеграционных тестов (routes/*, register.test.ts) API сервер должен быть запущен.

### Запуск только unit тестов (быстро, без сервера)
```bash
npm run test:utils
```

Эти тесты не требуют запущенного сервера и проверяют утилиты (auth, validation).

### Запуск тестов с покрытием кода
```bash
npm run test:coverage
```

Результаты будут сохранены в папке `coverage/`.

### Запуск тестов в режиме наблюдения
```bash
npm run test:watch
```

Тесты будут автоматически перезапускаться при изменении файлов.

### Настройка адреса сервера

Адрес сервера настраивается в файле `.env` в корне проекта:
```bash
API_URL=http://XXX.XXX.XXX.XXX:3001
```

Тесты автоматически загружают эту переменную. При запуске тестов вы увидите:
```
[Tests] Используется API URL: http://XXX.XXX.XXX.XXX:3001
```

Если нужно временно использовать другой адрес:
```bash
API_URL=http://other-server:3001 npm test
```

### Подготовка перед запуском интеграционных тестов

1. **Создайте тестовое изображение:**
```bash
npm run test:create-image
```

2. **Убедитесь, что API сервер запущен:**
```bash
# На сервере
npm run build
npm start
# или через PM2
pm2 start ecosystem.config.cjs
```

3. **Запустите тесты:**
```bash
npm run test:register
# или
npm run test:routes
```

