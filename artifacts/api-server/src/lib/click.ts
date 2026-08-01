import { and, eq } from "drizzle-orm";
import {
  db,
  paymentOrdersTable,
  pricingTiersTable,
  walletsTable,
  tangaTransactionsTable,
  type PaymentOrder,
} from "@workspace/db";
import crypto from "crypto";
import { getClickWebhookConfig, getClickCheckoutConfig, env } from "./env.js";

/** Click's own documented Shop API error codes. */
const ClickError = {
  Success: 0,
  SignFailed: -1,
  InvalidAmount: -2,
  ActionNotFound: -3,
  AlreadyPaid: -4,
  UserNotFound: -5,
  TransactionNotFound: -6,
  TransactionCanceled: -9,
} as const;

export interface ClickRequestBody {
  click_trans_id?: string;
  service_id?: string;
  click_paydoc_id?: string;
  merchant_trans_id?: string;
  merchant_prepare_id?: string;
  amount?: string;
  action?: string;
  error?: string;
  error_note?: string;
  sign_time?: string;
  sign_string?: string;
}

/** Builds the redirect URL for Click's hosted checkout page (my.click.uz/services/pay). */
export function buildClickCheckoutUrl(order: Pick<PaymentOrder, "id" | "amountSom">): string {
  const { merchantId, merchantUserId, serviceId } = getClickCheckoutConfig();
  const params = new URLSearchParams({
    merchant_id: merchantId,
    merchant_user_id: merchantUserId,
    service_id: serviceId,
    transaction_param: order.id,
    amount: String(order.amountSom),
    return_url: `${env.appBaseUrl}/wallet/return`,
  });
  return `https://my.click.uz/services/pay?${params.toString()}`;
}

/**
 * Click's own signature scheme: md5(click_trans_id + service_id + SECRET_KEY +
 * merchant_trans_id + merchant_prepare_id[Complete only] + amount + action + sign_time).
 * Cross-checked against Click's official click-integration-php reference and two
 * independent community implementations — all three agree on this exact formula.
 */
function verifyClickSignature(body: ClickRequestBody): boolean {
  const { secretKey } = getClickWebhookConfig();
  const prepareId = body.action === "1" ? (body.merchant_prepare_id ?? "") : "";
  const raw = `${body.click_trans_id}${body.service_id}${secretKey}${body.merchant_trans_id}${prepareId}${body.amount}${body.action}${body.sign_time}`;
  const expected = crypto.createHash("md5").update(raw).digest("hex");
  return expected === body.sign_string;
}

async function findOrder(orderId: string | undefined): Promise<PaymentOrder | null> {
  if (!orderId) return null;
  const [order] = await db
    .select()
    .from(paymentOrdersTable)
    .where(and(eq(paymentOrdersTable.id, orderId), eq(paymentOrdersTable.provider, "click")))
    .limit(1);
  return order ?? null;
}

export async function handleClickPrepare(body: ClickRequestBody) {
  if (!verifyClickSignature(body)) {
    return { error: ClickError.SignFailed, error_note: "SIGN CHECK FAILED!" };
  }
  if (body.action !== "0") {
    return { error: ClickError.ActionNotFound, error_note: "Action not found" };
  }

  const order = await findOrder(body.merchant_trans_id);
  if (!order) {
    return { error: ClickError.UserNotFound, error_note: "User does not exist" };
  }
  if (order.status === "cancelled" || order.status === "failed") {
    return { error: ClickError.TransactionCanceled, error_note: "Transaction cancelled" };
  }
  if (order.status === "paid") {
    return { error: ClickError.AlreadyPaid, error_note: "Already paid" };
  }
  // A different click_trans_id already claimed this order — refuse either way,
  // same reasoning as Payme's CreateTransaction "already occupied" check.
  if (order.providerTransactionId && order.providerTransactionId !== body.click_trans_id) {
    return { error: ClickError.AlreadyPaid, error_note: "Already paid" };
  }
  if (Number(body.amount) !== order.amountSom) {
    return { error: ClickError.InvalidAmount, error_note: "Incorrect parameter amount" };
  }

  await db
    .update(paymentOrdersTable)
    .set({ providerTransactionId: body.click_trans_id, updatedAt: new Date() })
    .where(eq(paymentOrdersTable.id, order.id));

  return {
    click_trans_id: body.click_trans_id,
    merchant_trans_id: body.merchant_trans_id,
    // No separate auto-increment prepare table — the order's own id already
    // uniquely identifies it, so it doubles as merchant_prepare_id.
    merchant_prepare_id: order.id,
    error: ClickError.Success,
    error_note: "Success",
  };
}

