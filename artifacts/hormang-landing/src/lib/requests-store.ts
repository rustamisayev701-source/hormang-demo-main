/**
 * requests-store.ts
 * localStorage persistence for customer requests, offers, and chats.
 *
 * Keys:
 *   hormang_requests  — CustomerRequest[]
 *   hormang_offers    — Offer[]            (shared with provider side)
 *   hormang_chats     — Chat[]             (shared with provider side)
 */

import type { Dict } from "./i18n/locales/uz";
import { emitStoreChange } from "./store-events";
import { incrementCompletedCount } from "./completion-store";
import { addTangaBalance, spendTangaBalance } from "./tanga-store";
import { recordTangaTransaction } from "./tanga-history-store";
import { calculateOfferCost } from "./offer-cost";
import { getBlockedUsers } from "./report-store";
import { recordReplyFromChat } from "./response-time-store";
import { recordServiceCompletion } from "./service-history-store";

/* ─── Types ──────────────────────────────────────────────────────── */

export interface CustomerRequest {
  id: string;
  customerId?: string;       // The user.id of the customer who created this request
  customerName?: string;     // Display name of the customer (shown on provider side)
  categoryId: string;
  categoryName: string;
  emoji: string;
  answers: Record<string, unknown>;
  /** Dedicated multi-photo upload (up to 10 images, stored as base64) */
  requestPhotos?: string[];
  status: "open" | "accepted" | "matched" | "completed" | "cancelled" | "inactive";
  createdAt: string;
  offerCount: number;
  region?: string;
  district?: string;
  /** Set when a customer accepts an offer — locks request to new offers. */
  acceptedOfferId?: string;
  /** Hard switch: once true, no new offers may be created on this request. */
  closedForOffers?: boolean;
}

export type OfferStatus =
  | "pending"
  | "negotiating"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "expired"
  | "in_progress"
  | "completed"
  | "Yopilgan";

export interface Offer {
  id: string;
  requestId: string;
  masterId: string;
  masterName: string;
  masterInitials: string;
  masterColor: string;
  price: number;
  priceLabel?: string;
  message: string;
  fileUrls?: string[];
  avgResponseTime: number; // minutes
  createdAt: string;
  status: OfferStatus;
  /** Tanga deducted from the provider when this offer was submitted. */
  tangaSpent?: number;
  /** true once admin has issued a batch 50% refund that included this offer. */
  refunded?: boolean;
  /** Two-party completion flags — both must be true before status → "completed" */
  providerConfirmedCompleted?: boolean;
  customerConfirmedCompleted?: boolean;
  /** Provider-supplied completion details (completion modal). Persisted on the
   * offer so they survive a one-sided "waiting" confirmation and are captured in
   * the Service-History snapshot whenever the offer is finally completed. */
  completionAfterPhotos?: string[];
  completionNotes?: string;
  completionDurationMinutes?: number;
}

/** Provider completion details collected in the completion modal. */
export interface CompletionDetails {
  afterPhotos?: string[];
  completionNotes?: string;
  durationMinutes?: number;
}

/* ─── Offer Limit Constants ──────────────────────────────────────── */
export const MAX_ACTIVE_OFFERS = 5;
export const MAX_LIFETIME_OFFERS = 10;
const ACTIVE_STATUSES: OfferStatus[] = ["pending", "negotiating", "accepted"];

/* ─── Request Cooldown Constants ────────────────────────────────────
 * Anti-spam: customer must wait between request creations.
 *  - Default cooldown: 5 minutes
 *  - If 3+ requests in last 24h → extended cooldown of 30 minutes
 *  - Admin flag suggested at 5+ requests in 24h
 * Cancelled requests do NOT count (don't punish failed attempts). */
export const REQUEST_COOLDOWN_MS          = 5 * 60 * 1000;
export const REQUEST_EXTENDED_COOLDOWN_MS = 30 * 60 * 1000;
export const REQUEST_EXTENDED_THRESHOLD   = 3;
export const REQUEST_DAILY_FLAG_THRESHOLD = 5;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export interface ChatAttachment {
  type: "image" | "file";
  url: string;      // base64 data URL or object URL
  name?: string;    // original filename
}

export interface ChatMessage {
  id: string;
  sender: "customer" | "master" | "system"; // master = provider/ijrochi; system = automated notification
  text: string;
  timestamp: string;
  attachment?: ChatAttachment;
  /** ISO timestamp when message arrived in the receiver's chat (set on send). */
  deliveredAt?: string | null;
  /** ISO timestamp when receiver actually opened the chat and saw it. */
  readAt?: string | null;
  /** Soft-deleted for both parties (within 5-min window). A placeholder is shown instead. */
  deletedForEveryone?: boolean;
  /** ISO timestamp when the soft-deletion happened. */
  deletedAt?: string | null;
  /** User IDs for whom this message is hidden on their side only. */
  deletedForUsers?: string[];
}

/**
 * Unified chat format — shared by customer and provider sides.
 * Both sides read/write to hormang_chats using this structure.
 * ID is deterministic: `${requestId}_${masterId}`
 */
export interface Chat {
  id: string;
  requestId: string;
  masterId: string;
  masterName: string;
  masterInitials: string;
  masterColor: string;
  avgResponseTime: number;
  categoryName: string;
  categoryEmoji: string;      // shown on provider side
  customerName: string;       // shown on provider side
  customerInitials: string;   // shown on provider side
  customerColor: string;      // shown on provider side
  providerUnread: number;     // messages customer sent that provider hasn't read
  customerUnread?: number;    // messages provider sent that customer hasn't read
  messages: ChatMessage[];
  createdAt: string;
}

/* ─── Storage Keys ───────────────────────────────────────────────── */

const REQUESTS_KEY = "hormang_requests";
const OFFERS_KEY = "hormang_offers";
const CHATS_KEY = "hormang_chats";
const CUSTOMER_REGISTRY_KEY = "hormang_customer_registry";

/* ─── Customer Name Registry ─────────────────────────────────────── */
/**
 * A lightweight userId → { name, initials } map written to localStorage
 * whenever a user logs in. Providers use this to show real customer names
 * on requests and chats without a server round-trip.
 */
