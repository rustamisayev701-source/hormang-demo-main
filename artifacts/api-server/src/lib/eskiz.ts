import { getEskizConfig } from "./env.js";

const ESKIZ_BASE_URL = "https://notify.eskiz.uz/api";
const DEFAULT_OTP_TEMPLATE = "Hormang.uz saytida ro'yxatdan o'tish/kirish uchun tasdiqlash kodi: {code}";

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

async function login(): Promise<string> {
  const { email, password } = getEskizConfig();
  const res = await fetch(`${ESKIZ_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email, password }),
  });

  if (!res.ok) {
    throw new Error(`Eskiz login failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { data?: { token?: string } };
  const token = data.data?.token;
  if (!token) throw new Error("Eskiz login response missing token");

  // Eskiz tokens are long-lived (~30 days); refresh a bit early to be safe.
  cachedToken = { token, expiresAt: Date.now() + 25 * 24 * 60 * 60 * 1000 };
  return token;
}

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;
  return login();
}

export async function sendSms(phone: string, message: string): Promise<void> {
  const { from } = getEskizConfig();
  const mobilePhone = phone.replace(/\D/g, "");

  const attempt = (token: string) =>
    fetch(`${ESKIZ_BASE_URL}/message/sms/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${token}`,
      },
      body: new URLSearchParams({ mobile_phone: mobilePhone, message, from }),
    });

  let token = await getToken();
  let res = await attempt(token);

  if (res.status === 401) {
    // Cached token was rejected — force a fresh login and retry once.
    cachedToken = null;
    token = await getToken();
    res = await attempt(token);
  }

  if (!res.ok) {
    throw new Error(`Eskiz SMS send failed: ${res.status} ${await res.text()}`);
  }
}

/**
 * Eskiz's test/moderation mode only delivers a handful of fixed template texts.
 * A custom OTP template must be submitted and approved in the Eskiz dashboard
 * before this will deliver real content in production.
 */
export async function sendOtpSms(phone: string, code: string): Promise<void> {
  const template = process.env.ESKIZ_OTP_TEMPLATE ?? DEFAULT_OTP_TEMPLATE;
  await sendSms(phone, template.replace("{code}", code));
}
