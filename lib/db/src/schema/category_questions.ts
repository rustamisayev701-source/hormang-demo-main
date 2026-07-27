import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { categoriesTable } from "./categories";

export const categoryQuestionsTable = pgTable("category_questions", {
  categoryId: text("category_id")
    .primaryKey()
    .references(() => categoriesTable.id, { onDelete: "cascade" }),
  /** Array of `Question` objects (deeply nested, self-referential via conditionalBranches) — stored as-is, matching the shape already used client-side. */
  questions: jsonb("questions").notNull().$type<unknown[]>().default([]),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type CategoryQuestionsRow = typeof categoryQuestionsTable.$inferSelect;
export type InsertCategoryQuestionsRow = typeof categoryQuestionsTable.$inferInsert;
