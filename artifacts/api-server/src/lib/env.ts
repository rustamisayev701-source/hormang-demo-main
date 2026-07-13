const isProduction = process.env.NODE_ENV === "production";

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction,
  appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:5173",
};

/**
 * JWT_SECRET falls back to an insecure dev default so local development keeps
 * working without a .env entry, but a missing secret in production is a hard error.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (isProduction) {
    throw new Error("JWT_SECRET must be set in production.");
  }
  console.warn(
    "[env] JWT_SECRET not set — using an insecure development default. Set JWT_SECRET before deploying."
  );
  return "hormang-dev-secret-change-in-production";
}

export interface EskizConfig {
  email: string;
  password: string;
  from: string;
}

export function isEskizConfigured(): boolean {
  return Boolean(process.env.ESKIZ_EMAIL && process.env.ESKIZ_PASSWORD);
}

export function getEskizConfig(): EskizConfig {
  const email = process.env.ESKIZ_EMAIL;
  const password = process.env.ESKIZ_PASSWORD;
  if (!email || !password) {
    throw new Error("Eskiz SMS is not configured: set ESKIZ_EMAIL and ESKIZ_PASSWORD.");
  }
  return { email, password, from: process.env.ESKIZ_FROM ?? "4546" };
}

export interface PaymeConfig {
  merchantId: string;
  key: string;
  testEnv: boolean;
}

export function isPaymeConfigured(): boolean {
  return Boolean(process.env.PAYME_MERCHANT_ID && process.env.PAYME_KEY);
}

export function getPaymeConfig(): PaymeConfig {
  const merchantId = process.env.PAYME_MERCHANT_ID;
  const key = process.env.PAYME_KEY;
  if (!merchantId || !key) {
    throw new Error("Payme is not configured: set PAYME_MERCHANT_ID and PAYME_KEY.");
  }
  return { merchantId, key, testEnv: process.env.PAYME_ENV !== "prod" };
}

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

export function getTelegramToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Telegram bot is not configured: set TELEGRAM_BOT_TOKEN.");
  return token;
}
