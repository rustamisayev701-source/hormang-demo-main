import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const telegramLinksTable = pgTable("telegram_links", {
  userId: text("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  chatId: text("chat_id").notNull().unique(),
  phone: text("phone").notNull(),
  linkedAt: timestamp("linked_at").notNull().defaultNow(),
});

export type TelegramLink = typeof telegramLinksTable.$inferSelect;
export type InsertTelegramLink = typeof telegramLinksTable.$inferInsert;
