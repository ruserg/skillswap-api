import { 
  hashPassword, 
  comparePassword, 
  generateAccessToken, 
  generateRefreshToken, 
  generateTokens,
  verifyRefreshToken,
  authenticateToken,
  optionalAuth,
  authorizeSelf,
  AuthRequest
} from "../../src/utils/auth.js";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

describe("auth utils", () => {
  describe("hashPassword", () => {
    it("должен хешировать пароль", async () => {
      const password = "testpassword123";
      const hashed = await hashPassword(password);
      
      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(password);
      expect(hashed.length).toBeGreaterThan(20);
    });

    it("должен генерировать разные хеши для одного пароля", async () => {
      const password = "testpassword123";
      const hashed1 = await hashPassword(password);
      const hashed2 = await hashPassword(password);
      
      expect(hashed1).not.toBe(hashed2);
    });
  });

  describe("comparePassword", () => {
    it("должен корректно проверять правильный пароль", async () => {
      const password = "testpassword123";
      const hashed = await hashPassword(password);
      
      const result = await comparePassword(password, hashed);
      expect(result).toBe(true);
    });

    it("должен корректно проверять неправильный пароль", async () => {
      const password = "testpassword123";
      const wrongPassword = "wrongpassword";
      const hashed = await hashPassword(password);
      
      const result = await comparePassword(wrongPassword, hashed);
      expect(result).toBe(false);
    });
  });

  describe("generateAccessToken", () => {
    it("должен генерировать валидный токен", () => {
      const user = { id: 1, email: "test@example.com" };
      const token = generateAccessToken(user);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      
      // Проверяем, что токен можно декодировать
      const decoded = jwt.decode(token) as any;
      expect(decoded.id).toBe(user.id);
      expect(decoded.email).toBe(user.email);
      expect(decoded.type).toBe("access");
    });
  });

  describe("generateRefreshToken", () => {
    it("должен генерировать валидный refresh токен", () => {
      const user = { id: 1, email: "test@example.com" };
      const token = generateRefreshToken(user);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      
      // Проверяем, что токен можно декодировать
      const decoded = jwt.decode(token) as any;
      expect(decoded.id).toBe(user.id);
      expect(decoded.email).toBe(user.email);
      expect(decoded.type).toBe("refresh");
    });
  });

  describe("generateTokens", () => {
    it("должен генерировать оба токена", () => {
      const user = { id: 1, email: "test@example.com" };
      const tokens = generateTokens(user);
      
      expect(tokens).toHaveProperty("accessToken");
      expect(tokens).toHaveProperty("refreshToken");
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.accessToken).not.toBe(tokens.refreshToken);
    });
  });

  describe("verifyRefreshToken", () => {
    it("должен корректно проверять валидный refresh токен", () => {
      const user = { id: 1, email: "test@example.com" };
      const token = generateRefreshToken(user);
      
      const result = verifyRefreshToken(token);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(user.id);
      expect(result?.email).toBe(user.email);
    });

    it("должен вернуть null для невалидного токена", () => {
      const result = verifyRefreshToken("invalid-token");
      expect(result).toBeNull();
    });

    it("должен вернуть null для access токена вместо refresh", () => {
      const user = { id: 1, email: "test@example.com" };
      const accessToken = generateAccessToken(user);
      
      const result = verifyRefreshToken(accessToken);
      expect(result).toBeNull();
    });
  });

  describe("authenticateToken", () => {
    let mockReq: Partial<AuthRequest>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
      mockReq = {
        headers: {},
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      mockNext = jest.fn();
    });

    it("должен вернуть 401 если токен не предоставлен", () => {
      authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Токен доступа не предоставлен" });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("должен вернуть 403 для невалидного токена", (done) => {
      mockReq.headers = { authorization: "Bearer invalid-token" };
      
      authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);
      
      // Проверяем асинхронно, так как jwt.verify может быть асинхронным
      setTimeout(() => {
        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockNext).not.toHaveBeenCalled();
        done();
      }, 100);
    });

    it("должен добавить user в request для валидного токена", (done) => {
      const user = { id: 1, email: "test@example.com" };
      const token = generateAccessToken(user);
      mockReq.headers = { authorization: `Bearer ${token}` };
      
      authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);
      
      setTimeout(() => {
        expect(mockReq.user).toBeDefined();
        expect(mockReq.user?.id).toBe(user.id);
        expect(mockReq.user?.email).toBe(user.email);
        expect(mockNext).toHaveBeenCalled();
        done();
      }, 100);
    });
  });

  describe("optionalAuth", () => {
    let mockReq: Partial<AuthRequest>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
      mockReq = {
        headers: {},
      };
      mockRes = {};
      mockNext = jest.fn();
    });

    it("должен продолжить без user если токен не предоставлен", () => {
      optionalAuth(mockReq as AuthRequest, mockRes as Response, mockNext);
      
      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it("должен добавить user если токен валидный", (done) => {
      const user = { id: 1, email: "test@example.com" };
      const token = generateAccessToken(user);
      mockReq.headers = { authorization: `Bearer ${token}` };
      
      optionalAuth(mockReq as AuthRequest, mockRes as Response, mockNext);
      
      setTimeout(() => {
        expect(mockReq.user).toBeDefined();
        expect(mockReq.user?.id).toBe(user.id);
        expect(mockNext).toHaveBeenCalled();
        done();
      }, 100);
    });
  });

  describe("authorizeSelf", () => {
    let mockReq: Partial<AuthRequest>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
      mockReq = {
        params: {},
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      mockNext = jest.fn();
    });

    it("должен вернуть 401 если пользователь не авторизован", () => {
      mockReq.params = { id: "1" };
      mockReq.user = undefined;
      
      authorizeSelf(mockReq as AuthRequest, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("должен вернуть 403 если пользователь пытается изменить чужой ресурс", () => {
      mockReq.user = { id: 1, email: "test@example.com" };
      mockReq.params = { id: "2" };
      
      authorizeSelf(mockReq as AuthRequest, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("должен разрешить доступ если пользователь изменяет свой ресурс", () => {
      mockReq.user = { id: 1, email: "test@example.com" };
      mockReq.params = { id: "1" };
      
      authorizeSelf(mockReq as AuthRequest, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });
});

