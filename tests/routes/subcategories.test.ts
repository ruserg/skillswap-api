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

describe("Subcategories routes", () => {
  let accessToken: string;
  let categoryId: number;
  let subcategoryId: number;

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

    // Создаем категорию
    const categoryResponse = await axios.post(
      `${API_BASE_URL}/api/categories`,
      { name: "Test Category" },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    categoryId = categoryResponse.data.id;
  });

  describe("GET /api/subcategories", () => {
    it("должен вернуть список всех подкатегорий", async () => {
      const response = await axios.get(`${API_BASE_URL}/api/subcategories`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it("должен фильтровать по categoryId", async () => {
      const response = await axios.get(`${API_BASE_URL}/api/subcategories?categoryId=${categoryId}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      response.data.forEach((subcategory: any) => {
        expect(subcategory.categoryId).toBe(categoryId);
      });
    });
  });

  describe("GET /api/subcategories/:id", () => {
    it("должен вернуть подкатегорию по ID", async () => {
      // Сначала создаем подкатегорию
      const createResponse = await axios.post(
        `${API_BASE_URL}/api/subcategories`,
        { categoryId, name: "Test Subcategory" },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      subcategoryId = createResponse.data.id;

      const response = await axios.get(`${API_BASE_URL}/api/subcategories/${subcategoryId}`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("id");
      expect(response.data.id).toBe(subcategoryId);
      expect(response.data.name).toBe("Test Subcategory");
    });

    it("должен вернуть 404 для несуществующей подкатегории", async () => {
      try {
        await axios.get(`${API_BASE_URL}/api/subcategories/999999`);
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(404);
      }
    });
  });

  describe("POST /api/subcategories", () => {
    it("должен создать новую подкатегорию", async () => {
      const response = await axios.post(
        `${API_BASE_URL}/api/subcategories`,
        { categoryId, name: "New Subcategory" },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty("id");
      expect(response.data.name).toBe("New Subcategory");
      expect(response.data.categoryId).toBe(categoryId);
    });

    it("должен вернуть 401 без токена", async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/subcategories`, {
          categoryId,
          name: "New Subcategory",
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
          `${API_BASE_URL}/api/subcategories`,
          { categoryId: -1, name: "New Subcategory" },
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

    it("должен вернуть ошибку если categoryId не существует", async () => {
      try {
        await axios.post(
          `${API_BASE_URL}/api/subcategories`,
          { categoryId: 999999, name: "New Subcategory" },
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
        expect(axiosError.response.data).toHaveProperty("error");
        expect((axiosError.response.data as any).error).toContain("не найдена");
      }
    });
  });

  describe("PUT /api/subcategories/:id", () => {
    it("должен обновить подкатегорию", async () => {
      const response = await axios.put(
        `${API_BASE_URL}/api/subcategories/${subcategoryId}`,
        { categoryId, name: "Updated Subcategory" },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.name).toBe("Updated Subcategory");
    });

    it("должен вернуть 401 без токена", async () => {
      try {
        await axios.put(`${API_BASE_URL}/api/subcategories/${subcategoryId}`, {
          name: "Updated Subcategory",
        });
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
      }
    });
  });

  describe("DELETE /api/subcategories/:id", () => {
    it("должен удалить подкатегорию", async () => {
      // Создаем временную подкатегорию для удаления
      const createResponse = await axios.post(
        `${API_BASE_URL}/api/subcategories`,
        { categoryId, name: "Temp Subcategory" },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const tempSubcategoryId = createResponse.data.id;

      const response = await axios.delete(`${API_BASE_URL}/api/subcategories/${tempSubcategoryId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.status).toBe(204);

      // Проверяем, что подкатегория действительно удалена
      try {
        await axios.get(`${API_BASE_URL}/api/subcategories/${tempSubcategoryId}`);
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(404);
      }
    });

    it("должен вернуть 401 без токена", async () => {
      try {
        await axios.delete(`${API_BASE_URL}/api/subcategories/${subcategoryId}`);
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
      }
    });
  });
});

