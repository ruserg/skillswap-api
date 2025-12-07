# Авторизация в SkillSwap API

API использует JWT (JSON Web Tokens) для аутентификации пользователей с системой **Access** и **Refresh** токенов.

## Установка зависимостей

```bash
npm install
```

Это установит:
- `jsonwebtoken` - для создания и проверки JWT токенов
- `bcrypt` - для хеширования паролей

## Эндпоинты авторизации

### POST /api/auth/register - Регистрация

Регистрирует нового пользователя с обязательной загрузкой аватара.

**Content-Type:** `multipart/form-data`

**Все поля обязательны:**
- `email` (string) - Email пользователя
- `password` (string) - Пароль (минимум 6 символов)
- `name` (string) - Имя пользователя
- `firstName` (string) - Имя
- `lastName` (string) - Фамилия
- `dateOfBirth` (string) - Дата рождения (формат: "YYYY-MM-DD")
- `gender` (string) - Пол ("M" или "F")
- `cityId` (number) - ID города (передается как строка в FormData)
- `avatar` (File) - Файл аватара (обязательный)

**Требования к файлу аватара:**
- Тип: `image/jpeg`, `image/png`, `image/webp`
- Максимальный размер: 5MB
- Минимальные размеры: 200x200px
- Рекомендуемые размеры: 400x400px

**Ответ:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Иван Иванов",
    "avatarUrl": "http://your-server.com/uploads/avatars/avatar-1234567890.jpg",
    "dateOfRegistration": "2024-01-01T00:00:00.000Z",
    "lastLoginDatetime": "2024-01-01T00:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Важно:** Теперь возвращаются два токена:
- `accessToken` - для доступа к API (короткое время жизни, ~15 минут)
- `refreshToken` - для обновления access токена (длинное время жизни, ~30 дней)

**Обработка аватара:**

1. **Валидация:**
   - Проверка типа файла (MIME type) - только `image/jpeg`, `image/png`, `image/webp`
   - Проверка размера файла (максимум 5MB)
   - Проверка размеров изображения (минимум 200x200px)

2. **Сохранение:**
   - Оригинальный файл сохраняется в `public/uploads/avatars/`
   - Генерируется уникальное имя файла: `avatar-{timestamp}-{random}.jpg`

3. **Создание миниатюр:**
   - Автоматически создаются миниатюры:
     - 200x200px - `avatar-{timestamp}-{random}-200x200.jpg`
     - 100x100px - `avatar-{timestamp}-{random}-100x100.jpg`
   - Миниатюры сохраняются в формате JPEG с качеством 85%
   - Миниатюры сохраняются в той же директории, что и оригинал

4. **URL:**
   - Возвращается публичный URL оригинального файла в поле `avatarUrl`
   - URL доступен без авторизации для отображения в `<img>`
   - URL формируется на основе `API_URL` или `PUBLIC_URL` из переменных окружения

**Структура директорий:**
```
public/
  uploads/
    avatars/
      avatar-1234567890.jpg          # оригинал
      avatar-1234567890-200x200.jpg  # миниатюра 200x200
      avatar-1234567890-100x100.jpg  # миниатюра 100x100
```

**Безопасность:**
- Проверка MIME-типа файла (не доверяем расширению)
- Ограничение размера файла
- Валидация размеров изображения
- Генерация уникальных имен файлов
- Санитизация имен файлов

**Настройка (переменные окружения):**
```env
# Публичный URL для доступа к файлам (опционально)
PUBLIC_URL=http://localhost:3001
# или
API_URL=http://localhost:3001

# Путь для хранения загруженных файлов (опционально, по умолчанию: public/uploads)
UPLOADS_PATH=/path/to/your/project/public/uploads
```

**Пример (cURL):**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -F "email=user@example.com" \
  -F "password=password123" \
  -F "name=Иван Иванов" \
  -F "firstName=Иван" \
  -F "lastName=Иванов" \
  -F "dateOfBirth=1990-01-01" \
  -F "gender=M" \
  -F "cityId=1" \
  -F "avatar=@/path/to/avatar.jpg"
