import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const walletsTable = pgTable("wallets", {
  userId: text("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  balance: integer("balance").notNull().default(0),
  /** Last balance threshold (10 or 5) a low-balance Telegram alert was sent for; null once balance recovers above 10. */
  lastLowBalanceAlertThreshold: integer("last_low_balance_alert_threshold"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Wallet = typeof walletsTable.$inferSelect;
export type InsertWallet = typeof walletsTable.$inferInsert;
