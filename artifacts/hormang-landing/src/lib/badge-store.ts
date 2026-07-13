/**
 * badge-store.ts — Provider Badge System engine
 *
 * 8 badge types across 2 categories:
 *   • 6 AUTO badges (provider-only): verified, top_provider, trusted_provider,
 *     experienced_provider, premium_provider, strong_portfolio.
 *   • 2 ADMIN-ONLY badges: recommended_by_hormang (provider-only),
 *     under_review (BOTH providers and customers — only badge for customers).
 *
 * Storage key: hormang_badges_<userId> → Badge[]
 *
 * Auto badges are recalculated lazily on every getBadges() read; the function
 * compares the auto-set with what's stored and only mutates + emits a change
 * event when the diff is non-empty (preventing render loops).
 *
 * Admin badges persist until explicitly removed by an admin.
 *
 * All grant/remove actions append to the admin audit log (`hormang_admin_log`)
 * so badge moderation history is queryable from the AuditLogSection.
 */
import type { SafeUser } from "./auth-client";
import { getStoredProviderProfile } from "./auth-client";
import { getLocalProfile, getCompletionChecks, getCompletionPct } from "./local-profile";
import {
  getAverageRatingForUser,
  getReviewsForUser,
  getCompletedCount,
  getProviderReviewAverages,
} from "./completion-store";
import { getTangaTransactions } from "./tanga-history-store";
import { emitStoreChange } from "./store-events";

/* ─── Types ────────────────────────────────────────────────────────── */

export type BadgeType =
  | "recommended_by_hormang"
  | "top_provider"
  | "trusted_provider"
  | "verified"
  | "experienced_provider"
  | "premium_provider"
  | "strong_portfolio"
  | "under_review";

export interface Badge {
  type:             BadgeType;
  source:           "auto" | "admin";
  grantedAt:        string;
  grantedBy?:       string;            // admin id (for admin-source badges)
  visible:          boolean;
  lastEvaluatedAt?: string;
}

/** Badge metadata: visual style, label, description, eligibility scope. */
export interface BadgeMeta {
  type:        BadgeType;
  label:       string;
  description: string;
  hint:        string;                 // shown in empty state hints
  source:      "auto" | "admin";
  scope:       "provider" | "both";    // who can hold this badge
  /** Tailwind classes for the pill background + text */
  pillBg:      string;
  pillText:    string;
  pillBorder:  string;
  /** Optional inline style — overrides the Tailwind classes above for richer effects (gradients, glows, etc.) */
  pillStyle?:  React.CSSProperties;
  /** Lucide icon name (resolved by the UI layer) */
  icon:        "ShieldCheck" | "Star" | "Shield" | "Award" | "Crown" | "Images" | "BadgeCheck" | "Eye" | "UserStar";
  /** Display priority — lower = shown first */
  order:       number;
}

/* ─── Badge metadata catalog ───────────────────────────────────────── */

