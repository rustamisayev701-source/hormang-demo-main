/**
 * announcements-store.ts
 * localStorage-backed CMS for admin announcements (news & events).
 *
 * Key: hormang_announcements — Announcement[]
 * Key: hormang_announcement_seen_<userId> — string[] (announcement IDs)
 */
import { emitStoreChange } from "./store-events";
import type { LocalizedText } from "./localization";

export const ANNOUNCEMENTS_KEY = "hormang_announcements";

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

/* ─── Helpers ─────────────────────────────────────────────────── */
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
function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/* ─── CRUD ────────────────────────────────────────────────────── */

export function getAllAnnouncements(): Announcement[] {
  return readJSON<Announcement[]>(ANNOUNCEMENTS_KEY, []);
}

export function getAnnouncementById(id: string): Announcement | undefined {
  return getAllAnnouncements().find((a) => a.id === id);
}

/**
 * Create or update an announcement.
 * If `data.id` exists in the store it's updated; otherwise a new record is created.
 */
export function saveAnnouncement(
  data: Partial<Announcement> & Pick<Announcement, "title" | "type" | "content" | "target" | "status">,
): Announcement {
  const all = getAllAnnouncements();
  const now = new Date().toISOString();

  if (data.id) {
    const idx = all.findIndex((a) => a.id === data.id);
    if (idx !== -1) {
      const updated = { ...all[idx], ...data, updatedAt: now };
      all[idx] = updated;
      writeJSON(ANNOUNCEMENTS_KEY, all);
      emitStoreChange();
      return updated;
    }
  }

  const created: Announcement = {
    id: uid(),
    type: data.type,
    title: data.title,
    content: data.content,
    image: data.image,
    ctaText: data.ctaText,
    ctaLink: data.ctaLink,
    target: data.target,
    isPinned: data.isPinned ?? false,
    expiresAt: data.expiresAt,
    status: data.status,
    publishAt: data.publishAt,
    createdAt: now,
  };
  writeJSON(ANNOUNCEMENTS_KEY, [created, ...all]);
  emitStoreChange();
  return created;
}

export function deleteAnnouncement(id: string): void {
  const all = getAllAnnouncements().filter((a) => a.id !== id);
  writeJSON(ANNOUNCEMENTS_KEY, all);
  emitStoreChange();
}

export function toggleAnnouncementPublished(id: string): Announcement | undefined {
  const all = getAllAnnouncements();
  const idx = all.findIndex((a) => a.id === id);
  if (idx === -1) return undefined;
  all[idx] = {
    ...all[idx],
    status: all[idx].status === "published" ? "draft" : "published",
    updatedAt: new Date().toISOString(),
  };
  writeJSON(ANNOUNCEMENTS_KEY, all);
  emitStoreChange();
  return all[idx];
}

export function toggleAnnouncementPinned(id: string): Announcement | undefined {
  const all = getAllAnnouncements();
  const idx = all.findIndex((a) => a.id === id);
  if (idx === -1) return undefined;
  all[idx] = { ...all[idx], isPinned: !all[idx].isPinned, updatedAt: new Date().toISOString() };
  writeJSON(ANNOUNCEMENTS_KEY, all);
  emitStoreChange();
  return all[idx];
}

/**
 * Returns published, non-expired announcements for a given audience,
 * sorted pinned-first then newest-first. Capped at 20.
 */
export function getPublishedAnnouncements(
  audience: "providers" | "customers",
): Announcement[] {
  const now = new Date();
  return getAllAnnouncements()
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

/* ─── Seen tracking ───────────────────────────────────────────── */
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
