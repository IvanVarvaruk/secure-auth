require('dotenv').config();

const int = (v, d) => (v !== undefined && v !== '' ? parseInt(v, 10) : d);

module.exports = {
  port: int(process.env.PORT, 4000),
  isProd: process.env.NODE_ENV === 'production',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || 'postgres://secureauth:secureauth@localhost:5432/secureauth',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  maxFailedAttempts: int(process.env.MAX_FAILED_ATTEMPTS, 5),
  lockMinutes: int(process.env.LOCK_MINUTES, 15),
  activationTtlMin: int(process.env.ACTIVATION_TTL_MIN, 1440),
  resetTtlMin: int(process.env.RESET_TTL_MIN, 30),
  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: int(process.env.SMTP_PORT, 1025),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'Secure Auth <no-reply@secureauth.local>',
  },
  admin: {
    email: (process.env.ADMIN_EMAIL || '').toLowerCase(),
    password: process.env.ADMIN_PASSWORD || '',
  },
  oidc: {
    issuer: process.env.OIDC_ISSUER || 'https://accounts.google.com',
    clientId: process.env.OIDC_CLIENT_ID || '',
    clientSecret: process.env.OIDC_CLIENT_SECRET || '',
    redirectUri: process.env.OIDC_REDIRECT_URI || 'http://localhost:5173/api/auth/oidc/callback',
  },
};
