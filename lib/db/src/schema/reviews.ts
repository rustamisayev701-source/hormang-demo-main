import { pgTable, text, integer, timestamp, pgEnum, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { requestsTable } from "./requests";
import { offersTable } from "./offers";

export const reviewRoleEnum = pgEnum("review_role", ["customer", "provider"]);

export const reviewsTable = pgTable("reviews", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  requestId: text("request_id").notNull().references(() => requestsTable.id, { onDelete: "cascade" }),
  offerId: text("offer_id").references(() => offersTable.id, { onDelete: "set null" }),
  reviewerId: text("reviewer_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  reviewerRole: reviewRoleEnum("reviewer_role").notNull(),
  reviewedId: text("reviewed_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  reviewedRole: reviewRoleEnum("reviewed_role").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  photoUrl: text("photo_url"),
  /** Only set when reviewedRole === "provider". */
  serviceQuality: integer("service_quality"),
  providerAttitude: integer("provider_attitude"),
  servicePrice: integer("service_price"),
  platformSentiment: text("platform_sentiment"),
  platformFeedback: text("platform_feedback"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  // One review per (request, reviewer) — mirrors the old hasReviewedRequest() guard.
  unique().on(table.requestId, table.reviewerId),
]);

export type Review = typeof reviewsTable.$inferSelect;
export type InsertReview = typeof reviewsTable.$inferInsert;