export const BADGE_META: Record<BadgeType, BadgeMeta> = {
  recommended_by_hormang: {
    type: "recommended_by_hormang",
    label: "Hormang tavsiyasi",
    description: "Hormang jamoasi tomonidan tavsiya etilgan ijrochi",
    hint: "Hormang jamoasi tomonidan tavsiya etilgan ijrochi",
    source: "admin",
    scope: "provider",
    pillBg:     "bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50",
    pillText:   "text-amber-800",
    pillBorder: "border-amber-300/70 ring-1 ring-amber-200/60 shadow-[0_2px_8px_-2px_rgba(217,119,6,0.25)]",
    icon: "UserStar",
    order: 1,
  },
  top_provider: {
    type: "top_provider",
    label: "Top ijrochi",
    description: "Reyting ≥ 4.7 va 50+ xizmat bajargan ijrochi",
    hint: "Reyting ≥ 4.7 va 50+ xizmat bajargan ijrochi",
    source: "auto",
    scope: "provider",
    pillBg:     "bg-gradient-to-r from-yellow-50 to-amber-50",
    pillText:   "text-amber-700",
    pillBorder: "border-amber-200",
    icon: "Star",
    order: 2,
  },
  trusted_provider: {
    type: "trusted_provider",
    label: "Ishonchli ijrochi",
    description: "Reyting ≥ 4.7 va sharhlarda barcha mezonlar 80%+",
    hint: "Reyting ≥ 4.7 va xizmat sifati, muomala va narx ko'rsatkichlari 80%+ bo'lgan ijrochi",
    source: "auto",
    scope: "provider",
    pillBg:     "bg-emerald-50",
    pillText:   "text-emerald-700",
    pillBorder: "border-emerald-200",
    icon: "Shield",
    order: 3,
  },
  verified: {
    type: "verified",
    label: "Tasdiqlangan",
    description: "Telefon raqami tasdiqlangan va profil 100% to'ldirilgan",
    hint: "Telefon raqami tasdiqlangan va profil 100% to'ldirilgan ijrochi",
    source: "auto",
    scope: "provider",
    pillBg:     "bg-blue-50",
    pillText:   "text-blue-700",
    pillBorder: "border-blue-200",
    icon: "ShieldCheck",
    order: 4,
  },
  experienced_provider: {
    type: "experienced_provider",
    label: "Tajribali",
    description: "1+ yil hisob va 50+ bajarilgan ish",
    hint: "Hormangda 1+ yil faoliyat ko'rsatgan va 50+ xizmat bajargan ijrochi",
    source: "auto",
    scope: "provider",
    pillBg:     "bg-indigo-50",
    pillText:   "text-indigo-700",
    pillBorder: "border-indigo-200",
    icon: "Award",
    order: 5,
  },
  premium_provider: {
    type: "premium_provider",
    label: "Premium",
    description: "Jami 500+ Tanga to'plagan",
    hint: "Hormang platformasida 500+ Tanga sarflagan ijrochi",
    source: "auto",
    scope: "provider",
    pillBg:     "bg-amber-100",
    pillText:   "text-amber-900",
    pillBorder: "border-amber-400",
    pillStyle: {
      background: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 55%, #FEF9C3 100%)",
      color: "#78350F",
      borderColor: "#D97706",
      boxShadow: "0 0 0 1px rgba(217,119,6,0.20), inset 0 1px 0 rgba(255,255,255,0.55)",
    },
    icon: "Crown",
    order: 6,
  },
  strong_portfolio: {
    type: "strong_portfolio",
    label: "Kuchli portfolio",
    description: "5+ albom va har birida 10+ rasm",
    hint: "Portfoliosida 5+ albom va har birida 10+ rasm bo'lgan ijrochi",
    source: "auto",
    scope: "provider",
    pillBg:     "bg-gradient-to-r from-purple-50 to-blue-50",
    pillText:   "text-purple-700",
    pillBorder: "border-purple-200",
    icon: "Images",
    order: 7,
  },
  under_review: {
    type: "under_review",
    label: "Kuzatuvda",
    description: "Platforma administratorlari tomonidan kuzatuv ostida turgan yoki ogohlantirish olgan ijrochi",
    hint: "Admin tomonidan vaqtinchalik tekshiruv ostida",
    source: "admin",
    scope: "both",
    pillBg:     "bg-rose-50/60",
    pillText:   "text-rose-700",
    pillBorder: "border-rose-300 border-dashed",
    icon: "Eye",
    order: 8,
  },
};

export const ALL_BADGE_TYPES: BadgeType[] = (Object.values(BADGE_META) as BadgeMeta[])
  .sort((a, b) => a.order - b.order)
  .map((m) => m.type);

export const AUTO_BADGE_TYPES: BadgeType[] = ALL_BADGE_TYPES
  .filter((t) => BADGE_META[t].source === "auto");

export const ADMIN_BADGE_TYPES: BadgeType[] = ALL_BADGE_TYPES
  .filter((t) => BADGE_META[t].source === "admin");

/* ─── Storage primitives ───────────────────────────────────────────── */

const KEY = (userId: string): string => `hormang_badges_${userId}`;

function readBadges(userId: string): Badge[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(KEY(userId));
    return raw ? (JSON.parse(raw) as Badge[]) : [];
  } catch {
    return [];
  }
}

function writeBadges(userId: string, badges: Badge[]): void {
  if (!userId) return;
  localStorage.setItem(KEY(userId), JSON.stringify(badges));
}

/* ─── Audit log integration ────────────────────────────────────────── */

const ADMIN_LOG_KEY = "hormang_admin_log";

