import { pgTable, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const providerProfilesTable = pgTable("provider_profiles", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }).unique(),
  categories: jsonb("categories").notNull().$type<string[]>().default([]),
  bio: text("bio"),
  portfolioImages: jsonb("portfolio_images").$type<string[]>().default([]),
  workingHours: text("working_hours"),
  preferredLocation: text("preferred_location"),
  isVerified: boolean("is_verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProviderProfileSchema = createInsertSchema(providerProfilesTable).omit({
  id: true,
  isVerified: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProviderProfile = z.infer<typeof insertProviderProfileSchema>;
export type ProviderProfile = typeof providerProfilesTable.$inferSelect;
