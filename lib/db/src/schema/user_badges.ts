import { pgTable, text, timestamp, pgEnum, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

/** All badge types, admin-granted and auto-evaluated alike — both now live
 * server-side (see `source`) so a badge is visible to every viewer/device,
 * not just the browser that computed it. Enum kept under its original
 * Postgres type name ("admin_badge_type") for a purely-additive migration. */
export const badgeTypeEnum = pgEnum("admin_badge_type", [
  "recommended_by_hormang", "under_review",
  "top_provider", "trusted_provider", "verified",
  "experienced_provider", "premium_provider", "strong_portfolio",
]);

export const badgeSourceEnum = pgEnum("badge_source", ["admin", "auto"]);

export const userBadgesTable = pgTable("user_badges", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: badgeTypeEnum("type").notNull(),
  /** "admin" — hand-granted via the admin panel. "auto" — computed by the
   * client from the owner's own data and synced via POST /badges/sync. */
  source: badgeSourceEnum("source").notNull().default("admin"),
  grantedAt: timestamp("granted_at").notNull().defaultNow(),
  grantedBy: text("granted_by").notNull(),
}, (table) => [
  unique().on(table.userId, table.type),
]);

export type UserBadgeRow = typeof userBadgesTable.$inferSelect;
