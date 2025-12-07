# Документация для фронтенда (React + RTK)

Документация по интеграции SkillSwap API в React приложение с использованием Redux Toolkit (RTK).

## Базовый URL

Для разработки используйте `http://localhost:3001`, для production - URL вашего сервера.

**Рекомендуется:** Использовать переменную окружения:
```typescript
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
```

## Быстрый старт

### 1. Установка зависимостей

```bash
npm install @reduxjs/toolkit react-redux
```

### 2. Настройка базового URL

Создайте файл `src/config/api.ts`:

```typescript
// Используйте переменную окружения для production
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
```

### 3. Настройка RTK Query

Создайте файл `src/store/api.ts`:

```typescript
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Используйте переменную окружения для production
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Функция для получения токена из localStorage
const getToken = () => {
  return localStorage.getItem('accessToken') || '';
};

// Базовый запрос с авторизацией
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers) => {
      const token = getToken();
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['User', 'Skill', 'Category', 'Subcategory', 'City', 'Like'],
  endpoints: (builder) => ({}),
});
```

## Авторизация

### Типы для авторизации

```typescript
// src/types/auth.ts
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "M" | "F";
  cityId: number;
  avatarUrl: string;
  dateOfRegistration: string;
  lastLoginDatetime: string;
  likesCount?: number; // Динамическое поле
  isLikedByCurrentUser?: boolean; // Динамическое поле
}
```

### Эндпоинты авторизации

```typescript
// src/store/api.ts - добавьте в endpoints

authApi: builder.mutation<AuthResponse, FormData>({
  query: (formData) => ({
    url: '/api/auth/register',
    method: 'POST',
    body: formData,
    // Не устанавливаем Content-Type - браузер установит автоматически с boundary для multipart/form-data
  }),
}),

loginApi: builder.mutation<AuthResponse, LoginRequest>({
  query: (body) => ({
    url: '/api/auth/login',
    method: 'POST',
    body,
  }),
}),

refreshTokenApi: builder.mutation<{ accessToken: string }, { refreshToken: string }>({
  query: (body) => ({
    url: '/api/auth/refresh',
    method: 'POST',
    body,
  }),
}),

getMeApi: builder.query<User, void>({
  query: () => '/api/auth/me',
  providesTags: ['User'],
}),

logoutApi: builder.mutation<{ message: string }, { refreshToken: string }>({
  query: (body) => ({
    url: '/api/auth/logout',
    method: 'POST',
    body,
  }),
}),
```

### Использование авторизации

```typescript
// src/components/Login.tsx
import { useLoginApiMutation } from '../store/api';
import { useState } from 'react';

export const Login = () => {
  const [login, { isLoading, error }] = useLoginApiMutation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await login({ email, password }).unwrap();
      
      // Сохраняем токены
      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);
      
      // Перенаправляем на главную
      window.location.href = '/';
    } catch (err) {
      console.error('Ошибка входа:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Вход...' : 'Войти'}
      </button>
      {error && <div>Ошибка: {JSON.stringify(error)}</div>}
    </form>
  );
};
```

### Автоматическое обновление токена

Создайте middleware для автоматического обновления токена:

```typescript
// src/store/middleware.ts
import { Middleware } from '@reduxjs/toolkit';
import { isRejectedWithValue } from '@reduxjs/toolkit';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';

export const tokenRefreshMiddleware: Middleware = (api) => (next) => async (action) => {
  if (isRejectedWithValue(action)) {
    const error = action.payload as FetchBaseQueryError;
    
    // Если токен истек (403), пытаемся обновить
    if (error.status === 403) {
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (refreshToken) {
        try {
          const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
          const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
          
          if (response.ok) {
            const data = await response.json();
            localStorage.setItem('accessToken', data.accessToken);
            // Повторяем оригинальный запрос
            return next(action);
          } else {
            // Refresh токен тоже истек - редирект на логин
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
          }
        } catch (err) {
          console.error('Ошибка обновления токена:', err);
        }
      }
    }
  }
  
  return next(action);
};
```

## Эндпоинты API

### Users (Пользователи)

#### Типы

```typescript
// src/types/user.ts
export interface User {
  id: number;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "M" | "F";
  cityId: number;
  avatarUrl: string;
  dateOfRegistration: string;
  lastLoginDatetime: string;
  likesCount?: number; // Динамическое поле
  isLikedByCurrentUser?: boolean; // Динамическое поле
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "M" | "F";
  cityId: number;
  avatar: File; // Файл аватара (multipart/form-data)
}

export interface UpdateUserRequest {
  name?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: "M" | "F";
  cityId?: number;
}
```