interface CustomerEntry { name: string; initials: string }

export function saveCustomerToRegistry(userId: string, name: string, initials: string): void {
  if (!userId || !name) return;
  const reg = readJSON<Record<string, CustomerEntry>>(CUSTOMER_REGISTRY_KEY, {});
  reg[userId] = { name, initials };
  localStorage.setItem(CUSTOMER_REGISTRY_KEY, JSON.stringify(reg));
}

export function getCustomerFromRegistry(userId: string): CustomerEntry | null {
  if (!userId) return null;
  const reg = readJSON<Record<string, CustomerEntry>>(CUSTOMER_REGISTRY_KEY, {});
  return reg[userId] ?? null;
}

/* ─── Phone Registry ─────────────────────────────────────────────── */
/**
 * A userId → phone map written to localStorage on every login.
 * Works for both customers and providers so the admin panel can
 * display phone numbers without a server round-trip.
 */
const PHONE_REGISTRY_KEY = "hormang_phone_registry";

export function savePhoneToRegistry(userId: string, phone: string | null | undefined): void {
  if (!userId || !phone) return;
  const reg = readJSON<Record<string, string>>(PHONE_REGISTRY_KEY, {});
  reg[userId] = phone;
  localStorage.setItem(PHONE_REGISTRY_KEY, JSON.stringify(reg));
}

export function getPhoneRegistry(): Record<string, string> {
  return readJSON<Record<string, string>>(PHONE_REGISTRY_KEY, {});
}

import { getCategoryEmoji } from "@/lib/categories";

/* ─── Storage helpers ─────────────────────────────────────────────── */

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch (_) { /* ignore */ }
  return fallback;
}

function writeJSON<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      console.warn("[Hormang] localStorage quota exceeded for key:", key);
      throw new Error("Xotira to'ldi. Iltimos, ba'zi eski ma'lumotlarni o'chiring.");
    }
    throw e;
  }
  emitStoreChange();
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/* ─── Requests ───────────────────────────────────────────────────── */

