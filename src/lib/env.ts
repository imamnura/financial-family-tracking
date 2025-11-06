/**
 * Environment variables helper
 * Centralized environment configuration with type safety
 */

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];

  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${key} is not set`);
  }

  return value || defaultValue || "";
}

export const env = {
  // Database
  database: {
    url: getEnvVar("DATABASE_URL"),
  },

  // JWT
  jwt: {
    secret: getEnvVar("JWT_SECRET"),
    expiresIn: getEnvVar("JWT_EXPIRES_IN", "7d"),
    refreshSecret: getEnvVar("JWT_REFRESH_SECRET"),
    refreshExpiresIn: getEnvVar("JWT_REFRESH_EXPIRES_IN", "30d"),
  },

  // Email
  email: {
    host: getEnvVar("EMAIL_HOST", "smtp.gmail.com"),
    port: parseInt(getEnvVar("EMAIL_PORT", "587")),
    secure: getEnvVar("EMAIL_SECURE", "false") === "true",
    user: getEnvVar("EMAIL_USER", ""),
    password: getEnvVar("EMAIL_PASSWORD", ""),
    from: getEnvVar("EMAIL_FROM", "Family Tracker <noreply@familytracker.com>"),
  },

  // App
  app: {
    url: getEnvVar("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
    name: getEnvVar("NEXT_PUBLIC_APP_NAME", "Family Financial Tracker"),
    nodeEnv: getEnvVar("NODE_ENV", "development"),
    isDevelopment: getEnvVar("NODE_ENV", "development") === "development",
    isProduction: getEnvVar("NODE_ENV", "development") === "production",
  },

  // File Upload
  upload: {
    maxFileSize: parseInt(getEnvVar("MAX_FILE_SIZE", "5242880")), // 5MB
    uploadDir: getEnvVar("UPLOAD_DIR", "./public/uploads"),
  },

  // Rate Limiting
  rateLimit: {
    max: parseInt(getEnvVar("RATE_LIMIT_MAX", "100")),
    windowMinutes: parseInt(getEnvVar("RATE_LIMIT_WINDOW", "15")),
  },

  // Cookie
  cookie: {
    secret: getEnvVar("COOKIE_SECRET"),
    secure: getEnvVar("COOKIE_SECURE", "false") === "true",
    maxAge: parseInt(getEnvVar("COOKIE_MAX_AGE", "604800000")), // 7 days
  },

  // Encryption
  encryption: {
    key: getEnvVar("ENCRYPTION_KEY"),
  },
} as const;

export type Env = typeof env;