#### RTK Query эндпоинты

```typescript
// src/store/api.ts

// 🔓 GET /api/users - получить всех пользователей
getUsers: builder.query<User[], void>({
  query: () => '/api/users',
  providesTags: ['User'],
}),

// 🔓 GET /api/users/:id - получить пользователя по ID
getUser: builder.query<User, number>({
  query: (id) => `/api/users/${id}`,
  providesTags: (result, error, id) => [{ type: 'User', id }],
}),

// Примечание: Для создания пользователя используйте POST /api/auth/register
// Этот эндпоинт был удален из соображений безопасности

// [PRIVATE] PUT /api/users/:id - обновить пользователя
updateUser: builder.mutation<User, { id: number; data: UpdateUserRequest }>({
  query: ({ id, data }) => ({
    url: `/api/users/${id}`,
    method: 'PUT',
    body: data,
  }),
  invalidatesTags: (result, error, { id }) => [{ type: 'User', id }],
}),

// [PRIVATE] DELETE /api/users/:id - удалить пользователя
deleteUser: builder.mutation<void, number>({
  query: (id) => ({
    url: `/api/users/${id}`,
    method: 'DELETE',
  }),
  invalidatesTags: ['User'],
}),
```

#### Использование

```typescript
// src/components/UsersList.tsx
import { useGetUsersQuery } from '../store/api';

export const UsersList = () => {
  const { data: users, isLoading, error } = useGetUsersQuery();

  if (isLoading) return <div>Загрузка...</div>;
  if (error) return <div>Ошибка загрузки пользователей</div>;

  return (
    <ul>
      {users?.map((user) => (
        <li key={user.id}>
          {user.name} ({user.email})
        </li>
      ))}
    </ul>
  );
};
```

### Skills (Навыки)

#### Типы

```typescript
// src/types/skill.ts
export interface Skill {
  id: number;
  userId: number;
  subcategoryId: number;
  title: string;
  description: string;
  type_of_proposal: 'offer' | 'request';
  modified_datetime: string;
  images: string[];
}

export interface CreateSkillRequest {
  subcategoryId: number;
  title: string;
  description: string;
  type_of_proposal: 'offer' | 'request';
  images?: string[];
}

export interface UpdateSkillRequest {
  title?: string;
  description?: string;
  subcategoryId?: number;
  type_of_proposal?: 'offer' | 'request';
  images?: string[];
}

export interface SkillsQueryParams {
  userId?: number;
  subcategoryId?: number;
  type_of_proposal?: 'offer' | 'request';
}
```

#### RTK Query эндпоинты

```typescript
// src/store/api.ts

// 🔓 GET /api/skills - получить все навыки
getSkills: builder.query<Skill[], SkillsQueryParams | void>({
  query: (params) => {
    const searchParams = new URLSearchParams();
    if (params?.userId) searchParams.append('userId', params.userId.toString());
    if (params?.subcategoryId) searchParams.append('subcategoryId', params.subcategoryId.toString());
    if (params?.type_of_proposal) searchParams.append('type_of_proposal', params.type_of_proposal);
    
    const query = searchParams.toString();
    return `/api/skills${query ? `?${query}` : ''}`;
  },
  providesTags: ['Skill'],
}),

// 🔓 GET /api/skills/:id - получить навык по ID
getSkill: builder.query<Skill, number>({
  query: (id) => `/api/skills/${id}`,
  providesTags: (result, error, id) => [{ type: 'Skill', id }],
}),

// [PRIVATE] POST /api/skills - создать новый навык
createSkill: builder.mutation<Skill, CreateSkillRequest>({
  query: (body) => ({
    url: '/api/skills',
    method: 'POST',
    body,
  }),
  invalidatesTags: ['Skill'],
}),

// [PRIVATE] PUT /api/skills/:id - обновить навык
updateSkill: builder.mutation<Skill, { id: number; data: UpdateSkillRequest }>({
  query: ({ id, data }) => ({
    url: `/api/skills/${id}`,
    method: 'PUT',
    body: data,
  }),
  invalidatesTags: (result, error, { id }) => [{ type: 'Skill', id }],
}),

// [PRIVATE] DELETE /api/skills/:id - удалить навык
deleteSkill: builder.mutation<void, number>({
  query: (id) => ({
    url: `/api/skills/${id}`,
    method: 'DELETE',
  }),
  invalidatesTags: ['Skill'],
}),
```

