import { fetchRequestPopularity } from "./requests-client";
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
 * platform-wide data (requests, offers, completed orders), fetched as a
 * per-category aggregate — no individual request/offer rows ever reach
 * the client.
 *
 * Formula:
 *   score = requestCount × 1.0 + offerCount × 0.5 + completedCount × 0.8
 *
 * Returns categories sorted descending by popularityScore, with rank assigned.
 */
export async function getPopularCategories(): Promise<PopularCategory[]> {
  const [{ categories: agg }, cats] = await Promise.all([
    fetchRequestPopularity(),
    Promise.resolve(getAllCategories().filter((c) => c.active)),
  ]);
  const scoreMap = new Map(agg.map((a) => [a.categoryId, a]));

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
