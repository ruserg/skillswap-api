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

describe("Cities routes", () => {
  let accessToken: string;
  let cityId: number;

  beforeAll(async () => {
    if (!fs.existsSync(TEST_IMAGE_PATH)) {
      throw new Error(`Тестовое изображение не найдено: ${TEST_IMAGE_PATH}`);
    }

    // Создаем пользователя
    const testEmail = generateTestEmail();
    const formData = new FormData();
    formData.append("email", testEmail);
    formData.append("password", "password123");
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
  });

  describe("GET /api/cities", () => {
    it("должен вернуть список всех городов", async () => {
      const response = await axios.get(`${API_BASE_URL}/api/cities`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  describe("GET /api/cities/:id", () => {
    it("должен вернуть город по ID", async () => {
      // Сначала создаем город
      const createResponse = await axios.post(
        `${API_BASE_URL}/api/cities`,
        { name: "Test City" },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      cityId = createResponse.data.id;

      const response = await axios.get(`${API_BASE_URL}/api/cities/${cityId}`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("id");
      expect(response.data.id).toBe(cityId);
      expect(response.data.name).toBe("Test City");
    });

    it("должен вернуть 404 для несуществующего города", async () => {
      try {
        await axios.get(`${API_BASE_URL}/api/cities/999999`);
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(404);
      }
    });
  });

  describe("POST /api/cities", () => {
    it("должен создать новый город", async () => {
      const response = await axios.post(
        `${API_BASE_URL}/api/cities`,
        { name: "New City" },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty("id");
      expect(response.data.name).toBe("New City");
    });

    it("должен вернуть 401 без токена", async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/cities`, {
          name: "New City",
        });
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
      }
    });

    it("должен валидировать входные данные", async () => {
      try {
        await axios.post(
          `${API_BASE_URL}/api/cities`,
          { name: "" }, // Пустое имя
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

  describe("PUT /api/cities/:id", () => {
    it("должен обновить город", async () => {
      const response = await axios.put(
        `${API_BASE_URL}/api/cities/${cityId}`,
        { name: "Updated City" },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.name).toBe("Updated City");
    });

    it("должен вернуть 401 без токена", async () => {
      try {
        await axios.put(`${API_BASE_URL}/api/cities/${cityId}`, {
          name: "Updated City",
        });
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
      }
    });
  });

  describe("DELETE /api/cities/:id", () => {
    it("должен удалить город", async () => {
      // Создаем временный город для удаления
      const createResponse = await axios.post(
        `${API_BASE_URL}/api/cities`,
        { name: "Temp City" },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const tempCityId = createResponse.data.id;

      const response = await axios.delete(`${API_BASE_URL}/api/cities/${tempCityId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.status).toBe(204);

      // Проверяем, что город действительно удален
      try {
        await axios.get(`${API_BASE_URL}/api/cities/${tempCityId}`);
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(404);
      }
    });

    it("должен вернуть 401 без токена", async () => {
      try {
        await axios.delete(`${API_BASE_URL}/api/cities/${cityId}`);
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
      }
    });
  });
});

