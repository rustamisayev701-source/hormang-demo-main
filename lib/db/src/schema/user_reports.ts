import { pgTable, text, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const reportReasonEnum = pgEnum("report_reason", [
  "spam", "fake_profile", "abuse", "fraud", "inappropriate_content", "outside_contact", "other",
]);
export const reportStatusEnum = pgEnum("report_status", ["new", "in_review", "resolved", "dismissed"]);

export const userReportsTable = pgTable("user_reports", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  reporterUserId: text("reporter_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  reportedUserId: text("reported_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  reason: reportReasonEnum("reason").notNull(),
  description: text("description"),
  attachments: jsonb("attachments").$type<string[]>().default([]),
  status: reportStatusEnum("status").notNull().default("new"),
  adminNote: text("admin_note"),
  source: text("source").default("profile"),
  chatId: text("chat_id"),
  lastMessageId: text("last_message_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type UserReportRow = typeof userReportsTable.$inferSelect;
