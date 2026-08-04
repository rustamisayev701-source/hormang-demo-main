import { apiFetch, ApiError } from "./api-client";

/* ─── Types ─────────────────────────────────────────────────────────────── */

export type TwoFactorMethod = "sms" | "email";

export interface SafeUser {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
  twoFactorMethod?: TwoFactorMethod | null;
  twoFactorHint?: string | null;
  pendingEmail?: string | null;
  pendingPhone?: string | null;
  pendingDeleteRequest?: boolean;
  role: "buyer" | "provider";
  createdAt: string;
  deletedAt?: string | null;
  suspended?: boolean;
}

export interface ProviderProfile {
  id: string;
  userId: string;
  categories: string[];
  bio?: string | null;
  preferredLocation?: string | null;
  isVerified: boolean;
  rating?: number;
}

export interface AuthResponse {
  user: SafeUser;
  accessToken: string;
  providerProfile?: ProviderProfile | null;
}

export interface LoginChallenge {
  needs2FA: true;
  challengeId: string;
  hint?: string;
}

/* ─── Storage Keys ──────────────────────────────────────────────────────── */

const TOKEN_KEY = "hormang_access_token";
const USERS_KEY = "hormang_auth_users";
const PROFILES_KEY = "hormang_auth_provider_profiles";
const OTP_KEY = "hormang_auth_otp_store";
const PWD_KEY = "hormang_auth_password_hashes";
const CHALLENGE_KEY = "hormang_auth_2fa_challenges";
const TWOFA_CODE_KEY = "hormang_2fa_codes";

/* ─── Token helpers (centralized, exported) ─────────────────────────────── */

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/* ─── Generic localStorage helpers ─────────────────────────────────────── */

function readLS<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLS<T>(key: string, val: T): void {
  localStorage.setItem(key, JSON.stringify(val));
}

function genId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* ─── Phone / email normalisation ──────────────────────────────────────── */

function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, "").trim();
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ─── Password hashing (Web Crypto: PBKDF2-HMAC-SHA256) ────────────────── */

interface PasswordHash {
  algo: "pbkdf2-sha256";
  salt: string;
  iterations: number;
  hash: string;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return arr;
}

async function pbkdf2(password: string, saltBytes: Uint8Array, iterations: number): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes as BufferSource, iterations, hash: "SHA-256" },
    baseKey,
    256,
  );
  return new Uint8Array(bits);
}

async function hashPassword(password: string): Promise<PasswordHash> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 100_000;
  const hashBytes = await pbkdf2(password, saltBytes, iterations);
  return {
    algo: "pbkdf2-sha256",
    salt: bytesToBase64(saltBytes),
    iterations,
    hash: bytesToBase64(hashBytes),
  };
}

async function verifyPasswordHash(password: string, stored: PasswordHash): Promise<boolean> {
  const saltBytes = base64ToBytes(stored.salt);
  const candidate = await pbkdf2(password, saltBytes, stored.iterations);
  const expected = base64ToBytes(stored.hash);
  if (candidate.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < candidate.length; i++) diff |= candidate[i] ^ expected[i];
  return diff === 0;
}

function readPasswordHashes(): Record<string, PasswordHash> {
  return readLS<Record<string, PasswordHash>>(PWD_KEY, {});
}
function writePasswordHash(userId: string, hash: PasswordHash): void {
  const all = readPasswordHashes();
  all[userId] = hash;
  writeLS(PWD_KEY, all);
}
function deletePasswordHash(userId: string): void {
  const all = readPasswordHashes();
  delete all[userId];
  writeLS(PWD_KEY, all);
}
function getPasswordHash(userId: string): PasswordHash | null {
  return readPasswordHashes()[userId] ?? null;
}

export function isStrongPassword(pw: string): boolean {
  return typeof pw === "string" && pw.length >= 8;
}

/* ─── User store ────────────────────────────────────────────────────────── */

function readUsers(): SafeUser[] {
  return readLS<SafeUser[]>(USERS_KEY, []);
}

function writeUsers(users: SafeUser[]): void {
  writeLS(USERS_KEY, users);
}

function findByPhone(phone: string): SafeUser | undefined {
  const n = normalizePhone(phone);
  return readUsers().find((u) => !u.deletedAt && normalizePhone(u.phone ?? "") === n);
}

