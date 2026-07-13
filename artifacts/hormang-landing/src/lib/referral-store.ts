/**
 * referral-store.ts
 * Per-user referral system — strictly isolated by userId (no data leakage).
 *
 * Flow:
 *  1. Referrer opens their ReferralCard → ensureReferralIndex() registers code→userId mapping
 *  2. Invitee follows link /auth/register?role=provider&ref=HORMANG-XXXXXX
 *  3. After OTP verified → recordReferralSignup(code, newUserId)
 *  4. After provider profile saved → processReferralReward(newUserId)
 *     → awards 3 Tanga to referrer, updates their stats
 */
import { addTangaBalance } from "./tanga-store";
import { recordTangaTransaction } from "./tanga-history-store";
import { emitStoreChange } from "./store-events";

export const TANGA_PER_REFERRAL = 3;
export const MAX_REFERRALS = 5;
export const MAX_REFERRAL_TANGA = TANGA_PER_REFERRAL * MAX_REFERRALS; // 15

export interface ReferralInvitee {
  userId: string;
  completedAt: string;
}

export interface ReferralStats {
  count: number;
  earned: number;
  invitees: ReferralInvitee[];
}

/* ─── Code helpers ────────────────────────────────────────────────── */

/** Deterministic referral code derived from userId (no storage needed). */
export function getReferralCode(userId: string): string {
  return `HORMANG-${userId.slice(0, 6).toUpperCase()}`;
}

/** Full referral link directing the invitee to provider registration. */
export function getReferralLink(userId: string): string {
  const code = getReferralCode(userId);
  return `${window.location.origin}/auth/register?role=provider&ref=${code}`;
}

/* ─── Per-user stats storage ──────────────────────────────────────── */

function statsKey(userId: string): string {
  return `hormang_referral_${userId}`;
}

export function getReferralStats(userId: string): ReferralStats {
  if (!userId) return { count: 0, earned: 0, invitees: [] };
  try {
    const raw = localStorage.getItem(statsKey(userId));
    if (raw) return JSON.parse(raw) as ReferralStats;
  } catch {}
  return { count: 0, earned: 0, invitees: [] };
}

function saveReferralStats(userId: string, stats: ReferralStats): void {
  localStorage.setItem(statsKey(userId), JSON.stringify(stats));
  emitStoreChange();
}

/* ─── Index: code → referrerId ────────────────────────────────────── */

/**
 * Register the code → userId mapping in localStorage.
 * Must be called whenever the referral card/link is displayed so that
 * processReferralReward() can look up the referrer.
 */
export function ensureReferralIndex(userId: string): void {
  if (!userId) return;
  const code = getReferralCode(userId);
  localStorage.setItem(`hormang_ref_code_${code}`, userId);
}

/**
 * Resolve a referral code to a referrer userId, even when the referrer
 * never opened their referral card (i.e. no `hormang_ref_code_*` index).
 *
 * Strategy:
 *   1. Direct index lookup (`hormang_ref_code_<code>`).
 *   2. Scan all known users (customer registry, phone registry, local
 *      profiles) and match by `getReferralCode(uid) === code`.
 *      Codes are derived deterministically from userId, so this is reliable.
 */
export function resolveReferrerByCode(code: string): string | null {
  if (!code) return null;
  const upper = code.toUpperCase();

  // 1) Direct index.
  const direct = localStorage.getItem(`hormang_ref_code_${upper}`);
  if (direct) return direct;

  // 2) Scan known users.
  const knownIds = new Set<string>();

  try {
    const reg = localStorage.getItem("hormang_customer_registry");
    if (reg) Object.keys(JSON.parse(reg) as Record<string, unknown>).forEach((id) => knownIds.add(id));
  } catch { /* ignore */ }

  try {
    const phones = localStorage.getItem("hormang_phone_registry");
    if (phones) Object.keys(JSON.parse(phones) as Record<string, unknown>).forEach((id) => knownIds.add(id));
  } catch { /* ignore */ }

  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (k.startsWith("user_") && k.endsWith("_localProfile")) {
      knownIds.add(k.slice("user_".length, -"_localProfile".length));
    }
    if (k.startsWith("provider_tokens_")) {
      knownIds.add(k.slice("provider_tokens_".length));
    }
  }

  for (const id of knownIds) {
    if (getReferralCode(id) === upper) {
      // Backfill the index for next time.
      localStorage.setItem(`hormang_ref_code_${upper}`, id);
      return id;
    }
  }

  return null;
}

