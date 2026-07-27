import { pgTable, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { paymentOrdersTable } from "./payment_orders";

export const tangaTransactionTypeEnum = pgEnum("tanga_transaction_type", [
  "purchase",
  "spend",
  "referral",
  "refund",
  "admin_adjustment",
  "profile_completion_reward",
]);

export const tangaTransactionDirectionEnum = pgEnum("tanga_transaction_direction", ["in", "out"]);

export const tangaTransactionsTable = pgTable("tanga_transactions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  orderId: text("order_id").references(() => paymentOrdersTable.id),
  type: tangaTransactionTypeEnum("type").notNull(),
  direction: tangaTransactionDirectionEnum("direction").notNull(),
  amount: integer("amount").notNull(),
  priceSom: integer("price_som"),
  description: text("description"),
  /** Informational only (no FK) — a financial ledger row must survive the
   * offer/request it references being deleted. */
  offerId: text("offer_id"),
  requestId: text("request_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type TangaTransaction = typeof tangaTransactionsTable.$inferSelect;
export type InsertTangaTransaction = typeof tangaTransactionsTable.$inferInsert;