function findByEmail(email: string): SafeUser | undefined {
  const n = normalizeEmail(email);
  return readUsers().find((u) => !u.deletedAt && normalizeEmail(u.email ?? "") === n);
}

function findById(id: string): SafeUser | undefined {
  return readUsers().find((u) => u.id === id && !u.deletedAt);
}

function upsertUser(user: SafeUser): void {
  const users = readUsers();
  const idx = users.findIndex((u) => u.id === user.id);
  if (idx >= 0) users[idx] = user;
  else users.push(user);
  writeUsers(users);
}

/* ─── Real backend bridge (register/login only — see auth-client module note) ─
 * Every other flow in this file (2FA, email verification, account deletion, …)
 * is still a local mock because the real Express backend doesn't implement
 * them yet. Register/login now hit the real backend so a genuine JWT backs
 * the wallet/payment API, which must not trust a client-asserted user id. */

interface BackendUser {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  role: "buyer" | "provider";
  createdAt: string;
}

/** Backend error text -> the error codes the UI's i18n dictionaries already know how to render. */
const BACKEND_ERROR_CODES: Record<string, string> = {
  "Bu raqam ro'yxatdan o'tmagan": "PHONE_NOT_REGISTERED",
  "Bu raqam allaqachon ro'yxatdan o'tgan": "PHONE_ALREADY_REGISTERED",
  "Tasdiqlash kodi noto'g'ri yoki muddati o'tgan": "OTP_INVALID",
  "Foydalanuvchi topilmadi": "USER_NOT_FOUND",
};

function throwBackendError(err: unknown): never {
  if (err instanceof ApiError) {
    throw new Error(BACKEND_ERROR_CODES[err.message] ?? err.message);
  }
  throw err instanceof Error ? err : new Error("SERVER_ERROR");
}

/** Maps the backend's user row onto the frontend SafeUser shape, preserving any
 * local-only fields (2FA, email verification, …) already stored for this id. */
function mergeBackendUser(backendUser: BackendUser): SafeUser {
  const existing = findById(backendUser.id);
  const merged: SafeUser = {
    id: backendUser.id,
    firstName: backendUser.firstName,
    lastName: backendUser.lastName,
    email: backendUser.email ?? existing?.email ?? null,
    phone: backendUser.phone ?? existing?.phone ?? null,
    role: backendUser.role,
    createdAt: backendUser.createdAt,
    emailVerified: existing?.emailVerified ?? false,
    twoFactorEnabled: existing?.twoFactorEnabled ?? false,
    twoFactorMethod: existing?.twoFactorMethod ?? null,
    twoFactorHint: existing?.twoFactorHint ?? null,
    pendingEmail: existing?.pendingEmail ?? null,
    pendingPhone: existing?.pendingPhone ?? null,
    pendingDeleteRequest: existing?.pendingDeleteRequest ?? false,
  };
  upsertUser(merged);
  return merged;
}

/* ─── Provider-profile store ────────────────────────────────────────────── */

function readProfiles(): ProviderProfile[] {
  return readLS<ProviderProfile[]>(PROFILES_KEY, []);
}

function writeProfiles(profiles: ProviderProfile[]): void {
  writeLS(PROFILES_KEY, profiles);
}

function findProfile(userId: string): ProviderProfile | null {
  return readProfiles().find((p) => p.userId === userId) ?? null;
}

/** Public read-only accessor for the stored provider profile (no auth required). */
export function getStoredProviderProfile(userId: string): ProviderProfile | null {
  return findProfile(userId);
}

/* ─── OTP store (shared for SMS + email) ───────────────────────────────── */

interface OtpEntry {
  code: string;
  expiresAt: number;
  purpose: string;
  channel: "sms" | "email";
}

function readOtpStore(): Record<string, OtpEntry> {
  return readLS<Record<string, OtpEntry>>(OTP_KEY, {});
}

function makeOtpKey(channel: "sms" | "email", destination: string): string {
  return `${channel}:${channel === "sms" ? normalizePhone(destination) : normalizeEmail(destination)}`;
}

