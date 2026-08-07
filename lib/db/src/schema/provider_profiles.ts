import { pgTable, text, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** Minimal local mirrors of the frontend's ProviderServiceArea/PortfolioAlbum
 * shapes (lib/local-profile.ts) — kept structural-only here since lib/db
 * must not depend on the frontend package. */
interface ServiceAreaJson {
  toshkent_city: { all: boolean; districts: string[] };
  toshkent_region: { all: boolean; cities: string[] };
}
interface PortfolioAlbumJson {
  id: string;
  title: string;
  photos: { url: string; caption?: string }[];
  coverIdx?: number;
}

export const providerProfilesTable = pgTable("provider_profiles", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }).unique(),
  categories: jsonb("categories").notNull().$type<string[]>().default([]),
  bio: text("bio"),
  portfolioImages: jsonb("portfolio_images").$type<string[]>().default([]),
  workingHours: text("working_hours"),
  preferredLocation: text("preferred_location"),
  isVerified: boolean("is_verified").notNull().default(false),
  photoUrl: text("photo_url"),
  experience: integer("experience"),
  region: text("region"),
  district: text("district"),
  serviceAreaV2: jsonb("service_area_v2").$type<ServiceAreaJson>(),
  albums: jsonb("albums").$type<PortfolioAlbumJson[]>(),
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