/* ─── Permanent inviter storage (userId → referrerUserId) ─────────── */

function inviterKey(userId: string): string {
  return `hormang_ref_inviter_${userId}`;
}

/** Returns the resolved referrer userId for a user, if any. */
export function getInviterId(userId: string): string | null {
  if (!userId) return null;
  const stored = localStorage.getItem(inviterKey(userId));
  if (stored) return stored;
  // Fall back to pending code → resolve.
  const pending = localStorage.getItem(`hormang_ref_pending_${userId}`);
  if (!pending) return null;
  const resolved = resolveReferrerByCode(pending);
  if (resolved) {
    localStorage.setItem(inviterKey(userId), resolved);
    return resolved;
  }
  return null;
}

/* ─── Registration hooks ──────────────────────────────────────────── */

/** Called immediately after a new user registers via a referral link. */
export function recordReferralSignup(refCode: string, newUserId: string): void {
  if (!refCode || !newUserId) return;
  const code = refCode.toUpperCase();
  localStorage.setItem(`hormang_ref_pending_${newUserId}`, code);

  // Try to resolve the inviter immediately so admin & analytics have it
  // even before processReferralReward() runs.
  const inviterId = resolveReferrerByCode(code);
  if (inviterId && inviterId !== newUserId) {
    localStorage.setItem(inviterKey(newUserId), inviterId);
  }

  console.log(`[Hormang] 🔗 Referral qayd etildi: code=${code} → userId=${newUserId}${inviterId ? ` (inviter=${inviterId.slice(0,8)})` : " (inviter unresolved)"}`);
  emitStoreChange();
}

/**
 * Called when an invited user completes their provider profile.
 * Awards TANGA_PER_REFERRAL Tanga to the referrer (capped at MAX_REFERRALS).
 */
export function processReferralReward(newUserId: string): void {
  if (!newUserId) return;

  const pendingKey = `hormang_ref_pending_${newUserId}`;
  const code = localStorage.getItem(pendingKey);
  if (!code) return;

  const referrerId = resolveReferrerByCode(code);
  if (!referrerId || referrerId === newUserId) {
    // Keep the pending key around if we still can't resolve — the admin
    // load step will retry once more users are known.
    if (referrerId === newUserId) localStorage.removeItem(pendingKey);
    return;
  }

  // Persist the inviter relationship permanently (survives reward processing).
  localStorage.setItem(inviterKey(newUserId), referrerId);

  const stats = getReferralStats(referrerId);

  if (stats.count >= MAX_REFERRALS) {
    console.log(`[Hormang] ⚠️ Referral chegarasi to'ldi: ${referrerId}`);
    localStorage.removeItem(pendingKey);
    return;
  }

  if (stats.invitees.some((inv) => inv.userId === newUserId)) {
    localStorage.removeItem(pendingKey);
    return;
  }

  addTangaBalance(referrerId, TANGA_PER_REFERRAL);

  recordTangaTransaction({
    userId: referrerId,
    offerId: "",
    requestId: "",
    categoryName: "Do'stni taklif qilish mukofoti",
    categoryEmoji: "🎁",
    description: `Yangi ijrochi taklif uchun +${TANGA_PER_REFERRAL} Tanga`,
    amount: TANGA_PER_REFERRAL,
    type: "referral",
    direction: "in",
  });

  saveReferralStats(referrerId, {
    count: stats.count + 1,
    earned: stats.earned + TANGA_PER_REFERRAL,
    invitees: [
      ...stats.invitees,
      { userId: newUserId, completedAt: new Date().toISOString() },
    ],
  });

  localStorage.removeItem(pendingKey);
  console.log(`[Hormang] 🎉 Referral mukofot berildi: ${referrerId} ← ${newUserId} (+${TANGA_PER_REFERRAL} Tanga)`);
}
