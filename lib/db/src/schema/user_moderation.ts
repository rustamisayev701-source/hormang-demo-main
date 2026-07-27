import { pgTable, text, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export interface AdminNote {
  text: string;
  at: string;
}

export const userModerationTable = pgTable("user_moderation", {
  userId: text("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  suspended: boolean("suspended").notNull().default(false),
  verified: boolean("verified").notNull().default(false),
  flagCount: integer("flag_count").notNull().default(0),
  tags: jsonb("tags").notNull().$type<string[]>().default([]),
  adminNotes: jsonb("admin_notes").notNull().$type<AdminNote[]>().default([]),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type UserModerationRow = typeof userModerationTable.$inferSelect;
export type InsertUserModerationRow = typeof userModerationTable.$inferInsert;
