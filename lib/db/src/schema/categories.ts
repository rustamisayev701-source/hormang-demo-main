import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const categoriesTable = pgTable("categories", {
  id: text("id").primaryKey(),
  nameUz: text("name_uz").notNull(),
  nameRu: text("name_ru"),
  nameEn: text("name_en"),
  descriptionUz: text("description_uz"),
  descriptionRu: text("description_ru"),
  descriptionEn: text("description_en"),
  emoji: text("emoji").notNull().default("📋"),
  icon: text("icon"),
  iconFamily: text("icon_family"),
  color: text("color").notNull().default("#3B82F6"),
  gradient: text("gradient"),
  baseCost: integer("base_cost").notNull().default(0),
  active: boolean("active").notNull().default(true),
  builtin: boolean("builtin").notNull().default(false),
  parentCategoryId: text("parent_category_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type CategoryRow = typeof categoriesTable.$inferSelect;
export type InsertCategoryRow = typeof categoriesTable.$inferInsert;
