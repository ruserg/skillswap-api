import axios, { AxiosError } from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";

const API_BASE_URL = process.env.API_URL || process.env.API_BASE_URL || "http://localhost:3001";
const testsDir = path.join(process.cwd(), "tests");
const TEST_IMAGE_PATH = path.join(testsDir, "test-avatar.jpg");

function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `test_${timestamp}_${random}@example.com`;
}

describe("Auth routes", () => {
  let testEmail: string;
  let testPassword: string;
  let accessToken: string;
  let refreshToken: string;
  let userId: number;

  beforeAll(() => {
    if (!fs.existsSync(TEST_IMAGE_PATH)) {
      throw new Error(`Тестовое изображение не найдено: ${TEST_IMAGE_PATH}`);
    }
  });

  beforeEach(async () => {
    testEmail = generateTestEmail();
    testPassword = "password123";

    // Регистрируем пользователя для тестов
    const formData = new FormData();
    formData.append("email", testEmail);
    formData.append("password", testPassword);
    formData.append("name", "Test User");
    formData.append("firstName", "Test");
    formData.append("lastName", "User");
    formData.append("dateOfBirth", "1990-01-01");
    formData.append("gender", "M");
    formData.append("cityId", "1");
    formData.append("avatar", fs.createReadStream(TEST_IMAGE_PATH));

    const registerResponse = await axios.post(`${API_BASE_URL}/api/auth/register`, formData, {
      headers: formData.getHeaders(),
    });

    accessToken = registerResponse.data.accessToken;
    refreshToken = registerResponse.data.refreshToken;
    userId = registerResponse.data.user.id;
  });

  describe("POST /api/auth/login", () => {
    it("должен успешно войти с правильными данными", async () => {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email: testEmail,
        password: testPassword,
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("user");
      expect(response.data).toHaveProperty("accessToken");
      expect(response.data).toHaveProperty("refreshToken");
      expect(response.data.user.email).toBe(testEmail);
      expect(response.data.user.password).toBeUndefined();
    });

    it("должен вернуть ошибку для неправильного email", async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/auth/login`, {
          email: "nonexistent@example.com",
          password: testPassword,
        });
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
        expect((axiosError.response?.data as any).error).toContain("Неверный email или пароль");
      }
    });

    it("должен вернуть ошибку для неправильного пароля", async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/auth/login`, {
          email: testEmail,
          password: "wrongpassword",
        });
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
        expect((axiosError.response?.data as any).error).toContain("Неверный email или пароль");
      }
    });

    it("должен валидировать email формат", async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/auth/login`, {
          email: "not-an-email",
          password: testPassword,
        });
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        // Может быть 400 (валидация) или 401 (неверные учетные данные)
        expect([400, 401]).toContain(axiosError.response?.status);
      }
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("должен обновить access токен с валидным refresh токеном", async () => {
      const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
        refreshToken: refreshToken,
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("accessToken");
      expect(response.data.accessToken).toBeDefined();
      // Новый токен может быть таким же, если время не прошло, но структура должна быть правильной
      expect(typeof response.data.accessToken).toBe("string");
      expect(response.data.accessToken.length).toBeGreaterThan(0);
    });

    it("должен вернуть ошибку для невалидного refresh токена", async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
          refreshToken: "invalid-token",
        });
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        // Может быть 403 (недействительный токен) или 401 (не авторизован)
        expect([401, 403]).toContain(axiosError.response?.status);
      }
    });

    it("должен вернуть ошибку если refresh токен не предоставлен", async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/auth/refresh`, {});
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(400);
      }
    });
  });

  describe("GET /api/auth/me", () => {
    it("должен вернуть информацию о текущем пользователе", async () => {
      const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("id");
      expect(response.data).toHaveProperty("email");
      expect(response.data.email).toBe(testEmail);
      expect(response.data.password).toBeUndefined();
    });

    it("должен вернуть ошибку без токена", async () => {
      try {
        await axios.get(`${API_BASE_URL}/api/auth/me`);
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
      }
    });

    it("должен вернуть ошибку с невалидным токеном", async () => {
      try {
        await axios.get(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            Authorization: "Bearer invalid-token",
          },
        });
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(403);
      }
    });
  });

  describe("POST /api/auth/logout", () => {
    it("должен успешно выйти", async () => {
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/logout`,
        { refreshToken: refreshToken },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("message");
    });

    it("должен вернуть ошибку без токена", async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/auth/logout`, {
          refreshToken: refreshToken,
        });
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
      }
    });
  });
});

