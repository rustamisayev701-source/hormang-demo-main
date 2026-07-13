import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, providerProfilesTable } from "@workspace/db";
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  COOKIE_OPTS,
} from "../lib/auth.js";
import type { AuthRequest } from "../middlewares/auth.js";
import { requireAuth } from "../middlewares/auth.js";
import { isEskizConfigured, env } from "../lib/env.js";
import { sendOtpSms } from "../lib/eskiz.js";
import crypto from "crypto";

const router = Router();

// ─── OTP Store ────────────────────────────────────────────────────────────────
interface OtpEntry { code: string; expiresAt: number; purpose: string }
const otpStore = new Map<string, OtpEntry>();

function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, "").trim();
}

function storeOtp(phone: string, purpose: string): string {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(normalizePhone(phone), { code, expiresAt: Date.now() + 5 * 60 * 1000, purpose });
  return code;
}

function verifyOtp(phone: string, code: string, purpose: string): boolean {
  const key = normalizePhone(phone);
  const entry = otpStore.get(key);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) { otpStore.delete(key); return false; }
  if (entry.purpose !== purpose) return false;
  if (entry.code !== code) return false;
  otpStore.delete(key);
  return true;
}

// ─── Rate Limiting ─────────────────────────────────────────────────────────
const loginAttempts = new Map<string, { count: number; lockedUntil?: number }>();

function checkRateLimit(key: string): { blocked: boolean; remaining: number } {
  const now = Date.now();
  const entry = loginAttempts.get(key) ?? { count: 0 };
  if (entry.lockedUntil && now < entry.lockedUntil) {
    return { blocked: true, remaining: Math.ceil((entry.lockedUntil - now) / 1000) };
  }
  if (entry.lockedUntil && now >= entry.lockedUntil) loginAttempts.delete(key);
  return { blocked: false, remaining: 5 - entry.count };
}

function recordFailedAttempt(key: string) {
  const entry = loginAttempts.get(key) ?? { count: 0 };
  entry.count += 1;
  if (entry.count >= 5) entry.lockedUntil = Date.now() + 5 * 60 * 1000;
  loginAttempts.set(key, entry);
}

function clearAttempts(key: string) { loginAttempts.delete(key); }

async function getProviderProfile(userId: string) {
  const [profile] = await db
    .select()
    .from(providerProfilesTable)
    .where(eq(providerProfilesTable.userId, userId))
    .limit(1);
  return profile ?? null;
}

// ─── POST /sms/send ─────────────────────────────────────────────────────────
router.post("/sms/send", async (req, res) => {
  try {
    const { phone, purpose } = req.body as { phone?: string; purpose?: string };

    if (!phone || !purpose) {
      res.status(400).json({ error: "Telefon raqami va maqsad talab qilinadi" });
      return;
    }

    const normalized = normalizePhone(phone);
    const digitsOnly = normalized.replace(/\D/g, "");
    if (digitsOnly.length < 9) {
      res.status(400).json({ error: "Noto'g'ri telefon raqami" });
      return;
    }

    if (!["register", "login", "migrate", "add-phone"].includes(purpose)) {
      res.status(400).json({ error: "Noto'g'ri maqsad" });
      return;
    }

    if (purpose === "login") {
      const [user] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.phone, normalized))
        .limit(1);
      if (!user) {
        res.status(404).json({ error: "Bu raqam ro'yxatdan o'tmagan" });
        return;
      }
    }

    if (purpose === "register") {
      const [user] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.phone, normalized))
        .limit(1);
      if (user) {
        res.status(409).json({ error: "Bu raqam allaqachon ro'yxatdan o'tgan" });
        return;
      }
    }

    const code = storeOtp(normalized, purpose);

    if (isEskizConfigured()) {
      try {
        await sendOtpSms(normalized, code);
      } catch (smsErr) {
        console.error("Eskiz SMS send error:", smsErr);
        if (env.isProduction) {
          res.status(502).json({ error: "SMS yuborishda xatolik yuz berdi. Qayta urinib ko'ring." });
          return;
        }
      }
    } else if (env.isProduction) {
      console.error("Eskiz SMS is not configured — cannot send OTP in production.");
      res.status(502).json({ error: "SMS xizmati sozlanmagan" });
      return;
    }

    // devCode is only ever returned outside production, so a real code can never
    // leak in the API response once Eskiz is live.
    res.json({ ok: true, ...(env.isProduction ? {} : { devCode: code }) });
  } catch (err) {
    console.error("SMS send error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

// ─── POST /register (phone + OTP) ──────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { firstName, lastName, phone, otp, role } = req.body as {
      firstName?: string;
      lastName?: string;
      phone?: string;
      otp?: string;
      role?: "buyer" | "provider";
    };

    if (!firstName || !lastName || !phone || !otp) {
      res.status(400).json({ error: "Ism, familiya, telefon va tasdiqlash kodi talab qilinadi" });
      return;
    }
    if (!role || !["buyer", "provider"].includes(role)) {
      res.status(400).json({ error: "Noto'g'ri rol" });
      return;
    }

    const normalized = normalizePhone(phone);

    if (!verifyOtp(normalized, otp, "register")) {
      res.status(400).json({ error: "Tasdiqlash kodi noto'g'ri yoki muddati o'tgan" });
      return;
    }

    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.phone, normalized))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "Bu raqam allaqachon ro'yxatdan o'tgan" });
      return;
    }

    const passwordHash = await hashPassword(crypto.randomBytes(32).toString("hex"));

    const [user] = await db
      .insert(usersTable)
      .values({ firstName, lastName, phone: normalized, passwordHash, role })
      .returning();

    const safeUser = { ...user, passwordHash: undefined };
    const accessToken = generateAccessToken({ ...user });
    const refreshToken = generateRefreshToken(user.id);

    res.cookie("refreshToken", refreshToken, COOKIE_OPTS);
    res.status(201).json({ user: safeUser, accessToken, providerProfile: null });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi. Qayta urinib ko'ring." });
  }
});

