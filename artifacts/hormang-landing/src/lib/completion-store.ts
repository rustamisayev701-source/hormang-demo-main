/**
 * completion-store.ts
 * Reviews/ratings, backed by the real `reviews` table (POST/GET /reviews).
 *
 * All the read functions below (getReviewsForUser, getAverageRatingForUser,
 * getProviderReviewAverages, getCompletedCount, hasReviewedRequest) have many
 * synchronous render-time callers across the app, so — same pattern as
 * wallet-balance.ts / badge-store.ts's acquired-Tanga cache — they read from
 * a small in-memory cache that's populated by a background fetch on first
 * read, then emit a store-change event once the real data lands.
 *
 * completedCount is NOT a separate counter here — it's derived server-side
 * from real offer/request completion status, so there's nothing to
 * increment client-side anymore.
 */
import { apiFetch } from "./api-client";
import { emitStoreChange } from "./store-events";

export interface ProviderReviewMetrics {
  serviceQuality: number;
  providerAttitude: number;
  servicePrice: number;
}

export interface Review {
  id: string;
  requestId: string;
  offerId?: string | null;
  reviewerId: string;
  reviewerRole: "customer" | "provider";
  reviewedId: string;
  reviewedRole: "customer" | "provider";
  rating: number;
  comment?: string | null;
  photoUrl?: string | null;
  platformSentiment?: "positive" | "negative" | null;
  platformFeedback?: string | null;
  providerMetrics?: ProviderReviewMetrics;
  /** Not stored server-side — display components already fall back to a
   * locally-resolved name/initials/color when these are absent. */
  reviewerName?: string;
  reviewerInitials?: string;
  reviewerColor?: string;
  reviewedName?: string;
  serviceCategory?: string;
  createdAt: string;
}

interface BackendReview {
  id: string; requestId: string; offerId: string | null;
  reviewerId: string; reviewerRole: "customer" | "provider";
  reviewedId: string; reviewedRole: "customer" | "provider";
  rating: number; comment: string | null; photoUrl: string | null;
  serviceQuality: number | null; providerAttitude: number | null; servicePrice: number | null;
  platformSentiment: string | null; platformFeedback: string | null;
  createdAt: string;
}

function fromBackend(r: BackendReview): Review {
  return {
    id: r.id, requestId: r.requestId, offerId: r.offerId,
    reviewerId: r.reviewerId, reviewerRole: r.reviewerRole,
    reviewedId: r.reviewedId, reviewedRole: r.reviewedRole,
    rating: r.rating, comment: r.comment, photoUrl: r.photoUrl,
    platformSentiment: r.platformSentiment as "positive" | "negative" | null,
    platformFeedback: r.platformFeedback,
    providerMetrics: r.serviceQuality != null
      ? { serviceQuality: r.serviceQuality, providerAttitude: r.providerAttitude ?? 0, servicePrice: r.servicePrice ?? 0 }
      : undefined,
    createdAt: r.createdAt,
  };
}

/* ─── Stats cache (reviews + averages + completedCount, per user+role) ──── */

interface UserReviewStats {
  reviews: Review[];
  averageRating: number;
  completedCount: number;
  providerMetrics?: ProviderReviewMetrics;
}

const EMPTY_STATS: UserReviewStats = { reviews: [], averageRating: 0, completedCount: 0 };

const statsCache = new Map<string, UserReviewStats>();
const statsInFlight = new Set<string>();

function statsKey(userId: string, role: "provider" | "customer"): string {
  return `${userId}:${role}`;
}

function ensureStatsLoaded(userId: string, role: "provider" | "customer"): UserReviewStats {
  const key = statsKey(userId, role);
  const cached = statsCache.get(key);
  if (cached) return cached;

  if (!statsInFlight.has(key)) {
    statsInFlight.add(key);
    apiFetch<{ reviews: BackendReview[]; averageRating: number; completedCount: number; providerMetrics?: ProviderReviewMetrics }>(
      `/reviews/user/${userId}?role=${role}`,
      { auth: false },
    )
      .then((res) => {
        statsCache.set(key, {
          reviews: res.reviews.map(fromBackend),
          averageRating: res.averageRating,
          completedCount: res.completedCount,
          providerMetrics: res.providerMetrics,
        });
        emitStoreChange();
      })
      .catch(() => {})
      .finally(() => statsInFlight.delete(key));
  }
  return EMPTY_STATS;
}

export function getReviewsForUser(userId: string, asRole: "provider" | "customer"): Review[] {
  if (!userId) return [];
  return ensureStatsLoaded(userId, asRole).reviews;
}

export function getAverageRatingForUser(userId: string, asRole: "provider" | "customer"): number {
  if (!userId) return 0;
  return ensureStatsLoaded(userId, asRole).averageRating;
}

export function getProviderReviewAverages(providerId: string): ProviderReviewMetrics {
  const fallback = { serviceQuality: 0, providerAttitude: 0, servicePrice: 0 };
  if (!providerId) return fallback;
  return ensureStatsLoaded(providerId, "provider").providerMetrics ?? fallback;
}

export function getCompletedCount(userId: string, role: "provider" | "customer"): number {
  if (!userId) return 0;
  return ensureStatsLoaded(userId, role).completedCount;
}

/* ─── Has-reviewed check (gates the "leave a review" UI) ─────────────────── */

const reviewedCache = new Map<string, boolean>();
const reviewedInFlight = new Set<string>();

export function hasReviewedRequest(requestId: string, reviewerId: string): boolean {
  if (!requestId || !reviewerId) return false;
  const key = `${requestId}:${reviewerId}`;
  if (reviewedCache.has(key)) return reviewedCache.get(key)!;

  if (!reviewedInFlight.has(key)) {
    reviewedInFlight.add(key);
    apiFetch<{ reviewed: boolean }>(`/reviews/check/${requestId}`)
      .then((res) => {
        reviewedCache.set(key, res.reviewed);
        emitStoreChange();
      })
      .catch(() => {})
      .finally(() => reviewedInFlight.delete(key));
  }
  return false;
}

/* ─── Write ────────────────────────────────────────────────────────────── */

/**
 * The backend derives reviewerRole/reviewedRole/reviewedId itself from the
 * request + the authenticated caller (safer — a client can't misattribute a
 * review), so most fields here are for local cache invalidation only.
 */
export async function addReview(review: Omit<Review, "id" | "createdAt">): Promise<void> {
  await apiFetch("/reviews", {
    method: "POST",
    body: {
      requestId: review.requestId,
      rating: review.rating,
      comment: review.comment,
      photoUrl: review.photoUrl,
      serviceQuality: review.providerMetrics?.serviceQuality,
      providerAttitude: review.providerMetrics?.providerAttitude,
      servicePrice: review.providerMetrics?.servicePrice,
      platformSentiment: review.platformSentiment,
      platformFeedback: review.platformFeedback,
    },
  });

  reviewedCache.set(`${review.requestId}:${review.reviewerId}`, true);
  statsCache.delete(statsKey(review.reviewedId, review.reviewedRole));
  emitStoreChange();
}