function storeOtp(channel: "sms" | "email", destination: string, purpose: string): string {
  const code = Math.floor(100_000 + Math.random() * 900_000).toString();
  const store = readOtpStore();
  store[makeOtpKey(channel, destination)] = {
    code,
    expiresAt: Date.now() + 5 * 60 * 1_000,
    purpose,
    channel,
  };
  writeLS(OTP_KEY, store);
  return code;
}

function verifyOtpEntry(channel: "sms" | "email", destination: string, code: string, purpose: string): boolean {
  const store = readOtpStore();
  const key = makeOtpKey(channel, destination);
  const entry = store[key];
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    delete store[key];
    writeLS(OTP_KEY, store);
    return false;
  }
  if (entry.purpose !== purpose || entry.channel !== channel || entry.code !== code) return false;
  delete store[key];
  writeLS(OTP_KEY, store);
  return true;
}

/* Backwards-compatible alias (legacy SMS-only verifyOtp signature). */
function verifyOtp(phone: string, code: string, purpose: string): boolean {
  return verifyOtpEntry("sms", phone, code, purpose);
}

/* ─── Reusable senders (swap with Twilio / SendGrid in production) ─────── */

export async function sendSmsCode(
  phone: string,
  purpose:
    | "register"
    | "login"
    | "migrate"
    | "add-phone"
    | "change-phone"
    | "delete-account"
    | "enable-2fa"
    | "login-2fa",
  /** Skip the email-delivery preference for "login" (e.g. user has no inbox access). */
  forceSms?: boolean,
): Promise<{ ok: boolean; devCode?: string; channel?: "sms" | "email"; maskedDestination?: string }> {
  const normalized = normalizePhone(phone);

  if (purpose === "register" || purpose === "login") {
    try {
      // For "login", the backend may deliver the code to a verified email
      // instead of SMS (see /auth/sms/send) — the phone stays the account
      // lookup key either way, only the delivery channel can change.
      return await apiFetch<{ ok: boolean; devCode?: string; channel?: "sms" | "email"; maskedDestination?: string }>(
        "/auth/sms/send",
        { method: "POST", auth: false, body: { phone: normalized, purpose, forceSms } },
      );
    } catch (err) {
      throwBackendError(err);
    }
  }

  if (purpose === "change-phone") {
    const user = findByPhone(normalized);
    if (user) throw new Error("PHONE_TAKEN");
  }

  const code = storeOtp("sms", normalized, purpose);
  return { ok: true, devCode: code };
}

export async function sendEmailCode(
  email: string,
  purpose:
    | "register-email"
    | "change-email"
    | "login-email-2fa"
    | "login-email",
): Promise<{ ok: boolean; devCode?: string }> {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) throw new Error("INVALID_EMAIL");

  if (purpose === "login-email") {
    try {
      return await apiFetch<{ ok: boolean; devCode?: string }>("/auth/login-email/send", {
        method: "POST",
        auth: false,
        body: { email: normalized },
      });
    } catch (err) {
      throwBackendError(err);
    }
  }

  if (purpose === "register-email" || purpose === "change-email") {
    const owner = findByEmail(normalized);
    const myId = getToken();
    if (owner && owner.id !== myId) throw new Error("EMAIL_ALREADY_REGISTERED");
  }

  const code = storeOtp("email", normalized, purpose);
  return { ok: true, devCode: code };
}

/* ─── Registration (phone + OTP) ───────────────────────────────────────── */

export async function registerUser(body: {
  firstName: string;
  lastName: string;
  phone: string;
  otp: string;
  role: "buyer" | "provider";
}): Promise<AuthResponse> {
  const normalized = normalizePhone(body.phone);

  try {
    const res = await apiFetch<{
      user: BackendUser;
      accessToken: string;
      providerProfile: ProviderProfile | null;
    }>("/auth/register", {
      method: "POST",
      auth: false,
      body: { ...body, phone: normalized },
    });

    const user = mergeBackendUser(res.user);
    setToken(res.accessToken);
    return { user, accessToken: res.accessToken, providerProfile: res.providerProfile };
  } catch (err) {
    throwBackendError(err);
  }
}

/* ─── Save Provider Profile ─────────────────────────────────────────────── */

export async function saveProviderProfile(body: {
  categories: string[];
  bio?: string;
  preferredLocation?: string;
}): Promise<{ profile: ProviderProfile }> {
  try {
    return await apiFetch<{ profile: ProviderProfile }>("/auth/provider-profile", {
      method: "PUT",
      body,
    });
  } catch (err) {
    throwBackendError(err);
  }
}