export function getRequests(): CustomerRequest[] {
  return readJSON<CustomerRequest[]>(REQUESTS_KEY, []).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getRequestById(id: string): CustomerRequest | undefined {
  return getRequests().find((r) => r.id === id);
}

export function saveNewRequest(
  categoryId: string,
  categoryName: string,
  answers: Record<string, unknown>,
  location?: { region?: string; district?: string },
  customerId?: string,
  customerName?: string,
  requestPhotos?: string[],
): CustomerRequest {
  let region = location?.region || (answers["region"] as string | undefined);
  let district = location?.district || (answers["district"] as string | undefined);
  // Parse new unified location answer (type: "location" question)
  const locAnswer = answers["location"];
  if (locAnswer && typeof locAnswer === "object" && !Array.isArray(locAnswer)) {
    const loc = locAnswer as { region?: string; district?: string };
    if (loc.region) { region = loc.region; district = loc.district; }
  }

  // Anti-spam cooldown — must validate BEFORE persisting the request
  if (customerId) {
    const cd = getRequestCooldown(customerId);
    if (cd.blocked) {
      const err = new Error(
        `So'rovlar oralig'ida kutish vaqti mavjud: ${formatCooldownRemaining(cd.remainingMs)} qoldi`,
      );
      (err as Error & { code?: string; cooldown?: CooldownState }).code = "REQUEST_COOLDOWN";
      (err as Error & { code?: string; cooldown?: CooldownState }).cooldown = cd;
      throw err;
    }
  }

  const req: CustomerRequest = {
    id: uid(),
    customerId: customerId || undefined,
    customerName: customerName || undefined,
    categoryId,
    categoryName,
    emoji: getCategoryEmoji(categoryId),
    answers,
    requestPhotos: requestPhotos?.length ? requestPhotos : undefined,
    status: "open",
    createdAt: new Date().toISOString(),
    offerCount: 0,
    region: region || undefined,
    district: district || undefined,
  };
  const existing = readJSON<CustomerRequest[]>(REQUESTS_KEY, []);
  writeJSON(REQUESTS_KEY, [req, ...existing]);
  return req;
}

export function updateRequestStatus(requestId: string, status: CustomerRequest["status"]): void {
  const reqs = readJSON<CustomerRequest[]>(REQUESTS_KEY, []);
  writeJSON(REQUESTS_KEY, reqs.map((r) => r.id === requestId ? { ...r, status } : r));
}

/**
 * Returns true if the request has no offers and can be permanently deleted.
 * Uses live offer count from the shared offers store — not the cached offerCount
 * field on the request — so it is always accurate.
 */
export function canDeleteRequest(requestId: string): boolean {
  return getOffersByRequestId(requestId).length === 0;
}

/**
 * Returns true if the request has ever received at least one offer.
 * Once true, permanent deletion must never be allowed even if the offer
 * was later rejected/withdrawn, to protect provider Tanga history.
 */
export function hasEverReceivedOffer(requestId: string): boolean {
  return getOffersByRequestId(requestId).length > 0;
}

/* ─── Customer-scoped helpers ────────────────────────────────────── */

/** Only requests created by this customer (strict isolation). */
export function getRequestsByCustomer(customerId: string): CustomerRequest[] {
  if (!customerId) return [];
  return getRequests().filter((r) => r.customerId === customerId);
}

/**
 * Only offers received on this customer's own requests.
 * Derives the set from their request IDs.
 * Offers from providers that this customer has blocked are excluded.
 */
export function getOffersByCustomer(customerId: string): Offer[] {
  if (!customerId) return [];
  const myRequestIds = new Set(getRequestsByCustomer(customerId).map((r) => r.id));
  const blocked = new Set(getBlockedUsers(customerId));
  return getOffers().filter(
    (o) => myRequestIds.has(o.requestId) && !blocked.has(o.masterId),
  );
}

/**
 * Only chats that belong to this customer's own requests.
 * Derives the set from their request IDs.
 * Chats with providers that this customer has blocked are excluded.
 */
export function getChatsByCustomer(customerId: string): Chat[] {
  if (!customerId) return [];
  const myRequestIds = new Set(getRequestsByCustomer(customerId).map((r) => r.id));
  const blocked = new Set(getBlockedUsers(customerId));
  return getChats().filter(
    (c) => myRequestIds.has(c.requestId) && !blocked.has(c.masterId),
  );
}

/* ─── Offers ─────────────────────────────────────────────────────── */

export function getOffers(): Offer[] {
  return readJSON<Offer[]>(OFFERS_KEY, []);
}

export function getOffersByRequestId(requestId: string): Offer[] {
  return getOffers().filter((o) => o.requestId === requestId);
}

/** Find the single offer for a chat (by requestId + masterId) */
export function getOfferForChat(requestId: string, masterId: string): Offer | undefined {
  return getOffers().find((o) => o.requestId === requestId && o.masterId === masterId);
}

export function getOfferById(offerId: string): Offer | undefined {
  return getOffers().find((o) => o.id === offerId);
}

/* ─── Offer Limiting System ──────────────────────────────────────── */

/**
 * Counts active and lifetime offers for a request.
 *  - active = pending | negotiating | accepted
 *  - total  = every offer ever created on this request
 */
export function getRequestCounts(requestId: string): { active: number; total: number } {
  const all = getOffersByRequestId(requestId);
  const active = all.filter((o) => ACTIVE_STATUSES.includes(o.status)).length;
  return { active, total: all.length };
}

export type CanSubmitOfferReason =
  | "no_request"
  | "request_closed"
  | "matched"
  | "active_limit"
  | "lifetime_limit"
  | "already_offered"
  | "self_request";

/**
 * Single source of truth for "may this provider submit an offer on this request?".
 * Called BEFORE Tanga deduction so balance is never spent on a blocked submission.
 */
export function canSubmitOffer(
  requestId: string,
  providerId: string,
): { ok: boolean; reason?: CanSubmitOfferReason; active: number; total: number } {
  const req = getRequestById(requestId);
  const { active, total } = getRequestCounts(requestId);
  if (!req) return { ok: false, reason: "no_request", active, total };
  // Prevent a provider from sending an offer on their own customer request
  if (providerId && req.customerId === providerId)
    return { ok: false, reason: "self_request", active, total };
  if (req.closedForOffers || req.acceptedOfferId || req.status === "matched")
    return { ok: false, reason: "matched", active, total };
  if (req.status !== "open") return { ok: false, reason: "request_closed", active, total };
  if (total >= MAX_LIFETIME_OFFERS) return { ok: false, reason: "lifetime_limit", active, total };
  if (active >= MAX_ACTIVE_OFFERS) return { ok: false, reason: "active_limit", active, total };
  if (providerId) {
    const dup = getOffersByRequestId(requestId).some(
      (o) => o.masterId === providerId && ACTIVE_STATUSES.includes(o.status),
    );
    if (dup) return { ok: false, reason: "already_offered", active, total };
  }
  return { ok: true, active, total };
}

/* ─── Request Cooldown System ────────────────────────────────────── */

/** All non-cancelled requests this customer has submitted. */
function getQualifyingRequests(customerId: string): CustomerRequest[] {
  if (!customerId) return [];
  return getRequests().filter(
    (r) => r.customerId === customerId && r.status !== "cancelled",
  );
}

/** Count of qualifying requests created in the last `windowMs` (default 24h). */
export function getRecentRequestCount(customerId: string, windowMs: number = ONE_DAY_MS): number {
  const now = Date.now();
  return getQualifyingRequests(customerId).filter(
    (r) => now - new Date(r.createdAt).getTime() < windowMs,
  ).length;
}

export type CooldownState = {
  /** True if the customer is currently inside a cooldown window. */
  blocked: boolean;
  /** Milliseconds remaining until they may create a new request. */
  remainingMs: number;
  /** Epoch ms when the cooldown ends (null if not blocked). */
  until: number | null;
  /** Active cooldown duration: 5min default, 30min if 3+ in 24h. */
  durationMs: number;
  /** Number of qualifying requests in the last 24h. */
  recentCount: number;
  /** True if extended (30 min) cooldown is the active duration. */
  extended: boolean;
};

/**
 * Single source of truth for "is this customer currently rate-limited?".
 * Pure read — does not mutate. Call freely from UI tickers.
 */
export function getRequestCooldown(customerId: string): CooldownState {
  const baseDuration = REQUEST_COOLDOWN_MS;
  if (!customerId) {
    return { blocked: false, remainingMs: 0, until: null, durationMs: baseDuration, recentCount: 0, extended: false };
  }
  const qualifying = getQualifyingRequests(customerId);
  const now = Date.now();
  const recentCount = qualifying.filter((r) => now - new Date(r.createdAt).getTime() < ONE_DAY_MS).length;
  const extended = recentCount >= REQUEST_EXTENDED_THRESHOLD;
  const durationMs = extended ? REQUEST_EXTENDED_COOLDOWN_MS : REQUEST_COOLDOWN_MS;

  // Latest qualifying request determines the cooldown anchor
  const latest = qualifying
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  if (!latest) {
    return { blocked: false, remainingMs: 0, until: null, durationMs, recentCount, extended };
  }

  const elapsed = now - new Date(latest.createdAt).getTime();
  if (elapsed >= durationMs) {
    return { blocked: false, remainingMs: 0, until: null, durationMs, recentCount, extended };
  }
  const remainingMs = durationMs - elapsed;
  return {
    blocked: true,
    remainingMs,
    until: new Date(latest.createdAt).getTime() + durationMs,
    durationMs,
    recentCount,
    extended,
  };
}

/** "X daqiqa YY soniya" — Uzbek live-countdown label. */
export function formatCooldownRemaining(remainingMs: number): string {
  const totalSec = Math.max(0, Math.ceil(remainingMs / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m} daqiqa ${s.toString().padStart(2, "0")} soniya`;
}

/** Localised label for a `canSubmitOffer` failure reason. */
export function offerBlockLabel(reason: CanSubmitOfferReason | undefined, t: Dict): string {
  switch (reason) {
    case "matched":          return t.offerBlock.matched;
    case "active_limit":     return t.offerBlock.activeLimit;
    case "lifetime_limit":   return t.offerBlock.lifetimeLimit;
    case "request_closed":   return t.offerBlock.requestClosed;
    case "already_offered":  return t.offerBlock.alreadyOffered;
    case "no_request":       return t.offerBlock.noRequest;
    case "self_request":     return t.offerBlock.selfRequest;
    default:                 return t.offerBlock.default;
  }
}

/** Set offer status to in_progress (when provider schedules the work) */
export function markOfferInProgress(offerId: string): void {
  const allOffers = getOffers();
  const target = allOffers.find((o) => o.id === offerId);
  if (!target || target.status !== "accepted") return;
  writeJSON(OFFERS_KEY, allOffers.map((o) => o.id === offerId ? { ...o, status: "in_progress" as const } : o));
  emitStoreChange();
}

/**
 * Force-complete an offer (admin / direct use). Sets both confirmation flags and
 * immediately finalises. Returns true if newly completed, false if already was.
 */
export function markOfferCompleted(offerId: string): boolean {
  const allOffers = getOffers();
  const target = allOffers.find((o) => o.id === offerId);
  if (!target) return false;
  if (target.status === "completed") return false;

  writeJSON(
    OFFERS_KEY,
    allOffers.map((o) =>
      o.id === offerId
        ? { ...o, status: "completed" as const, providerConfirmedCompleted: true, customerConfirmedCompleted: true }
        : o
    )
  );

  const request = getRequestById(target.requestId);
  if (request) {
    updateRequestStatus(target.requestId, "completed");
    if (request.customerId) incrementCompletedCount(request.customerId, "customer");
  }
  incrementCompletedCount(target.masterId, "provider");
  recordCompletionSnapshot(target, request);

  sendSystemMessage(`${target.requestId}_${target.masterId}`, "✅ Xizmat yakunlandi! Hamkorlik uchun rahmat.");
  return true;
}

/**
 * Build a plain-text snapshot of a request's answers (excluding meta/location
 * fields and base64 blobs) so completed-service history has a self-contained
 * description even after the original request is gone.
 */
function snapshotDescription(answers: Record<string, unknown> | undefined): string {
  if (!answers) return "";
  const skip = new Set(["urgency", "budget", "budget_open", "region", "district", "location"]);
  const parts: string[] = [];
  for (const [k, v] of Object.entries(answers)) {
    if (skip.has(k) || k.endsWith("_other")) continue;
    if (v === null || v === undefined || v === "") continue;
    if (typeof v === "string") {
      if (v.startsWith("data:")) continue;
      parts.push(v);
    } else if (typeof v === "number") {
      parts.push(String(v));
    } else if (Array.isArray(v)) {
      const joined = (v as unknown[])
        .filter((x) => typeof x === "string" && !(x as string).startsWith("data:"))
        .join(", ");
      if (joined) parts.push(joined);
    }
  }
  return parts.join(" · ");
}

/** Record an immutable Service-History snapshot when an offer is finalised. */
function recordCompletionSnapshot(offer: Offer, request: CustomerRequest | undefined): void {
  recordServiceCompletion({
    providerId: offer.masterId,
    customerId: request?.customerId,
    customerName: request?.customerName,
    requestId: offer.requestId,
    offerId: offer.id,
    categoryId: request?.categoryId ?? "",
    categoryName: request?.categoryName ?? "",
    emoji: request?.emoji,
    serviceTitle: request?.categoryName ?? "",
    serviceDescription: snapshotDescription(request?.answers),
    completionNotes: offer.completionNotes,
    durationMinutes: offer.completionDurationMinutes,
    finalPrice: offer.price,
    region: request?.region,
    district: request?.district,
    beforePhotos: request?.requestPhotos,
    afterPhotos: offer.completionAfterPhotos,
  });
}

/**
 * Dual-party completion: both provider AND customer must confirm before the
 * offer is officially marked "completed" and counters are incremented.
 *
 * - Sets the caller's confirmation flag on the offer.
 * - If both flags are now set → finalises (status → "completed", increments
 *   completed counts for both parties, sends a success system message).
 * - If only one party has confirmed → saves the flag and sends a waiting
 *   system message. Returns "waiting".
 *
 * Returns "completed" when fully finalised, "waiting" otherwise.
 */
export function confirmCompletion(
  offerId: string,
  role: "provider" | "customer",
  systemMsgs?: { providerConfirmed: string; customerConfirmed: string; completed: string },
  details?: CompletionDetails
): "completed" | "waiting" {
  const allOffers = getOffers();
  const target = allOffers.find((o) => o.id === offerId);
  if (!target) return "waiting";
  if (target.status === "completed") return "completed";

  const updated: Offer = {
    ...target,
    providerConfirmedCompleted: role === "provider" ? true : target.providerConfirmedCompleted,
    customerConfirmedCompleted: role === "customer" ? true : target.customerConfirmedCompleted,
    // Persist provider completion details (only the provider supplies these).
    completionAfterPhotos:
      role === "provider" && details?.afterPhotos?.length
        ? details.afterPhotos
        : target.completionAfterPhotos,
    completionNotes:
      role === "provider" && details?.completionNotes?.trim()
        ? details.completionNotes.trim()
        : target.completionNotes,
    completionDurationMinutes:
      role === "provider" && details?.durationMinutes && details.durationMinutes > 0
        ? details.durationMinutes
        : target.completionDurationMinutes,
  };

  if (updated.providerConfirmedCompleted && updated.customerConfirmedCompleted) {
    writeJSON(
      OFFERS_KEY,
      allOffers.map((o) =>
        o.id === offerId ? { ...updated, status: "completed" as const } : o
      )
    );
    const request = getRequestById(target.requestId);
    if (request) {
      updateRequestStatus(target.requestId, "completed");
      if (request.customerId) incrementCompletedCount(request.customerId, "customer");
    }
    incrementCompletedCount(target.masterId, "provider");
    recordCompletionSnapshot(updated, request);
    sendSystemMessage(
      `${target.requestId}_${target.masterId}`,
      systemMsgs?.completed ?? "✅ Xizmat yakunlandi! Hamkorlik uchun rahmat."
    );
    emitStoreChange();
    return "completed";
  }

  writeJSON(OFFERS_KEY, allOffers.map((o) => (o.id === offerId ? updated : o)));
  const waitingMsg =
    role === "provider"
      ? (systemMsgs?.providerConfirmed ?? "⏳ Ijrochi xizmat yakunlanganligini tasdiqladi. Mijoz tasdig'i kutilmoqda.")
      : (systemMsgs?.customerConfirmed ?? "⏳ Mijoz xizmat yakunlanganligini tasdiqladi. Ijrochi tasdig'i kutilmoqda.");
  sendSystemMessage(`${target.requestId}_${target.masterId}`, waitingMsg);
  emitStoreChange();
  return "waiting";
}

/**
 * Refund the Tanga an offer originally cost back to its provider, and record
 * a transaction. Idempotent per (offerId, reason): a "refund-applied" marker
 * is written so a second call is a no-op.
 */
function refundOfferToProvider(
  offer: Offer,
  request: CustomerRequest | undefined,
  reason: "rejected" | "request_deleted" | "request_cancelled",
): void {
  if (!offer.masterId) return;
  const flagKey = `hormang_offer_refunded_${offer.id}`;
  if (localStorage.getItem(flagKey)) return;

  const cost = request
    ? calculateOfferCost({ categoryId: request.categoryId, answers: request.answers as Record<string, unknown> | undefined })
    : 2;

  addTangaBalance(offer.masterId, cost);
  recordTangaTransaction({
    userId: offer.masterId,
    offerId: offer.id,
    requestId: offer.requestId,
    categoryName: request?.categoryName ?? "",
    categoryEmoji: request?.emoji ?? "↩️",
    description:
      reason === "rejected"
        ? "Taklif rad etildi — Tanga qaytarildi"
        : reason === "request_deleted"
          ? "So'rov o'chirildi — Tanga qaytarildi"
          : "So'rov bekor qilindi — Tanga qaytarildi",
    amount: cost,
    type: "refund",
    direction: "in",
  });
  localStorage.setItem(flagKey, new Date().toISOString());
  console.log(`[Hormang] 💰 Refund: +${cost} Tanga → provider=${offer.masterId.slice(0,8)} offer=${offer.id} (${reason})`);
}

export function updateOfferStatus(
  offerId: string,
  status: "accepted" | "rejected",
  systemMsgs?: { accepted: string; rejected: string; sibling: string },
): void {
  const allOffers = getOffers();
  const target = allOffers.find((o) => o.id === offerId);
  if (!target) return;

  // Mark the target offer with the new status. When accepted, also flip every
  // sibling active offer on the same request to "closed_by_match" so providers
  // see a clear, distinct status rather than a rejection.
  let updated: Offer[] = allOffers.map((o) => {
    if (o.id === offerId) return { ...o, status };
    if (
      status === "accepted" &&
      o.requestId === target.requestId &&
      ACTIVE_STATUSES.includes(o.status)
    ) {
      return { ...o, status: "Yopilgan" as const };
    }
    return o;
  });

  writeJSON(OFFERS_KEY, updated);
  console.log(`[Hormang] ✅ Offer ${status === "accepted" ? "qabul qilindi" : "rad etildi"}`, { offerId, status });

  // When the customer accepts, lock the request: status → matched, mark
  // acceptedOfferId, and set closedForOffers so no new offers can be created.
  if (status === "accepted") {
    const reqs = readJSON<CustomerRequest[]>(REQUESTS_KEY, []);
    const lockedReqs = reqs.map((r) =>
      r.id === target.requestId
        ? { ...r, status: "matched" as const, acceptedOfferId: offerId, closedForOffers: true }
        : r
    );
    writeJSON(REQUESTS_KEY, lockedReqs);
  }

  // Inject a timeline system message into the offer's own chat
  if (target) {
    const chatId = `${target.requestId}_${target.masterId}`;
    const text =
      status === "accepted"
        ? (systemMsgs?.accepted ?? "Taklif qabul qilindi — Suhbat davom etmoqda")
        : (systemMsgs?.rejected ?? "Taklif rad etildi. Suhbat yopildi.");
    sendSystemMessage(chatId, text);
  }

  // When an offer is accepted, also notify sibling providers via system message
  if (status === "accepted") {
    const siblings = allOffers.filter(
      (o) => o.requestId === target.requestId && o.id !== offerId
    );
    const sibMsg = systemMsgs?.sibling ?? "Mijoz boshqa ijrochi taklifini qabul qildi";
    for (const sib of siblings) {
      sendSystemMessage(`${sib.requestId}_${sib.masterId}`, sibMsg);
    }
  }

  emitStoreChange();
}

/**
 * Re-open a previously rejected offer (only when the request is still open
 * and no other offer has been accepted).
 * Since there are no automatic rejection refunds, no Tanga movement is needed
 * on reopen — the original spend remains as-is.
 */
export function reopenOffer(
  offerId: string,
): { ok: boolean; reason?: "not_found" | "not_rejected" | "no_request" | "request_closed" | "already_accepted" } {
  const allOffers = getOffers();
  const target = allOffers.find((o) => o.id === offerId);
  if (!target) return { ok: false, reason: "not_found" };
  if (target.status !== "rejected") return { ok: false, reason: "not_rejected" };

  const req = getRequestById(target.requestId);
  if (!req) return { ok: false, reason: "no_request" };
  if (req.status !== "open") return { ok: false, reason: "request_closed" };
  if (allOffers.some((o) => o.requestId === target.requestId && o.status === "accepted")) {
    return { ok: false, reason: "already_accepted" };
  }

  const updated = allOffers.map((o) => o.id === offerId ? { ...o, status: "pending" as const } : o);
  writeJSON(OFFERS_KEY, updated);
  emitStoreChange();
  return { ok: true };
}

/* ─── Admin Refund System ────────────────────────────────────────── */

/**
 * Returns the last 10 offers submitted by a provider, sorted newest-first,
 * and checks whether all 10 are rejected and not yet refunded.
 */
export function getLast10RejectedEligibility(providerId: string): {
  offers: Offer[];
  eligible: boolean;
  totalSpent: number;
  refundAmount: number;
} {
  const allOffers = getOffers();
  const providerOffers = allOffers
    .filter((o) => o.masterId === providerId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  const eligible =
    providerOffers.length === 10 &&
    providerOffers.every((o) => o.status === "rejected" && !o.refunded);

  const totalSpent = providerOffers.reduce((sum, o) => sum + (o.tangaSpent ?? 0), 0);
  const refundAmount = Math.floor(totalSpent * 0.5);

  return { offers: providerOffers, eligible, totalSpent, refundAmount };
}

/**
 * Admin-triggered 50% refund for a provider whose last 10 offers are all rejected.
 * Marks every offer as `refunded: true` to prevent double-payment.
 */
export function adminRefundProvider(
  adminId: string,
  providerId: string,
): { ok: boolean; refundAmount?: number; reason?: string } {
  const { offers, eligible, refundAmount } = getLast10RejectedEligibility(providerId);
  if (!eligible) return { ok: false, reason: "not_eligible" };
  if (refundAmount <= 0) return { ok: false, reason: "zero_refund" };

  // Mark all 10 offers as refunded so this action cannot be repeated.
  const allOffers = getOffers();
  const offerIds = new Set(offers.map((o) => o.id));
  writeJSON(OFFERS_KEY, allOffers.map((o) => offerIds.has(o.id) ? { ...o, refunded: true } : o));

  // Credit the provider.
  addTangaBalance(providerId, refundAmount);

  // Record transaction.
  recordTangaTransaction({
    userId: providerId,
    offerId: "",
    requestId: "",
    categoryName: "Admin qaytarish",
    categoryEmoji: "↩️",
    description: `So'nggi 10 rad etilgan taklif uchun 50% qaytarish — ${refundAmount} Tanga (admin: ${adminId})`,
    amount: refundAmount,
    type: "refund",
    direction: "in",
  });

  emitStoreChange();
  console.log(`[Hormang] 💰 Admin refund: +${refundAmount} Tanga → provider=${providerId.slice(0, 8)} by admin=${adminId}`);
  return { ok: true, refundAmount };
}

