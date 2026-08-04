import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const referralsTable = pgTable("referrals", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  referrerId: text("referrer_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  /** One reward per invitee, ever — the unique constraint is the idempotency guard. */
  inviteeId: text("invitee_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }).unique(),
  rewarded: boolean("rewarded").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Referral = typeof referralsTable.$inferSelect;
export type InsertReferral = typeof referralsTable.$inferInsert;