interface AuditLogEntry {
  id:          string;
  actorId:     string;
  actorRole:   "admin" | "system";
  action:      string;
  category:    "admin" | "marketplace" | "financial" | "referral" | "risk";
  targetId?:   string;
  targetType?: "user";
  description: string;
  metadata?:   Record<string, unknown>;
  createdAt:   string;
}

function appendAuditLog(entry: Omit<AuditLogEntry, "id" | "createdAt">): void {
  try {
    const raw = localStorage.getItem(ADMIN_LOG_KEY);
    const log: AuditLogEntry[] = raw ? JSON.parse(raw) : [];
    const full: AuditLogEntry = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(ADMIN_LOG_KEY, JSON.stringify([full, ...log].slice(0, 1000)));
  } catch {
    /* swallow — audit failures never break UI */
  }
}

/* ─── Auto-badge evaluation ────────────────────────────────────────── */

/**
 * Cumulative acquired Tanga across the user's lifetime.
 * Counts every "in"-direction transaction (purchase, referral, refund,
 * profile reward, admin grant). Excludes spends.
 */
function cumulativeAcquiredTanga(userId: string): number {
  return getTangaTransactions(userId).reduce((sum, tx) => {
    if (tx.direction === "in") return sum + Math.abs(tx.amount);
    if (tx.direction === "out") return sum;
    // Legacy untyped fallback
    if (tx.type === "purchase" || tx.type === "referral" ||
        tx.type === "refund"   || tx.type === "profile_completion_reward") {
      return sum + Math.abs(tx.amount);
    }
    return sum;
  }, 0);
}

/** Account age in days. Returns 0 if createdAt is missing/invalid. */
function accountAgeDays(user: SafeUser): number {
  if (!user.createdAt) return 0;
  const ms = Date.now() - new Date(user.createdAt).getTime();
  if (isNaN(ms) || ms < 0) return 0;
  return Math.floor(ms / 86_400_000);
}

/** Returns the set of auto badges this provider currently qualifies for. */
export function computeQualifiedAutoBadges(user: SafeUser): Set<BadgeType> {
  const out = new Set<BadgeType>();

  const local           = getLocalProfile(user.id);
  const providerProfile = getStoredProviderProfile(user.id);

  // Accept both native-provider accounts and buyer accounts that became providers.
  if (user.role !== "provider" && !providerProfile) return out;
  const checks         = getCompletionChecks(user, providerProfile, local);
  const completion     = getCompletionPct(checks);
  const rating      = getAverageRatingForUser(user.id, "provider");
  const reviewCount = getReviewsForUser(user.id, "provider").length;
  const completed   = getCompletedCount(user.id, "provider");
  const metrics     = getProviderReviewAverages(user.id);
  const albums      = local.albums ?? [];
  const tangaAcquired = cumulativeAcquiredTanga(user.id);
  const ageDays     = accountAgeDays(user);

  // 1. Verified — phone present + profile 100%
  if (!!user.phone && completion === 100) {
    out.add("verified");
  }

  // 2. Top provider — rating ≥ 4.7 AND completed ≥ 50
  if (rating >= 4.7 && completed >= 50) {
    out.add("top_provider");
  }

  // 3. Trusted provider — rating ≥ 4.7 AND all 3 sliders ≥ 80%
  // Sliders are 0-100 scale (review-modal default 50). Require at least
  // one review to avoid awarding on empty metrics.
  if (rating >= 4.7 && reviewCount > 0 &&
      metrics.serviceQuality   >= 80 &&
      metrics.providerAttitude >= 80 &&
      metrics.servicePrice     >= 80) {
    out.add("trusted_provider");
  }

  // 4. Experienced provider — account age ≥ 365 days AND completed ≥ 50
  if (ageDays >= 365 && completed >= 50) {
    out.add("experienced_provider");
  }

  // 5. Premium provider — cumulative acquired Tanga > 500
  if (tangaAcquired > 500) {
    out.add("premium_provider");
  }

  // 6. Strong portfolio — 5+ albums, each with 10+ photos
  if (albums.length >= 5 && albums.every((a) => a.photos.length >= 10)) {
    out.add("strong_portfolio");
  }

  return out;
}

/**
 * Sync the auto-badge set in storage to match current eligibility.
 * Returns {added, removed} so callers can surface notifications.
 * Idempotent: if nothing changed, no write or event is emitted.
 */
