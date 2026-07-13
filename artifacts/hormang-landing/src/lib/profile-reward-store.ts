/**
 * profile-reward-store.ts
 * One-time profile completion reward tracking (100% → +5 Tanga).
 *
 * Storage key: hormang_profile_reward_<userId>
 * Value: { granted: boolean; grantedAt?: string }
 *
 * CRITICAL: tryGrantProfileReward() writes the flag FIRST, then credits
 * balance + history. This prevents any double-grant race.
 */
import { addTangaBalance } from "./tanga-store";
import { recordTangaTransaction } from "./tanga-history-store";
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

/**
 * Atomically grants the one-time 100% profile completion reward.
 * Returns true if reward was just granted (first time ever).
 * Returns false if already granted, userId empty, or write failed.
 *
 * Safe to call on every render — only acts once per provider account.
 */
export function tryGrantProfileReward(userId: string): boolean {
  if (!userId) return false;

  const status = getProfileRewardStatus(userId);
  if (status.granted) return false;

  const grantedAt = new Date().toISOString();

  /* Write the flag FIRST — prevents any re-entry */
  try {
    localStorage.setItem(
      `${PROFILE_REWARD_PREFIX}${userId}`,
      JSON.stringify({ granted: true, grantedAt }),
    );
  } catch {
    return false;
  }

  /* Credit +5 Tanga to balance */
  addTangaBalance(userId, 5);

  /* Record in Tanga history */
  recordTangaTransaction({
    userId,
    offerId:        "",
    requestId:      "",
    categoryName:   "Profil bonusi",
    categoryEmoji:  "🎖",
    description:    "Profil 100% to'ldirilgani uchun bonus",
    amount:         5,
    type:           "profile_completion_reward",
    direction:      "in",
    source:         "admin_grant",
  });

  emitStoreChange();
  return true;
}