```

**Пример (JavaScript/FormData):**
```javascript
const formData = new FormData();
formData.append('email', 'user@example.com');
formData.append('password', 'password123');
formData.append('name', 'Иван Иванов');
formData.append('firstName', 'Иван');
formData.append('lastName', 'Иванов');
formData.append('dateOfBirth', '1990-01-01');
formData.append('gender', 'M');
formData.append('cityId', '1');
formData.append('avatar', fileInput.files[0]);

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

fetch(`${API_BASE_URL}/api/auth/register`, {
  method: 'POST',
  body: formData
})
  .then(res => res.json())
  .then(data => console.log(data));
```

**Ошибки:**
- `400 Bad Request` - Аватар обязателен для загрузки
- `400 Bad Request` - Неподдерживаемый тип файла
- `400 Bad Request` - Файл слишком большой (максимум 5MB)
- `400 Bad Request` - Минимальный размер изображения: 200x200px
- `400 Bad Request` - Все поля обязательны
- `400 Bad Request` - Пароль должен быть не менее 6 символов
- `400 Bad Request` - Пользователь с таким email уже существует
- `400 Bad Request` - Город с ID X не найден

**Примечание:** В примерах используется `localhost:3001` для разработки. В production используйте переменную окружения `API_URL` или реальный URL сервера.

### POST /api/auth/login - Вход

Авторизует существующего пользователя.

**Запрос:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Ответ:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Иван Иванов",
    "dateOfRegistration": "2024-01-01T00:00:00.000Z",
    "lastLoginDatetime": "2024-01-01T00:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Важно:** Теперь возвращаются два токена:
- `accessToken` - для доступа к API (короткое время жизни, ~15 минут)
- `refreshToken` - для обновления access токена (длинное время жизни, ~30 дней)

**Пример:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### GET /api/auth/me - Информация о текущем пользователе

Возвращает информацию о текущем авторизованном пользователе.

**Требует авторизации:** Да

**Заголовок:**
```
Authorization: Bearer <accessToken>
```

**Ответ:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "Иван Иванов",
  "dateOfRegistration": "2024-01-01T00:00:00.000Z",
  "lastLoginDatetime": "2024-01-01T00:00:00.000Z"
}
```

**Пример:**
```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer <accessToken>"
```

### POST /api/auth/refresh - Обновить access токен

Обновляет access токен используя refresh токен. Это позволяет пользователю оставаться авторизованным без повторного входа.

**Запрос:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Ответ:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Пример:**
```bash
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refreshToken>"}'
```

### POST /api/auth/logout - Выход

Отзывает refresh токен и завершает сессию пользователя.

**Требует авторизации:** Да

**Запрос:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Ответ:**
```json
{
  "message": "Выход выполнен успешно"
}
```

**Пример:**
```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refreshToken>"}'
```

## Использование токенов

### Access Token (токен доступа)

После регистрации или входа вы получите `accessToken`. Используйте его в заголовке `Authorization` для доступа к защищенным эндпоинтам:

```
Authorization: Bearer <accessToken>
```

**Время жизни:** ~15 минут (настраивается через `JWT_EXPIRES_IN`)

### Refresh Token (токен обновления)

`refreshToken` используется для получения нового `accessToken` без повторного входа.

**Время жизни:** ~30 дней (настраивается через `JWT_REFRESH_EXPIRES_IN`)

**Как использовать:**
1. Когда `accessToken` истекает, используйте `refreshToken` для получения нового
2. Отправьте запрос на `/api/auth/refresh` с `refreshToken`
3. Получите новый `accessToken` и продолжайте работу

**Безопасность:**
- Храните `refreshToken` безопасно (httpOnly cookies, secure storage)
- Не передавайте `refreshToken` в каждом запросе
- Используйте только для обновления `accessToken`

### Пример использования в JavaScript (fetch):