/**
 * Cascading delete of a request and ALL related rows (offers, chats).
 * Refunds Tanga to providers whose pending offers get destroyed and also
 * scrubs the request from every per-provider offer mirror.
 */
export function deleteRequestCascade(requestId: string): void {
  const req = getRequestById(requestId);
  if (req && req.offerCount > 0) {
    throw new Error("Taklif mavjud bo'lgan so'rovni o'chirib bo'lmaydi");
  }
  const allOffers = getOffers();
  // Only refund unresolved offers. Accepted/in_progress represent committed
  // work and completed offers are already paid for, so we do not over-refund.
  for (const o of allOffers) {
    if (o.requestId === requestId && o.status === "pending") {
      refundOfferToProvider(o, req, "request_deleted");
    }
  }
  writeJSON(OFFERS_KEY, allOffers.filter((o) => o.requestId !== requestId));

  const reqs = getRequests().filter((r) => r.id !== requestId);
  writeJSON(REQUESTS_KEY, reqs);

  const chats = readJSON<Chat[]>(CHATS_KEY, []);
  writeJSON(CHATS_KEY, chats.filter((c) => c.requestId !== requestId));

  // Per-provider offer mirrors live at hormang_provider_offers_<providerId>.
  // Walk localStorage and prune entries pointing at this requestId.
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith("hormang_provider_offers_")) continue;
    try {
      const arr = JSON.parse(localStorage.getItem(k) ?? "[]") as Array<{ requestId?: string }>;
      const next = arr.filter((o) => o.requestId !== requestId);
      if (next.length !== arr.length) localStorage.setItem(k, JSON.stringify(next));
    } catch (_) {}
  }

  emitStoreChange();
}

