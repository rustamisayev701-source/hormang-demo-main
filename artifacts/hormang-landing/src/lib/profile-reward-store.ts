/**
 * profile-reward-store.ts
 * One-time profile completion reward (100% → +5 Tanga).
 *
 * The grant itself is enforced server-side (users.profile_bonus_granted_at,
 * checked atomically in a DB transaction — see POST /wallet/profile-bonus),
 * so it's safe to call on every render. The local "granted" flag here is
 * just a fast-path cache to skip the network round-trip once we already
 * know it's claimed, not a correctness requirement.
 */
import { apiFetch } from "./api-client";
import { refreshTangaBalance } from "./wallet-balance";
import { emitStoreChange } from "./store-events";

export const PROFILE_REWARD_PREFIX = "hormang_profile_reward_";

export interface ProfileRewardStatus {
  granted: boolean;
  grantedAt?: string;
}

export function getProfileRewardStatus(userId: string): ProfileRewardStatus {
  if (!userId) return { granted: false };
  try {
    const raw = localStorage.getItem(`${PROFILE_REWARD_PREFIX}${userId}`);
    return raw ? (JSON.parse(raw) as ProfileRewardStatus) : { granted: false };
  } catch {
    return { granted: false };
  }
}

function markGrantedLocally(userId: string): void {
  try {
    localStorage.setItem(
      `${PROFILE_REWARD_PREFIX}${userId}`,
      JSON.stringify({ granted: true, grantedAt: new Date().toISOString() }),
    );
  } catch { /* ignore */ }
}

/**
 * Attempts the one-time 100% profile completion reward.
 * Returns true only the first time it's actually granted (by this call).
 */
export async function tryGrantProfileReward(userId: string): Promise<boolean> {
  if (!userId) return false;
  if (getProfileRewardStatus(userId).granted) return false;

  try {
    const res = await apiFetch<{ granted: boolean; alreadyGranted?: boolean; balance: number }>(
      "/wallet/profile-bonus",
      { method: "POST" },
    );
    if (res.granted) {
      markGrantedLocally(userId);
      await refreshTangaBalance(userId);
      emitStoreChange();
      return true;
    }
    if (res.alreadyGranted) markGrantedLocally(userId);
    return false;
  } catch {
    return false;
  }
}
