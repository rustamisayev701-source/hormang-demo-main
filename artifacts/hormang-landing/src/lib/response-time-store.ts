/**
 * Response-Time Tracker
 *
 * The sample is now recorded server-side (see POST /chats/:chatId/messages)
 * at the moment a reply is sent — authoritative regardless of which device
 * sends it, unlike the old purely-client-observed version. This module just
 * reads the aggregate via GET /chats/response-time/:userId, cached the same
 * way as completion-store.ts's review stats (many synchronous render-time
 * callers, so a background-fetch-then-cache pattern keeps their signature).
 */
import { apiFetch } from "./api-client";
import { emitStoreChange } from "./store-events";

const avgCache = new Map<string, number | null>();
const avgInFlight = new Set<string>();

/**
 * Return the user's average response time in minutes, or null if no samples
 * have been recorded yet (or none loaded yet — a background fetch is kicked
 * off and a store-change event fires once it lands).
 */
export function getAvgResponseMinutes(userId: string): number | null {
  if (!userId) return null;
  if (avgCache.has(userId)) return avgCache.get(userId)!;

  if (!avgInFlight.has(userId)) {
    avgInFlight.add(userId);
    apiFetch<{ avgMinutes: number | null }>(`/chats/response-time/${userId}`, { auth: false })
      .then((res) => {
        avgCache.set(userId, res.avgMinutes);
        emitStoreChange();
      })
      .catch(() => {})
      .finally(() => avgInFlight.delete(userId));
  }
  return null;
}

/* ─── Formatting ─────────────────────────────────────────────────── */

export interface ResponseTimeDict {
  notAvailable: string;   // "—" — no samples yet
  minutesTpl: string;     // e.g. "{{n}} daqiqa" / "{{n}} мин" / "{{n}} min"
  aboutHour: string;      // e.g. "~1 soat" / "~1 час" / "~1 hr"
}

/**
 * Format an average-response-time value into the display string per the
 * Hormang display rules:
 *   - null/no samples → notAvailable
 *   - < 10 minutes    → "10 min" (floor of 10 for stability)
 *   - < 60 minutes    → rounded minutes
 *   - >= 60 minutes   → aboutHour (no need for finer granularity)
 */
export function formatAvgResponseTime(
  minutes: number | null,
  dict: ResponseTimeDict,
): string {
  if (minutes === null || !Number.isFinite(minutes) || minutes < 0) {
    return dict.notAvailable;
  }
  if (minutes >= 60) return dict.aboutHour;
  const display = minutes < 10 ? 10 : Math.round(minutes);
  return dict.minutesTpl.replace(/\{\{n\}\}/g, String(display));
}