/**
 * Cascading delete of every localStorage key tied to a single user.
 * Used when admin deletes a user.
 */
export function deleteUserDataCascade(userId: string): void {
  if (!userId) return;
  // 1. Per-user prefixed keys (user_<id>_*, provider_tokens_<id>, etc.)
  const PER_USER_PREFIXES = [
    `user_${userId}_`,
    `provider_tokens_${userId}`,
    `hormang_referral_${userId}`,
    `hormang_ref_pending_${userId}`,
    `hormang_ref_inviter_${userId}`,
    `hormang_tanga_history_${userId}`,
    `provider_seen_${userId}`,
    `provider_offers_${userId}`,
    `provider_services_${userId}`,
    `provider_statuses_${userId}`,
  ];
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (PER_USER_PREFIXES.some((p) => k === p || k.startsWith(p))) toRemove.push(k);
    if (k.endsWith(`_${userId}`) || k.includes(`_${userId}_`)) toRemove.push(k);
  }
  toRemove.forEach((k) => localStorage.removeItem(k));

  // 2. Shared collections — drop rows owned by this user. We must also
  //    purge offers/chats whose requestId belongs to a request we just
  //    removed (the user was the customer), otherwise they orphan.
  const allReqs = getRequests();
  const removedReqIds = new Set(allReqs.filter((r) => r.customerId === userId).map((r) => r.id));
  const reqs = allReqs.filter((r) => r.customerId !== userId);
  writeJSON(REQUESTS_KEY, reqs);

  const offers = getOffers().filter(
    (o) => o.masterId !== userId && !removedReqIds.has(o.requestId),
  );
  writeJSON(OFFERS_KEY, offers);

  const chats = readJSON<Chat[]>(CHATS_KEY, []).filter(
    (c) => c.masterId !== userId && !removedReqIds.has(c.requestId),
  );
  writeJSON(CHATS_KEY, chats);

  // Also scrub the deleted requestIds from every per-provider offer mirror.
  if (removedReqIds.size > 0) {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith("hormang_provider_offers_")) continue;
      try {
        const arr = JSON.parse(localStorage.getItem(k) ?? "[]") as Array<{ requestId?: string }>;
        const next = arr.filter((o) => o.requestId === undefined || !removedReqIds.has(o.requestId));
        if (next.length !== arr.length) localStorage.setItem(k, JSON.stringify(next));
      } catch (_) {}
    }
  }

  // 3. Customer / phone registry
  try {
    const reg = JSON.parse(localStorage.getItem(CUSTOMER_REGISTRY_KEY) ?? "{}");
    delete reg[userId];
    localStorage.setItem(CUSTOMER_REGISTRY_KEY, JSON.stringify(reg));
  } catch {}
  try {
    const phones = JSON.parse(localStorage.getItem("hormang_phone_registry") ?? "{}");
    delete phones[userId];
    localStorage.setItem("hormang_phone_registry", JSON.stringify(phones));
  } catch {}

  emitStoreChange();
  console.log(`[Hormang] 🗑️ Foydalanuvchi ma'lumotlari to'liq o'chirildi: ${userId.slice(0,8)}`);
}

