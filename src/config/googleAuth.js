// src/config/googleAuth.js
module.exports = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: (base = process.env.BASE_URL) => `${base}${process.env.GOOGLE_REDIRECT_PATH || '/api/auth/google/callback'}`,
  scopes: ['openid', 'email', 'profile']
};
