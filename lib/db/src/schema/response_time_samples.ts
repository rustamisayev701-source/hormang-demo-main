import { pgTable, text, real, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { chatsTable } from "./chats";

/**
 * One sample per reply: how long `userId` took to answer the oldest
 * unanswered incoming message in a chat. Written server-side at message-send
 * time (see POST /chats/:chatId/messages) — event-sourced running total, same
 * shape as tanga_transactions, so the average is just SUM(minutes)/COUNT(*).
 */
export const responseTimeSamplesTable = pgTable("response_time_samples", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  chatId: text("chat_id").notNull().references(() => chatsTable.id, { onDelete: "cascade" }),
  minutes: real("minutes").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ResponseTimeSample = typeof responseTimeSamplesTable.$inferSelect;
