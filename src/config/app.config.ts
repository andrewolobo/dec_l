/**
 * Application configuration
 */
export const appConfig = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  apiPrefix: '/api/v1',
  
  // Pagination defaults
  pagination: {
    defaultPage: 1,
    defaultLimit: 20,
    maxLimit: 100,
  },
  
  // Post settings
  post: {
    maxImages: 10,
    defaultExpiryDays: 30,
  },
  
  // File upload settings
  upload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
};