#### Использование

```typescript
// src/components/SkillsList.tsx
import { useGetSkillsQuery, useDeleteSkillMutation } from '../store/api';

export const SkillsList = () => {
  const { data: skills, isLoading } = useGetSkillsQuery({ type_of_proposal: 'offer' });
  const [deleteSkill] = useDeleteSkillMutation();

  const handleDelete = async (id: number) => {
    if (confirm('Удалить навык?')) {
      await deleteSkill(id);
    }
  };

  if (isLoading) return <div>Загрузка...</div>;

  return (
    <div>
      {skills?.map((skill) => (
        <div key={skill.id}>
          <h3>{skill.title}</h3>
          <p>{skill.description}</p>
          <button onClick={() => handleDelete(skill.id)}>Удалить</button>
        </div>
      ))}
    </div>
  );
};
```

### Categories (Категории)

#### Типы

```typescript
// src/types/category.ts
export interface Category {
  id: number;
  name: string;
}
```

#### RTK Query эндпоинты

```typescript
// src/store/api.ts

// 🔓 GET /api/categories - получить все категории
getCategories: builder.query<Category[], void>({
  query: () => '/api/categories',
  providesTags: ['Category'],
}),

// 🔓 GET /api/categories/:id - получить категорию по ID
getCategory: builder.query<Category, number>({
  query: (id) => `/api/categories/${id}`,
  providesTags: (result, error, id) => [{ type: 'Category', id }],
}),

// [PRIVATE] POST /api/categories - создать новую категорию
createCategory: builder.mutation<Category, { name: string }>({
  query: (body) => ({
    url: '/api/categories',
    method: 'POST',
    body,
  }),
  invalidatesTags: ['Category'],
}),

// [PRIVATE] PUT /api/categories/:id - обновить категорию
updateCategory: builder.mutation<Category, { id: number; name: string }>({
  query: ({ id, name }) => ({
    url: `/api/categories/${id}`,
    method: 'PUT',
    body: { name },
  }),
  invalidatesTags: (result, error, { id }) => [{ type: 'Category', id }],
}),

// [PRIVATE] DELETE /api/categories/:id - удалить категорию
deleteCategory: builder.mutation<void, number>({
  query: (id) => ({
    url: `/api/categories/${id}`,
    method: 'DELETE',
  }),
  invalidatesTags: ['Category'],
}),
```

### Subcategories (Подкатегории)

#### Типы

```typescript
// src/types/subcategory.ts
export interface Subcategory {
  id: number;
  categoryId: number;
  name: string;
}
```

#### RTK Query эндпоинты

```typescript
// src/store/api.ts

// 🔓 GET /api/subcategories - получить все подкатегории
getSubcategories: builder.query<Subcategory[], { categoryId?: number } | void>({
  query: (params) => {
    if (params?.categoryId) {
      return `/api/subcategories?categoryId=${params.categoryId}`;
    }
    return '/api/subcategories';
  },
  providesTags: ['Subcategory'],
}),

// 🔓 GET /api/subcategories/:id - получить подкатегорию по ID
getSubcategory: builder.query<Subcategory, number>({
  query: (id) => `/api/subcategories/${id}`,
  providesTags: (result, error, id) => [{ type: 'Subcategory', id }],
}),

// [PRIVATE] POST /api/subcategories - создать новую подкатегорию
createSubcategory: builder.mutation<Subcategory, { categoryId: number; name: string }>({
  query: (body) => ({
    url: '/api/subcategories',
    method: 'POST',
    body,
  }),
  invalidatesTags: ['Subcategory'],
}),

// [PRIVATE] PUT /api/subcategories/:id - обновить подкатегорию
updateSubcategory: builder.mutation<Subcategory, { id: number; categoryId: number; name: string }>({
  query: ({ id, ...body }) => ({
    url: `/api/subcategories/${id}`,
    method: 'PUT',
    body,
  }),
  invalidatesTags: (result, error, { id }) => [{ type: 'Subcategory', id }],
}),

// [PRIVATE] DELETE /api/subcategories/:id - удалить подкатегорию
deleteSubcategory: builder.mutation<void, number>({
  query: (id) => ({
    url: `/api/subcategories/${id}`,
    method: 'DELETE',
  }),
  invalidatesTags: ['Subcategory'],
}),
```

### Cities (Города)

#### Типы

```typescript
// src/types/city.ts
export interface City {
  id: number;
  name: string;
}
```