// ─── POST /register/provider-profile ────────────────────────────────────────
router.post("/register/provider-profile", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { categories, bio, workingHours, preferredLocation } = req.body as {
      categories: string[];
      bio?: string;
      workingHours?: string;
      preferredLocation?: string;
    };

    if (!categories?.length) {
      res.status(400).json({ error: "Kamida bitta kategoriya tanlang" });
      return;
    }

    const existing = await db
      .select({ id: providerProfilesTable.id })
      .from(providerProfilesTable)
      .where(eq(providerProfilesTable.userId, req.user!.id))
      .limit(1);

    if (existing.length > 0) {
      const [profile] = await db
        .update(providerProfilesTable)
        .set({ categories, bio, workingHours, preferredLocation, updatedAt: new Date() })
        .where(eq(providerProfilesTable.userId, req.user!.id))
        .returning();
      res.json({ profile });
      return;
    }

    const [profile] = await db
      .insert(providerProfilesTable)
      .values({ userId: req.user!.id, categories, bio, workingHours, preferredLocation })
      .returning();

    res.status(201).json({ profile });
  } catch (err) {
    console.error("Provider profile error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi. Qayta urinib ko'ring." });
  }
});

// ─── POST /login (phone + OTP) ──────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { phone, otp } = req.body as { phone?: string; otp?: string };
  const normalized = normalizePhone(phone ?? "");
  const { blocked, remaining } = checkRateLimit(normalized);

  if (blocked) {
    res.status(429).json({ error: `Juda ko'p urinish. ${remaining} soniyadan so'ng qayta urinib ko'ring.` });
    return;
  }

  try {
    if (!phone || !otp) {
      res.status(400).json({ error: "Telefon va tasdiqlash kodi talab qilinadi" });
      return;
    }

    if (!verifyOtp(normalized, otp, "login")) {
      recordFailedAttempt(normalized);
      res.status(401).json({ error: "Tasdiqlash kodi noto'g'ri yoki muddati o'tgan" });
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.phone, normalized))
      .limit(1);

    if (!user) {
      recordFailedAttempt(normalized);
      res.status(401).json({ error: "Foydalanuvchi topilmadi" });
      return;
    }

    clearAttempts(normalized);

    await db
      .update(usersTable)
      .set({ lastLoginAt: new Date() })
      .where(eq(usersTable.id, user.id));

    const providerProfile = user.role === "provider" ? await getProviderProfile(user.id) : null;

    const safeUser = { ...user, passwordHash: undefined };
    const accessToken = generateAccessToken({ ...user });
    const refreshToken = generateRefreshToken(user.id);

    res.cookie("refreshToken", refreshToken, COOKIE_OPTS);
    res.json({ user: safeUser, accessToken, providerProfile });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi. Qayta urinib ko'ring." });
  }
});

// ─── POST /migrate-account (email+password → add phone → migrate to OTP) ───
router.post("/migrate-account", async (req, res) => {
  try {
    const { email, password, phone, otp } = req.body as {
      email?: string;
      password?: string;
      phone?: string;
      otp?: string;
    };

    if (!email || !password || !phone || !otp) {
      res.status(400).json({ error: "Barcha maydonlar talab qilinadi" });
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: "Email yoki parol noto'g'ri" });
      return;
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Email yoki parol noto'g'ri" });
      return;
    }

    const normalized = normalizePhone(phone);

    if (!verifyOtp(normalized, otp, "migrate")) {
      res.status(400).json({ error: "Tasdiqlash kodi noto'g'ri yoki muddati o'tgan" });
      return;
    }

    const [phoneConflict] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.phone, normalized))
      .limit(1);

    if (phoneConflict && phoneConflict.id !== user.id) {
      res.status(409).json({ error: "Bu raqam boshqa hisob bilan bog'liq" });
      return;
    }

    const [updated] = await db
      .update(usersTable)
      .set({ phone: normalized, updatedAt: new Date() })
      .where(eq(usersTable.id, user.id))
      .returning();

    const providerProfile = updated.role === "provider" ? await getProviderProfile(updated.id) : null;

    const safeUser = { ...updated, passwordHash: undefined };
    const accessToken = generateAccessToken({ ...updated });
    const refreshToken = generateRefreshToken(updated.id);

    res.cookie("refreshToken", refreshToken, COOKIE_OPTS);
    res.json({ user: safeUser, accessToken, providerProfile });
  } catch (err) {
    console.error("Migrate account error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

// ─── POST /refresh ─────────────────────────────────────────────────────────
router.post("/refresh", async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    res.status(401).json({ error: "Refresh token topilmadi" });
    return;
  }
  try {
    const payload = verifyRefreshToken(token);
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, payload.sub as string))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: "Foydalanuvchi topilmadi" });
      return;
    }

    const accessToken = generateAccessToken({ ...user });
    const newRefreshToken = generateRefreshToken(user.id);

    res.cookie("refreshToken", newRefreshToken, COOKIE_OPTS);
    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: "Token yaroqsiz" });
  }
});

