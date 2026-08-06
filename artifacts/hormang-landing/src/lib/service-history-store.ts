/**
 * service-history-store.ts
 *
 * A provider's completed-job history, stats, and portfolio — derived live
 * from real backend data (completed offers + their requests + reviews), not
 * a separate local snapshot. Keeps the same synchronous-getter shape the UI
 * already relies on via a module-level cache: the sync getters return
 * cached/empty data immediately and kick off a background fetch the first
 * time a given providerId is requested, notifying via emitStoreChange() on
 * resolution (the same "fast-path cache" pattern used by wallet-balance.ts,
 * completion-store.ts, etc.).
 */
import { emitStoreChange } from "./store-events";
import * as api from "./requests-client";
import type { BackendServiceHistory, BackendHistoryStats, BackendPublicPortfolioProject } from "./requests-client";

export interface PortfolioProject {
  title: string;
  description: string;
  /** Cover image — always one of the parent record's afterPhotos. */
  coverPhoto: string;
  /** Extra images (subset of the parent record's afterPhotos). */
  additionalPhotos: string[];
  featured: boolean;
  createdAt: string; // ISO timestamp
}

export interface ServiceHistory {
  id: string;
  providerId: string;
  customerId?: string;
  customerName?: string;
  requestId: string;
  offerId: string;
  categoryId: string;
  categoryName: string;
  emoji?: string;
  serviceTitle: string;
  serviceDescription: string;
  completionNotes?: string;
  finalPrice: number;
  status: "completed";
  rating?: number;
  review?: string;
  completedAt: string; // ISO timestamp
  durationMinutes?: number;
  beforePhotos?: string[];
  afterPhotos?: string[];
  region?: string;
  district?: string;
  locationName?: string;
  isRepeatCustomer: boolean;
  isPortfolio: boolean;
  portfolioData?: PortfolioProject;
}

export interface ProviderHistoryStats {
  totalCompleted: number;
  totalEarnings: number;
  thisMonthEarnings: number;
  averageRating: number;
  successRate: number;
  mostPopularCategoryId?: string;
  mostPopularCategoryName?: string;
  repeatCustomers: number;
}

export interface PublicPortfolioProject {
  id: string;
  title: string;
  description: string;
  coverPhoto?: string;
  photos: string[];
  categoryId: string;
  categoryName: string;
  emoji?: string;
  completedAt: string;
  durationMinutes?: number;
  rating?: number;
  review?: string;
  featured: boolean;
}

/** Maximum number of portfolio projects a provider can pin as "featured" (enforced server-side too). */
export const MAX_FEATURED_PROJECTS = 3;

const EMPTY_STATS: ProviderHistoryStats = {
  totalCompleted: 0, totalEarnings: 0, thisMonthEarnings: 0, averageRating: 0, successRate: 0, repeatCustomers: 0,
};

function fromBackend(h: BackendServiceHistory): ServiceHistory {
  return { ...h };
}
function statsFromBackend(s: BackendHistoryStats): ProviderHistoryStats {
  return { ...s };
}
function portfolioFromBackend(p: BackendPublicPortfolioProject): PublicPortfolioProject {
  return { ...p };
}

/* ─── Own history + stats (auth'd, provider-scoped) ─────────────────────── */

const historyCache = new Map<string, { history: ServiceHistory[]; stats: ProviderHistoryStats }>();
const historyInFlight = new Set<string>();

function ensureHistoryLoaded(providerId: string): void {
  if (!providerId || historyCache.has(providerId) || historyInFlight.has(providerId)) return;
  historyInFlight.add(providerId);
  api.fetchProviderHistory(providerId)
    .then(({ history, stats }) => {
      historyCache.set(providerId, { history: history.map(fromBackend), stats: statsFromBackend(stats) });
      emitStoreChange();
    })
    .catch(() => { /* leave uncached — next read retries */ })
    .finally(() => historyInFlight.delete(providerId));
}