/* ─── 2FA code store (user-defined static code + hint) ────────────────── */

interface TwoFAEntry { hash: PasswordHash; hint: string; }

function readTwoFACodes(): Record<string, TwoFAEntry> {
  return readLS<Record<string, TwoFAEntry>>(TWOFA_CODE_KEY, {});
}
function getTwoFAEntry(userId: string): TwoFAEntry | null {
  return readTwoFACodes()[userId] ?? null;
}
function setTwoFAEntry(userId: string, entry: TwoFAEntry): void {
  const all = readTwoFACodes();
  all[userId] = entry;
  writeLS(TWOFA_CODE_KEY, all);
}
function deleteTwoFAEntry(userId: string): void {
  const all = readTwoFACodes();
  delete all[userId];
  writeLS(TWOFA_CODE_KEY, all);
}

/* ─── 2FA challenge store ──────────────────────────────────────────────── */

interface ChallengeEntry {
  userId: string;
  method: TwoFactorMethod;
  destination: string;
  expiresAt: number;
  /** The token to persist once the 2FA step passes (real JWT for backend-authenticated logins). */
  pendingAccessToken: string;
}

function readChallenges(): Record<string, ChallengeEntry> {
  return readLS<Record<string, ChallengeEntry>>(CHALLENGE_KEY, {});
}
function storeChallenge(entry: ChallengeEntry): string {
  const id = genId();
  const all = readChallenges();
  all[id] = entry;
  writeLS(CHALLENGE_KEY, all);
  return id;
}
function consumeChallenge(id: string): ChallengeEntry | null {
  const all = readChallenges();
  const entry = all[id];
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    delete all[id];
    writeLS(CHALLENGE_KEY, all);
    return null;
  }
  return entry;
}
function dropChallenge(id: string): void {
  const all = readChallenges();
  delete all[id];
  writeLS(CHALLENGE_KEY, all);
}

/* ─── Phone login (returns 2FA challenge if enabled) ───────────────────── */

export async function loginUser(body: {
  phone: string;
  otp: string;
}): Promise<AuthResponse | LoginChallenge> {
  const normalized = normalizePhone(body.phone);

  try {
    const res = await apiFetch<{
      user: BackendUser;
      accessToken: string;
      providerProfile: ProviderProfile | null;
    }>("/auth/login", {
      method: "POST",
      auth: false,
      body: { phone: normalized, otp: body.otp },
    });

    const user = mergeBackendUser(res.user);

    if (user.twoFactorEnabled) {
      const challenge = await issue2FAChallenge(user, res.accessToken);
      return challenge;
    }

    setToken(res.accessToken);
    return { user, accessToken: res.accessToken, providerProfile: res.providerProfile };
  } catch (err) {
    throwBackendError(err);
  }
}

/* ─── Email + password login ───────────────────────────────────────────── */

export async function loginWithEmail(body: {
  email: string;
  password: string;
}): Promise<AuthResponse | LoginChallenge> {
  const email = normalizeEmail(body.email);
  if (!isValidEmail(email)) throw new Error("INVALID_EMAIL");

  const user = findByEmail(email);
  if (!user || !user.emailVerified) throw new Error("EMAIL_OR_PASSWORD_WRONG");

  const stored = getPasswordHash(user.id);
  if (!stored) throw new Error("EMAIL_OR_PASSWORD_WRONG");

  const ok = await verifyPasswordHash(body.password, stored);
  if (!ok) throw new Error("EMAIL_OR_PASSWORD_WRONG");

  if (user.twoFactorEnabled) {
    const challenge = await issue2FAChallenge(user);
    return challenge;
  }

  setToken(user.id);
  const providerProfile = user.role === "provider" ? findProfile(user.id) : null;
  return { user, accessToken: user.id, providerProfile };
}

/* ─── Email + code login (no password — mirrors phone+OTP login) ──────── */

