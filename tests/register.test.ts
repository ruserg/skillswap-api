import axios, { AxiosError } from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";

// Получаем путь к директории тестов
const testsDir = path.join(process.cwd(), "tests");

// URL API из переменных окружения или fallback для тестов
const API_BASE_URL = process.env.API_URL || process.env.API_BASE_URL || "http://localhost:3001";

// Генерируем уникальный email для тестов
function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `test_${timestamp}_${random}@example.com`;
}

// Получаем путь к тестовому изображению
const TEST_IMAGE_PATH = path.join(testsDir, "test-avatar.jpg");

// Проверяем наличие тестового изображения перед запуском всех тестов
beforeAll(() => {
  if (!fs.existsSync(TEST_IMAGE_PATH)) {
    throw new Error(
      `Тестовое изображение не найдено: ${TEST_IMAGE_PATH}\n` +
      `Создайте его командой: npm run test:create-image`
    );
  }
});

describe("POST /api/auth/register", () => {
  let testEmail: string;

  beforeEach(() => {
    testEmail = generateTestEmail();
  });

  describe("Успешная регистрация", () => {
    it("должен зарегистрировать пользователя с валидными данными", async () => {
      const formData = new FormData();
      formData.append("email", testEmail);
      formData.append("password", "password123");
      formData.append("name", "Тестовый Пользователь");
      formData.append("firstName", "Тестовый");
      formData.append("lastName", "Пользователь");
      formData.append("dateOfBirth", "1990-01-01");
      formData.append("gender", "M");
      formData.append("cityId", "1");

      formData.append("avatar", fs.createReadStream(TEST_IMAGE_PATH), {
        filename: "test-avatar.jpg",
        contentType: "image/jpeg",
      });

      const response = await axios.post(`${API_BASE_URL}/api/auth/register`, formData, {
        headers: formData.getHeaders(),
      });

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty("user");
      expect(response.data).toHaveProperty("accessToken");
      expect(response.data).toHaveProperty("refreshToken");
      expect(response.data.user.email).toBe(testEmail);
      expect(response.data.user.name).toBe("Тестовый Пользователь");
      expect(response.data.user.avatarUrl).toBeDefined();
      // Проверяем, что avatarUrl содержит правильный путь (может быть localhost на сервере или API_URL из .env)
      expect(response.data.user.avatarUrl).toMatch(/\/uploads\/avatars\/avatar-\d+-\d+\.jpg$/);
      
      // Проверяем, что пароль НЕ возвращается в ответе (безопасность)
      expect(response.data.user.password).toBeUndefined();
      
      // Проверяем, что можно войти с этим паролем (значит пароль сохранен в БД)
      const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email: testEmail,
        password: "password123",
      });
      expect(loginResponse.status).toBe(200);
      expect(loginResponse.data).toHaveProperty("accessToken");
    });

    it("должен зарегистрировать пользователя со всеми обязательными полями", async () => {
      const formData = new FormData();
      formData.append("email", testEmail);
      formData.append("password", "password123");
      formData.append("name", "Полный Пользователь");
      formData.append("firstName", "Полный");
      formData.append("lastName", "Пользователь");
      formData.append("dateOfBirth", "1990-01-01");
      formData.append("gender", "M");
      formData.append("cityId", "1");

      formData.append("avatar", fs.createReadStream(TEST_IMAGE_PATH), {
        filename: "test-avatar.jpg",
        contentType: "image/jpeg",
      });

      const response = await axios.post(`${API_BASE_URL}/api/auth/register`, formData, {
        headers: formData.getHeaders(),
      });

      expect(response.status).toBe(201);
      expect(response.data.user.email).toBe(testEmail);
      expect(response.data.user.name).toBe("Полный Пользователь");
      expect(response.data.user.firstName).toBe("Полный");
      expect(response.data.user.lastName).toBe("Пользователь");
      expect(response.data.user.dateOfBirth).toBe("1990-01-01");
      expect(response.data.user.gender).toBe("M");
      expect(response.data.user.cityId).toBe(1);
    });
  });

  describe("Валидация обязательных полей", () => {
    it("должен вернуть ошибку если email отсутствует", async () => {
      const formData = new FormData();
      formData.append("password", "password123");
      formData.append("name", "Тестовый Пользователь");
      formData.append("firstName", "Тестовый");
      formData.append("lastName", "Пользователь");
      formData.append("dateOfBirth", "1990-01-01");
      formData.append("gender", "M");
      formData.append("cityId", "1");

      formData.append("avatar", fs.createReadStream(TEST_IMAGE_PATH));

      try {
        await axios.post(`${API_BASE_URL}/api/auth/register`, formData, {
          headers: formData.getHeaders(),
        });
        expect(true).toBe(false); // Должна была быть ошибка
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(400);
        expect(axiosError.response?.data).toHaveProperty("error");
      }
    });

    it("должен вернуть ошибку если пароль отсутствует", async () => {
      const formData = new FormData();
      formData.append("email", testEmail);
      formData.append("name", "Тестовый Пользователь");
      formData.append("firstName", "Тестовый");
      formData.append("lastName", "Пользователь");
      formData.append("dateOfBirth", "1990-01-01");
      formData.append("gender", "M");
      formData.append("cityId", "1");

      formData.append("avatar", fs.createReadStream(TEST_IMAGE_PATH));

      try {
        await axios.post(`${API_BASE_URL}/api/auth/register`, formData, {
          headers: formData.getHeaders(),
        });
        expect(true).toBe(false); // Должна была быть ошибка
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(400);
        expect(axiosError.response?.data).toHaveProperty("error");
      }
    });

    it("должен вернуть ошибку если name отсутствует", async () => {
      const formData = new FormData();
      formData.append("email", testEmail);
      formData.append("password", "password123");
      formData.append("firstName", "Тестовый");
      formData.append("lastName", "Пользователь");
      formData.append("dateOfBirth", "1990-01-01");
      formData.append("gender", "M");
      formData.append("cityId", "1");

      formData.append("avatar", fs.createReadStream(TEST_IMAGE_PATH));

      try {
        await axios.post(`${API_BASE_URL}/api/auth/register`, formData, {
          headers: formData.getHeaders(),
        });
        expect(true).toBe(false); // Должна была быть ошибка
      } catch (error) {
        const axiosError = error as AxiosError;
        if (!axiosError.response) {
          console.error("Ошибка сети:", axiosError.message);
          throw axiosError;
        }
        expect(axiosError.response.status).toBe(400);
      }
    });

    it("должен вернуть ошибку если firstName отсутствует", async () => {
      const formData = new FormData();
      formData.append("email", testEmail);
      formData.append("password", "password123");
      formData.append("name", "Тестовый Пользователь");
      formData.append("lastName", "Пользователь");
      formData.append("dateOfBirth", "1990-01-01");
      formData.append("gender", "M");
      formData.append("cityId", "1");

      formData.append("avatar", fs.createReadStream(TEST_IMAGE_PATH));

      try {
        await axios.post(`${API_BASE_URL}/api/auth/register`, formData, {
          headers: formData.getHeaders(),
        });
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        if (!axiosError.response) {
          console.error("Ошибка сети:", axiosError.message);
          throw axiosError;
        }
        expect(axiosError.response.status).toBe(400);
      }
    });

    it("должен вернуть ошибку если lastName отсутствует", async () => {
      const formData = new FormData();
      formData.append("email", testEmail);
      formData.append("password", "password123");
      formData.append("name", "Тестовый Пользователь");
      formData.append("firstName", "Тестовый");
      formData.append("dateOfBirth", "1990-01-01");
      formData.append("gender", "M");
      formData.append("cityId", "1");

      formData.append("avatar", fs.createReadStream(TEST_IMAGE_PATH));

      try {
        await axios.post(`${API_BASE_URL}/api/auth/register`, formData, {
          headers: formData.getHeaders(),
        });
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        if (!axiosError.response) {
          console.error("Ошибка сети:", axiosError.message);
          throw axiosError;
        }
        expect(axiosError.response.status).toBe(400);
      }
    });

    it("должен вернуть ошибку если dateOfBirth отсутствует", async () => {
      const formData = new FormData();
      formData.append("email", testEmail);
      formData.append("password", "password123");
      formData.append("name", "Тестовый Пользователь");
      formData.append("firstName", "Тестовый");
      formData.append("lastName", "Пользователь");
      formData.append("gender", "M");
      formData.append("cityId", "1");

      formData.append("avatar", fs.createReadStream(TEST_IMAGE_PATH));

      try {
        await axios.post(`${API_BASE_URL}/api/auth/register`, formData, {
          headers: formData.getHeaders(),
        });
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        if (!axiosError.response) {
          console.error("Ошибка сети:", axiosError.message);
          throw axiosError;
        }
        expect(axiosError.response.status).toBe(400);
      }
    });

    it("должен вернуть ошибку если gender отсутствует", async () => {
      const formData = new FormData();
      formData.append("email", testEmail);
      formData.append("password", "password123");
      formData.append("name", "Тестовый Пользователь");
      formData.append("firstName", "Тестовый");
      formData.append("lastName", "Пользователь");
      formData.append("dateOfBirth", "1990-01-01");
      formData.append("cityId", "1");

      formData.append("avatar", fs.createReadStream(TEST_IMAGE_PATH));

      try {
        await axios.post(`${API_BASE_URL}/api/auth/register`, formData, {
          headers: formData.getHeaders(),
        });
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        if (!axiosError.response) {
          console.error("Ошибка сети:", axiosError.message);
          throw axiosError;
        }
        expect(axiosError.response.status).toBe(400);
      }
    });

    it("должен вернуть ошибку если cityId отсутствует", async () => {
      const formData = new FormData();
      formData.append("email", testEmail);
      formData.append("password", "password123");
      formData.append("name", "Тестовый Пользователь");
      formData.append("firstName", "Тестовый");
      formData.append("lastName", "Пользователь");
      formData.append("dateOfBirth", "1990-01-01");
      formData.append("gender", "M");

      formData.append("avatar", fs.createReadStream(TEST_IMAGE_PATH));

      try {
        await axios.post(`${API_BASE_URL}/api/auth/register`, formData, {
          headers: formData.getHeaders(),
        });
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        if (!axiosError.response) {
          console.error("Ошибка сети:", axiosError.message);
          throw axiosError;
        }
        expect(axiosError.response.status).toBe(400);
      }
    });

    it("должен вернуть ошибку если пароль слишком короткий", async () => {
      const formData = new FormData();
      formData.append("email", testEmail);
      formData.append("password", "12345"); // Меньше 6 символов
      formData.append("name", "Тестовый Пользователь");
      formData.append("firstName", "Тестовый");
      formData.append("lastName", "Пользователь");
      formData.append("dateOfBirth", "1990-01-01");
      formData.append("gender", "M");
      formData.append("cityId", "1");
      formData.append("avatar", fs.createReadStream(TEST_IMAGE_PATH));

      try {
        await axios.post(`${API_BASE_URL}/api/auth/register`, formData, {
          headers: formData.getHeaders(),
        });
        expect(true).toBe(false); // Должна была быть ошибка
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(400);
        expect(axiosError.response?.data).toHaveProperty("error");
        // Сообщение об ошибке может быть в error или в details[].message
        const responseData = axiosError.response?.data as any;
        const errorMessage = responseData.error || "";
        const detailsMessages = (responseData.details || []).map((d: any) => d.message || "").join(" ");
        const allMessages = `${errorMessage} ${detailsMessages}`.toLowerCase();
        expect(allMessages).toMatch(/пароль|password/i);
      }
    });

    it("должен вернуть ошибку если аватар отсутствует", async () => {
      const formData = new FormData();
      formData.append("email", testEmail);
      formData.append("password", "password123");
      formData.append("name", "Тестовый Пользователь");
      formData.append("firstName", "Тестовый");
      formData.append("lastName", "Пользователь");
      formData.append("dateOfBirth", "1990-01-01");
      formData.append("gender", "M");
      formData.append("cityId", "1");

      try {
        await axios.post(`${API_BASE_URL}/api/auth/register`, formData, {
          headers: formData.getHeaders(),
        });
        expect(true).toBe(false); // Должна была быть ошибка
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(400);
        expect(axiosError.response?.data).toHaveProperty("error");
        expect((axiosError.response?.data as any).error).toContain("Аватар обязателен");
      }
    });
  });

  describe("Дубликаты email", () => {
    it("должен вернуть ошибку если email уже существует", async () => {
      const duplicateEmail = generateTestEmail();
      
      // Сначала регистрируем пользователя
      const formData1 = new FormData();
      formData1.append("email", duplicateEmail);
      formData1.append("password", "password123");
      formData1.append("name", "Первый Пользователь");
      formData1.append("firstName", "Первый");
      formData1.append("lastName", "Пользователь");
      formData1.append("dateOfBirth", "1990-01-01");
      formData1.append("gender", "M");
      formData1.append("cityId", "1");
      formData1.append("avatar", fs.createReadStream(TEST_IMAGE_PATH));

      await axios.post(`${API_BASE_URL}/api/auth/register`, formData1, {
        headers: formData1.getHeaders(),
      });

      // Пытаемся зарегистрировать с тем же email
      const formData2 = new FormData();
      formData2.append("email", duplicateEmail);
      formData2.append("password", "password123");
      formData2.append("name", "Второй Пользователь");
      formData2.append("firstName", "Второй");
      formData2.append("lastName", "Пользователь");
      formData2.append("dateOfBirth", "1990-01-01");
      formData2.append("gender", "M");
      formData2.append("cityId", "1");
      formData2.append("avatar", fs.createReadStream(TEST_IMAGE_PATH));

      try {
        await axios.post(`${API_BASE_URL}/api/auth/register`, formData2, {
          headers: formData2.getHeaders(),
        });
        expect(true).toBe(false); // Должна была быть ошибка
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(400);
        expect(axiosError.response?.data).toHaveProperty("error");
        expect((axiosError.response?.data as any).error).toContain("уже существует");
      }
    });
  });

  describe("Проверка существования связей", () => {
    it("должен вернуть ошибку если cityId не существует", async () => {
      const formData = new FormData();
      formData.append("email", generateTestEmail());
      formData.append("password", "password123");
      formData.append("name", "Тестовый Пользователь");
      formData.append("firstName", "Тестовый");
      formData.append("lastName", "Пользователь");
      formData.append("dateOfBirth", "1990-01-01");
      formData.append("gender", "M");
      formData.append("cityId", "999999"); // Несуществующий ID города

      formData.append("avatar", fs.createReadStream(TEST_IMAGE_PATH));

      try {
        await axios.post(`${API_BASE_URL}/api/auth/register`, formData, {
          headers: formData.getHeaders(),
        });
        expect(true).toBe(false); // Должна была быть ошибка
      } catch (error) {
        const axiosError = error as AxiosError;
        if (!axiosError.response) {
          console.error("Ошибка сети:", axiosError.message);
          throw axiosError;
        }
        expect(axiosError.response.status).toBe(400);
        expect(axiosError.response.data).toHaveProperty("error");
        expect((axiosError.response.data as any).error).toContain("не найден");
      }
    });
  });

  describe("Валидация файла аватара", () => {
    it("должен вернуть ошибку если файл не является изображением", async () => {
      const formData = new FormData();
      formData.append("email", testEmail);
      formData.append("password", "password123");
      formData.append("name", "Тестовый Пользователь");

      // Создаем текстовый файл вместо изображения
      const textFilePath = path.join(testsDir, "test.txt");
      fs.writeFileSync(textFilePath, "Это не изображение");

      formData.append("firstName", "Тестовый");
      formData.append("lastName", "Пользователь");
      formData.append("dateOfBirth", "1990-01-01");
      formData.append("gender", "M");
      formData.append("cityId", "1");
      formData.append("avatar", fs.createReadStream(textFilePath), {
        filename: "test.txt",
        contentType: "text/plain",
      });

      try {
        await axios.post(`${API_BASE_URL}/api/auth/register`, formData, {
          headers: formData.getHeaders(),
        });
        expect(true).toBe(false); // Должна была быть ошибка
      } catch (error) {
        const axiosError = error as AxiosError;
        // Multer может вернуть ошибку на этапе загрузки или валидации
        expect([400, 500]).toContain(axiosError.response?.status);
      } finally {
        if (fs.existsSync(textFilePath)) {
          fs.unlinkSync(textFilePath);
        }
      }
    });
  });
});