function patchHistoryItem(providerId: string, id: string, patch: Partial<ServiceHistory>): void {
  const entry = historyCache.get(providerId);
  if (!entry) return;
  historyCache.set(providerId, {
    history: entry.history.map((h) => (h.id === id ? { ...h, ...patch } : h)),
    stats: entry.stats,
  });
}

/** All completed services for a provider, newest first. */
export function getProviderHistory(providerId: string): ServiceHistory[] {
  if (!providerId) return [];
  ensureHistoryLoaded(providerId);
  return historyCache.get(providerId)?.history ?? [];
}

/** Derived analytics for the Statistics tab / header. */
export function getProviderHistoryStats(providerId: string): ProviderHistoryStats {
  if (!providerId) return EMPTY_STATS;
  ensureHistoryLoaded(providerId);
  return historyCache.get(providerId)?.stats ?? EMPTY_STATS;
}

/** Provider-scoped detail lookup — only returns a record belonging to the given provider. */
export function getServiceHistoryByIdForProvider(providerId: string, id: string): ServiceHistory | undefined {
  return getProviderHistory(providerId).find((h) => h.id === id);
}

/** Count a provider's currently-featured portfolio projects (optionally excluding one record). */
export function countFeaturedProjects(providerId: string, excludeId?: string): number {
  return getProviderHistory(providerId).filter((h) => h.portfolioData?.featured && h.id !== excludeId).length;
}

/* ─── Public portfolio (unauthenticated, sanitized) ──────────────────────── */

const portfolioCache = new Map<string, PublicPortfolioProject[]>();
const portfolioInFlight = new Set<string>();

function ensurePortfolioLoaded(providerId: string): void {
  if (!providerId || portfolioCache.has(providerId) || portfolioInFlight.has(providerId)) return;
  portfolioInFlight.add(providerId);
  api.fetchPublicPortfolio(providerId)
    .then(({ portfolio }) => {
      portfolioCache.set(providerId, portfolio.map(portfolioFromBackend));
      emitStoreChange();
    })
    .catch(() => { /* leave uncached — next read retries */ })
    .finally(() => portfolioInFlight.delete(providerId));
}

/** Sanitized, published-only portfolio for the public provider profile. */
export function getPublicPortfolio(providerId: string, limit?: number): PublicPortfolioProject[] {
  if (!providerId) return [];
  ensurePortfolioLoaded(providerId);
  const list = portfolioCache.get(providerId) ?? [];
  return typeof limit === "number" ? list.slice(0, limit) : list;
}

/* ─── Writes ─────────────────────────────────────────────────────────────── */

/** Attach/replace the "after" photos for a completed job. */
export async function setAfterPhotos(providerId: string, id: string, afterPhotos: string[]): Promise<void> {
  const { offer } = await api.setOfferAfterPhotos(id, afterPhotos);
  patchHistoryItem(providerId, id, { afterPhotos: offer.completionAfterPhotos ?? undefined });
  emitStoreChange();
}

/** Publish (or update) a completed job as a portfolio project. */
export async function savePortfolioProject(providerId: string, id: string, project: PortfolioProject): Promise<void> {
  const { offer } = await api.saveOfferPortfolio(id, {
    title: project.title,
    description: project.description,
    coverPhoto: project.coverPhoto,
    additionalPhotos: project.additionalPhotos,
    featured: project.featured,
  });
  patchHistoryItem(providerId, id, {
    isPortfolio: true,
    portfolioData: {
      title: offer.portfolioTitle ?? project.title,
      description: offer.portfolioDescription ?? project.description,
      coverPhoto: offer.portfolioCoverPhoto ?? project.coverPhoto,
      additionalPhotos: offer.portfolioAdditionalPhotos ?? [],
      featured: !!offer.portfolioFeatured,
      createdAt: project.createdAt,
    },
  });
  portfolioCache.delete(providerId);
  emitStoreChange();
}

/** Remove a job from the portfolio. */
export async function removePortfolioProject(providerId: string, id: string): Promise<void> {
  await api.removeOfferPortfolio(id);
  patchHistoryItem(providerId, id, { isPortfolio: false, portfolioData: undefined });
  portfolioCache.delete(providerId);
  emitStoreChange();
}