export async function loginWithEmailCode(body: {
  email: string;
  otp: string;
}): Promise<AuthResponse | LoginChallenge> {
  const normalized = normalizeEmail(body.email);

  try {
    const res = await apiFetch<{
      user: BackendUser;
      accessToken: string;
      providerProfile: ProviderProfile | null;
    }>("/auth/login-email", {
      method: "POST",
      auth: false,
      body: { email: normalized, otp: body.otp },
    });

    const user = mergeBackendUser(res.user);
    setToken(res.accessToken);
    return { user, accessToken: res.accessToken, providerProfile: res.providerProfile };
  } catch (err) {
    throwBackendError(err);
  }
}

async function issue2FAChallenge(user: SafeUser, pendingAccessToken?: string): Promise<LoginChallenge> {
  const challengeId = storeChallenge({
    userId: user.id,
    method: "sms",
    destination: "",
    expiresAt: Date.now() + 30 * 60 * 1_000,
    pendingAccessToken: pendingAccessToken ?? user.id,
  });
  return { needs2FA: true, challengeId, hint: user.twoFactorHint ?? undefined };
}

export async function verifyLogin2FA(body: {
  challengeId: string;
  otp: string;
}): Promise<AuthResponse> {
  const ch = consumeChallenge(body.challengeId);
  if (!ch) throw new Error("SESSION_EXPIRED");

  const user = findById(ch.userId);
  if (!user) throw new Error("USER_NOT_FOUND");

  const entry = getTwoFAEntry(user.id);
  if (!entry) throw new Error("TWO_FA_NOT_FOUND");

  const ok = await verifyPasswordHash(body.otp, entry.hash);
  if (!ok) throw new Error("TWO_FA_INVALID");

  dropChallenge(body.challengeId);
  setToken(ch.pendingAccessToken);
  const providerProfile = user.role === "provider" ? findProfile(user.id) : null;
  return { user, accessToken: ch.pendingAccessToken, providerProfile };
}

/* ─── Account Migration ─────────────────────────────────────────────────── */

export async function migrateAccount(body: {
  email: string;
  password: string;
  phone: string;
  otp: string;
}): Promise<AuthResponse> {
  const normalized = normalizePhone(body.phone);

  if (!verifyOtp(normalized, body.otp, "migrate")) {
    throw new Error("OTP_INVALID");
  }

  const existing = findByPhone(normalized);
  if (existing) {
    setToken(existing.id);
    return { user: existing, accessToken: existing.id };
  }

  const user: SafeUser = {
    id: genId(),
    firstName: body.email.split("@")[0] ?? "Foydalanuvchi",
    lastName: "",
    phone: normalized,
    email: normalizeEmail(body.email),
    emailVerified: false,
    twoFactorEnabled: false,
    role: "buyer",
    createdAt: new Date().toISOString(),
  };
  upsertUser(user);
  setToken(user.id);
  return { user, accessToken: user.id };
}

/* ─── Add phone to existing account ────────────────────────────────────── */

export async function addPhone(body: {
  phone: string;
  otp: string;
}): Promise<{ user: SafeUser }> {
  const token = getToken();
  if (!token) throw new Error("AUTH_REQUIRED");

  const normalized = normalizePhone(body.phone);

  if (!verifyOtp(normalized, body.otp, "add-phone")) {
    throw new Error("OTP_INVALID");
  }

  const user = findById(token);
  if (!user) throw new Error("USER_NOT_FOUND");

  const conflict = findByPhone(normalized);
  if (conflict && conflict.id !== user.id) {
    throw new Error("PHONE_BELONGS_TO_OTHER");
  }

  const updated: SafeUser = { ...user, phone: normalized };
  upsertUser(updated);
  return { user: updated };
}

/* ─── Verify password (sensitive-action gate) ──────────────────────────── */

export async function verifyMyPassword(password: string): Promise<boolean> {
  const token = getToken();
  if (!token) throw new Error("AUTH_REQUIRED");
  const stored = getPasswordHash(token);
  if (!stored) throw new Error("NO_PASSWORD_SET");
  return verifyPasswordHash(password, stored);
}

/* ─── Email registration (logged-in user adds a verified email) ─────────
 * Hits the real backend (/auth/email/send, /auth/email/verify) — this is
 * what actually delivers a real email via Resend, unlike the rest of the
 * 2FA/account-deletion flows further down this file, which are still local
 * mocks. No password is collected here: attaching an email exists solely
 * to give login OTP delivery a fallback channel besides SMS.
 */