// ─── POST /logout ───────────────────────────────────────────────────────────
router.post("/logout", (_req, res) => {
  res.clearCookie("refreshToken", { path: "/" });
  res.json({ ok: true });
});

// ─── PUT /profile ──────────────────────────────────────────────────────────
router.put("/profile", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { firstName, lastName, email } = req.body as {
      firstName?: string;
      lastName?: string;
      email?: string;
    };

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (email !== undefined) updates.email = email || null;

    const [user] = await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, req.user!.id))
      .returning();

    const safeUser = { ...user, passwordHash: undefined };
    res.json({ user: safeUser });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

// ─── PUT /add-phone (add phone to existing logged-in account) ──────────────
router.put("/add-phone", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { phone, otp } = req.body as { phone?: string; otp?: string };

    if (!phone || !otp) {
      res.status(400).json({ error: "Telefon va tasdiqlash kodi talab qilinadi" });
      return;
    }

    const normalized = normalizePhone(phone);

    if (!verifyOtp(normalized, otp, "add-phone")) {
      res.status(400).json({ error: "Tasdiqlash kodi noto'g'ri yoki muddati o'tgan" });
      return;
    }

    const [phoneConflict] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.phone, normalized))
      .limit(1);

    if (phoneConflict && phoneConflict.id !== req.user!.id) {
      res.status(409).json({ error: "Bu raqam boshqa hisob bilan bog'liq" });
      return;
    }

    const [user] = await db
      .update(usersTable)
      .set({ phone: normalized, updatedAt: new Date() })
      .where(eq(usersTable.id, req.user!.id))
      .returning();

    const safeUser = { ...user, passwordHash: undefined };
    res.json({ user: safeUser });
  } catch (err) {
    console.error("Add phone error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

// ─── PUT /provider-profile ─────────────────────────────────────────────────
router.put("/provider-profile", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { categories, bio, workingHours, preferredLocation } = req.body as {
      categories?: string[];
      bio?: string;
      workingHours?: string;
      preferredLocation?: string;
    };

    const existing = await db
      .select({ id: providerProfilesTable.id })
      .from(providerProfilesTable)
      .where(eq(providerProfilesTable.userId, req.user!.id))
      .limit(1);

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (categories !== undefined) updates.categories = categories;
    if (bio !== undefined) updates.bio = bio;
    if (workingHours !== undefined) updates.workingHours = workingHours;
    if (preferredLocation !== undefined) updates.preferredLocation = preferredLocation;

    let profile;
    if (existing.length > 0) {
      [profile] = await db
        .update(providerProfilesTable)
        .set(updates)
        .where(eq(providerProfilesTable.userId, req.user!.id))
        .returning();
    } else {
      [profile] = await db
        .insert(providerProfilesTable)
        .values({ userId: req.user!.id, categories: categories ?? [], bio, workingHours, preferredLocation })
        .returning();
    }

    res.json({ profile });
  } catch (err) {
    console.error("Update provider profile error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

// ─── GET /providers/:id ────────────────────────────────────────────────────
router.get("/providers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);

    if (!user || user.role !== "provider") {
      res.status(404).json({ error: "Ijrochi topilmadi" });
      return;
    }

    const [profile] = await db
      .select()
      .from(providerProfilesTable)
      .where(eq(providerProfilesTable.userId, id))
      .limit(1);

    const safeUser = { ...user, passwordHash: undefined, phone: undefined };
    res.json({ user: safeUser, providerProfile: profile ?? null });
  } catch (err) {
    console.error("Get provider error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

// ─── GET /me ───────────────────────────────────────────────────────────────
router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.id))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "Foydalanuvchi topilmadi" });
      return;
    }

    const safeUser = { ...user, passwordHash: undefined };
    const providerProfile = user.role === "provider" ? await getProviderProfile(user.id) : null;

    res.json({ user: safeUser, providerProfile });
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

export default router;