export async function handleClickComplete(body: ClickRequestBody) {
  if (!verifyClickSignature(body)) {
    return { error: ClickError.SignFailed, error_note: "SIGN CHECK FAILED!" };
  }
  if (body.action !== "1") {
    return { error: ClickError.ActionNotFound, error_note: "Action not found" };
  }

  const order = await findOrder(body.merchant_trans_id);
  if (!order) {
    return { error: ClickError.UserNotFound, error_note: "User does not exist" };
  }
  if (body.merchant_prepare_id !== order.id || order.providerTransactionId !== body.click_trans_id) {
    return { error: ClickError.TransactionNotFound, error_note: "Transaction does not exist" };
  }

  // Click itself is reporting a failure (e.g. the user backed out) — acknowledge
  // by cancelling our side rather than crediting anything.
  if (Number(body.error) < 0) {
    if (order.status === "pending") {
      await db
        .update(paymentOrdersTable)
        .set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() })
        .where(eq(paymentOrdersTable.id, order.id));
    }
    return { error: ClickError.TransactionCanceled, error_note: "Transaction cancelled" };
  }

  if (order.status === "paid") {
    // Idempotent retry of an already-completed transaction.
    return {
      click_trans_id: body.click_trans_id,
      merchant_trans_id: body.merchant_trans_id,
      merchant_confirm_id: order.id,
      error: ClickError.Success,
      error_note: "Success",
    };
  }
  if (order.status !== "pending") {
    return { error: ClickError.TransactionCanceled, error_note: "Transaction cancelled" };
  }
  if (Number(body.amount) !== order.amountSom) {
    return { error: ClickError.InvalidAmount, error_note: "Incorrect parameter amount" };
  }

  const performedAt = new Date();
  await db.transaction(async (tx) => {
    const [tier] = await tx
      .select()
      .from(pricingTiersTable)
      .where(eq(pricingTiersTable.id, order.tierId))
      .limit(1);
    if (!tier) throw new Error("Tarif topilmadi");

    const credited = tier.credits + tier.bonusTokens;

    const [existingWallet] = await tx
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.userId, order.userId))
      .limit(1);

    if (existingWallet) {
      await tx
        .update(walletsTable)
        .set({ balance: existingWallet.balance + credited, updatedAt: new Date() })
        .where(eq(walletsTable.userId, order.userId));
    } else {
      await tx.insert(walletsTable).values({ userId: order.userId, balance: credited });
    }

    await tx.insert(tangaTransactionsTable).values({
      userId: order.userId,
      orderId: order.id,
      type: "purchase",
      direction: "in",
      amount: credited,
      priceSom: order.amountSom,
      description: `${tier.nameUz} — Click orqali sotib olindi`,
    });

    await tx
      .update(paymentOrdersTable)
      .set({ status: "paid", performedAt, updatedAt: new Date() })
      .where(eq(paymentOrdersTable.id, order.id));
  });

  return {
    click_trans_id: body.click_trans_id,
    merchant_trans_id: body.merchant_trans_id,
    merchant_confirm_id: order.id,
    error: ClickError.Success,
    error_note: "Success",
  };
}