/** findById only reads this browser's local cache, which can be empty even for a
 *  genuinely logged-in session (cleared storage, a session that never synced, …).
 *  Falls back to a real /auth/me fetch — which repopulates the cache — instead
 *  of incorrectly reporting the account as missing. */
async function resolveCurrentUser(token: string): Promise<SafeUser> {
  const cached = findById(token);
  if (cached) return cached;
  const { user } = await getMe();
  return user;
}

export async function startEmailRegistration(body: { email: string }): Promise<{ devCode?: string }> {
  const token = getToken();
  if (!token) throw new Error("AUTH_REQUIRED");
  const user = await resolveCurrentUser(token);
  if (user.emailVerified) throw new Error("EMAIL_ALREADY_ATTACHED");

  const email = normalizeEmail(body.email);
  if (!isValidEmail(email)) throw new Error("INVALID_EMAIL");

  try {
    const res = await apiFetch<{ ok: boolean; devCode?: string }>("/auth/email/send", {
      method: "POST",
      body: { email },
    });
    upsertUser({ ...user, pendingEmail: email });
    return { devCode: res.devCode };
  } catch (err) {
    throwBackendError(err);
  }
}

export async function cancelPendingEmail(): Promise<void> {
  const token = getToken();
  if (!token) return;
  const user = findById(token);
  if (!user) return;
  if (user.pendingEmail) {
    upsertUser({ ...user, pendingEmail: null });
    deletePasswordHash(`${user.id}__pending_email`);
  }
}

export async function cancelPendingPhone(): Promise<void> {
  const token = getToken();
  if (!token) return;
  const user = findById(token);
  if (!user) return;
  if (user.pendingPhone) {
    upsertUser({ ...user, pendingPhone: null });
  }
}

export async function verifyEmailRegistration(otp: string): Promise<{ user: SafeUser }> {
  const token = getToken();
  if (!token) throw new Error("AUTH_REQUIRED");
  const user = await resolveCurrentUser(token);
  if (!user.pendingEmail) throw new Error("EMAIL_VERIFICATION_NOT_FOUND");

  try {
    const res = await apiFetch<{ user: BackendUser & { emailVerified?: boolean } }>("/auth/email/verify", {
      method: "PUT",
      body: { email: user.pendingEmail, otp },
    });
    const updated: SafeUser = {
      ...mergeBackendUser(res.user),
      email: res.user.email ?? user.pendingEmail,
      emailVerified: true,
      pendingEmail: null,
    };
    upsertUser(updated);
    return { user: updated };
  } catch (err) {
    throwBackendError(err);
  }
}

/* ─── Change email (password-gated, OTP confirmed) ─────────────────────── */

export async function startChangeEmail(body: {
  currentPassword: string;
  newEmail: string;
}): Promise<{ devCode?: string }> {
  const token = getToken();
  if (!token) throw new Error("AUTH_REQUIRED");
  const user = findById(token);
  if (!user) throw new Error("USER_NOT_FOUND");
  if (!user.emailVerified) throw new Error("EMAIL_NOT_VERIFIED");

  const ok = await verifyMyPassword(body.currentPassword);
  if (!ok) throw new Error("WRONG_PASSWORD");

  const newEmail = normalizeEmail(body.newEmail);
  if (!isValidEmail(newEmail)) throw new Error("INVALID_EMAIL");
  if (newEmail === normalizeEmail(user.email ?? "")) throw new Error("NEW_EMAIL_SAME_AS_OLD");
  const owner = findByEmail(newEmail);
  if (owner && owner.id !== user.id) throw new Error("EMAIL_ALREADY_REGISTERED");

  upsertUser({ ...user, pendingEmail: newEmail });
  return sendEmailCode(newEmail, "change-email");
}

export async function verifyChangeEmail(otp: string): Promise<{ user: SafeUser }> {
  const token = getToken();
  if (!token) throw new Error("AUTH_REQUIRED");
  const user = findById(token);
  if (!user || !user.pendingEmail) throw new Error("EMAIL_CHANGE_NOT_FOUND");

  const ok = verifyOtpEntry("email", user.pendingEmail, otp, "change-email");
  if (!ok) throw new Error("OTP_INVALID");

  const updated: SafeUser = {
    ...user,
    email: user.pendingEmail,
    emailVerified: true,
    pendingEmail: null,
  };
  upsertUser(updated);
  return { user: updated };
}

