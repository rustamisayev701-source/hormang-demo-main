import { getResendConfig } from "./env.js";

const RESEND_BASE_URL = "https://api.resend.com";

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const { apiKey, from } = getResendConfig();

  const res = await fetch(`${RESEND_BASE_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    throw new Error(`Resend send failed: ${res.status} ${await res.text()}`);
  }
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  await sendEmail(
    to,
    "Hormang — tasdiqlash kodi",
    `<div style="font-family:sans-serif;font-size:15px;color:#111">
      <p>Hormang.co.uz saytida tasdiqlash kodingiz:</p>
      <p style="font-size:28px;font-weight:800;letter-spacing:4px">${code}</p>
      <p style="color:#666;font-size:13px">Kod 5 daqiqa amal qiladi.</p>
    </div>`,
  );
}
