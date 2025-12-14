import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { AuthService } from "../../../services/auth.service";
import { userRepository } from "../../../dal/repositories";
import { createMockUser } from "../../helpers/test-data";
import { ErrorCode } from "../../../types/common/api-response.types";
import { PasswordUtil } from "../../../utils/password.util";
import { JwtUtil } from "../../../utils/jwt.util";
import axios from "axios";

type MockedFunction = jest.MockedFunction<any>;

// Mock repositories
jest.mock("../../../dal/repositories", () => ({
  userRepository: {
    findByEmail: jest.fn<any>(),
    findByOAuth: jest.fn<any>(),
    create: jest.fn<any>(),
  },
  postRepository: {},
  categoryRepository: {},
  likeRepository: {},
  viewRepository: {},
  postImageRepository: {},
  paymentRepository: {},
}));

// Mock utilities
jest.mock("../../../utils/password.util");
jest.mock("../../../utils/jwt.util");

// Mock axios
jest.mock("axios");

describe("AuthService", () => {
  let authService: AuthService;
  let mockUser: any;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService();
    mockUser = createMockUser({ oauthProvider: "Local" });
  });

  describe("register", () => {
    it("should register a new user successfully", async () => {
      // Arrange
      const registerData = {
        emailAddress: "newuser@example.com",
        password: "StrongPassword123!",
        fullName: "New User",
        phoneNumber: "1234567890",
      };

      (userRepository.findByEmail as MockedFunction).mockResolvedValue(null);
      (PasswordUtil.validateStrength as MockedFunction).mockReturnValue({
        valid: true,
        errors: [],
      });
      (PasswordUtil.hash as MockedFunction).mockResolvedValue(
        "$2b$12$hashedPassword"
      );
      (userRepository.create as MockedFunction).mockResolvedValue(mockUser);
      (JwtUtil.generateTokenPair as MockedFunction).mockReturnValue({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });

      // Act
      const result = await authService.register(registerData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.user).toBeDefined();
      expect(result.data?.user.id).toBe(mockUser.id);
      expect(result.data?.tokens).toBeDefined();
      expect(result.data?.tokens.accessToken).toBe("access-token");
      expect(result.data?.tokens.refreshToken).toBe("refresh-token");
      expect(userRepository.findByEmail).toHaveBeenCalledWith(
        registerData.emailAddress
      );
      expect(PasswordUtil.hash).toHaveBeenCalledWith(registerData.password);
      expect(userRepository.create).toHaveBeenCalled();
    });

    it("should return error when email already exists", async () => {
      // Arrange
      (userRepository.findByEmail as MockedFunction).mockResolvedValue(
        mockUser
      );

      // Act
      const result = await authService.register({
        emailAddress: mockUser.email,
        password: "Password123!",
        fullName: "Test User",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.RESOURCE_ALREADY_EXISTS);
      expect(result.error?.statusCode).toBe(409);
      expect(result.error?.message).toBe("Email address already registered");
    });

    it("should return error when password is weak", async () => {
      // Arrange
      (userRepository.findByEmail as MockedFunction).mockResolvedValue(null);
      (PasswordUtil.validateStrength as MockedFunction).mockReturnValue({
        valid: false,
        errors: ["Password too weak", "Missing special character"],
      });

      // Act
      const result = await authService.register({
        emailAddress: "test@example.com",
        password: "weak",
        fullName: "Test User",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(result.error?.statusCode).toBe(400);
      expect(result.error?.message).toContain("Password too weak");
    });

    it("should handle database error during registration", async () => {
      // Arrange
      (userRepository.findByEmail as MockedFunction).mockResolvedValue(null);
      (PasswordUtil.validateStrength as MockedFunction).mockReturnValue({
        valid: true,
        errors: [],
      });
      (PasswordUtil.hash as MockedFunction).mockResolvedValue(
        "$2b$12$hashedPassword"
      );
      (userRepository.create as MockedFunction).mockRejectedValue(
        new Error("Database error")
      );

      // Act
      const result = await authService.register({
        emailAddress: "test@example.com",
        password: "StrongPassword123!",
        fullName: "Test User",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(result.error?.statusCode).toBe(500);
      expect(result.error?.message).toBe("Failed to register user");
    });

    it("should create user with optional phone number", async () => {
      // Arrange
      (userRepository.findByEmail as MockedFunction).mockResolvedValue(null);
      (PasswordUtil.validateStrength as MockedFunction).mockReturnValue({
        valid: true,
        errors: [],
      });
      (PasswordUtil.hash as MockedFunction).mockResolvedValue(
        "$2b$12$hashedPassword"
      );
      (userRepository.create as MockedFunction).mockResolvedValue(mockUser);
      (JwtUtil.generateTokenPair as MockedFunction).mockReturnValue({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });

      // Act
      const result = await authService.register({
        emailAddress: "test@example.com",
        password: "StrongPassword123!",
        fullName: "Test User",
        // No phone number provided
      });

      // Assert
      expect(result.success).toBe(true);
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          phoneNumber: "",
        })
      );
    });
  });

  describe("login", () => {
    it("should login successfully with valid credentials", async () => {
      // Arrange
      const loginData = {
        emailAddress: mockUser.email,
        password: "CorrectPassword123!",
      };

      (userRepository.findByEmail as MockedFunction).mockResolvedValue(
        mockUser
      );
      (PasswordUtil.verify as MockedFunction).mockResolvedValue(true);
      (JwtUtil.generateTokenPair as MockedFunction).mockReturnValue({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });

      // Act
      const result = await authService.login(loginData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.user).toBeDefined();
      expect(result.data?.user.id).toBe(mockUser.id);
      expect(result.data?.tokens).toBeDefined();
      expect(PasswordUtil.verify).toHaveBeenCalledWith(
        loginData.password,
        mockUser.passwordHash
      );
    });

    it("should return error when user not found", async () => {
      // Arrange
      (userRepository.findByEmail as MockedFunction).mockResolvedValue(null);

      // Act
      const result = await authService.login({
        emailAddress: "nonexistent@example.com",
        password: "Password123!",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INVALID_CREDENTIALS);
      expect(result.error?.statusCode).toBe(401);
      expect(result.error?.message).toBe("Invalid email or password");
    });

    it("should return error when user has no password (OAuth user)", async () => {
      // Arrange
      const oauthUser = createMockUser({ passwordHash: null });
      (userRepository.findByEmail as MockedFunction).mockResolvedValue(
        oauthUser
      );

      // Act
      const result = await authService.login({
        emailAddress: oauthUser.email,
        password: "Password123!",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INVALID_CREDENTIALS);
      expect(result.error?.statusCode).toBe(401);
      expect(result.error?.message).toBe("Invalid email or password");
    });

    it("should return error when password is incorrect", async () => {
      // Arrange
      (userRepository.findByEmail as MockedFunction).mockResolvedValue(
        mockUser
      );
      (PasswordUtil.verify as MockedFunction).mockResolvedValue(false);

      // Act
      const result = await authService.login({
        emailAddress: mockUser.email,
        password: "WrongPassword123!",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INVALID_CREDENTIALS);
      expect(result.error?.statusCode).toBe(401);
      expect(result.error?.message).toBe("Invalid email or password");
    });

    it("should handle database error during login", async () => {
      // Arrange
      (userRepository.findByEmail as MockedFunction).mockRejectedValue(
        new Error("Database error")
      );

      // Act
      const result = await authService.login({
        emailAddress: "test@example.com",
        password: "Password123!",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(result.error?.statusCode).toBe(500);
      expect(result.error?.message).toBe("Failed to login");
    });
  });

  describe("oauthLogin", () => {
    it("should login existing OAuth user successfully (Google)", async () => {
      // Arrange
      const oauthUser = createMockUser({
        oauthProvider: "Google",
        oauthProviderId: "google-123",
        isEmailVerified: true, // OAuth users have verified emails
      });
      const oauthData = {
        provider: "Google" as const,
        accessToken: "google-access-token",
      };

      (axios.get as MockedFunction).mockResolvedValue({
        data: {
          id: "google-123",
          email: "test@gmail.com",
          name: "Test User",
          picture: "https://example.com/pic.jpg",
        },
      });
      (userRepository.findByOAuth as MockedFunction).mockResolvedValue(
        oauthUser
      );
      (JwtUtil.generateTokenPair as MockedFunction).mockReturnValue({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });

      // Act
      const result = await authService.oauthLogin(oauthData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.user).toBeDefined();
      expect(result.data?.user.id).toBe(oauthUser.id);
      expect(result.data?.user.isEmailVerified).toBe(true);
      expect(result.data?.tokens).toBeDefined();
      expect(userRepository.findByOAuth).toHaveBeenCalledWith(
        "Google",
        "google-123"
      );
    });

    it("should create new OAuth user when not exists (Google)", async () => {
      // Arrange
      const newUser = createMockUser({
        oauthProvider: "Google",
        oauthProviderId: "google-456",
      });
      const oauthData = {
        provider: "Google" as const,
        accessToken: "google-access-token",
      };

      (axios.get as MockedFunction).mockResolvedValue({
        data: {
          id: "google-456",
          email: "newuser@gmail.com",
          name: "New User",
          picture: "https://example.com/pic.jpg",
        },
      });
      (userRepository.findByOAuth as MockedFunction).mockResolvedValue(null);
      (userRepository.create as MockedFunction).mockResolvedValue(newUser);
      (JwtUtil.generateTokenPair as MockedFunction).mockReturnValue({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });

      // Act
      const result = await authService.oauthLogin(oauthData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.user).toBeDefined();
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "newuser@gmail.com",
          fullName: "New User",
          oauthProvider: "Google",
          oauthProviderId: "google-456",
        })
      );
    });

    it("should login existing OAuth user successfully (Microsoft)", async () => {
      // Arrange
      const oauthUser = createMockUser({
        oauthProvider: "Microsoft",
        oauthProviderId: "microsoft-123",
      });
      const oauthData = {
        provider: "Microsoft" as const,
        accessToken: "microsoft-access-token",
      };

      (axios.get as MockedFunction).mockResolvedValue({
        data: {
          id: "microsoft-123",
          mail: "test@outlook.com",
          displayName: "Test User",
        },
      });
      (userRepository.findByOAuth as MockedFunction).mockResolvedValue(
        oauthUser
      );
      (JwtUtil.generateTokenPair as MockedFunction).mockReturnValue({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });

      // Act
      const result = await authService.oauthLogin(oauthData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.user).toBeDefined();
      expect(result.data?.user.id).toBe(oauthUser.id);
      expect(userRepository.findByOAuth).toHaveBeenCalledWith(
        "Microsoft",
        "microsoft-123"
      );
    });

    it("should handle Microsoft user with userPrincipalName instead of mail", async () => {
      // Arrange
      const newUser = createMockUser({
        oauthProvider: "Microsoft",
        oauthProviderId: "microsoft-789",
      });
      const oauthData = {
        provider: "Microsoft" as const,
        accessToken: "microsoft-access-token",
      };

      (axios.get as MockedFunction).mockResolvedValue({
        data: {
          id: "microsoft-789",
          userPrincipalName: "test@company.com",
          displayName: "Test User",
        },
      });
      (userRepository.findByOAuth as MockedFunction).mockResolvedValue(null);
      (userRepository.create as MockedFunction).mockResolvedValue(newUser);
      (JwtUtil.generateTokenPair as MockedFunction).mockReturnValue({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });

      // Act
      const result = await authService.oauthLogin(oauthData);

      // Assert
      expect(result.success).toBe(true);
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "test@company.com",
        })
      );
    });

    it("should return error when OAuth provider fails", async () => {
      // Arrange
      const oauthData = {
        provider: "Google" as const,
        accessToken: "invalid-token",
      };

      (axios.get as MockedFunction).mockRejectedValue(new Error("OAuth error"));

      // Act
      const result = await authService.oauthLogin(oauthData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.EXTERNAL_SERVICE_ERROR);
      expect(result.error?.statusCode).toBe(502);
      expect(result.error?.message).toBe(
        "Failed to get user info from OAuth provider"
      );
    });

    it("should handle database error during OAuth user creation", async () => {
      // Arrange
      const oauthData = {
        provider: "Google" as const,
        accessToken: "google-access-token",
      };

      (axios.get as MockedFunction).mockResolvedValue({
        data: {
          id: "google-789",
          email: "test@gmail.com",
          name: "Test User",
          picture: "https://example.com/pic.jpg",
        },
      });
      (userRepository.findByOAuth as MockedFunction).mockResolvedValue(null);
      (userRepository.create as MockedFunction).mockRejectedValue(
        new Error("Database error")
      );

      // Act
      const result = await authService.oauthLogin(oauthData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(result.error?.statusCode).toBe(500);
      expect(result.error?.message).toBe("Failed to login with OAuth");
    });
  });

  describe("refreshToken", () => {
    it("should refresh access token successfully", async () => {
      // Arrange
      const refreshTokenData = {
        refreshToken: "valid-refresh-token",
      };
      const mockPayload = {
        userId: mockUser.id,
        email: mockUser.email,
      };

      (JwtUtil.verifyRefreshToken as MockedFunction).mockReturnValue(
        mockPayload
      );
      (JwtUtil.generateAccessToken as MockedFunction).mockReturnValue(
        "new-access-token"
      );

      // Act
      const result = await authService.refreshToken(refreshTokenData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.accessToken).toBe("new-access-token");
      expect(JwtUtil.verifyRefreshToken).toHaveBeenCalledWith(
        refreshTokenData.refreshToken
      );
      expect(JwtUtil.generateAccessToken).toHaveBeenCalledWith({
        userId: mockPayload.userId,
        email: mockPayload.email,
      });
    });

    it("should return error when refresh token is invalid", async () => {
      // Arrange
      const refreshTokenData = {
        refreshToken: "invalid-refresh-token",
      };

      (JwtUtil.verifyRefreshToken as MockedFunction).mockImplementation(() => {
        throw new Error("Invalid token");
      });

      // Act
      const result = await authService.refreshToken(refreshTokenData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INVALID_TOKEN);
      expect(result.error?.statusCode).toBe(401);
      expect(result.error?.message).toBe("Invalid or expired refresh token");
    });

    it("should return error when refresh token is expired", async () => {
      // Arrange
      const refreshTokenData = {
        refreshToken: "expired-refresh-token",
      };

      (JwtUtil.verifyRefreshToken as MockedFunction).mockImplementation(() => {
        throw new Error("Token expired");
      });

      // Act
      const result = await authService.refreshToken(refreshTokenData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INVALID_TOKEN);
      expect(result.error?.statusCode).toBe(401);
    });
  });
});
