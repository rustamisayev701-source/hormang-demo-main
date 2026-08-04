/**
 * safety-store.ts
 * Suspension is enforced server-side (users are checked against the real
 * user_moderation table on login and on GET /auth/me) — callers should read
 * `user.suspended` from useAuth() directly. This module just keeps the
 * shared toast copy.
 */

/** Suspension copy shown in toasts / banners. */
export const SUSPENDED_MESSAGE =
  "Hisobingiz vaqtincha to'xtatilgan. Iltimos, qo'llab-quvvatlash bilan bog'laning.";