#### RTK Query эндпоинты

```typescript
// src/store/api.ts

// 🔓 GET /api/cities - получить все города
getCities: builder.query<City[], void>({
  query: () => '/api/cities',
  providesTags: ['City'],
}),

// 🔓 GET /api/cities/:id - получить город по ID
getCity: builder.query<City, number>({
  query: (id) => `/api/cities/${id}`,
  providesTags: (result, error, id) => [{ type: 'City', id }],
}),

// [PRIVATE] POST /api/cities - создать новый город
createCity: builder.mutation<City, { name: string }>({
  query: (body) => ({
    url: '/api/cities',
    method: 'POST',
    body,
  }),
  invalidatesTags: ['City'],
}),

// [PRIVATE] PUT /api/cities/:id - обновить город
updateCity: builder.mutation<City, { id: number; name: string }>({
  query: ({ id, name }) => ({
    url: `/api/cities/${id}`,
    method: 'PUT',
    body: { name },
  }),
  invalidatesTags: (result, error, { id }) => [{ type: 'City', id }],
}),

// [PRIVATE] DELETE /api/cities/:id - удалить город
deleteCity: builder.mutation<void, number>({
  query: (id) => ({
    url: `/api/cities/${id}`,
    method: 'DELETE',
  }),
  invalidatesTags: ['City'],
}),
```

### Likes (Лайки)

#### Типы

```typescript
// src/types/like.ts
export interface Like {
  id: number;
  userId: number;
  skillId: number;
}

export interface CreateLikeRequest {
  skillId: number;
}
```

#### RTK Query эндпоинты

```typescript
// src/store/api.ts

// 🔓 GET /api/likes - получить все лайки
getLikes: builder.query<Like[], { userId?: number; skillId?: number } | void>({
  query: (params) => {
    const searchParams = new URLSearchParams();
    if (params?.userId) searchParams.append('userId', params.userId.toString());
    if (params?.skillId) searchParams.append('skillId', params.skillId.toString());
    
    const query = searchParams.toString();
    return `/api/likes${query ? `?${query}` : ''}`;
  },
  providesTags: ['Like'],
}),

// 🔓 GET /api/likes/:id - получить лайк по ID
getLike: builder.query<Like, number>({
  query: (id) => `/api/likes/${id}`,
  providesTags: (result, error, id) => [{ type: 'Like', id }],
}),

// [PRIVATE] POST /api/likes - создать новый лайк
createLike: builder.mutation<Like, CreateLikeRequest>({
  query: (body) => ({
    url: '/api/likes',
    method: 'POST',
    body,
  }),
  invalidatesTags: ['Like'],
}),

// [PRIVATE] DELETE /api/likes/:id - удалить лайк по ID
deleteLike: builder.mutation<void, number>({
  query: (id) => ({
    url: `/api/likes/${id}`,
    method: 'DELETE',
  }),
  invalidatesTags: ['Like'],
}),

// [PRIVATE] DELETE /api/likes?skillId=:skillId - удалить лайк по skillId
deleteLikeBySkillId: builder.mutation<void, number>({
  query: (skillId) => ({
    url: `/api/likes?skillId=${skillId}`,
    method: 'DELETE',
  }),
  invalidatesTags: ['Like'],
}),
```

#### Использование

```typescript
// src/components/LikeButton.tsx
import { useCreateLikeMutation, useDeleteLikeBySkillIdMutation, useGetLikesQuery } from '../store/api';
import { useSelector } from 'react-redux';

export const LikeButton = ({ skillId }: { skillId: number }) => {
  const userId = useSelector((state: any) => state.auth.user?.id);
  const { data: likes } = useGetLikesQuery({ skillId });
  const [createLike] = useCreateLikeMutation();
  const [deleteLike] = useDeleteLikeBySkillIdMutation();

  const isLiked = likes?.some(like => like.userId === userId);

  const handleToggle = async () => {
    if (isLiked) {
      await deleteLike(skillId);
    } else {
      await createLike({ skillId });
    }
  };

  return (
    <button onClick={handleToggle}>
      {isLiked ? 'Liked' : 'Not liked'} {likes?.length || 0}
    </button>
  );
};
```

## Полный пример настройки store

