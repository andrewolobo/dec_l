/**
 * User registration DTO
 */
export interface RegisterDTO {
  emailAddress: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
}

/**
 * User login DTO
 */
export interface LoginDTO {
  emailAddress: string;
  password: string;
}

/**
 * OAuth login DTO
 */
export interface OAuthLoginDTO {
  provider: "Google" | "Microsoft";
  accessToken: string;
}

/**
 * JWT payload structure
 */
export interface JwtPayload {
  userId: number;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Authentication tokens
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Auth response with user data
 */
export interface AuthResponse {
  user: AuthUserDTO;
  tokens: AuthTokens;
}

/**
 * User data in auth response
 */
export interface AuthUserDTO {
  id: number;
  fullName: string;
  emailAddress: string;
  profilePictureUrl?: string;
  isEmailVerified: boolean;
}

/**
 * Refresh token DTO
 */
export interface RefreshTokenDTO {
  refreshToken: string;
}

/**
 * Phone verification DTO
 */
export interface PhoneVerificationDTO {
  phoneNumber: string;
  code: string;
}

/**
 * OAuth user info from provider
 */
export interface OAuthUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: "google" | "microsoft";
}
