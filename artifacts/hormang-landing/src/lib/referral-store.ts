/**
 * referral-store.ts
 * Per-user referral system.
 *
 * Flow:
 *  1. Referrer opens their ReferralCard → shows their deterministic code/link.
 *  2. Invitee follows link /auth/register?role=provider&ref=HORMANG-XXXXXX
 *  3. After OTP verified → recordReferralSignup(code, newUserId) remembers
 *     the pending code locally (same browser, same registration flow).
 *  4. After provider profile saved → processReferralReward(newUserId) submits
 *     the pending code to POST /wallet/referral-reward, which resolves the
 *     referrer server-side (codes are deterministic — HORMANG-<first 6 chars
 *     of the referrer's userId> — so no client-side index is needed) and
 *     credits their real wallet atomically. Idempotent via a unique DB
 *     constraint, so this is safe to call more than once.
 */
import { apiFetch } from "./api-client";

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

/* ─── Code helpers (deterministic, no storage needed) ──────────────── */

export function getReferralCode(userId: string): string {
  return `HORMANG-${userId.slice(0, 6).toUpperCase()}`;
}

export function getReferralLink(userId: string): string {
  const code = getReferralCode(userId);
  return `${window.location.origin}/auth/register?role=provider&ref=${code}`;
}

/* ─── Real stats (the current authenticated user's own) ─────────────── */

export async function getReferralStats(): Promise<ReferralStats> {
  try {
    return await apiFetch<ReferralStats>("/wallet/referral-stats");
  } catch {
    return { count: 0, earned: 0, invitees: [] };
  }
}

/* ─── Pending-code bookkeeping (local, single registration flow) ────── */

function pendingKey(userId: string): string {
  return `hormang_ref_pending_${userId}`;
}

/** Called immediately after a new user registers via a referral link. */
export function recordReferralSignup(refCode: string, newUserId: string): void {
  if (!refCode || !newUserId) return;
  localStorage.setItem(pendingKey(newUserId), refCode.toUpperCase());
}

/**
 * Called when an invited user completes their provider profile. Submits the
 * pending referral code to the real backend, which credits the referrer's
 * wallet (capped at MAX_REFERRALS) — safe to call more than once.
 */
export async function processReferralReward(newUserId: string): Promise<void> {
  if (!newUserId) return;
  const code = localStorage.getItem(pendingKey(newUserId));
  if (!code) return;

  try {
    const res = await apiFetch<{ granted: boolean; alreadyGranted?: boolean; capped?: boolean; balance?: number }>(
      "/wallet/referral-reward",
      { method: "POST", body: { referrerCode: code } },
    );
    if (res.granted || res.alreadyGranted || res.capped) {
      localStorage.removeItem(pendingKey(newUserId));
    }
  } catch {
    // Leave the pending key in place — a transient failure can retry later.
  }
}
