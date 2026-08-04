/**
 * wallet-balance.ts
 * In-memory cache of the real backend Tanga balance (wallets table), shared
 * across every display spot (TangaChip, plans hero, admin summaries).
 *
 * Replaces the old per-browser localStorage balance (tanga-store.ts's
 * getTangaBalance) as the source of truth — that number only ever went up
 * (nothing actually decremented it on spend), so it silently drifted away
 * from the real balance admin sees. Components call refreshTangaBalance()
 * on mount/after a mutation and re-render via useStoreRefresh(), reading
 * getCachedTangaBalance() synchronously.
 */
import { getWallet } from "./wallet-client";
import { emitStoreChange } from "./store-events";

let cachedBalance = 0;
let cachedUserId: string | null = null;
let inFlight: Promise<number> | null = null;

export function getCachedTangaBalance(): number {
  return cachedBalance;
}

export async function refreshTangaBalance(userId?: string): Promise<number> {
  if (inFlight) return inFlight;
  inFlight = getWallet()
    .then((res) => {
      cachedBalance = res.balance;
      cachedUserId = userId ?? cachedUserId;
      emitStoreChange();
      return res.balance;
    })
    .catch(() => cachedBalance)
    .finally(() => { inFlight = null; });
  return inFlight;
}

/** Clears the cache on logout so a different account never briefly shows a stale number. */
export function clearCachedTangaBalance(): void {
  cachedBalance = 0;
  cachedUserId = null;
}

export function getCachedTangaBalanceUserId(): string | null {
  return cachedUserId;
}
