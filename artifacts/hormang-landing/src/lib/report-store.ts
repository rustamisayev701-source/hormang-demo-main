/**
 * report-store.ts
 * User Report System — localStorage-backed, event-driven.
 *
 * Storage keys:
 *   hormang_user_reports          — UserReport[]
 *   hormang_blocked_users_<uid>   — string[] of blocked userIds (per blocker)
 */
import { emitStoreChange } from "@/lib/store-events";

export type ReportReason =
  | "spam"
  | "fake_profile"
  | "abuse"
  | "fraud"
  | "inappropriate_content"
  | "outside_contact"
  | "other";

export type ReportStatus = "new" | "in_review" | "resolved" | "dismissed";

export type ReportSource = "profile" | "chat";

export interface UserReport {
  id: string;
  reporterUserId: string;
  reportedUserId: string;
  reason: ReportReason;
  description?: string;
  attachments?: string[];
  status: ReportStatus;
  adminNote?: string;
  createdAt: string;
  /** Where the report was filed from. Defaults to "profile" for legacy entries. */
  source?: ReportSource;
  /** Set when source === "chat". */
  chatId?: string;
  /** Optional context — last message id at the time of the report. */
  lastMessageId?: string;
}

const REPORTS_KEY = "hormang_user_reports";
const BLOCKED_PREFIX = "hormang_blocked_users_";

/* ── Internal read/write ─────────────────────────────────────────── */

function readReports(): UserReport[] {
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    return raw ? (JSON.parse(raw) as UserReport[]) : [];
  } catch {
    return [];
  }
}

function writeReports(reports: UserReport[]): void {
  try {
    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
  } catch {
    const slim = reports.map((r) => ({ ...r, attachments: [] }));
    localStorage.setItem(REPORTS_KEY, JSON.stringify(slim));
  }
  emitStoreChange();
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/* ── Public API — reports ────────────────────────────────────────── */

export function getAllReports(): UserReport[] {
  return readReports().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getReportCountForUser(userId: string): number {
  return readReports().filter((r) => r.reportedUserId === userId).length;
}

export function getReporterIdsForUser(userId: string): string[] {
  const seen = new Set<string>();
  return readReports()
    .filter((r) => r.reportedUserId === userId)
    .map((r) => r.reporterUserId)
    .filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
}

/**
 * Safeguard check before submitting.
 * Returns { ok: true } if allowed, otherwise { ok: false, reason: string }.
 */
export function canSubmitReport(
  reporterUserId: string,
  reportedUserId: string,
): { ok: true } | { ok: false; reason: string } {
  if (reporterUserId === reportedUserId) {
    return { ok: false, reason: "O'zingizga shikoyat qilib bo'lmaydi" };
  }
  const duplicate = readReports().find(
    (r) =>
      r.reporterUserId === reporterUserId &&
      r.reportedUserId === reportedUserId &&
      Date.now() - new Date(r.createdAt).getTime() < 24 * 60 * 60 * 1000,
  );
  if (duplicate) {
    return {
      ok: false,
      reason: "Bu foydalanuvchi haqida shikoyat qilingan",
    };
  }
  return { ok: true };
}

export function submitReport(
  data: Omit<UserReport, "id" | "status" | "createdAt">,
): UserReport {
  const entry: UserReport = {
    ...data,
    id: uid(),
    status: "new",
    createdAt: new Date().toISOString(),
  };
  writeReports([entry, ...readReports()]);
  return entry;
}

export function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  adminNote?: string,
): void {
  const all = readReports();
  const idx = all.findIndex((r) => r.id === reportId);
  if (idx === -1) return;
  all[idx] = {
    ...all[idx],
    status,
    ...(adminNote !== undefined ? { adminNote } : {}),
  };
  writeReports(all);
}

/* ── Public API — block/unblock ─────────────────────────────────── */

function readBlocked(userId: string): string[] {
  try {
    const raw = localStorage.getItem(BLOCKED_PREFIX + userId);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeBlocked(userId: string, ids: string[]): void {
  localStorage.setItem(BLOCKED_PREFIX + userId, JSON.stringify(ids));
  emitStoreChange();
}

export function blockUser(blockerId: string, blockedId: string): void {
  const ids = readBlocked(blockerId);
  if (!ids.includes(blockedId)) writeBlocked(blockerId, [...ids, blockedId]);
}

export function unblockUser(blockerId: string, blockedId: string): void {
  writeBlocked(blockerId, readBlocked(blockerId).filter((id) => id !== blockedId));
}

export function isBlockedBy(viewerId: string, targetId: string): boolean {
  return readBlocked(viewerId).includes(targetId);
}

export function getBlockedUsers(userId: string): string[] {
  return readBlocked(userId);
}
