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

describe("Users routes", () => {
  let testEmail: string;
  let accessToken: string;
  let userId: number;
  let secondUserEmail: string;
  let secondUserAccessToken: string;
  let secondUserId: number;

  beforeAll(() => {
    if (!fs.existsSync(TEST_IMAGE_PATH)) {
      throw new Error(`Тестовое изображение не найдено: ${TEST_IMAGE_PATH}`);
    }
  });

  beforeEach(async () => {
    // Создаем первого пользователя
    testEmail = generateTestEmail();
    const formData1 = new FormData();
    formData1.append("email", testEmail);
    formData1.append("password", "password123");
    formData1.append("name", "Test User 1");
    formData1.append("firstName", "Test");
    formData1.append("lastName", "User1");
    formData1.append("dateOfBirth", "1990-01-01");
    formData1.append("gender", "M");
    formData1.append("cityId", "1");
    formData1.append("avatar", fs.createReadStream(TEST_IMAGE_PATH));

    const registerResponse1 = await axios.post(`${API_BASE_URL}/api/auth/register`, formData1, {
      headers: formData1.getHeaders(),
    });

    accessToken = registerResponse1.data.accessToken;
    userId = registerResponse1.data.user.id;

    // Создаем второго пользователя
    secondUserEmail = generateTestEmail();
    const formData2 = new FormData();
    formData2.append("email", secondUserEmail);
    formData2.append("password", "password123");
    formData2.append("name", "Test User 2");
    formData2.append("firstName", "Test");
    formData2.append("lastName", "User2");
    formData2.append("dateOfBirth", "1990-01-01");
    formData2.append("gender", "F");
    formData2.append("cityId", "1");
    formData2.append("avatar", fs.createReadStream(TEST_IMAGE_PATH));

    const registerResponse2 = await axios.post(`${API_BASE_URL}/api/auth/register`, formData2, {
      headers: formData2.getHeaders(),
    });

    secondUserAccessToken = registerResponse2.data.accessToken;
    secondUserId = registerResponse2.data.user.id;
  });

  describe("GET /api/users", () => {
    it("должен вернуть список всех пользователей", async () => {
      const response = await axios.get(`${API_BASE_URL}/api/users`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
      
      // Проверяем, что пароли не возвращаются
      response.data.forEach((user: any) => {
        expect(user.password).toBeUndefined();
        expect(user).toHaveProperty("likesCount");
        expect(user).toHaveProperty("isLikedByCurrentUser");
      });
    });

    it("должен вернуть isLikedByCurrentUser = false для неавторизованного пользователя", async () => {
      const response = await axios.get(`${API_BASE_URL}/api/users`);

      expect(response.status).toBe(200);
      response.data.forEach((user: any) => {
        expect(user.isLikedByCurrentUser).toBe(false);
      });
    });

    it("должен вернуть isLikedByCurrentUser для авторизованного пользователя", async () => {
      const response = await axios.get(`${API_BASE_URL}/api/users`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      response.data.forEach((user: any) => {
        expect(typeof user.isLikedByCurrentUser).toBe("boolean");
      });
    });
  });

  describe("GET /api/users/:id", () => {
    it("должен вернуть пользователя по ID", async () => {
      const response = await axios.get(`${API_BASE_URL}/api/users/${userId}`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("id");
      expect(response.data).toHaveProperty("email");
      expect(response.data.email).toBe(testEmail);
      expect(response.data.password).toBeUndefined();
      expect(response.data).toHaveProperty("likesCount");
      expect(response.data).toHaveProperty("isLikedByCurrentUser");
    });

    it("должен вернуть 404 для несуществующего пользователя", async () => {
      try {
        await axios.get(`${API_BASE_URL}/api/users/999999`);
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(404);
      }
    });
  });

  describe("PUT /api/users/:id", () => {
    it("должен обновить пользователя", async () => {
      const response = await axios.put(
        `${API_BASE_URL}/api/users/${userId}`,
        {
          name: "Updated Name",
          firstName: "Updated",
          lastName: "Name",
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.name).toBe("Updated Name");
      expect(response.data.firstName).toBe("Updated");
      expect(response.data.lastName).toBe("Name");
      expect(response.data.password).toBeUndefined();
    });

    it("должен вернуть 403 при попытке обновить чужого пользователя", async () => {
      try {
        await axios.put(
          `${API_BASE_URL}/api/users/${secondUserId}`,
          {
            name: "Hacked Name",
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(403);
      }
    });

    it("должен вернуть 401 без токена", async () => {
      try {
        await axios.put(`${API_BASE_URL}/api/users/${userId}`, {
          name: "Updated Name",
        });
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
      }
    });

    it("должен валидировать входные данные", async () => {
      try {
        await axios.put(
          `${API_BASE_URL}/api/users/${userId}`,
          {
            name: "", // Пустое имя должно быть отклонено
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
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
  });

  describe("DELETE /api/users/:id", () => {
    it("должен удалить пользователя", async () => {
      // Создаем временного пользователя для удаления
      const tempEmail = generateTestEmail();
      const formData = new FormData();
      formData.append("email", tempEmail);
      formData.append("password", "password123");
      formData.append("name", "Temp User");
      formData.append("firstName", "Temp");
      formData.append("lastName", "User");
      formData.append("dateOfBirth", "1990-01-01");
      formData.append("gender", "M");
      formData.append("cityId", "1");
      formData.append("avatar", fs.createReadStream(TEST_IMAGE_PATH));

      const registerResponse = await axios.post(`${API_BASE_URL}/api/auth/register`, formData, {
        headers: formData.getHeaders(),
      });

      const tempUserId = registerResponse.data.user.id;
      const tempAccessToken = registerResponse.data.accessToken;

      const response = await axios.delete(`${API_BASE_URL}/api/users/${tempUserId}`, {
        headers: {
          Authorization: `Bearer ${tempAccessToken}`,
        },
      });

      expect(response.status).toBe(204);

      // Проверяем, что пользователь действительно удален
      try {
        await axios.get(`${API_BASE_URL}/api/users/${tempUserId}`);
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(404);
      }
    });

    it("должен вернуть 403 при попытке удалить чужого пользователя", async () => {
      try {
        await axios.delete(`${API_BASE_URL}/api/users/${secondUserId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(403);
      }
    });

    it("должен вернуть 401 без токена", async () => {
      try {
        await axios.delete(`${API_BASE_URL}/api/users/${userId}`);
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
      }
    });
  });
});

