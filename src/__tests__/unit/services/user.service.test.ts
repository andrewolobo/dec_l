import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { UserService } from "../../../services/user.service";
import { userRepository, postRepository } from "../../../dal/repositories";
import { createMockUser, createMockPost } from "../../helpers/test-data";
import { ErrorCode } from "../../../types/common/api-response.types";
import { PasswordUtil } from "../../../utils/password.util";

type MockedFunction = jest.MockedFunction<any>;

// Mock repositories
jest.mock("../../../dal/repositories", () => ({
  userRepository: {
    findById: jest.fn<any>(),
    findByEmail: jest.fn<any>(),
    update: jest.fn<any>(),
    delete: jest.fn<any>(),
  },
  postRepository: {
    findAll: jest.fn<any>(),
  },
}));

// Mock PasswordUtil
jest.mock("../../../utils/password.util");

describe("UserService", () => {
  let userService: UserService;
  let mockUser: any;

  beforeEach(() => {
    jest.clearAllMocks();
    userService = new UserService();
    mockUser = createMockUser();
  });

  describe("getProfile", () => {
    it("should get user profile successfully", async () => {
      // Arrange
      (userRepository.findById as MockedFunction).mockResolvedValue(mockUser);

      // Act
      const result = await userService.getProfile(mockUser.id);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe(mockUser.id);
      expect(result.data?.fullName).toBe(mockUser.fullName);
      expect(result.data?.emailAddress).toBe(mockUser.email);
      expect(userRepository.findById).toHaveBeenCalledWith(mockUser.id);
    });

    it("should return error when user not found", async () => {
      // Arrange
      (userRepository.findById as MockedFunction).mockResolvedValue(null);

      // Act
      const result = await userService.getProfile(999);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      expect(result.error?.statusCode).toBe(404);
      expect(result.error?.message).toBe("User not found");
    });

    it("should handle database error", async () => {
      // Arrange
      (userRepository.findById as MockedFunction).mockRejectedValue(
        new Error("Database error")
      );

      // Act
      const result = await userService.getProfile(mockUser.id);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(result.error?.statusCode).toBe(500);
      expect(result.error?.message).toBe("Failed to get user profile");
    });
  });

  describe("updateProfile", () => {
    it("should update profile successfully", async () => {
      // Arrange
      const updateData = {
        fullName: "Updated Name",
        location: "New City",
      };
      const updatedUser = { ...mockUser, ...updateData };

      (userRepository.findById as MockedFunction).mockResolvedValue(mockUser);
      (userRepository.update as MockedFunction).mockResolvedValue(updatedUser);

      // Act
      const result = await userService.updateProfile(mockUser.id, updateData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.fullName).toBe("Updated Name");
      expect(result.data?.location).toBe("New City");
      expect(userRepository.update).toHaveBeenCalledWith(
        mockUser.id,
        updateData
      );
    });

    it("should return error when user not found", async () => {
      // Arrange
      (userRepository.findById as MockedFunction).mockResolvedValue(null);

      // Act
      const result = await userService.updateProfile(999, {});

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      expect(result.error?.statusCode).toBe(404);
    });

    it("should handle database error during update", async () => {
      // Arrange
      (userRepository.findById as MockedFunction).mockResolvedValue(mockUser);
      (userRepository.update as MockedFunction).mockRejectedValue(
        new Error("Database error")
      );

      // Act
      const result = await userService.updateProfile(mockUser.id, {
        fullName: "New Name",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(result.error?.statusCode).toBe(500);
    });
  });

  describe("changePassword", () => {
    it("should change password successfully", async () => {
      // Arrange
      const changePasswordData = {
        currentPassword: "OldPassword123!",
        newPassword: "NewPassword123!",
      };

      (userRepository.findById as MockedFunction).mockResolvedValue(mockUser);
      (PasswordUtil.verify as jest.MockedFunction<any>).mockResolvedValue(true);
      (
        PasswordUtil.validateStrength as jest.MockedFunction<any>
      ).mockReturnValue({
        valid: true,
        errors: [],
      });
      (PasswordUtil.hash as jest.MockedFunction<any>).mockResolvedValue(
        "$2b$12$newHashedPassword"
      );
      (userRepository.update as MockedFunction).mockResolvedValue(mockUser);

      // Act
      const result = await userService.changePassword(
        mockUser.id,
        changePasswordData
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.message).toBe("Password changed successfully");
      expect(PasswordUtil.verify).toHaveBeenCalledWith(
        changePasswordData.currentPassword,
        mockUser.passwordHash
      );
      expect(PasswordUtil.hash).toHaveBeenCalledWith(
        changePasswordData.newPassword
      );
    });

    it("should return error when user not found", async () => {
      // Arrange
      (userRepository.findById as MockedFunction).mockResolvedValue(null);

      // Act
      const result = await userService.changePassword(999, {
        currentPassword: "old",
        newPassword: "new",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      expect(result.error?.statusCode).toBe(404);
    });

    it("should reject password change for OAuth users", async () => {
      // Arrange
      const oauthUser = createMockUser({ passwordHash: null });
      (userRepository.findById as MockedFunction).mockResolvedValue(oauthUser);

      // Act
      const result = await userService.changePassword(oauthUser.id, {
        currentPassword: "old",
        newPassword: "new",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.BAD_REQUEST);
      expect(result.error?.message).toBe(
        "Cannot change password for OAuth users"
      );
      expect(result.error?.statusCode).toBe(400);
    });

    it("should reject incorrect current password", async () => {
      // Arrange
      (userRepository.findById as MockedFunction).mockResolvedValue(mockUser);
      (PasswordUtil.verify as jest.MockedFunction<any>).mockResolvedValue(
        false
      );

      // Act
      const result = await userService.changePassword(mockUser.id, {
        currentPassword: "WrongPassword123!",
        newPassword: "NewPassword123!",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INVALID_CREDENTIALS);
      expect(result.error?.message).toBe("Current password is incorrect");
      expect(result.error?.statusCode).toBe(401);
    });

    it("should reject weak new password", async () => {
      // Arrange
      (userRepository.findById as MockedFunction).mockResolvedValue(mockUser);
      (PasswordUtil.verify as jest.MockedFunction<any>).mockResolvedValue(true);
      (
        PasswordUtil.validateStrength as jest.MockedFunction<any>
      ).mockReturnValue({
        valid: false,
        errors: ["Password too weak"],
      });

      // Act
      const result = await userService.changePassword(mockUser.id, {
        currentPassword: "OldPassword123!",
        newPassword: "weak",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(result.error?.statusCode).toBe(400);
    });

    it("should handle database error during password change", async () => {
      // Arrange
      (userRepository.findById as MockedFunction).mockResolvedValue(mockUser);
      (PasswordUtil.verify as jest.MockedFunction<any>).mockResolvedValue(true);
      (
        PasswordUtil.validateStrength as jest.MockedFunction<any>
      ).mockReturnValue({
        valid: true,
        errors: [],
      });
      (PasswordUtil.hash as jest.MockedFunction<any>).mockResolvedValue(
        "$2b$12$newHashedPassword"
      );
      (userRepository.update as MockedFunction).mockRejectedValue(
        new Error("Database error")
      );

      // Act
      const result = await userService.changePassword(mockUser.id, {
        currentPassword: "OldPassword123!",
        newPassword: "NewPassword123!",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(result.error?.statusCode).toBe(500);
    });
  });

  describe("requestPasswordReset", () => {
    it("should return success message when user exists", async () => {
      // Arrange
      (userRepository.findByEmail as MockedFunction).mockResolvedValue(
        mockUser
      );

      // Act
      const result = await userService.requestPasswordReset({
        emailAddress: mockUser.email,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.message).toBe(
        "If the email exists, a reset link will be sent"
      );
    });

    it("should return success message even when user not found (security)", async () => {
      // Arrange
      (userRepository.findByEmail as MockedFunction).mockResolvedValue(null);

      // Act
      const result = await userService.requestPasswordReset({
        emailAddress: "nonexistent@example.com",
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.message).toBe(
        "If the email exists, a reset link will be sent"
      );
    });

    it("should return success message for OAuth users (no password reset)", async () => {
      // Arrange
      const oauthUser = createMockUser({ passwordHash: null });
      (userRepository.findByEmail as MockedFunction).mockResolvedValue(
        oauthUser
      );

      // Act
      const result = await userService.requestPasswordReset({
        emailAddress: oauthUser.email,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.message).toBe(
        "If the email exists, a reset link will be sent"
      );
    });

    it("should handle database error", async () => {
      // Arrange
      (userRepository.findByEmail as MockedFunction).mockRejectedValue(
        new Error("Database error")
      );

      // Act
      const result = await userService.requestPasswordReset({
        emailAddress: "test@example.com",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(result.error?.statusCode).toBe(500);
    });
  });

  describe("resetPassword", () => {
    it("should validate password strength", async () => {
      // Arrange
      (
        PasswordUtil.validateStrength as jest.MockedFunction<any>
      ).mockReturnValue({
        valid: false,
        errors: ["Password too weak"],
      });

      // Act
      const result = await userService.resetPassword({
        token: "reset-token",
        newPassword: "weak",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(result.error?.statusCode).toBe(400);
    });

    it("should return not implemented error", async () => {
      // Arrange
      (
        PasswordUtil.validateStrength as jest.MockedFunction<any>
      ).mockReturnValue({
        valid: true,
        errors: [],
      });

      // Act
      const result = await userService.resetPassword({
        token: "reset-token",
        newPassword: "StrongPassword123!",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.NOT_IMPLEMENTED);
      expect(result.error?.statusCode).toBe(501);
      expect(result.error?.message).toBe("Password reset not yet implemented");
    });
  });

  describe("getPostsSummary", () => {
    it("should get posts summary successfully", async () => {
      // Arrange
      const posts = [
        createMockPost(mockUser.id, 1, { status: "Active" }),
        createMockPost(mockUser.id, 1, { status: "Active" }),
        createMockPost(mockUser.id, 1, { status: "Draft" }),
        createMockPost(mockUser.id, 1, { status: "Expired" }),
      ];

      (userRepository.findById as MockedFunction).mockResolvedValue(mockUser);
      (postRepository.findAll as MockedFunction).mockResolvedValue(posts);

      // Act
      const result = await userService.getPostsSummary(mockUser.id);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.totalPosts).toBe(4);
      expect(result.data?.activePosts).toBe(2);
      expect(result.data?.draftPosts).toBe(1);
      expect(result.data?.expiredPosts).toBe(1);
      expect(postRepository.findAll).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
      });
    });

    it("should return error when user not found", async () => {
      // Arrange
      (userRepository.findById as MockedFunction).mockResolvedValue(null);

      // Act
      const result = await userService.getPostsSummary(999);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      expect(result.error?.statusCode).toBe(404);
    });

    it("should return zero counts when user has no posts", async () => {
      // Arrange
      (userRepository.findById as MockedFunction).mockResolvedValue(mockUser);
      (postRepository.findAll as MockedFunction).mockResolvedValue([]);

      // Act
      const result = await userService.getPostsSummary(mockUser.id);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.totalPosts).toBe(0);
      expect(result.data?.activePosts).toBe(0);
      expect(result.data?.draftPosts).toBe(0);
      expect(result.data?.expiredPosts).toBe(0);
    });

    it("should handle database error", async () => {
      // Arrange
      (userRepository.findById as MockedFunction).mockResolvedValue(mockUser);
      (postRepository.findAll as MockedFunction).mockRejectedValue(
        new Error("Database error")
      );

      // Act
      const result = await userService.getPostsSummary(mockUser.id);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(result.error?.statusCode).toBe(500);
    });
  });

  describe("deleteAccount", () => {
    it("should delete account successfully", async () => {
      // Arrange
      (userRepository.findById as MockedFunction).mockResolvedValue(mockUser);
      (userRepository.delete as MockedFunction).mockResolvedValue({});

      // Act
      const result = await userService.deleteAccount(mockUser.id);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.message).toBe("Account deleted successfully");
      expect(userRepository.delete).toHaveBeenCalledWith(mockUser.id);
    });

    it("should return error when user not found", async () => {
      // Arrange
      (userRepository.findById as MockedFunction).mockResolvedValue(null);

      // Act
      const result = await userService.deleteAccount(999);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      expect(result.error?.statusCode).toBe(404);
    });

    it("should handle database error during deletion", async () => {
      // Arrange
      (userRepository.findById as MockedFunction).mockResolvedValue(mockUser);
      (userRepository.delete as MockedFunction).mockRejectedValue(
        new Error("Database error")
      );

      // Act
      const result = await userService.deleteAccount(mockUser.id);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(result.error?.statusCode).toBe(500);
    });
  });

  describe("verifyEmail", () => {
    it("should verify email successfully", async () => {
      // Arrange
      const unverifiedUser = { ...mockUser, isEmailVerified: false };
      (userRepository.findById as MockedFunction).mockResolvedValue(unverifiedUser);
      (userRepository.update as MockedFunction).mockResolvedValue({ ...unverifiedUser, isEmailVerified: true });

      // Act
      const result = await userService.verifyEmail(mockUser.id);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.message).toBe("Email verified successfully");
      expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, { isEmailVerified: true });
    });

    it("should return already verified message when email already verified", async () => {
      // Arrange
      const verifiedUser = { ...mockUser, isEmailVerified: true };
      (userRepository.findById as MockedFunction).mockResolvedValue(verifiedUser);

      // Act
      const result = await userService.verifyEmail(mockUser.id);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.message).toBe("Email already verified");
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it("should return error when user not found", async () => {
      // Arrange
      (userRepository.findById as MockedFunction).mockResolvedValue(null);

      // Act
      const result = await userService.verifyEmail(999);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      expect(result.error?.statusCode).toBe(404);
    });

    it("should handle database error", async () => {
      // Arrange
      (userRepository.findById as MockedFunction).mockRejectedValue(
        new Error("Database error")
      );

      // Act
      const result = await userService.verifyEmail(mockUser.id);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(result.error?.statusCode).toBe(500);
    });
  });

  describe("verifyPhone", () => {
    it("should verify phone successfully", async () => {
      // Arrange
      const unverifiedUser = { ...mockUser, isPhoneVerified: false };
      (userRepository.findById as MockedFunction).mockResolvedValue(unverifiedUser);
      (userRepository.update as MockedFunction).mockResolvedValue({ ...unverifiedUser, isPhoneVerified: true });

      // Act
      const result = await userService.verifyPhone(mockUser.id);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.message).toBe("Phone verified successfully");
      expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, { isPhoneVerified: true });
    });

    it("should return already verified message when phone already verified", async () => {
      // Arrange
      const verifiedUser = { ...mockUser, isPhoneVerified: true };
      (userRepository.findById as MockedFunction).mockResolvedValue(verifiedUser);

      // Act
      const result = await userService.verifyPhone(mockUser.id);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.message).toBe("Phone already verified");
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it("should return error when user not found", async () => {
      // Arrange
      (userRepository.findById as MockedFunction).mockResolvedValue(null);

      // Act
      const result = await userService.verifyPhone(999);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      expect(result.error?.statusCode).toBe(404);
    });

    it("should handle database error", async () => {
      // Arrange
      (userRepository.findById as MockedFunction).mockRejectedValue(
        new Error("Database error")
      );

      // Act
      const result = await userService.verifyPhone(mockUser.id);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(result.error?.statusCode).toBe(500);
    });
  });
});