```javascript
// Сохраните токены после логина
let accessToken = "ваш_accessToken";
let refreshToken = "ваш_refreshToken";

// Использование access токена
async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  // Если токен истек, обновляем его
  if (response.status === 403) {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      // Повторяем запрос с новым токеном
      return fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${newAccessToken}`,
          ...options.headers,
        },
      });
    }
  }

  return response;
}

// Обновление access токена
async function refreshAccessToken() {
  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (response.ok) {
    const data = await response.json();
    accessToken = data.accessToken;
    return accessToken;
  }

  // Если refresh токен тоже истек, нужно залогиниться заново
  return null;
}

// Использование
makeRequest(`${API_BASE_URL}/api/skills`, {
  method: "POST",
  body: JSON.stringify({
    title: "Уроки программирования",
    description: "Обучаю JavaScript",
    subcategoryId: 1,
    type_of_proposal: "offer"
  }),
});
```

## Защищенные эндпоинты

Следующие эндпоинты требуют авторизации (токен в заголовке `Authorization`):

### Users
- `PUT /api/users/:id` - обновить пользователя (только свои данные)
- `DELETE /api/users/:id` - удалить пользователя (только свои данные)

### Skills
- `POST /api/skills` - создать новый навык
- `PUT /api/skills/:id` - обновить навык
- `DELETE /api/skills/:id` - удалить навык

### Likes
- `POST /api/likes` - создать новый лайк
- `DELETE /api/likes/:id` - удалить лайк
- `DELETE /api/likes?skillId=1` - удалить лайк по skillId

### Auth
- `GET /api/auth/me` - получить информацию о текущем пользователе

## Публичные эндпоинты

Следующие эндпоинты не требуют авторизации:

- `GET /api/users` - получить всех пользователей
- `GET /api/users/:id` - получить пользователя по ID
- `GET /api/skills` - получить все навыки
- `GET /api/skills/:id` - получить навык по ID
- `GET /api/categories` - получить все категории
- `GET /api/categories/:id` - получить категорию по ID
- `GET /api/subcategories` - получить все подкатегории
- `GET /api/subcategories/:id` - получить подкатегорию по ID
- `GET /api/cities` - получить все города
- `GET /api/cities/:id` - получить город по ID
- `GET /api/likes` - получить все лайки
- `GET /api/likes/:id` - получить лайк по ID
- `POST /api/auth/register` - регистрация
- `POST /api/auth/login` - вход

## Настройка

### Переменные окружения

Для production рекомендуется установить следующие переменные окружения:

```bash
JWT_SECRET=your-very-secret-key-change-this-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-this-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
```

**Важно: Разница между переменными**

#### JWT_SECRET (секретный ключ для access токенов)
- **Что это:** Секретный ключ для подписи и проверки access токенов
- **Когда менять:** Только один раз при настройке, или если был скомпрометирован
- **Пример:** `JWT_SECRET=my-super-secret-key-12345`

#### JWT_REFRESH_SECRET (секретный ключ для refresh токенов)
- **Что это:** Секретный ключ для подписи и проверки refresh токенов
- **Когда менять:** Только один раз при настройке, или если был скомпрометирован
- **Важно:** Должен отличаться от `JWT_SECRET`!
- **Пример:** `JWT_REFRESH_SECRET=my-refresh-secret-key-67890`

#### JWT_EXPIRES_IN (время жизни access токена)
- **Что это:** Время, в течение которого access токен действителен
- **Рекомендуемое значение:** `15m` (15 минут) или `1h` (1 час)
- **Как работает:** После истечения используйте refresh токен для получения нового access токена
- **Примеры:** `15m`, `1h`, `30m`

#### JWT_REFRESH_EXPIRES_IN (время жизни refresh токена)
- **Что это:** Время, в течение которого refresh токен действителен
- **Рекомендуемое значение:** `30d` (30 дней) или `7d` (7 дней)
- **Как работает:** После истечения пользователь должен залогиниться заново
- **Примеры:** `30d`, `7d`, `14d`

**По умолчанию:**
- `JWT_SECRET` = "your-secret-key-change-in-production" (ВАЖНО: измените!)
- `JWT_REFRESH_SECRET` = "your-refresh-secret-key-change-in-production" (ВАЖНО: измените!)
- `JWT_EXPIRES_IN` = "15m" (15 минут) - access токен
- `JWT_REFRESH_EXPIRES_IN` = "30d" (30 дней) - refresh токен

### Безопасность

1. **Измените JWT_SECRET** в production окружении (один раз при настройке)
   - Используйте длинный случайный ключ (минимум 32 символа)
   - Никогда не коммитьте его в git
   - Храните в переменных окружения или секретах
2. **JWT_EXPIRES_IN** - настройте время жизни токена по вашим требованиям
   - Короткое время (1-24 часа) = более безопасно, но пользователи чаще логинятся
   - Длинное время (7-30 дней) = удобнее для пользователей, но менее безопасно
3. **Используйте HTTPS** для передачи токенов
4. **Храните токены безопасно** на клиенте (не в localStorage для веб-приложений, лучше в httpOnly cookies)
5. **Пароли хешируются** с помощью bcrypt перед сохранением

### Как это работает на практике

1. **Пользователь логинится** → получает `accessToken` (15 минут) и `refreshToken` (30 дней)
2. **Access токен истекает** через 15 минут → клиент автоматически использует `refreshToken` для получения нового
3. **Refresh токен истекает** через 30 дней → пользователь должен залогиниться заново
4. **При выходе** (`/api/auth/logout`) refresh токен отзывается

**Преимущества:**
- Пользователь не замечает истечения access токена (автоматическое обновление)
- Более безопасно (access токен живет короткое время)
- Можно отозвать refresh токен при выходе
- Не нужно логиниться каждые 15 минут

## Структура пользователя

После регистрации пользователь сохраняется в `users.json` со следующей структурой:

```json
{
  "id": 1,
  "email": "user@example.com",
  "password": "$2b$10$...", // Хешированный пароль
  "name": "Иван Иванов",
  "firstName": "Иван",
  "lastName": "Иванов",
  "dateOfBirth": "1990-01-01",
  "gender": "M",
  "cityId": 1,
  "avatarUrl": "http://your-server.com/uploads/avatars/avatar-1234567890.jpg",
  "dateOfRegistration": "2024-01-01T00:00:00.000Z",
  "lastLoginDatetime": "2024-01-01T00:00:00.000Z"
}
```

**Важно:** 
- Все поля обязательны при регистрации
- Пароль всегда хешируется с помощью bcrypt перед сохранением
- Пароль никогда не возвращается в ответах API

## Обработка ошибок

### 401 Unauthorized
Токен не предоставлен или недействителен:
```json
{
  "error": "Токен доступа не предоставлен"
}
```
или
```json
{
  "error": "Недействительный или истекший токен"
}
```

### 403 Forbidden
Нет доступа к ресурсу:
```json
{
  "error": "Нет доступа к этому ресурсу"
}
```

### 400 Bad Request
Ошибка валидации:
```json
{
  "error": "Email и пароль обязательны"
}
```

## Тесты

Все эндпоинты авторизации покрыты тестами. См. [TESTS.md](./TESTS.md) для подробной информации.

**Тесты авторизации:**
- `tests/routes/auth.test.ts` - тесты эндпоинтов `/api/auth/login`, `/api/auth/me`, `/api/auth/refresh`, `/api/auth/logout`
- `tests/utils/auth.test.ts` - тесты утилит (хеширование паролей, генерация токенов, middleware аутентификации)
- `tests/register.test.ts` - тесты регистрации с загрузкой аватара, проверка существования cityId

Запуск тестов:
```bash
npm run test:routes  # Тесты API маршрутов (требуют запущенного сервера)
npm run test:utils   # Тесты утилит (не требуют сервера)
npm run test:register # Тесты регистрации (требуют запущенного сервера)
```

