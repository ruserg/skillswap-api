import { 
  loginSchema, 
  createSkillSchema, 
  createCategorySchema,
  updateUserSchema,
  validate
} from "../../src/utils/validation.js";
import { Request, Response, NextFunction } from "express";

describe("validation utils", () => {
  describe("loginSchema", () => {
    it("должен валидировать корректные данные", () => {
      const validData = {
        email: "test@example.com",
        password: "password123"
      };
      
      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it("должен отклонять некорректный email", () => {
      const invalidData = {
        email: "not-an-email",
        password: "password123"
      };
      
      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("должен отклонять пустой пароль", () => {
      const invalidData = {
        email: "test@example.com",
        password: ""
      };
      
      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("createSkillSchema", () => {
    it("должен валидировать корректные данные", () => {
      const validData = {
        subcategoryId: 1,
        title: "Test Skill",
        description: "Test Description",
        type_of_proposal: "offer"
      };
      
      const result = createSkillSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("должен отклонять отрицательный subcategoryId", () => {
      const invalidData = {
        subcategoryId: -1,
        title: "Test Skill",
        description: "Test Description",
        type_of_proposal: "offer"
      };
      
      const result = createSkillSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("должен отклонять пустой title", () => {
      const invalidData = {
        subcategoryId: 1,
        title: "",
        description: "Test Description",
        type_of_proposal: "offer"
      };
      
      const result = createSkillSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("должен отклонять невалидный type_of_proposal", () => {
      const invalidData = {
        subcategoryId: 1,
        title: "Test Skill",
        description: "Test Description",
        type_of_proposal: "invalid"
      };
      
      const result = createSkillSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("createCategorySchema", () => {
    it("должен валидировать корректные данные", () => {
      const validData = {
        name: "Test Category"
      };
      
      const result = createCategorySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("должен отклонять пустое имя", () => {
      const invalidData = {
        name: ""
      };
      
      const result = createCategorySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("updateUserSchema", () => {
    it("должен валидировать корректные данные", () => {
      const validData = {
        name: "New Name",
        firstName: "First",
        lastName: "Last"
      };
      
      const result = updateUserSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("должен отклонять дополнительные поля", () => {
      const invalidData = {
        name: "New Name",
        invalidField: "should not be here"
      };
      
      const result = updateUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("validate middleware", () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
      mockReq = {
        body: {},
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      mockNext = jest.fn();
    });

    it("должен пропускать валидные данные", () => {
      mockReq.body = {
        email: "test@example.com",
        password: "password123"
      };
      
      const middleware = validate(loginSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("должен возвращать ошибку для невалидных данных", () => {
      mockReq.body = {
        email: "not-an-email",
        password: "password123"
      };
      
      const middleware = validate(loginSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Ошибка валидации",
          details: expect.any(Array)
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("должен обновлять req.body валидированными данными", () => {
      mockReq.body = {
        email: "test@example.com",
        password: "password123"
      };
      
      const middleware = validate(loginSchema);
      middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockReq.body).toEqual({
        email: "test@example.com",
        password: "password123"
      });
    });
  });
});

