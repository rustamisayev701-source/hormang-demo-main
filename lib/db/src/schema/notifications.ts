import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const notificationsTable = pgTable("notifications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id"), // null if targeted by role/all
  target: text("target").notNull().default("all"), // "all" | "providers" | "customers"
  announcementId: text("announcement_id"),
  type: text("type").notNull().default("news"), // "news" | "event" | "system" | "offer" | "request"
  titleUz: text("title_uz").notNull(),
  titleRu: text("title_ru"),
  titleEn: text("title_en"),
  contentUz: text("content_uz").notNull(),
  contentRu: text("content_ru"),
  contentEn: text("content_en"),
  ctaTextUz: text("cta_text_uz"),
  ctaTextRu: text("cta_text_ru"),
  ctaTextEn: text("cta_text_en"),
  ctaLink: text("cta_link"),
  image: text("image"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type NotificationRow = typeof notificationsTable.$inferSelect;