export function evaluateAutoBadges(user: SafeUser): { added: BadgeType[]; removed: BadgeType[] } {
  const stored    = readBadges(user.id);
  const qualified = computeQualifiedAutoBadges(user);
  const now       = new Date().toISOString();

  // Keep all admin badges as-is; rebuild auto set from qualifying types,
  // preserving original grantedAt for badges that already existed.
  const adminBadges = stored.filter((b) => b.source === "admin");
  const oldAutoMap  = new Map(stored.filter((b) => b.source === "auto").map((b) => [b.type, b]));

  const newAutoBadges: Badge[] = Array.from(qualified).map((type) => {
    const prev = oldAutoMap.get(type);
    return {
      type,
      source: "auto",
      grantedAt: prev?.grantedAt ?? now,
      visible:   prev?.visible   ?? true,
      lastEvaluatedAt: now,
    };
  });

  const added: BadgeType[]   = newAutoBadges
    .filter((b) => !oldAutoMap.has(b.type))
    .map((b) => b.type);
  const removed: BadgeType[] = Array.from(oldAutoMap.keys())
    .filter((t) => !qualified.has(t));

  if (added.length === 0 && removed.length === 0) {
    return { added, removed };
  }

  writeBadges(user.id, [...adminBadges, ...newAutoBadges]);
  // Audit auto-changes (system actor) so they show up in moderation log
  for (const t of added) {
    appendAuditLog({
      actorId: "system", actorRole: "system",
      action: "BADGE_AUTO_GRANT", category: "admin",
      targetId: user.id, targetType: "user",
      description: `Avtomatik nishon berildi: ${BADGE_META[t].label}`,
      metadata: { badgeType: t, userName: `${user.firstName} ${user.lastName}` },
    });
  }
  for (const t of removed) {
    appendAuditLog({
      actorId: "system", actorRole: "system",
      action: "BADGE_AUTO_REMOVE", category: "admin",
      targetId: user.id, targetType: "user",
      description: `Avtomatik nishon olib tashlandi: ${BADGE_META[t].label}`,
      metadata: { badgeType: t, userName: `${user.firstName} ${user.lastName}` },
    });
  }
  emitStoreChange();
  return { added, removed };
}

/* ─── Public read API ──────────────────────────────────────────────── */

/**
 * Returns the user's badges sorted by display priority. If `user` is provided
 * AND they're a provider, auto badges are re-evaluated lazily before reading.
 * Customers only ever hold the `under_review` badge.
 */
export function getBadges(userId: string, _user?: SafeUser | null): Badge[] {
  if (!userId) return [];
  const badges = readBadges(userId).filter((b) => b.visible !== false);
  return badges.sort(
    (a, b) => (BADGE_META[a.type]?.order ?? 99) - (BADGE_META[b.type]?.order ?? 99),
  );
}

/** Same as getBadges but skips re-evaluation — for read-only displays. */
export function getStoredBadges(userId: string): Badge[] {
  return readBadges(userId)
    .filter((b) => b.visible !== false)
    .sort((a, b) => (BADGE_META[a.type]?.order ?? 99) - (BADGE_META[b.type]?.order ?? 99));
}

/** Has the user been granted a specific badge? */
export function hasBadge(userId: string, type: BadgeType): boolean {
  return readBadges(userId).some((b) => b.type === type && b.visible !== false);
}

/* ─── Admin grant / remove ─────────────────────────────────────────── */

export interface AdminBadgeContext {
  adminId:      string;
  targetUserId: string;
  targetName:   string;
  targetRole:   "provider" | "customer" | "both";
}

export function adminGrantBadge(
  type: BadgeType,
  ctx: AdminBadgeContext,
): { ok: true } | { ok: false; reason: string } {
  const meta = BADGE_META[type];
  if (!meta) return { ok: false, reason: "Noma'lum nishon turi" };
  if (meta.source !== "admin") {
    return { ok: false, reason: "Bu nishon avtomatik beriladi, qo'lda berib bo'lmaydi" };
  }
  if (meta.scope === "provider" && ctx.targetRole === "customer") {
    return { ok: false, reason: "Bu nishon faqat ijrochilarga beriladi" };
  }

  const stored = readBadges(ctx.targetUserId);
  if (stored.some((b) => b.type === type)) {
    return { ok: false, reason: "Bu nishon allaqachon berilgan" };
  }

  const badge: Badge = {
    type,
    source: "admin",
    grantedAt: new Date().toISOString(),
    grantedBy: ctx.adminId,
    visible: true,
    lastEvaluatedAt: new Date().toISOString(),
  };
  writeBadges(ctx.targetUserId, [...stored, badge]);
  appendAuditLog({
    actorId: ctx.adminId, actorRole: "admin",
    action: "BADGE_GRANT", category: "admin",
    targetId: ctx.targetUserId, targetType: "user",
    description: `${ctx.targetName}ga "${meta.label}" nishoni berildi`,
    metadata: { badgeType: type, userName: ctx.targetName },
  });
  emitStoreChange();
  return { ok: true };
}