/**
 * Inject a system notification into a chat.
 * Does NOT increment providerUnread (it's not a real message from either side).
 */
export function sendSystemMessage(chatId: string, text: string): void {
  const chats = readJSON<Chat[]>(CHATS_KEY, []);
  const idx = chats.findIndex((c) => c.id === chatId);
  if (idx === -1) return;
  const msg: ChatMessage = {
    id: uid(),
    sender: "system",
    text,
    timestamp: new Date().toISOString(),
  };
  chats[idx] = { ...chats[idx], messages: [...chats[idx].messages, msg] };
  writeJSON(CHATS_KEY, chats);
}

/* ─── Chats ──────────────────────────────────────────────────────── */

export function getChats(): Chat[] {
  return readJSON<Chat[]>(CHATS_KEY, []).sort(
    (a, b) => {
      const aLast = a.messages[a.messages.length - 1]?.timestamp ?? a.createdAt;
      const bLast = b.messages[b.messages.length - 1]?.timestamp ?? b.createdAt;
      return new Date(bLast).getTime() - new Date(aLast).getTime();
    }
  );
}

export function getChatById(id: string): Chat | undefined {
  return readJSON<Chat[]>(CHATS_KEY, []).find((c) => c.id === id);
}

/**
 * Create or return an existing chat for a request+master pair.
 * ID is deterministic: `${requestId}_${masterId}`.
 * customerMeta is optional — used when creating chat from customer side
 * before provider has set up the chat (rare case).
 */
