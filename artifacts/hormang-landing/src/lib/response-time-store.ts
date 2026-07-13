/**
 * Response-Time Tracker
 *
 * Tracks each user's average response time in chats, aggregated across all
 * conversations. A "response" is the FIRST reply to the most recent unanswered
 * burst of incoming messages from the other side. Spam bursts (e.g. customer
 * sends 3 messages, provider replies once) count as a single interval measured
 * from the earliest unanswered incoming message.
 *
 * Storage: `hormang_response_stats` in localStorage, keyed by userId.
 * Only running totals are stored (totalMinutes + sampleCount) — average is
 * derived on read.
 */

import type { Chat, ChatMessage } from "./requests-store";

const STORAGE_KEY = "hormang_response_stats";

interface Stats {
  totalMinutes: number;
  sampleCount: number;
}

type StatsMap = Record<string, Stats>;

function readAll(): StatsMap {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StatsMap) : {};
  } catch {
    return {};
  }
}

function writeAll(map: StatsMap): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota or serialization issue — silently ignore */
  }
}

/**
 * Add one response-time sample (in minutes) for `userId`. Negative or non-
 * finite samples are ignored.
 */
export function recordResponseSample(userId: string, minutes: number): void {
  if (!userId) return;
  if (!Number.isFinite(minutes) || minutes < 0) return;
  const all = readAll();
  const prev = all[userId] ?? { totalMinutes: 0, sampleCount: 0 };
  all[userId] = {
    totalMinutes: prev.totalMinutes + minutes,
    sampleCount: prev.sampleCount + 1,
  };
  writeAll(all);
}

export function getResponseStats(userId: string): Stats | null {
  if (!userId) return null;
  const all = readAll();
  return all[userId] ?? null;
}

/**
 * Return the user's average response time in minutes, or null if no samples
 * have been recorded yet.
 */
export function getAvgResponseMinutes(userId: string): number | null {
  const s = getResponseStats(userId);
  if (!s || s.sampleCount === 0) return null;
  return s.totalMinutes / s.sampleCount;
}

/**
 * Inspect the chat's message history and, if the newly-added message is a
 * first reply to one or more unanswered incoming messages from the other
 * side, record one response-time sample under `senderUserId`.
 *
 * Pairing rules:
 *   - System messages are ignored entirely.
 *   - `deletedForEveryone` messages are skipped.
 *   - The interval is measured from the OLDEST incoming message in the
 *     unanswered burst (so 3 incoming + 1 reply = 1 sample, not 3).
 *   - If the previous message in the chat is from the same sender (i.e. they
 *     are continuing their own turn), no sample is recorded.
 */
export function recordReplyFromChat(
  chat: Chat,
  newMsgId: string,
  senderUserId: string,
): void {
  if (!senderUserId) return;
  const messages = chat.messages;
  const newIdx = messages.findIndex((m) => m.id === newMsgId);
  if (newIdx === -1) return;
  const newMsg = messages[newIdx];
  if (newMsg.sender === "system") return;

  let oldestIncoming: ChatMessage | null = null;
  for (let i = newIdx - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.sender === "system") continue;
    if (m.deletedForEveryone) continue;
    if (m.sender === newMsg.sender) break;
    oldestIncoming = m;
  }
  if (!oldestIncoming) return;

  const replyMs = new Date(newMsg.timestamp).getTime();
  const incomingMs = new Date(oldestIncoming.timestamp).getTime();
  if (!Number.isFinite(replyMs) || !Number.isFinite(incomingMs)) return;
  if (replyMs <= incomingMs) return;

  const minutes = (replyMs - incomingMs) / 60000;
  recordResponseSample(senderUserId, minutes);
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
