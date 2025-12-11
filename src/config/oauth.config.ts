/**
 * OAuth configuration for Google and Microsoft providers
 */
export const oauthConfig = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback',
    scope: ['openid', 'profile', 'email'],
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
  },
  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID || '',
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
    redirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3000/auth/microsoft/callback',
    scope: ['openid', 'profile', 'email'],
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
  },
};
