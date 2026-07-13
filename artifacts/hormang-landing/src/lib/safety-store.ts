/**
 * safety-store.ts
 * Cross-cutting safety helpers — currently: user suspension enforcement.
 *
 * Storage keys consumed:
 *   hormang_admin_suspended_users — string[] of suspended userIds (written by admin panel)
 */

const SUSPENDED_KEY = "hormang_admin_suspended_users";

function readSuspended(): Set<string> {
  try {
    const raw = localStorage.getItem(SUSPENDED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? (arr as string[]) : []);
  } catch {
    return new Set();
  }
}

/** True if the given userId is currently in the admin suspended set. */
export function isUserSuspended(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return readSuspended().has(userId);
}

/** Suspension copy shown in toasts / banners. */
export const SUSPENDED_MESSAGE =
  "Hisobingiz vaqtincha to'xtatilgan. Iltimos, qo'llab-quvvatlash bilan bog'laning.";
