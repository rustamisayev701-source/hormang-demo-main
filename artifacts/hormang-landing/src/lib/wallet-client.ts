import { apiFetch } from "./api-client";

export interface WalletTier {
  id: string;
  key: string;
  nameUz: string;
  nameRu: string;
  credits: number;
  bonusTokens: number;
  priceSom: number;
  active: boolean;
  sortOrder: number;
}

export interface WalletOrder {
  id: string;
  userId: string;
  tierId: string;
  provider: "payme" | "click";
  amountSom: number;
  status: "pending" | "paid" | "cancelled" | "failed";
  providerTransactionId: string | null;
  performedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function getWallet(): Promise<{ balance: number; tiers: WalletTier[] }> {
  return apiFetch("/wallet");
}

export function createWalletOrder(
  tierId: string,
  provider: "payme" | "click" = "payme"
): Promise<{ orderId: string; checkoutUrl: string }> {
  return apiFetch("/wallet/orders", { method: "POST", body: { tierId, provider } });
}

export function getWalletOrder(orderId: string): Promise<{ order: WalletOrder; tier: WalletTier }> {
  return apiFetch(`/wallet/orders/${orderId}`);
}

/* ─── Local mirror bookkeeping ──────────────────────────────────────────────
 * The rest of the app (offer spending, Tanga history, badges, admin panel)
 * still reads/writes the localStorage balance from tanga-store.ts — that
 * whole spend-side economy has no backend yet. Once a Payme order is
 * confirmed paid (verified server-side via the webhook, not by the client),
 * the wallet return page mirrors the credit into that local balance so the
 * rest of the app keeps working unchanged. This flag just prevents mirroring
 * the same paid order twice if the user revisits the return page. */
const SYNCED_ORDERS_KEY = "hormang_wallet_synced_orders";

export function isOrderSynced(orderId: string): boolean {
  try {
    const ids = JSON.parse(localStorage.getItem(SYNCED_ORDERS_KEY) ?? "[]") as string[];
    return ids.includes(orderId);
  } catch {
    return false;
  }
}

export function markOrderSynced(orderId: string): void {
  try {
    const ids = JSON.parse(localStorage.getItem(SYNCED_ORDERS_KEY) ?? "[]") as string[];
    if (!ids.includes(orderId)) {
      ids.push(orderId);
      localStorage.setItem(SYNCED_ORDERS_KEY, JSON.stringify(ids));
    }
  } catch {
    localStorage.setItem(SYNCED_ORDERS_KEY, JSON.stringify([orderId]));
  }
}
