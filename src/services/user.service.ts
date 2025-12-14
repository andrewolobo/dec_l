import { userRepository, postRepository } from "../dal/repositories";
import {
  UserProfileDTO,
  UpdateProfileDTO,
  ChangePasswordDTO,
  ResetPasswordRequestDTO,
  ResetPasswordDTO,
  UserPostsSummaryDTO,
} from "../types/user/user.types";
import { PasswordUtil } from "../utils";
import { ApiResponse, ErrorCode } from "../types/common/api-response.types";

/**
 * User service
 */
export class UserService {
  /**
   * Get user profile by ID
   */
  async getProfile(userId: number): Promise<ApiResponse<UserProfileDTO>> {
    try {
      const user = await userRepository.findById(userId);

      if (!user) {
        return {
          success: false,
          error: {
            code: ErrorCode.RESOURCE_NOT_FOUND,
            message: "User not found",
            statusCode: 404,
          },
        };
      }

      return {
        success: true,
        data: {
          id: user.id,
          fullName: user.fullName,
          emailAddress: user.email,
          phoneNumber: user.phoneNumber || undefined,
          profilePictureUrl: user.profilePictureUrl || undefined,
          location: user.location || undefined,
          bio: user.bio || undefined,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to get user profile",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: number,
    data: UpdateProfileDTO
  ): Promise<ApiResponse<UserProfileDTO>> {
    try {
      const user = await userRepository.findById(userId);

      if (!user) {
        return {
          success: false,
          error: {
            code: ErrorCode.RESOURCE_NOT_FOUND,
            message: "User not found",
            statusCode: 404,
          },
        };
      }

      const updatedUser = await userRepository.update(userId, data);

      return {
        success: true,
        data: {
          id: updatedUser.id,
          fullName: updatedUser.fullName,
          emailAddress: updatedUser.email,
          phoneNumber: updatedUser.phoneNumber || undefined,
          profilePictureUrl: updatedUser.profilePictureUrl || undefined,
          location: updatedUser.location || undefined,
          bio: updatedUser.bio || undefined,
          isEmailVerified: updatedUser.isEmailVerified,
          isPhoneVerified: updatedUser.isPhoneVerified,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to update profile",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: number,
    data: ChangePasswordDTO
  ): Promise<ApiResponse<{ message: string }>> {
    try {
      const user = await userRepository.findById(userId);

      if (!user) {
        return {
          success: false,
          error: {
            code: ErrorCode.RESOURCE_NOT_FOUND,
            message: "User not found",
            statusCode: 404,
          },
        };
      }

      // Check if user has a password (not OAuth user)
      if (!user.passwordHash) {
        return {
          success: false,
          error: {
            code: ErrorCode.BAD_REQUEST,
            message: "Cannot change password for OAuth users",
            statusCode: 400,
          },
        };
      }

      // Verify current password
      const isValidPassword = await PasswordUtil.verify(
        data.currentPassword,
        user.passwordHash
      );

      if (!isValidPassword) {
        return {
          success: false,
          error: {
            code: ErrorCode.INVALID_CREDENTIALS,
            message: "Current password is incorrect",
            statusCode: 401,
          },
        };
      }

      // Validate new password strength
      const passwordValidation = PasswordUtil.validateStrength(
        data.newPassword
      );
      if (!passwordValidation.valid) {
        return {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: passwordValidation.errors.join(", "),
            statusCode: 400,
          },
        };
      }

      // Hash new password
      const hashedPassword = await PasswordUtil.hash(data.newPassword);

      // Update password
      await userRepository.update(userId, {
        passwordHash: hashedPassword,
      });

      return {
        success: true,
        data: {
          message: "Password changed successfully",
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to change password",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Request password reset (generate reset token)
   */
  async requestPasswordReset(
    data: ResetPasswordRequestDTO
  ): Promise<ApiResponse<{ message: string }>> {
    try {
      const user = await userRepository.findByEmail(data.emailAddress);

      if (!user) {
        // Return success even if user doesn't exist (security best practice)
        return {
          success: true,
          data: {
            message: "If the email exists, a reset link will be sent",
          },
        };
      }

      // Check if user has a password (not OAuth user)
      if (!user.passwordHash) {
        return {
          success: true,
          data: {
            message: "If the email exists, a reset link will be sent",
          },
        };
      }

      // TODO: Generate reset token and send email
      // For now, return success message
      // In production:
      // 1. Generate unique token
      // 2. Store token with expiry in database
      // 3. Send email with reset link

      return {
        success: true,
        data: {
          message: "If the email exists, a reset link will be sent",
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to process password reset request",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Reset password using reset token
   */
  async resetPassword(
    data: ResetPasswordDTO
  ): Promise<ApiResponse<{ message: string }>> {
    try {
      // TODO: Verify reset token
      // In production:
      // 1. Find token in database
      // 2. Check if token is expired
      // 3. Get user ID from token
      // 4. Update password
      // 5. Invalidate token

      // Validate new password strength
      const passwordValidation = PasswordUtil.validateStrength(
        data.newPassword
      );
      if (!passwordValidation.valid) {
        return {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: passwordValidation.errors.join(", "),
            statusCode: 400,
          },
        };
      }

      return {
        success: false,
        error: {
          code: ErrorCode.NOT_IMPLEMENTED,
          message: "Password reset not yet implemented",
          statusCode: 501,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to reset password",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Get user's posts summary
   */
  async getPostsSummary(
    userId: number
  ): Promise<ApiResponse<UserPostsSummaryDTO>> {
    try {
      const user = await userRepository.findById(userId);

      if (!user) {
        return {
          success: false,
          error: {
            code: ErrorCode.RESOURCE_NOT_FOUND,
            message: "User not found",
            statusCode: 404,
          },
        };
      }

      const posts = await postRepository.findAll({
        where: { userId },
      });

      const summary: UserPostsSummaryDTO = {
        totalPosts: posts.length,
        activePosts: posts.filter((p: any) => p.status === "Active").length,
        expiredPosts: posts.filter((p: any) => p.status === "Expired").length,
        draftPosts: posts.filter((p: any) => p.status === "Draft").length,
      };

      return {
        success: true,
        data: summary,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to get posts summary",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(
    userId: number
  ): Promise<ApiResponse<{ message: string }>> {
    try {
      const user = await userRepository.findById(userId);

      if (!user) {
        return {
          success: false,
          error: {
            code: ErrorCode.RESOURCE_NOT_FOUND,
            message: "User not found",
            statusCode: 404,
          },
        };
      }

      // Delete user (cascade will handle related data)
      await userRepository.delete(userId);

      return {
        success: true,
        data: {
          message: "Account deleted successfully",
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to delete account",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Verify user email
   */
  async verifyEmail(userId: number): Promise<ApiResponse<{ message: string }>> {
    try {
      const user = await userRepository.findById(userId);

      if (!user) {
        return {
          success: false,
          error: {
            code: ErrorCode.RESOURCE_NOT_FOUND,
            message: "User not found",
            statusCode: 404,
          },
        };
      }

      if (user.isEmailVerified) {
        return {
          success: true,
          data: {
            message: "Email already verified",
          },
        };
      }

      await userRepository.update(userId, {
        isEmailVerified: true,
      });

      return {
        success: true,
        data: {
          message: "Email verified successfully",
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to verify email",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Verify user phone
   */
  async verifyPhone(userId: number): Promise<ApiResponse<{ message: string }>> {
    try {
      const user = await userRepository.findById(userId);

      if (!user) {
        return {
          success: false,
          error: {
            code: ErrorCode.RESOURCE_NOT_FOUND,
            message: "User not found",
            statusCode: 404,
          },
        };
      }

      if (user.isPhoneVerified) {
        return {
          success: true,
          data: {
            message: "Phone already verified",
          },
        };
      }

      await userRepository.update(userId, {
        isPhoneVerified: true,
      });

      return {
        success: true,
        data: {
          message: "Phone verified successfully",
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to verify phone",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }
}

// Export singleton instance
export const userService = new UserService();
