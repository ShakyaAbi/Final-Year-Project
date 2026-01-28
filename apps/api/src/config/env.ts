import dotenv from 'dotenv';

dotenv.config();

const required = ['DATABASE_URL', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  throw new Error(`Missing environment variables: ${missing.join(', ')}`);
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '4000', 10),
  jwtSecret: process.env.JWT_SECRET as string,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
  rateLimitEnabled: (process.env.RATE_LIMIT_ENABLED ?? 'true') === 'true',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
  authDisabled: (process.env.AUTH_DISABLED ?? 'true') === 'true'
};

export const adminSeed = {
  email: process.env.ADMIN_EMAIL,
  password: process.env.ADMIN_PASSWORD
};