```typescript
// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { api } from './api';
import { tokenRefreshMiddleware } from './middleware';

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware).concat(tokenRefreshMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

```typescript
// src/main.tsx или src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);
```

## Обработка ошибок

### Типы ошибок

```typescript
// src/types/error.ts
export interface ApiError {
  error: string;
  status?: number;
}
```

### Хук для обработки ошибок

```typescript
// src/hooks/useApiError.ts
import { SerializedError } from '@reduxjs/toolkit';
import { FetchBaseQueryError } from '@reduxjs/toolkit/query';

export const useApiError = () => {
  const getErrorMessage = (error: FetchBaseQueryError | SerializedError | undefined): string => {
    if (!error) return 'Неизвестная ошибка';
    
    if ('status' in error) {
      if (error.status === 401) return 'Не авторизован';
      if (error.status === 403) return 'Доступ запрещен';
      if (error.status === 404) return 'Ресурс не найден';
      if (error.status === 500) return 'Ошибка сервера';
      
      if ('data' in error && typeof error.data === 'object' && error.data !== null) {
        const apiError = error.data as ApiError;
        return apiError.error || 'Ошибка запроса';
      }
    }
    
    if ('message' in error) {
      return error.message || 'Ошибка запроса';
    }
    
    return 'Неизвестная ошибка';
  };

  return { getErrorMessage };
};
```

### Использование

```typescript
// src/components/Example.tsx
import { useGetSkillsQuery } from '../store/api';
import { useApiError } from '../hooks/useApiError';

export const Example = () => {
  const { data, error, isLoading } = useGetSkillsQuery();
  const { getErrorMessage } = useApiError();

  if (isLoading) return <div>Загрузка...</div>;
  if (error) return <div>Ошибка: {getErrorMessage(error)}</div>;

  return <div>{/* ... */}</div>;
};
```

## Health Check

```typescript
// src/store/api.ts

healthCheck: builder.query<{ status: string; message: string }, void>({
  query: () => '/api/health',
}),
```

## Полезные хуки

### Хук для проверки авторизации

```typescript
// src/hooks/useAuth.ts
import { useSelector } from 'react-redux';
import { useGetMeApiQuery } from '../store/api';

export const useAuth = () => {
  const accessToken = localStorage.getItem('accessToken');
  const { data: user, isLoading } = useGetMeApiQuery(undefined, {
    skip: !accessToken,
  });

  return {
    isAuthenticated: !!accessToken && !!user,
    user,
    isLoading,
  };
};
```

### Хук для работы с токенами

```typescript
// src/hooks/useTokens.ts
export const useTokens = () => {
  const getAccessToken = () => localStorage.getItem('accessToken');
  const getRefreshToken = () => localStorage.getItem('refreshToken');
  
  const setTokens = (accessToken: string, refreshToken: string) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  };
  
  const clearTokens = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  return { getAccessToken, getRefreshToken, setTokens, clearTokens };
};
```

## Примеры использования

### Регистрация и вход

```typescript
// src/components/Auth.tsx
import { useState } from 'react';
import { useRegisterApiMutation, useLoginApiMutation } from '../store/api';
import { useTokens } from '../hooks/useTokens';

export const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  const [register, { isLoading: isRegistering }] = useRegisterApiMutation();
  const [login, { isLoading: isLoggingIn }] = useLoginApiMutation();
  const { setTokens } = useTokens();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let result;
      if (isLogin) {
        result = await login({ email, password }).unwrap();
      } else {
        result = await register({ email, password, name }).unwrap();
      }
      
      setTokens(result.accessToken, result.refreshToken);
      window.location.href = '/';
    } catch (error) {
      console.error('Ошибка:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {!isLogin && (
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Имя"
          required
        />
      )}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit" disabled={isRegistering || isLoggingIn}>
        {isLogin ? 'Войти' : 'Зарегистрироваться'}
      </button>
      <button type="button" onClick={() => setIsLogin(!isLogin)}>
        {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
      </button>
    </form>
  );
};
```

## Важные замечания

1. **Токены**: Храните `accessToken` и `refreshToken` в `localStorage` или `sessionStorage`
2. **Автоматическое обновление**: Реализуйте middleware для автоматического обновления токена при истечении
3. **Обработка ошибок**: Всегда обрабатывайте ошибки запросов
4. **Типы**: Используйте TypeScript для типобезопасности
5. **Кеширование**: RTK Query автоматически кеширует запросы, используйте `invalidatesTags` для обновления кеша

## Дополнительные ресурсы

- [Redux Toolkit Query документация](https://redux-toolkit.js.org/rtk-query/overview)
- [React Redux документация](https://react-redux.js.org/)
- [API документация](./README.md)
- [Документация по авторизации](./AUTH.md)



