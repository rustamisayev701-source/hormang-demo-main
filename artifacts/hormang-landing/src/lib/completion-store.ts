/**
 * completion-store.ts
 *
 * Clean review storage system.
 * Key: "hormang_reviews_v2"  →  Review[]
 *
 * Each Review records:
 *   - WHO wrote it (reviewerId + reviewerRole)
 *   - WHO received it (reviewedId + reviewedRole)
 *   - WHICH request/offer it belongs to
 *   - rating + optional comment
 *
 * Completed-count keys (role-separated, incremented on offer completion):
 *   hormang_completed_provider_{uid}
 *   hormang_completed_customer_{uid}
 */
import { emitStoreChange } from "./store-events";

/* ─── Type ───────────────────────────────────────────────────────── */

export interface Review {
  id: string;
  requestId: string;
  offerId?: string;
  reviewerId: string;
  reviewerRole: "customer" | "provider";
  reviewedId: string;
  reviewedRole: "customer" | "provider";
  rating: number;             // 1–5
  comment?: string;
  photoUrl?: string;
  platformSentiment?: "positive" | "negative";
  platformFeedback?: string;
  providerMetrics?: ProviderReviewMetrics;
  reviewerName?: string;
  reviewerInitials?: string;
  reviewerColor?: string;
  reviewedName?: string;
  createdAt: string;
  serviceCategory?: string;
}

export interface ProviderReviewMetrics {
  serviceQuality: number;
  providerAttitude: number;
  servicePrice: number;
}

/* ─── Keys ───────────────────────────────────────────────────────── */

const REVIEWS_KEY = "hormang_reviews_v2";

function providerAveragesKey(providerId: string): string {
  return `hormang_provider_review_averages_${providerId}`;
}

function completedKey(userId: string, role: "provider" | "customer"): string {
  return `hormang_completed_${role}_${userId}`;
}

/* ─── Helpers ────────────────────────────────────────────────────── */

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch (_) { /* ignore */ }
  return fallback;
}

function genId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function allReviews(): Review[] {
  return readJSON<Review[]>(REVIEWS_KEY, []);
}

function averageMetric(oldValue: number, newValue: number): number {
  return oldValue > 0 ? (oldValue + newValue) / 2 : newValue;
}

/* ─── Read helpers ───────────────────────────────────────────────── */

/**
 * All reviews about a specific user in a specific role.
 * - provider profile  → getReviewsForUser(masterId, "provider")
 * - customer profile  → getReviewsForUser(customerId, "customer")
 */
export function getReviewsForUser(userId: string, asRole: "provider" | "customer"): Review[] {
  if (!userId) return [];
  return allReviews().filter(
    (r) => r.reviewedId === userId && r.reviewedRole === asRole
  );
}

export function getAverageRatingForUser(
  userId: string,
  asRole: "provider" | "customer"
): number {
  const reviews = getReviewsForUser(userId, asRole);
  if (!reviews.length) return 0;
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  return Math.round(avg * 100) / 100;
}

export function getProviderReviewAverages(providerId: string): ProviderReviewMetrics {
  if (!providerId) {
    return { serviceQuality: 0, providerAttitude: 0, servicePrice: 0 };
  }
  const key = providerAveragesKey(providerId);
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      return JSON.parse(saved) as ProviderReviewMetrics;
    } catch (_) { /* rebuild from reviews below */ }
  }

  const derived = getReviewsForUser(providerId, "provider")
    .filter((review) => review.providerMetrics)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .reduce<ProviderReviewMetrics>(
      (current, review) => ({
        serviceQuality: averageMetric(current.serviceQuality, review.providerMetrics!.serviceQuality),
        providerAttitude: averageMetric(current.providerAttitude, review.providerMetrics!.providerAttitude),
        servicePrice: averageMetric(current.servicePrice, review.providerMetrics!.servicePrice),
      }),
      { serviceQuality: 0, providerAttitude: 0, servicePrice: 0 }
    );

  if (derived.serviceQuality || derived.providerAttitude || derived.servicePrice) {
    localStorage.setItem(key, JSON.stringify(derived));
  }
  return derived;
}

/**
 * Has this reviewer already reviewed the given request?
 * Prevents submitting a second review for the same job.
 */
export function hasReviewedRequest(requestId: string, reviewerId: string): boolean {
  return allReviews().some(
    (r) => r.requestId === requestId && r.reviewerId === reviewerId
  );
}

/* ─── Write ──────────────────────────────────────────────────────── */

export function addReview(
  review: Omit<Review, "id" | "createdAt">
): void {
  const reviews = allReviews();
  const isDuplicate = reviews.some(
    (r) => r.requestId === review.requestId && r.reviewerId === review.reviewerId
  );
  if (isDuplicate) return;

  const newReview: Review = {
    ...review,
    id: genId(),
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(REVIEWS_KEY, JSON.stringify([...reviews, newReview]));

  if (newReview.reviewedRole === "provider" && newReview.providerMetrics) {
    const old = getProviderReviewAverages(newReview.reviewedId);
    const next: ProviderReviewMetrics = {
      serviceQuality: averageMetric(old.serviceQuality, newReview.providerMetrics.serviceQuality),
      providerAttitude: averageMetric(old.providerAttitude, newReview.providerMetrics.providerAttitude),
      servicePrice: averageMetric(old.servicePrice, newReview.providerMetrics.servicePrice),
    };
    localStorage.setItem(providerAveragesKey(newReview.reviewedId), JSON.stringify(next));
  }

  emitStoreChange();
}

/* ─── Completed Counts (role-separated, from completion events) ──── */

export function getCompletedCount(
  userId: string,
  role: "provider" | "customer"
): number {
  if (!userId) return 0;
  return readJSON<number>(completedKey(userId, role), 0);
}

export function incrementCompletedCount(
  userId: string,
  role: "provider" | "customer"
): void {
  if (!userId) return;
  const current = getCompletedCount(userId, role);
  localStorage.setItem(completedKey(userId, role), JSON.stringify(current + 1));
  emitStoreChange();
}
