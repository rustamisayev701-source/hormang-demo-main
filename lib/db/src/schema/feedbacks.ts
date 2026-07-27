import { pgTable, text, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const feedbackTypeEnum = pgEnum("feedback_type", ["problem", "complaint", "suggestion"]);
export const feedbackStatusEnum = pgEnum("feedback_status", ["new", "in_review", "resolved", "rejected"]);
export const feedbackPriorityEnum = pgEnum("feedback_priority", ["low", "medium", "high"]);

export const feedbacksTable = pgTable("feedbacks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  userRole: text("user_role").notNull(),
  type: feedbackTypeEnum("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  problemArea: text("problem_area"),
  suggestionCategory: text("suggestion_category"),
  relatedRequestId: text("related_request_id"),
  attachments: jsonb("attachments").$type<string[]>().default([]),
  status: feedbackStatusEnum("status").notNull().default("new"),
  priority: feedbackPriorityEnum("priority").notNull().default("medium"),
  adminNote: text("admin_note"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type FeedbackRow = typeof feedbacksTable.$inferSelect;
