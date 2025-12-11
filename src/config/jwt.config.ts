/**
 * JWT configuration
 */
export const jwtConfig = {
  accessToken: {
    secret: process.env.JWT_ACCESS_SECRET || 'your-access-secret-key-change-in-production',
    expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
  },
  refreshToken: {
    secret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production',
    expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
};