/* ─── Change phone (password-gated, SMS OTP) ───────────────────────────── */

export async function startChangePhone(body: {
  currentPassword: string;
  newPhone: string;
}): Promise<{ devCode?: string }> {
  const token = getToken();
  if (!token) throw new Error("AUTH_REQUIRED");
  const user = findById(token);
  if (!user) throw new Error("USER_NOT_FOUND");
  if (!user.emailVerified) throw new Error("EMAIL_REQUIRED_FOR_PHONE_CHANGE");

  const ok = await verifyMyPassword(body.currentPassword);
  if (!ok) throw new Error("WRONG_PASSWORD");

  const newPhone = normalizePhone(body.newPhone);
  if (newPhone.replace(/\D/g, "").length < 9) throw new Error("INVALID_PHONE");
  if (newPhone === normalizePhone(user.phone ?? "")) throw new Error("NEW_PHONE_SAME_AS_OLD");
  const owner = findByPhone(newPhone);
  if (owner && owner.id !== user.id) throw new Error("PHONE_TAKEN");

  upsertUser({ ...user, pendingPhone: newPhone });
  return sendSmsCode(newPhone, "change-phone");
}

export async function verifyChangePhone(otp: string): Promise<{ user: SafeUser }> {
  const token = getToken();
  if (!token) throw new Error("AUTH_REQUIRED");
  const user = findById(token);
  if (!user || !user.pendingPhone) throw new Error("PHONE_CHANGE_NOT_FOUND");

  const ok = verifyOtpEntry("sms", user.pendingPhone, otp, "change-phone");
  if (!ok) throw new Error("OTP_INVALID");

  const updated: SafeUser = {
    ...user,
    phone: user.pendingPhone,
    pendingPhone: null,
  };
  upsertUser(updated);
  return { user: updated };
}

/* ─── 2FA setup / disable (user-defined code + hint) ───────────────────── */

export async function setup2FA(body: {
  currentPassword?: string;
  code: string;
  hint: string;
}): Promise<{ user: SafeUser }> {
  const token = getToken();
  if (!token) throw new Error("AUTH_REQUIRED");
  const user = findById(token);
  if (!user) throw new Error("USER_NOT_FOUND");

  if (user.emailVerified) {
    if (!body.currentPassword) throw new Error("PASSWORD_REQUIRED_FOR_2FA");
    const ok = await verifyMyPassword(body.currentPassword);
    if (!ok) throw new Error("WRONG_PASSWORD");
  }

  const hash = await hashPassword(body.code);
  setTwoFAEntry(user.id, { hash, hint: body.hint });

  const updated: SafeUser = {
    ...user,
    twoFactorEnabled: true,
    twoFactorHint: body.hint || null,
  };
  upsertUser(updated);
  return { user: updated };
}

export async function disable2FA(currentPassword: string): Promise<{ user: SafeUser }> {
  const token = getToken();
  if (!token) throw new Error("AUTH_REQUIRED");
  const user = findById(token);
  if (!user) throw new Error("USER_NOT_FOUND");

  if (user.emailVerified) {
    const ok = await verifyMyPassword(currentPassword);
    if (!ok) throw new Error("WRONG_PASSWORD");
  }

  deleteTwoFAEntry(user.id);
  const updated: SafeUser = {
    ...user,
    twoFactorEnabled: false,
    twoFactorMethod: null,
    twoFactorHint: null,
  };
  upsertUser(updated);
  return { user: updated };
}

/* ─── Delete account (password + SMS OTP, soft-delete) ─────────────────── */

export async function startDeleteAccount(currentPassword: string): Promise<{ devCode?: string; destination: string }> {
  const token = getToken();
  if (!token) throw new Error("AUTH_REQUIRED");
  const user = findById(token);
  if (!user) throw new Error("USER_NOT_FOUND");

  const ok = await verifyMyPassword(currentPassword);
  if (!ok) throw new Error("WRONG_PASSWORD");
  if (!user.phone) throw new Error("PHONE_REQUIRED");

  upsertUser({ ...user, pendingDeleteRequest: true });
  const res = await sendSmsCode(user.phone, "delete-account");
  return { devCode: res.devCode, destination: user.phone };
}

