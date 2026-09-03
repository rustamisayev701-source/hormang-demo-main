/**
 * announcements-store.ts
 * Backend-backed CMS for admin announcements (news & events).
 *
 * `getPublishedAnnouncements` is read synchronously by customer-home.tsx and
 * provider/home.tsx render bodies, so — same pattern as lib/categories — this
 * keeps an in-memory cache of the *published* set, refreshed on app boot
 * (App.tsx) and after every admin mutation, instead of forcing every caller
 * to go async. The admin CMS (admin/index.tsx) needs the full list including
 * drafts, which isn't cached — it's fetched fresh on each panel load.
 *
 * Per-user "seen" dismissal state stays in localStorage — purely cosmetic,
 * per-browser is fine.
 */
import { apiFetch } from "@/lib/api-client";
import { adminFetch } from "@/lib/admin-client";
import { emitStoreChange } from "./store-events";
import type { LocalizedText } from "./localization";

export interface Announcement {
  id: string;
  type: "news" | "event";
  /** Primary display title (Uzbek). Used as fallback when titleLocalized is absent. */
  title: string;
  /** Multilingual title. When present, use getLocalizedText(titleLocalized ?? title, locale). */
  titleLocalized?: LocalizedText;
  /** Primary display content (Uzbek). Used as fallback when contentLocalized is absent. */
  content: string;
  /** Multilingual content body. */
  contentLocalized?: LocalizedText;
  image?: string;
  ctaText?: string;
  ctaTextLocalized?: LocalizedText;
  ctaLink?: string;
  target: "all" | "providers" | "customers";
  isPinned?: boolean;
  expiresAt?: string;
  status: "draft" | "published";
  publishAt?: string;
  createdAt: string;
  updatedAt?: string;
}

/* ─── In-memory cache (published set only) ───────────────────────── */

let cache: Announcement[] = [];

export async function refreshAnnouncementsCache(): Promise<void> {
  try {
    const res = await apiFetch<{ announcements: Announcement[] }>("/announcements", { auth: false });
    cache = res.announcements;
    emitStoreChange();
  } catch (e) {
    console.warn("[Hormang] e'lonlarni yuklab bo'lmadi:", e);
  }
}

/**
 * Returns published, non-expired announcements for a given audience,
 * sorted pinned-first then newest-first. Capped at 20.
 */
export function getPublishedAnnouncements(
  audience: "providers" | "customers",
): Announcement[] {
  const now = new Date();
  return cache
    .filter(
      (a) =>
        a.status === "published" &&
        (a.target === "all" || a.target === audience) &&
        (!a.expiresAt || new Date(a.expiresAt) > now) &&
        (!a.publishAt || new Date(a.publishAt) <= now),
    )
    .sort((a, b) => {
      if ((a.isPinned ? 1 : 0) !== (b.isPinned ? 1 : 0))
        return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, 20);
}

/* ─── Admin CRUD — fetched fresh each call, not cached (drafts included) ── */

export async function getAllAnnouncements(): Promise<Announcement[]> {
  const res = await adminFetch<{ announcements: Announcement[] }>("/announcements/all");
  return res.announcements;
}

/**
 * Create or update an announcement.
 * If `data.id` exists it's updated; otherwise a new record is created.
 */
export async function saveAnnouncement(
  data: Partial<Announcement> & Pick<Announcement, "title" | "type" | "content" | "target" | "status">,
): Promise<Announcement> {
  const body = { ...data, id: undefined };
  const res = data.id
    ? await adminFetch<{ announcement: Announcement }>(`/announcements/${data.id}`, { method: "PUT", body })
    : await adminFetch<{ announcement: Announcement }>("/announcements", { method: "POST", body });
  await refreshAnnouncementsCache();
  return res.announcement;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await adminFetch(`/announcements/${id}`, { method: "DELETE" });
  await refreshAnnouncementsCache();
}

export async function toggleAnnouncementPublished(id: string): Promise<Announcement> {
  const res = await adminFetch<{ announcement: Announcement }>(`/announcements/${id}/publish`, { method: "PATCH" });
  await refreshAnnouncementsCache();
  return res.announcement;
}

export async function toggleAnnouncementPinned(id: string): Promise<Announcement> {
  const res = await adminFetch<{ announcement: Announcement }>(`/announcements/${id}/pin`, { method: "PATCH" });
  await refreshAnnouncementsCache();
  return res.announcement;
}

export async function sendAnnouncementNotification(id: string): Promise<void> {
  await adminFetch(`/announcements/${id}/send-notification`, { method: "POST" });
}

/* ─── Seen tracking (per-browser, cosmetic only) ─────────────────── */
function readJSON<T>(key: string, fallback: T): T {
  try {
    const r = localStorage.getItem(key);
    return r ? (JSON.parse(r) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJSON<T>(key: string, val: T) {
  localStorage.setItem(key, JSON.stringify(val));
}
function seenKey(userId: string) {
  return `hormang_announcement_seen_${userId}`;
}

export function getSeenAnnouncementIds(userId: string): string[] {
  return readJSON<string[]>(seenKey(userId), []);
}

export function markAnnouncementSeen(userId: string, announcementId: string): void {
  const seen = getSeenAnnouncementIds(userId);
  if (!seen.includes(announcementId)) {
    writeJSON(seenKey(userId), [...seen, announcementId]);
  }
}
