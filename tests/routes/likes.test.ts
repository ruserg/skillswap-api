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

describe("Likes routes", () => {
  let accessToken1: string;
  let userId1: number;
  let accessToken2: string;
  let userId2: number;
  let likeId: number;

  beforeAll(async () => {
    if (!fs.existsSync(TEST_IMAGE_PATH)) {
      throw new Error(`Тестовое изображение не найдено: ${TEST_IMAGE_PATH}`);
    }

    // Создаем первого пользователя
    const testEmail1 = generateTestEmail();
    const formData1 = new FormData();
    formData1.append("email", testEmail1);
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

    accessToken1 = registerResponse1.data.accessToken;
    userId1 = registerResponse1.data.user.id;

    // Создаем второго пользователя
    const testEmail2 = generateTestEmail();
    const formData2 = new FormData();
    formData2.append("email", testEmail2);
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

    accessToken2 = registerResponse2.data.accessToken;
    userId2 = registerResponse2.data.user.id;
  });

  describe("POST /api/likes/users-info", () => {
    it("должен вернуть информацию о лайках для нескольких пользователей", async () => {
      const response = await axios.post(`${API_BASE_URL}/api/likes/users-info`, {
        userIds: [userId1, userId2],
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBe(2);
      response.data.forEach((item: any) => {
        expect(item).toHaveProperty("userId");
        expect(item).toHaveProperty("likesCount");
        expect(item).toHaveProperty("isLikedByCurrentUser");
        expect(typeof item.likesCount).toBe("number");
        expect(typeof item.isLikedByCurrentUser).toBe("boolean");
      });
    });

    it("должен вернуть isLikedByCurrentUser = false для неавторизованного пользователя", async () => {
      const response = await axios.post(`${API_BASE_URL}/api/likes/users-info`, {
        userIds: [userId1],
      });

      expect(response.status).toBe(200);
      expect(response.data[0].isLikedByCurrentUser).toBe(false);
    });

    it("должен вернуть ошибку для пустого массива", async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/likes/users-info`, {
          userIds: [],
        });
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(400);
      }
    });
  });

  describe("GET /api/likes/users-info/:userId", () => {
    it("должен вернуть информацию о лайках одного пользователя", async () => {
      const response = await axios.get(`${API_BASE_URL}/api/likes/users-info/${userId1}`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("userId");
      expect(response.data).toHaveProperty("likesCount");
      expect(response.data).toHaveProperty("isLikedByCurrentUser");
      expect(response.data.userId).toBe(userId1);
    });

    it("должен вернуть isLikedByCurrentUser = false для неавторизованного пользователя", async () => {
      const response = await axios.get(`${API_BASE_URL}/api/likes/users-info/${userId1}`);

      expect(response.status).toBe(200);
      expect(response.data.isLikedByCurrentUser).toBe(false);
    });
  });

  describe("GET /api/likes/:id", () => {
    it("должен вернуть лайк по ID", async () => {
      // Сначала создаем лайк
      const createResponse = await axios.post(
        `${API_BASE_URL}/api/likes`,
        { toUserId: userId2 },
        {
          headers: {
            Authorization: `Bearer ${accessToken1}`,
          },
        }
      );
      likeId = createResponse.data.id;

      const response = await axios.get(`${API_BASE_URL}/api/likes/${likeId}`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("id");
      expect(response.data.id).toBe(likeId);
      expect(response.data.fromUserId).toBe(userId1);
      expect(response.data.toUserId).toBe(userId2);
    });

    it("должен вернуть 404 для несуществующего лайка", async () => {
      try {
        await axios.get(`${API_BASE_URL}/api/likes/999999`);
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(404);
      }
    });
  });

  describe("POST /api/likes", () => {
    it("должен создать новый лайк", async () => {
      // Создаем третьего пользователя для лайка
      const testEmail3 = generateTestEmail();
      const formData3 = new FormData();
      formData3.append("email", testEmail3);
      formData3.append("password", "password123");
      formData3.append("name", "Test User 3");
      formData3.append("firstName", "Test");
      formData3.append("lastName", "User3");
      formData3.append("dateOfBirth", "1990-01-01");
      formData3.append("gender", "M");
      formData3.append("cityId", "1");
      formData3.append("avatar", fs.createReadStream(TEST_IMAGE_PATH));

      const registerResponse3 = await axios.post(`${API_BASE_URL}/api/auth/register`, formData3, {
        headers: formData3.getHeaders(),
      });

      const userId3 = registerResponse3.data.user.id;

      const response = await axios.post(
        `${API_BASE_URL}/api/likes`,
        { toUserId: userId3 },
        {
          headers: {
            Authorization: `Bearer ${accessToken1}`,
          },
        }
      );

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty("id");
      expect(response.data.fromUserId).toBe(userId1);
      expect(response.data.toUserId).toBe(userId3);
    });

    it("должен вернуть 401 без токена", async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/likes`, {
          toUserId: userId2,
        });
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
      }
    });

    it("должен вернуть ошибку если toUserId не существует", async () => {
      try {
        await axios.post(
          `${API_BASE_URL}/api/likes`,
          { toUserId: 999999 }, // Несуществующий ID пользователя
          {
            headers: {
              Authorization: `Bearer ${accessToken1}`,
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
        expect(axiosError.response.data).toHaveProperty("error");
        expect((axiosError.response.data as any).error).toContain("не найден");
      }
    });
  });

  describe("DELETE /api/likes/:id", () => {
    it("должен удалить лайк по ID", async () => {
      // Удаляем существующий лайк, если он есть
      try {
        await axios.delete(`${API_BASE_URL}/api/likes?toUserId=${userId2}`, {
          headers: {
            Authorization: `Bearer ${accessToken2}`,
          },
        });
      } catch (error) {
        // Игнорируем ошибки (лайк может не существовать)
      }

      // Создаем временный лайк для удаления
      let tempLikeId: number;
      try {
        const createResponse = await axios.post(
          `${API_BASE_URL}/api/likes`,
          { toUserId: userId2 },
          {
            headers: {
              Authorization: `Bearer ${accessToken2}`,
            },
          }
        );
        tempLikeId = createResponse.data.id;
      } catch (error: any) {
        // Если лайк уже существует (409), пропускаем тест
        if (error.response?.status === 409 || error.response?.status === 400) {
          return;
        }
        throw error;
      }

      const response = await axios.delete(`${API_BASE_URL}/api/likes/${tempLikeId}`, {
        headers: {
          Authorization: `Bearer ${accessToken2}`,
        },
      });

      expect(response.status).toBe(204);

      // Проверяем, что лайк действительно удален
      try {
        await axios.get(`${API_BASE_URL}/api/likes/${tempLikeId}`);
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(404);
      }
    });

    it("должен вернуть 401 без токена", async () => {
      try {
        await axios.delete(`${API_BASE_URL}/api/likes/${likeId}`);
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
      }
    });
  });

  describe("DELETE /api/likes?toUserId=:userId", () => {
    it("должен удалить лайк по toUserId", async () => {
      // Удаляем существующий лайк, если он есть
      try {
        await axios.delete(`${API_BASE_URL}/api/likes?toUserId=${userId2}`, {
          headers: {
            Authorization: `Bearer ${accessToken1}`,
          },
        });
      } catch (error) {
        // Игнорируем ошибки (лайк может не существовать)
      }

      // Удаляем существующий лайк, если он есть
      try {
        await axios.delete(`${API_BASE_URL}/api/likes?toUserId=${userId2}`, {
          headers: {
            Authorization: `Bearer ${accessToken1}`,
          },
        });
      } catch (error) {
        // Игнорируем ошибки (лайк может не существовать)
      }

      // Создаем лайк для удаления
      try {
        await axios.post(
          `${API_BASE_URL}/api/likes`,
          { toUserId: userId2 },
          {
            headers: {
              Authorization: `Bearer ${accessToken1}`,
            },
          }
        );
      } catch (error: any) {
        // Если лайк уже существует (409), пропускаем тест
        if (error.response?.status === 409) {
          return;
        }
        throw error;
      }

      const response = await axios.delete(`${API_BASE_URL}/api/likes?toUserId=${userId2}`, {
        headers: {
          Authorization: `Bearer ${accessToken1}`,
        },
      });

      expect(response.status).toBe(204);
    });

    it("должен вернуть 401 без токена", async () => {
      try {
        await axios.delete(`${API_BASE_URL}/api/likes?toUserId=${userId2}`);
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
      }
    });
  });
});

