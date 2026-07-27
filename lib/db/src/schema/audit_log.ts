import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const auditLogTable = pgTable("audit_log", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  actorId: text("actor_id").notNull(),
  actorRole: text("actor_role").notNull(),
  action: text("action").notNull(),
  category: text("category").notNull(),
  targetId: text("target_id"),
  targetType: text("target_type"),
  description: text("description").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AuditLogRow = typeof auditLogTable.$inferSelect;
