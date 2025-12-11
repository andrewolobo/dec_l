import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/auth/auth.types';

/**
 * JWT utility for token generation and verification
 */
export class JwtUtil {
  private static readonly ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'your-access-secret-key';
  private static readonly REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
  private static readonly ACCESS_TOKEN_EXPIRY = '15m';
  private static readonly REFRESH_TOKEN_EXPIRY = '7d';

  /**
   * Generate access token
   * @param payload - JWT payload
   * @returns Access token
   */
  static generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, this.ACCESS_TOKEN_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });
  }

  /**
   * Generate refresh token
   * @param payload - JWT payload
   * @returns Refresh token
   */
  static generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign(payload, this.REFRESH_TOKEN_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
    });
  }

  /**
   * Generate both access and refresh tokens
   * @param payload - JWT payload
   * @returns Token pair
   */
  static generateTokenPair(payload: JwtPayload): {
    accessToken: string;
    refreshToken: string;
  } {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }

  /**
   * Verify access token
   * @param token - Access token
   * @returns Decoded payload
   */
  static verifyAccessToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.ACCESS_TOKEN_SECRET) as JwtPayload;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Verify refresh token
   * @param token - Refresh token
   * @returns Decoded payload
   */
  static verifyRefreshToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.REFRESH_TOKEN_SECRET) as JwtPayload;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Decode token without verification
   * @param token - JWT token
   * @returns Decoded payload or null
   */
  static decode(token: string): JwtPayload | null {
    return jwt.decode(token) as JwtPayload | null;
  }
}
