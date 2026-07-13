import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const pricingTiersTable = pgTable("pricing_tiers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  key: text("key").notNull().unique(),
  nameUz: text("name_uz").notNull(),
  nameRu: text("name_ru").notNull(),
  credits: integer("credits").notNull(),
  bonusTokens: integer("bonus_tokens").notNull().default(0),
  priceSom: integer("price_som").notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPricingTierSchema = createInsertSchema(pricingTiersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectPricingTierSchema = createSelectSchema(pricingTiersTable);

export type InsertPricingTier = typeof pricingTiersTable.$inferInsert;
export type PricingTier = typeof pricingTiersTable.$inferSelect;
