import { pgTable, text, timestamp, jsonb, boolean, integer, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { requestsTable } from "./requests";

export const chatSenderEnum = pgEnum("chat_sender", ["customer", "master", "system"]);

export const chatsTable = pgTable("chats", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  requestId: text("request_id").notNull().references(() => requestsTable.id, { onDelete: "cascade" }),
  masterId: text("master_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  providerUnread: integer("provider_unread").notNull().default(0),
  customerUnread: integer("customer_unread").notNull().default(0),
  customerClearedAt: timestamp("customer_cleared_at"),
  providerClearedAt: timestamp("provider_cleared_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("chats_request_master_idx").on(t.requestId, t.masterId)]);

export const chatMessagesTable = pgTable("chat_messages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  chatId: text("chat_id").notNull().references(() => chatsTable.id, { onDelete: "cascade" }),
  sender: chatSenderEnum("sender").notNull(),
  text: text("text"),
  attachmentType: text("attachment_type"),
  attachmentUrl: text("attachment_url"),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  deletedForEveryone: boolean("deleted_for_everyone").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  deletedForUsers: jsonb("deleted_for_users").$type<string[]>().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ChatRow = typeof chatsTable.$inferSelect;
export type ChatMessageRow = typeof chatMessagesTable.$inferSelect;
