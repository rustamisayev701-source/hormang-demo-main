import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

/** Singleton table (always exactly one row, id="singleton") for the shared applies-to-every-category question set. */
export const commonQuestionsTable = pgTable("common_questions", {
  id: text("id").primaryKey().default("singleton"),
  questions: jsonb("questions").notNull().$type<unknown[]>().default([]),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type CommonQuestionsRow = typeof commonQuestionsTable.$inferSelect;
export type InsertCommonQuestionsRow = typeof commonQuestionsTable.$inferInsert;
