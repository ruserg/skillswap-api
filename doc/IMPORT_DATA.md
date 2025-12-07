# Импорт данных в базу данных

База данных SkillSwap API использует JSON файлы, хранящиеся в папке `public/db/`.

## Структура базы данных

Файлы базы данных:
- `users.json` - пользователи
- `skills.json` - навыки/объявления
- `categories.json` - категории
- `subcategories.json` - подкатегории
- `cities.json` - города
- `likes.json` - лайки

## Инициализация базы данных

Создать пустые файлы базы данных:

```bash
npm run init-db
```

Это создаст все необходимые JSON файлы с пустыми массивами в папке `public/db/`.

## Импорт данных из JSON файла

### Способ 1: Через npm скрипт

```bash
npm run import -- <путь_к_json_файлу> <имя_файла_в_бд>
```

**Примеры:**

```bash
# Импорт пользователей
npm run import -- ./data/users.json users.json

# Импорт навыков
npm run import -- ./data/skills.json skills.json

# Импорт категорий
npm run import -- ./data/categories.json categories.json

# Импорт подкатегорий
npm run import -- ./data/subcategories.json subcategories.json

# Импорт городов
npm run import -- ./data/cities.json cities.json

# Импорт лайков
npm run import -- ./data/likes.json likes.json
```

### Способ 2: Прямое копирование файлов

Вы можете напрямую скопировать JSON файлы в папку `public/db/`:

```bash
# Создайте папку, если её нет
mkdir -p public/db

# Скопируйте файлы
cp ./data/users.json public/db/users.json
cp ./data/skills.json public/db/skills.json
# и т.д.
```

### Способ 3: Ручное редактирование

Отредактируйте файлы напрямую в папке `public/db/`:

```bash
nano public/db/users.json
# или
code public/db/users.json
```

## Формат данных

### users.json
```json
[
  {
    "id": 1,
    "email": "ivan@example.com",
    "password": "$2b$10$abcdefghijklmnopqrstuvwxyz1234567890",
    "name": "Иван Иванов",
    "firstName": "Иван",
    "lastName": "Иванов",
    "dateOfBirth": "1990-01-01",
    "gender": "M",
    "cityId": 1,
    "avatarUrl": "http://your-server.com/uploads/avatars/avatar-1234567890.jpg",
    "dateOfRegistration": "2024-01-01T00:00:00.000Z",
    "lastLoginDatetime": "2024-01-15T10:30:00.000Z"
  }
]
```

**Важно:** Все поля обязательны. При ручном создании пользователей пароль должен быть хеширован с помощью bcrypt.

### skills.json
```json
[
  {
    "id": 1,
    "userId": 1,
    "subcategoryId": 1,
    "title": "Уроки программирования",
    "description": "Обучаю JavaScript",
    "type_of_proposal": "offer",
    "modified_datetime": "2024-01-15T10:30:00.000Z",
    "images": []
  }
]
```

### categories.json
```json
[
  {
    "id": 1,
    "name": "Образование"
  }
]
```

### subcategories.json
```json
[
  {
    "id": 1,
    "categoryId": 1,
    "name": "Программирование"
  }
]
```

### cities.json
```json
[
  {
    "id": 1,
    "name": "Москва"
  }
]
```

### likes.json
```json
[
  {
    "id": 1,
    "userId": 1,
    "skillId": 1
  }
]
```

## Важные замечания

1. **Формат файлов**: Все файлы должны содержать валидный JSON массив `[]`
2. **ID**: Убедитесь, что ID уникальны для каждого типа данных
3. **Связи**: При импорте данных проверьте связи между таблицами:
   - `skills.userId` должен существовать в `users`
   - `skills.subcategoryId` должен существовать в `subcategories`
   - `subcategories.categoryId` должен существовать в `categories`
   - `likes.userId` и `likes.skillId` должны существовать

## Проверка данных

После импорта проверьте данные через API:

```bash
# Проверка пользователей
curl http://localhost:3001/api/users

# Проверка навыков
curl http://localhost:3001/api/skills

# Проверка категорий
curl http://localhost:3001/api/categories
```

## На сервере

После деплоя на сервер, данные находятся в:
- Локально: `public/db/`
- На сервере: `public/db/` (или путь, указанный в переменной окружения `DB_PATH`)

Для импорта на сервере:

```bash
# Подключитесь к серверу
ssh user@server

# Перейдите в директорию проекта
cd /path/to/your/project

# Импортируйте данные
npm run import -- /path/to/data.json users.json
```

