import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { JwtUtil } from "../../../utils/jwt.util";

describe("JwtUtil", () => {
  const mockUserId = 123;
  const mockEmail = "test@example.com";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generateAccessToken", () => {
    it("should generate an access token with correct payload", () => {
      const token = JwtUtil.generateAccessToken({
        userId: mockUserId,
        email: mockEmail,
      });

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
    });

    it("should include userId and email in payload", () => {
      const token = JwtUtil.generateAccessToken({
        userId: mockUserId,
        email: mockEmail,
      });
      const decoded = JwtUtil.decode(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(mockUserId);
      expect(decoded?.email).toBe(mockEmail);
    });
  });

  describe("generateRefreshToken", () => {
    it("should generate a refresh token with correct payload", () => {
      const token = JwtUtil.generateRefreshToken({
        userId: mockUserId,
        email: mockEmail,
      });

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
    });

    it("should include userId and email in payload", () => {
      const token = JwtUtil.generateRefreshToken({
        userId: mockUserId,
        email: mockEmail,
      });
      const decoded = JwtUtil.decode(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(mockUserId);
      expect(decoded?.email).toBe(mockEmail);
    });
  });

  describe("generateTokenPair", () => {
    it("should generate both access and refresh tokens", () => {
      const tokens = JwtUtil.generateTokenPair({
        userId: mockUserId,
        email: mockEmail,
      });

      expect(tokens).toBeDefined();
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(typeof tokens.accessToken).toBe("string");
      expect(typeof tokens.refreshToken).toBe("string");
    });

    it("should generate different access and refresh tokens", () => {
      const tokens = JwtUtil.generateTokenPair({
        userId: mockUserId,
        email: mockEmail,
      });

      expect(tokens.accessToken).not.toBe(tokens.refreshToken);
    });
  });

  describe("verifyAccessToken", () => {
    it("should verify valid access token", () => {
      const token = JwtUtil.generateAccessToken({
        userId: mockUserId,
        email: mockEmail,
      });
      const payload = JwtUtil.verifyAccessToken(token);

      expect(payload).toBeDefined();
      expect(payload.userId).toBe(mockUserId);
      expect(payload.email).toBe(mockEmail);
    });

    it("should throw error for invalid token", () => {
      expect(() => {
        JwtUtil.verifyAccessToken("invalid.token.here");
      }).toThrow();
    });

    it("should throw error for empty token", () => {
      expect(() => {
        JwtUtil.verifyAccessToken("");
      }).toThrow();
    });
  });

  describe("verifyRefreshToken", () => {
    it("should verify valid refresh token", () => {
      const token = JwtUtil.generateRefreshToken({
        userId: mockUserId,
        email: mockEmail,
      });
      const payload = JwtUtil.verifyRefreshToken(token);

      expect(payload).toBeDefined();
      expect(payload.userId).toBe(mockUserId);
      expect(payload.email).toBe(mockEmail);
    });

    it("should throw error for invalid token", () => {
      expect(() => {
        JwtUtil.verifyRefreshToken("invalid.token.here");
      }).toThrow();
    });
  });

  describe("decode", () => {
    it("should decode token without verification", () => {
      const token = JwtUtil.generateAccessToken({
        userId: mockUserId,
        email: mockEmail,
      });
      const decoded = JwtUtil.decode(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(mockUserId);
      expect(decoded?.email).toBe(mockEmail);
    });

    it("should return null for invalid token format", () => {
      const decoded = JwtUtil.decode("invalid-token");

      expect(decoded).toBeNull();
    });

    it("should decode refresh token", () => {
      const token = JwtUtil.generateRefreshToken({
        userId: mockUserId,
        email: mockEmail,
      });
      const decoded = JwtUtil.decode(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(mockUserId);
      expect(decoded?.email).toBe(mockEmail);
    });
  });
});