export function getOrCreateChat(
  requestId: string,
  masterId: string,
  masterName: string,
  masterInitials: string,
  masterColor: string,
  avgResponseTime: number,
  categoryName: string,
  customerMeta?: {
    name?: string;
    initials?: string;
    color?: string;
    emoji?: string;
  }
): Chat {
  const chatId = `${requestId}_${masterId}`;
  const existing = getChatById(chatId);
  if (existing) return existing;

  const chat: Chat = {
    id: chatId,
    requestId,
    masterId,
    masterName,
    masterInitials,
    masterColor,
    avgResponseTime,
    categoryName,
    categoryEmoji: customerMeta?.emoji ?? "📋",
    customerName: customerMeta?.name ?? "Mijoz",
    customerInitials: customerMeta?.initials ?? "X",
    customerColor: customerMeta?.color ?? "#2563EB",
    providerUnread: 0,
    customerUnread: 0,
    messages: [],
    createdAt: new Date().toISOString(),
  };

  const existing2 = readJSON<Chat[]>(CHATS_KEY, []);
  writeJSON(CHATS_KEY, [chat, ...existing2]);
  return chat;
}

/**
 * Send a message and return the updated chat.
 * - "customer" sends → providerUnread++  (provider has unread message)
 * - "master"   sends → customerUnread++ (customer has unread message)
 * The sender's own counter is never bumped.
 */
export function sendMessage(
  chatId: string,
  sender: "customer" | "master",
  text: string,
  attachment?: ChatAttachment,
  senderUserId?: string,
): Chat | null {
  const chats = readJSON<Chat[]>(CHATS_KEY, []);
  const idx = chats.findIndex((c) => c.id === chatId);
  if (idx === -1) return null;

  const now = new Date().toISOString();
  const msg: ChatMessage = {
    id: uid(),
    sender,
    text,
    timestamp: now,
    deliveredAt: now,
    readAt: null,
    ...(attachment ? { attachment } : {}),
  };
  const prevProviderUnread = chats[idx].providerUnread ?? 0;
  const prevCustomerUnread = chats[idx].customerUnread ?? 0;
  const providerUnread = sender === "customer" ? prevProviderUnread + 1 : prevProviderUnread;
  // Don't increment customerUnread if the sending provider is blocked by the customer
  const isBlockedProvider = (() => {
    if (sender !== "master") return false;
    const req = getRequestById(chats[idx].requestId);
    if (!req || !req.customerId) return false;
    return getBlockedUsers(req.customerId).includes(chats[idx].masterId);
  })();
  const customerUnread = (sender === "master" && !isBlockedProvider) ? prevCustomerUnread + 1 : prevCustomerUnread;
  chats[idx] = {
    ...chats[idx],
    messages: [...chats[idx].messages, msg],
    providerUnread,
    customerUnread,
  };
  writeJSON(CHATS_KEY, chats);
  if (senderUserId) {
    try { recordReplyFromChat(chats[idx], msg.id, senderUserId); } catch { /* best-effort */ }
  }
  console.log(`[Hormang] 💬 Xabar yuborildi`, { chatId, sender, text: text.slice(0, 50), hasAttachment: !!attachment });
  return chats[idx];
}

/**
 * Mark all messages in this chat as read by the provider.
 * Called when provider opens the chat thread.
 */
export function markProviderChatRead(chatId: string): void {
  const chats = readJSON<Chat[]>(CHATS_KEY, []);
  const idx = chats.findIndex((c) => c.id === chatId);
  if (idx === -1) return;
  const chat = chats[idx];
  const now = new Date().toISOString();
  let touched = false;
  const messages = chat.messages.map((m) => {
    if (m.sender === "customer" && !m.readAt) {
      touched = true;
      return { ...m, readAt: now, deliveredAt: m.deliveredAt ?? m.timestamp };
    }
    return m;
  });
  const hadUnread = (chat.providerUnread ?? 0) > 0;
  if (!touched && !hadUnread) return;
  chats[idx] = { ...chat, providerUnread: 0, messages };
  writeJSON(CHATS_KEY, chats);
}

