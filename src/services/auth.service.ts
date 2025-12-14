import axios from "axios";
import { userRepository } from "../dal/repositories";
import {
  RegisterDTO,
  LoginDTO,
  OAuthLoginDTO,
  AuthResponse,
  OAuthUserInfo,
  JwtPayload,
  RefreshTokenDTO,
} from "../types/auth/auth.types";
import { PasswordUtil, JwtUtil } from "../utils";
import { oauthConfig } from "../config";
import { ApiResponse, ErrorCode } from "../types/common/api-response.types";

/**
 * Authentication service
 */
export class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterDTO): Promise<ApiResponse<AuthResponse>> {
    try {
      // Check if email already exists
      const existingUser = await userRepository.findByEmail(data.emailAddress);
      if (existingUser) {
        return {
          success: false,
          error: {
            code: ErrorCode.RESOURCE_ALREADY_EXISTS,
            message: "Email address already registered",
            statusCode: 409,
          },
        };
      }

      // Validate password strength
      const passwordValidation = PasswordUtil.validateStrength(data.password);
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

      // Hash password
      const hashedPassword = await PasswordUtil.hash(data.password);

      // Create user
      const user = await userRepository.create({
        email: data.emailAddress,
        phoneNumber: data.phoneNumber || "",
        passwordHash: hashedPassword,
        fullName: data.fullName,
        oauthProvider: "Local",
      });

      // Generate tokens
      const payload: JwtPayload = {
        userId: user.id,
        email: user.email,
      };
      const tokens = JwtUtil.generateTokenPair(payload);

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            fullName: user.fullName,
            emailAddress: user.email,
            profilePictureUrl: user.profilePictureUrl || undefined,
            isEmailVerified: user.isEmailVerified,
          },
          tokens,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to register user",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Login with email and password
   */
  async login(data: LoginDTO): Promise<ApiResponse<AuthResponse>> {
    try {
      // Find user by email
      const user = await userRepository.findByEmail(data.emailAddress);
      if (!user || !user.passwordHash) {
        return {
          success: false,
          error: {
            code: ErrorCode.INVALID_CREDENTIALS,
            message: "Invalid email or password",
            statusCode: 401,
          },
        };
      }

      // Verify password
      const isValidPassword = await PasswordUtil.verify(
        data.password,
        user.passwordHash
      );
      if (!isValidPassword) {
        return {
          success: false,
          error: {
            code: ErrorCode.INVALID_CREDENTIALS,
            message: "Invalid email or password",
            statusCode: 401,
          },
        };
      }

      // Generate tokens
      const payload: JwtPayload = {
        userId: user.id,
        email: user.email,
      };
      const tokens = JwtUtil.generateTokenPair(payload);

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            fullName: user.fullName,
            emailAddress: user.email,
            profilePictureUrl: user.profilePictureUrl || undefined,
            isEmailVerified: user.isEmailVerified,
          },
          tokens,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to login",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * OAuth login (Google/Microsoft)
   */
  async oauthLogin(data: OAuthLoginDTO): Promise<ApiResponse<AuthResponse>> {
    try {
      // Get user info from OAuth provider
      const userInfo = await this.getOAuthUserInfo(
        data.provider,
        data.accessToken
      );

      if (!userInfo) {
        return {
          success: false,
          error: {
            code: ErrorCode.EXTERNAL_SERVICE_ERROR,
            message: "Failed to get user info from OAuth provider",
            statusCode: 502,
          },
        };
      }

      // Check if user exists
      let user = await userRepository.findByOAuth(data.provider, userInfo.id);

      if (!user) {
        // Create new user with email pre-verified for OAuth
        user = await userRepository.create({
          email: userInfo.email,
          phoneNumber: "", // OAuth users may not have phone
          fullName: userInfo.name,
          profilePictureUrl: userInfo.picture,
          oauthProvider: data.provider,
          oauthProviderId: userInfo.id,
          isEmailVerified: true, // OAuth emails are pre-verified
        });
      }

      // Generate tokens
      const payload: JwtPayload = {
        userId: user.id,
        email: user.email,
      };
      const tokens = JwtUtil.generateTokenPair(payload);

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            fullName: user.fullName,
            emailAddress: user.email,
            profilePictureUrl: user.profilePictureUrl || undefined,
            isEmailVerified: user.isEmailVerified,
          },
          tokens,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to login with OAuth",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(
    data: RefreshTokenDTO
  ): Promise<ApiResponse<{ accessToken: string }>> {
    try {
      // Verify refresh token
      const payload = JwtUtil.verifyRefreshToken(data.refreshToken);

      // Generate new access token
      const accessToken = JwtUtil.generateAccessToken({
        userId: payload.userId,
        email: payload.email,
      });

      return {
        success: true,
        data: { accessToken },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INVALID_TOKEN,
          message: "Invalid or expired refresh token",
          statusCode: 401,
        },
      };
    }
  }

  /**
   * Get user info from OAuth provider
   */
  private async getOAuthUserInfo(
    provider: "Google" | "Microsoft" | "Facebook",
    accessToken: string
  ): Promise<OAuthUserInfo | null> {
    try {
      let config;
      if (provider === "Google") {
        config = oauthConfig.google;
      } else if (provider === "Microsoft") {
        config = oauthConfig.microsoft;
      } else {
        config = oauthConfig.facebook;
      }

      const response = await axios.get(config.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (provider === "Google") {
        return {
          id: response.data.id,
          email: response.data.email,
          name: response.data.name,
          picture: response.data.picture,
          provider: "google",
        };
      } else if (provider === "Microsoft") {
        return {
          id: response.data.id,
          email: response.data.mail || response.data.userPrincipalName,
          name: response.data.displayName,
          picture: undefined, // Microsoft Graph doesn't return picture in basic profile
          provider: "microsoft",
        };
      } else {
        // Facebook
        return {
          id: response.data.id,
          email: response.data.email,
          name: response.data.name,
          picture: response.data.picture?.data?.url,
          provider: "facebook",
        };
      }
    } catch (error) {
      console.error("Failed to get OAuth user info:", error);
      return null;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