export async function confirmDeleteAccount(otp: string): Promise<{ ok: true }> {
  const token = getToken();
  if (!token) throw new Error("AUTH_REQUIRED");
  const user = findById(token);
  if (!user || !user.pendingDeleteRequest || !user.phone) {
    throw new Error("DELETE_REQUEST_NOT_FOUND");
  }

  const ok = verifyOtpEntry("sms", user.phone, otp, "delete-account");
  if (!ok) throw new Error("OTP_INVALID");

  const users = readUsers();
  const idx = users.findIndex((u) => u.id === user.id);
  if (idx >= 0) {
    users[idx] = {
      ...users[idx],
      deletedAt: new Date().toISOString(),
      email: null,
      phone: null,
      pendingEmail: null,
      pendingPhone: null,
      pendingDeleteRequest: false,
      emailVerified: false,
      twoFactorEnabled: false,
      twoFactorMethod: null,
    };
    writeUsers(users);
  }
  deletePasswordHash(user.id);
  clearToken();
  return { ok: true };
}

export async function cancelDeleteAccount(): Promise<{ user: SafeUser }> {
  const token = getToken();
  if (!token) throw new Error("AUTH_REQUIRED");
  const user = findById(token);
  if (!user) throw new Error("USER_NOT_FOUND");
  const updated: SafeUser = { ...user, pendingDeleteRequest: false };
  upsertUser(updated);
  return { user: updated };
}

/* ─── Session ───────────────────────────────────────────────────────────── */

export async function logoutUser(): Promise<void> {
  clearToken();
}

/** Real JWTs are 3 dot-separated segments; local-mock tokens (crypto.randomUUID()) never contain a dot. */
function looksLikeJwt(token: string): boolean {
  return token.split(".").length === 3;
}

export async function getMe(): Promise<{
  user: SafeUser;
  providerProfile: ProviderProfile | null;
}> {
  const token = getToken();
  if (!token) throw new Error("AUTH_REQUIRED");

  if (looksLikeJwt(token)) {
    try {
      const res = await apiFetch<{ user: BackendUser; providerProfile: ProviderProfile | null }>("/auth/me");
      const user = mergeBackendUser(res.user);
      return { user, providerProfile: res.providerProfile };
    } catch (err) {
      throwBackendError(err);
    }
  }

  const user = findById(token);
  if (!user) throw new Error("USER_NOT_FOUND");

  const providerProfile = user.role === "provider" ? findProfile(user.id) : null;
  return { user, providerProfile };
}

export async function refreshToken(): Promise<string | null> {
  const token = getToken();
  if (token && looksLikeJwt(token)) {
    try {
      const res = await apiFetch<{ accessToken: string }>("/auth/refresh", { method: "POST", auth: false });
      setToken(res.accessToken);
      return res.accessToken;
    } catch {
      return getToken();
    }
  }
  return token;
}

/* ─── Profile Updates ───────────────────────────────────────────────────── */

export async function updateProfile(body: {
  firstName?: string;
  lastName?: string;
  email?: string;
}): Promise<{ user: SafeUser }> {
  const token = getToken();
  if (!token) throw new Error("AUTH_REQUIRED");

  const user = findById(token);
  if (!user) throw new Error("USER_NOT_FOUND");

  const updated: SafeUser = {
    ...user,
    ...(body.firstName !== undefined && { firstName: body.firstName }),
    ...(body.lastName !== undefined && { lastName: body.lastName }),
    ...(body.email !== undefined && { email: body.email || null }),
  };
  upsertUser(updated);
  return { user: updated };
}

export async function updateProviderProfile(body: {
  categories?: string[];
  bio?: string;
  preferredLocation?: string;
}): Promise<{ profile: ProviderProfile }> {
  try {
    return await apiFetch<{ profile: ProviderProfile }>("/auth/provider-profile", {
      method: "PUT",
      body,
    });
  } catch (err) {
    throwBackendError(err);
  }
}

export async function getProviderPublicProfile(id: string): Promise<{
  user: SafeUser;
  providerProfile: ProviderProfile | null;
}> {
  try {
    return await apiFetch<{ user: SafeUser; providerProfile: ProviderProfile | null }>(
      `/auth/providers/${id}`,
      { auth: false },
    );
  } catch (err) {
    throwBackendError(err);
  }
}
