import axios from "axios";

const API_BASE_URL = process.env.API_URL || process.env.API_BASE_URL || "http://localhost:3001";

describe("Index routes", () => {
  describe("GET /", () => {
    it("должен вернуть информацию об API", async () => {
      const response = await axios.get(`${API_BASE_URL}/`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("message");
      expect(response.data).toHaveProperty("version");
      expect(response.data).toHaveProperty("endpoints");
      expect(response.data).toHaveProperty("api");
    });
  });

  describe("GET /api", () => {
    it("должен вернуть информацию об API", async () => {
      const response = await axios.get(`${API_BASE_URL}/api`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("message");
      expect(response.data).toHaveProperty("version");
      expect(response.data).toHaveProperty("endpoints");
    });
  });

  describe("GET /api/", () => {
    it("должен вернуть информацию об API", async () => {
      const response = await axios.get(`${API_BASE_URL}/api/`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("message");
      expect(response.data).toHaveProperty("version");
      expect(response.data).toHaveProperty("endpoints");
    });
  });

  describe("GET /api/health", () => {
    it("должен вернуть статус здоровья API", async () => {
      const response = await axios.get(`${API_BASE_URL}/api/health`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("status");
      expect(response.data.status).toBe("ok");
      expect(response.data).toHaveProperty("message");
    });
  });

  describe("404 handler", () => {
    it("должен вернуть 404 для несуществующего эндпоинта", async () => {
      try {
        await axios.get(`${API_BASE_URL}/api/nonexistent`);
        expect(true).toBe(false);
      } catch (error: any) {
        if (!error.response) {
          console.error("Ошибка сети:", error.message);
          throw error;
        }
        expect(error.response.status).toBe(404);
        expect(error.response.data).toHaveProperty("error");
        expect(error.response.data).toHaveProperty("message");
      }
    });
  });
});

