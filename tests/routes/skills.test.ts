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

describe("Skills routes", () => {
  let accessToken: string;
  let userId: number;
  let categoryId: number;
  let subcategoryId: number;
  let skillId: number;

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
    userId = registerResponse.data.user.id;

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

    // Создаем подкатегорию
    const subcategoryResponse = await axios.post(
      `${API_BASE_URL}/api/subcategories`,
      { categoryId, name: "Test Subcategory" },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    subcategoryId = subcategoryResponse.data.id;
  });

  describe("GET /api/skills", () => {
    it("должен вернуть список всех навыков", async () => {
      const response = await axios.get(`${API_BASE_URL}/api/skills`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it("должен фильтровать по userId", async () => {
      // Создаем навык
      const createResponse = await axios.post(
        `${API_BASE_URL}/api/skills`,
        {
          subcategoryId,
          title: "Test Skill",
          description: "Test Description",
          type_of_proposal: "offer",
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      skillId = createResponse.data.id;

      const response = await axios.get(`${API_BASE_URL}/api/skills?userId=${userId}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      response.data.forEach((skill: any) => {
        expect(skill.userId).toBe(userId);
      });
    });

    it("должен фильтровать по subcategoryId", async () => {
      const response = await axios.get(`${API_BASE_URL}/api/skills?subcategoryId=${subcategoryId}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      response.data.forEach((skill: any) => {
        expect(skill.subcategoryId).toBe(subcategoryId);
      });
    });

    it("должен фильтровать по type_of_proposal", async () => {
      const response = await axios.get(`${API_BASE_URL}/api/skills?type_of_proposal=offer`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      response.data.forEach((skill: any) => {
        expect(skill.type_of_proposal).toBe("offer");
      });
    });
  });

  describe("GET /api/skills/:id", () => {
    it("должен вернуть навык по ID", async () => {
      const response = await axios.get(`${API_BASE_URL}/api/skills/${skillId}`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("id");
      expect(response.data.id).toBe(skillId);
    });

    it("должен вернуть 404 для несуществующего навыка", async () => {
      try {
        await axios.get(`${API_BASE_URL}/api/skills/999999`);
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(404);
      }
    });
  });

  describe("POST /api/skills", () => {
    it("должен создать новый навык", async () => {
      const response = await axios.post(
        `${API_BASE_URL}/api/skills`,
        {
          subcategoryId,
          title: "New Skill",
          description: "New Description",
          type_of_proposal: "request",
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty("id");
      expect(response.data.title).toBe("New Skill");
      expect(response.data.userId).toBe(userId);
    });

    it("должен вернуть 401 без токена", async () => {
      try {
        await axios.post(`${API_BASE_URL}/api/skills`, {
          subcategoryId,
          title: "New Skill",
          description: "New Description",
          type_of_proposal: "offer",
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
          `${API_BASE_URL}/api/skills`,
          {
            subcategoryId: -1, // Невалидный ID (отрицательное число)
            title: "New Skill",
            description: "New Description",
            type_of_proposal: "offer",
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

    it("должен вернуть ошибку если subcategoryId не существует", async () => {
      try {
        await axios.post(
          `${API_BASE_URL}/api/skills`,
          {
            subcategoryId: 999999, // Несуществующий ID
            title: "New Skill",
            description: "New Description",
            type_of_proposal: "offer",
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
        expect(axiosError.response.data).toHaveProperty("error");
        expect((axiosError.response.data as any).error).toContain("не найдена");
      }
    });
  });

  describe("PUT /api/skills/:id", () => {
    it("должен обновить навык", async () => {
      const response = await axios.put(
        `${API_BASE_URL}/api/skills/${skillId}`,
        {
          title: "Updated Skill",
          description: "Updated Description",
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.title).toBe("Updated Skill");
      expect(response.data.description).toBe("Updated Description");
    });

    it("должен вернуть 401 без токена", async () => {
      try {
        await axios.put(`${API_BASE_URL}/api/skills/${skillId}`, {
          title: "Updated Skill",
        });
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
      }
    });
  });

  describe("DELETE /api/skills/:id", () => {
    it("должен удалить навык", async () => {
      // Создаем временный навык для удаления
      const createResponse = await axios.post(
        `${API_BASE_URL}/api/skills`,
        {
          subcategoryId,
          title: "Temp Skill",
          description: "Temp Description",
          type_of_proposal: "offer",
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const tempSkillId = createResponse.data.id;

      const response = await axios.delete(`${API_BASE_URL}/api/skills/${tempSkillId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.status).toBe(204);

      // Проверяем, что навык действительно удален
      try {
        await axios.get(`${API_BASE_URL}/api/skills/${tempSkillId}`);
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(404);
      }
    });

    it("должен вернуть 401 без токена", async () => {
      try {
        await axios.delete(`${API_BASE_URL}/api/skills/${skillId}`);
        expect(true).toBe(false);
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
      }
    });
  });
});

