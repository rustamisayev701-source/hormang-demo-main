import { getRequests, getOffers } from "./requests-store";
import { getAllCategories } from "./categories";

export interface PopularCategory {
  categoryId: string;
  popularityScore: number;
  rank: number;
  requestCount: number;
  offerCount: number;
  completedCount: number;
}

/**
 * Compute real popularity scores for all active categories from live
 * platform data (requests, offers, completed orders).
 *
 * Formula:
 *   score = requestCount × 1.0 + offerCount × 0.5 + completedCount × 0.8
 *
 * Returns categories sorted descending by popularityScore, with rank assigned.
 * Can be used on the homepage, admin analytics, or any trend widget.
 */
export function getPopularCategories(): PopularCategory[] {
  const requests = getRequests();
  const offers   = getOffers();
  const cats     = getAllCategories().filter((c) => c.active);

  const scoreMap = new Map<string, { requestCount: number; offerCount: number; completedCount: number }>();

  for (const req of requests) {
    if (!req.categoryId) continue;
    const s = scoreMap.get(req.categoryId) ?? { requestCount: 0, offerCount: 0, completedCount: 0 };
    s.requestCount++;
    if (req.status === "completed") s.completedCount++;
    scoreMap.set(req.categoryId, s);
  }

  const reqById = new Map(requests.map((r) => [r.id, r]));
  for (const offer of offers) {
    const req = reqById.get(offer.requestId);
    if (!req?.categoryId) continue;
    const s = scoreMap.get(req.categoryId) ?? { requestCount: 0, offerCount: 0, completedCount: 0 };
    s.offerCount++;
    scoreMap.set(req.categoryId, s);
  }

  const scored = cats
    .map((cat) => {
      const s = scoreMap.get(cat.id) ?? { requestCount: 0, offerCount: 0, completedCount: 0 };
      return {
        categoryId:      cat.id,
        popularityScore: s.requestCount * 1.0 + s.offerCount * 0.5 + s.completedCount * 0.8,
        rank:            0,
        requestCount:    s.requestCount,
        offerCount:      s.offerCount,
        completedCount:  s.completedCount,
      };
    })
    .sort((a, b) => b.popularityScore - a.popularityScore);

  scored.forEach((cat, i) => { cat.rank = i + 1; });

  return scored;
}