export function adminRemoveBadge(
  type: BadgeType,
  ctx: AdminBadgeContext,
): { ok: true } | { ok: false; reason: string } {
  const meta = BADGE_META[type];
  if (!meta) return { ok: false, reason: "Noma'lum nishon turi" };

  const stored = readBadges(ctx.targetUserId);
  const target = stored.find((b) => b.type === type);
  if (!target) return { ok: false, reason: "Bu nishon mavjud emas" };
  if (target.source === "auto") {
    return { ok: false, reason: "Avtomatik nishonlarni qo'lda olib tashlab bo'lmaydi (shartlar bajarilmasa o'zi olinadi)" };
  }

  writeBadges(ctx.targetUserId, stored.filter((b) => b.type !== type));
  appendAuditLog({
    actorId: ctx.adminId, actorRole: "admin",
    action: "BADGE_REMOVE", category: "admin",
    targetId: ctx.targetUserId, targetType: "user",
    description: `${ctx.targetName}dan "${meta.label}" nishoni olib tashlandi`,
    metadata: { badgeType: type, userName: ctx.targetName },
  });
  emitStoreChange();
  return { ok: true };
}

/* ─── Reasons (for admin diagnostics & motivational hints) ─────────── */

export interface BadgeReason {
  type:      BadgeType;
  qualified: boolean;
  details:   string;
}

/**
 * Per-badge eligibility report — used by admin "view automatic badge reasons"
 * and by the empty state to show which conditions a provider is closest to.
 */
export function explainAutoBadges(user: SafeUser): BadgeReason[] {
  if (user.role !== "provider") return [];

  const local       = getLocalProfile(user.id);
  const completion  = getCompletionPct(getCompletionChecks(user, null, local));
  const rating      = getAverageRatingForUser(user.id, "provider");
  const reviewCount = getReviewsForUser(user.id, "provider").length;
  const completed   = getCompletedCount(user.id, "provider");
  const metrics     = getProviderReviewAverages(user.id);
  const albums      = local.albums ?? [];
  const tanga       = cumulativeAcquiredTanga(user.id);
  const days        = accountAgeDays(user);
  const albumsWith10 = albums.filter((a) => a.photos.length >= 10).length;

  return [
    {
      type: "verified",
      qualified: !!user.phone && completion === 100,
      details: `Telefon: ${user.phone ? "✓" : "✗"} · Profil: ${completion}%`,
    },
    {
      type: "top_provider",
      qualified: rating >= 4.7 && completed >= 50,
      details: `Reyting: ${rating.toFixed(2)}/5 · Bajarilgan: ${completed}/50`,
    },
    {
      type: "trusted_provider",
      qualified: rating >= 4.7 && reviewCount > 0 &&
                 metrics.serviceQuality >= 80 && metrics.providerAttitude >= 80 && metrics.servicePrice >= 80,
      details: `Reyting: ${rating.toFixed(2)} · Sifat: ${Math.round(metrics.serviceQuality)}% · Munosabat: ${Math.round(metrics.providerAttitude)}% · Narx: ${Math.round(metrics.servicePrice)}%`,
    },
    {
      type: "experienced_provider",
      qualified: days >= 365 && completed >= 50,
      details: `Yosh: ${days} kun · Bajarilgan: ${completed}/50`,
    },
    {
      type: "premium_provider",
      qualified: tanga > 500,
      details: `Jami olingan Tanga: ${tanga}/500`,
    },
    {
      type: "strong_portfolio",
      qualified: albums.length >= 5 && albums.every((a) => a.photos.length >= 10),
      details: `Albomlar: ${albums.length}/5 · 10+ rasmli: ${albumsWith10}/${albums.length || 0}`,
    },
  ];
}