/**
 * Mark all messages in this chat as read by the customer.
 * Called when customer opens the chat thread.
 */
export function markCustomerChatRead(chatId: string): void {
  const chats = readJSON<Chat[]>(CHATS_KEY, []);
  const idx = chats.findIndex((c) => c.id === chatId);
  if (idx === -1) return;
  const chat = chats[idx];
  const now = new Date().toISOString();
  let touched = false;
  const messages = chat.messages.map((m) => {
    if (m.sender === "master" && !m.readAt) {
      touched = true;
      return { ...m, readAt: now, deliveredAt: m.deliveredAt ?? m.timestamp };
    }
    return m;
  });
  const hadUnread = (chat.customerUnread ?? 0) > 0;
  if (!touched && !hadUnread) return;
  chats[idx] = { ...chat, customerUnread: 0, messages };
  writeJSON(CHATS_KEY, chats);
}

/**
 * Total unread messages across all chats for the provider.
 */
export function getTotalProviderUnread(): number {
  return readJSON<Chat[]>(CHATS_KEY, []).reduce((s, c) => s + (c.providerUnread ?? 0), 0);
}

/**
 * Total unread messages across all chats that belong to this customer's requests.
 * Excludes chats with blocked providers (mirrors getChatsByCustomer filter).
 */
export function getTotalCustomerUnread(customerId: string): number {
  if (!customerId) return 0;
  const myRequestIds = new Set(getRequestsByCustomer(customerId).map((r) => r.id));
  const blocked = new Set(getBlockedUsers(customerId));
  return readJSON<Chat[]>(CHATS_KEY, [])
    .filter((c) => myRequestIds.has(c.requestId) && !blocked.has(c.masterId))
    .reduce((s, c) => s + (c.customerUnread ?? 0), 0);
}

/** Get the latest chat across all requests (for bottom nav redirect) */
export function getLatestChatId(): string | null {
  const chats = getChats();
  return chats.length > 0 ? chats[0].id : null;
}

/**
 * Soft-delete a message for both parties (only within the 5-minute window).
 * The message is kept in the list but marked with deletedForEveryone=true.
 * A placeholder is rendered in place of the content.
 */
export function deleteMessageForEveryone(chatId: string, messageId: string): boolean {
  const chats = readJSON<Chat[]>(CHATS_KEY, []);
  const idx = chats.findIndex((c) => c.id === chatId);
  if (idx === -1) return false;
  const chat = chats[idx];
  const msgIdx = chat.messages.findIndex((m) => m.id === messageId);
  if (msgIdx === -1) return false;
  const msg = chat.messages[msgIdx];
  if (msg.sender === "system" || msg.deletedForEveryone) return false;
  // Enforce 5-minute window in store (not just UI)
  if (Date.now() - new Date(msg.timestamp).getTime() > 5 * 60 * 1000) return false;
  const updated = [...chat.messages];
  updated[msgIdx] = { ...msg, deletedForEveryone: true, deletedAt: new Date().toISOString() };
  chats[idx] = { ...chat, messages: updated };
  writeJSON(CHATS_KEY, chats);
  emitStoreChange();
  return true;
}

/**
 * Hide a message from one user's view only. The other party is unaffected.
 * Works for both own messages (after 5-min window) and incoming messages.
 */
export function deleteMessageForMe(chatId: string, messageId: string, userId: string): boolean {
  const chats = readJSON<Chat[]>(CHATS_KEY, []);
  const idx = chats.findIndex((c) => c.id === chatId);
  if (idx === -1) return false;
  const chat = chats[idx];
  const msgIdx = chat.messages.findIndex((m) => m.id === messageId);
  if (msgIdx === -1) return false;
  const msg = chat.messages[msgIdx];
  if (msg.sender === "system") return false;
  if (msg.deletedForUsers?.includes(userId)) return false;
  const updated = [...chat.messages];
  updated[msgIdx] = { ...msg, deletedForUsers: [...(msg.deletedForUsers ?? []), userId] };
  chats[idx] = { ...chat, messages: updated };
  writeJSON(CHATS_KEY, chats);
  emitStoreChange();
  return true;
}

/**
 * Hard-delete a single non-system message (legacy — both sides lose it immediately).
 * Prefer deleteMessageForEveryone / deleteMessageForMe for new UI flows.
 */
export function deleteChatMessage(chatId: string, messageId: string): boolean {
  const chats = readJSON<Chat[]>(CHATS_KEY, []);
  const idx = chats.findIndex((c) => c.id === chatId);
  if (idx === -1) return false;
  const chat = chats[idx];
  const msg = chat.messages.find((m) => m.id === messageId);
  if (!msg || msg.sender === "system") return false;
  chats[idx] = { ...chat, messages: chat.messages.filter((m) => m.id !== messageId) };
  writeJSON(CHATS_KEY, chats);
  return true;
}

/* ─── Per-side chat clear ────────────────────────────────────────── */
const CHAT_CLEARED_KEY = "hormang_chat_cleared";

function readClearedMap(): Record<string, number> {
  return readJSON<Record<string, number>>(CHAT_CLEARED_KEY, {});
}

/**
 * Record the current timestamp as the "cleared at" marker for one side.
 * Messages older than (or equal to) this timestamp are hidden for that side only.
 * The underlying message data is NOT modified.
 */
export function clearChatForCustomer(chatId: string): void {
  const map = readClearedMap();
  map[`${chatId}_customer`] = Date.now();
  writeJSON(CHAT_CLEARED_KEY, map);
  emitStoreChange();
}

export function clearChatForProvider(chatId: string): void {
  const map = readClearedMap();
  map[`${chatId}_provider`] = Date.now();
  writeJSON(CHAT_CLEARED_KEY, map);
  emitStoreChange();
}

/** Returns the timestamp after which messages are visible for the given side (0 = show all). */
export function getChatClearedAt(chatId: string, side: "customer" | "provider"): number {
  return readClearedMap()[`${chatId}_${side}`] ?? 0;
}
