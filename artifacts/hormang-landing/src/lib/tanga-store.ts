import { emitStoreChange } from "./store-events";
import type { LocalizedText } from "./localization";

export const TANGA_BALANCE_PREFIX      = "provider_tokens";
export const PRICING_TIERS_KEY         = "hormang_pricing_tiers";
export const PLAN_USER_PURCHASES_KEY   = "hormang_plan_user_purchases";

export interface PricingTier {
  id: string;
  /** Primary display name (Uzbek). Use nameLocalized when available. */
  name: string;
  /** Multilingual plan name. Use getLocalizedText(nameLocalized ?? name, locale). */
  nameLocalized?: LocalizedText;
  credits: number;
  price: number;

  /* ── Pricing ────────────────────────────────────────────────────── */
  salePrice?: number;
  /** Global campaign cap — total discounted purchases available. */
  saleLimit?: number;
  salePurchaseCount?: number;
  /** Per-provider purchase cap (0 = unlimited). */
  perUserLimit?: number;
  bonusTokens?: number;

  /* ── Scheduling ─────────────────────────────────────────────────── */
  startsAt?: string;    // ISO datetime — campaign start
  validUntil?: string;  // ISO datetime — campaign expiry

  /* ── Status & targeting ─────────────────────────────────────────── */
  status?: "draft" | "active" | "scheduled" | "expired" | "archived";
  visibilityTarget?: "all" | "new" | "active" | "referral";

  /* ── Highlighting ───────────────────────────────────────────────── */
  featured?: boolean;
  hotOffer?: boolean;
  bonusPlan?: boolean;
  badge?: string;
  /** Multilingual badge label. Use getLocalizedText(badgeLocalized ?? badge, locale). */
  badgeLocalized?: LocalizedText;

  /* ── Meta ───────────────────────────────────────────────────────── */
  desc: string;
  /** Multilingual description. Use getLocalizedText(descLocalized ?? desc, locale). */
  descLocalized?: LocalizedText;
  color: string;
  active: boolean;
}

/* ─── Per-user purchase tracking ────────────────────────────────── */
export function getUserPlanPurchaseCount(userId: string, planId: string): number {
  try {
    const raw = localStorage.getItem(PLAN_USER_PURCHASES_KEY);
    const data: Record<string, number> = raw ? JSON.parse(raw) : {};
    return data[`${userId}__${planId}`] ?? 0;
  } catch { return 0; }
}

