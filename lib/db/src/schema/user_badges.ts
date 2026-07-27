import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

/** Only admin-granted badge types live server-side. Auto-evaluated badges are
 * computed from still-local review/completion/tanga data (Phase D territory)
 * and stay in localStorage until that data moves too. */
export const adminBadgeTypeEnum = pgEnum("admin_badge_type", ["recommended_by_hormang", "under_review"]);

export const userBadgesTable = pgTable("user_badges", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: adminBadgeTypeEnum("type").notNull(),
  grantedAt: timestamp("granted_at").notNull().defaultNow(),
  grantedBy: text("granted_by").notNull(),
});

export type UserBadgeRow = typeof userBadgesTable.$inferSelect;