export function incrementUserPlanPurchaseCount(userId: string, planId: string): void {
  try {
    const raw = localStorage.getItem(PLAN_USER_PURCHASES_KEY);
    const data: Record<string, number> = raw ? JSON.parse(raw) : {};
    data[`${userId}__${planId}`] = (data[`${userId}__${planId}`] ?? 0) + 1;
    localStorage.setItem(PLAN_USER_PURCHASES_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

/* ─── Sale helpers ───────────────────────────────────────────────── */
export function isSaleActive(tier: PricingTier): boolean {
  if (tier.salePrice === undefined) return false;
  const now = new Date();
  if (tier.startsAt && new Date(tier.startsAt) > now) return false;
  if (tier.validUntil && new Date(tier.validUntil) <= now) return false;
  if (tier.saleLimit === undefined) return true;
  return (tier.salePurchaseCount ?? 0) < tier.saleLimit;
}

export function getEffectivePrice(tier: PricingTier): number {
  return isSaleActive(tier) ? tier.salePrice! : tier.price;
}

export function getSaleRemaining(tier: PricingTier): number | null {
  if (tier.salePrice === undefined || tier.saleLimit === undefined) return null;
  return Math.max(0, tier.saleLimit - (tier.salePurchaseCount ?? 0));
}

export function incrementSalePurchaseCount(tierId: string): void {
  const all = getAllTiers();
  const updated = all.map((t) =>
    t.id === tierId ? { ...t, salePurchaseCount: (t.salePurchaseCount ?? 0) + 1 } : t
  );
  saveAllTiers(updated);
}

/* ─── Pre-purchase eligibility check (for UI) ────────────────────── */
export interface EligibilityResult {
  ok: boolean;
  reason?: "tier_missing" | "tier_inactive" | "expired" | "not_started" | "sale_sold_out" | "per_user_limit_exceeded";
  userCount?: number;
  perUserLimit?: number;
}

export function canUserPurchaseTier(userId: string, tierId: string): EligibilityResult {
  const tier = getAllTiers().find((t) => t.id === tierId);
  if (!tier) return { ok: false, reason: "tier_missing" };
  if (!tier.active) return { ok: false, reason: "tier_inactive" };
  const status = tier.status ?? "active";
  if (status !== "active") return { ok: false, reason: "tier_inactive" };
  const now = new Date();
  if (tier.startsAt && new Date(tier.startsAt) > now) return { ok: false, reason: "not_started" };
  if (tier.validUntil && new Date(tier.validUntil) <= now) return { ok: false, reason: "expired" };
  if (isSaleActive(tier) && tier.saleLimit !== undefined) {
    const used = tier.salePurchaseCount ?? 0;
    if (used >= tier.saleLimit) return { ok: false, reason: "sale_sold_out" };
  }
  const limit = tier.perUserLimit ?? 0;
  if (limit > 0) {
    const userCount = getUserPlanPurchaseCount(userId, tierId);
    if (userCount >= limit) return { ok: false, reason: "per_user_limit_exceeded", userCount, perUserLimit: limit };
    return { ok: true, userCount, perUserLimit: limit };
  }
  return { ok: true };
}

/* ─── Balance ────────────────────────────────────────────────────── */
export function getTangaBalance(userId: string): number {
  try {
    const raw = localStorage.getItem(`${TANGA_BALANCE_PREFIX}_${userId}`);
    return raw ? parseInt(raw, 10) : 0;
  } catch { return 0; }
}

export function addTangaBalance(userId: string, amount: number): number {
  const next = getTangaBalance(userId) + amount;
  localStorage.setItem(`${TANGA_BALANCE_PREFIX}_${userId}`, String(next));
  emitStoreChange();
  return next;
}

export function spendTangaBalance(userId: string, amount: number): number {
  const current = getTangaBalance(userId);
  if (current < amount) {
    throw new Error(`Insufficient Tanga balance: has ${current}, needs ${amount}`);
  }
  const next = current - amount;
  localStorage.setItem(`${TANGA_BALANCE_PREFIX}_${userId}`, String(next));
  emitStoreChange();
  return next;
}

/* ─── Atomic plan purchase ───────────────────────────────────────── */
export interface PurchaseResult {
  ok: boolean;
  total?: number;
  pricePaid?: number;
  wasOnSale?: boolean;
  source?: "normal_purchase" | "discount_campaign";
  error?: "tier_missing" | "tier_inactive" | "expired" | "sale_sold_out" | "not_started" | "per_user_limit_exceeded";
}

export function purchaseTier(userId: string, tierId: string): PurchaseResult {
  if (!userId) return { ok: false, error: "tier_missing" };
  const tiers = getAllTiers();
  const idx = tiers.findIndex((t) => t.id === tierId);
  if (idx === -1) return { ok: false, error: "tier_missing" };
  const tier = tiers[idx];

  if (!tier.active) return { ok: false, error: "tier_inactive" };
  const status = tier.status ?? "active";
  if (status !== "active") return { ok: false, error: "tier_inactive" };

  const now = new Date();
  if (tier.startsAt && new Date(tier.startsAt) > now) return { ok: false, error: "not_started" };
  if (tier.validUntil && new Date(tier.validUntil) <= now) return { ok: false, error: "expired" };

  /* ── Per-user limit check ──────────────────────────────────────── */
  const perUserLimit = tier.perUserLimit ?? 0;
  if (perUserLimit > 0) {
    const userCount = getUserPlanPurchaseCount(userId, tierId);
    if (userCount >= perUserLimit) return { ok: false, error: "per_user_limit_exceeded" };
  }

  const wasOnSale = isSaleActive(tier);
  if (wasOnSale && tier.saleLimit !== undefined) {
    const used = tier.salePurchaseCount ?? 0;
    if (used >= tier.saleLimit) return { ok: false, error: "sale_sold_out" };
    // Atomic seat reservation BEFORE credit.
    tiers[idx] = { ...tier, salePurchaseCount: used + 1 };
    saveAllTiers(tiers);
  }

  /* ── Per-user count increment ──────────────────────────────────── */
  if (perUserLimit > 0) {
    incrementUserPlanPurchaseCount(userId, tierId);
  }

  const pricePaid = wasOnSale && tier.salePrice !== undefined ? tier.salePrice : tier.price;
  const total = tier.credits + (tier.bonusTokens ?? 0);
  addTangaBalance(userId, total);

  const source: PurchaseResult["source"] = wasOnSale ? "discount_campaign" : "normal_purchase";
  return { ok: true, total, pricePaid, wasOnSale, source };
}

/* ─── Tiers ──────────────────────────────────────────────────────── */
export function getAllTiers(): PricingTier[] {
  try {
    const raw = localStorage.getItem(PRICING_TIERS_KEY);
    return raw ? (JSON.parse(raw) as PricingTier[]) : [];
  } catch { return []; }
}

export function getActiveTiers(): PricingTier[] {
  const now = new Date();
  return getAllTiers().filter((t) => {
    if (!t.active) return false;
    const status = t.status ?? "active";
    if (status !== "active") return false;
    if (t.startsAt && new Date(t.startsAt) > now) return false;
    if (t.validUntil && new Date(t.validUntil) <= now) return false;
    return true;
  });
}

export function saveAllTiers(tiers: PricingTier[]): void {
  localStorage.setItem(PRICING_TIERS_KEY, JSON.stringify(tiers));
  emitStoreChange();
}
