import { Router, type IRouter } from "express";
import { eq, and, or, asc, inArray, sql } from "drizzle-orm";
import { db, chatsTable, chatMessagesTable, requestsTable, type ChatRow, type ChatMessageRow } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";

const router: IRouter = Router();

function chatJson(row: ChatRow) {
  return {
    ...row,
    customerClearedAt: row.customerClearedAt?.toISOString(),
    providerClearedAt: row.providerClearedAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}
function messageJson(row: ChatMessageRow) {
  return {
    id: row.id,
    chatId: row.chatId,
    sender: row.sender,
    text: row.text ?? undefined,
    attachment: row.attachmentUrl ? { type: row.attachmentType, url: row.attachmentUrl } : undefined,
    deliveredAt: row.deliveredAt?.toISOString(),
    readAt: row.readAt?.toISOString(),
    deletedForEveryone: row.deletedForEveryone,
    deletedAt: row.deletedAt?.toISOString(),
    deletedForUsers: row.deletedForUsers ?? [],
    createdAt: row.createdAt.toISOString(),
  };
}

/** Resolve the caller's role in a chat: "customer" (owns the request), "master"
 * (is the chat's provider), or null (no access). */
async function resolveRole(chat: { requestId: string; masterId: string }, userId: string): Promise<"customer" | "master" | null> {
  if (chat.masterId === userId) return "master";
  const [request] = await db.select().from(requestsTable).where(eq(requestsTable.id, chat.requestId)).limit(1);
  if (request?.customerId === userId) return "customer";
  return null;
}

// ─── GET /mine — every chat the authenticated user can see, as either side ─
router.get("/mine", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const myRequestIds = (await db.select({ id: requestsTable.id }).from(requestsTable).where(eq(requestsTable.customerId, userId))).map((r) => r.id);
    const rows = await db
      .select()
      .from(chatsTable)
      .where(or(eq(chatsTable.masterId, userId), myRequestIds.length ? inArray(chatsTable.requestId, myRequestIds) : sql`false`));
    res.json({ chats: rows.map(chatJson) });
  } catch (err) {
    console.error("List my chats error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

// ─── GET /by-pair/:requestId/:masterId — get-or-create a chat + its messages ─
router.get("/by-pair/:requestId/:masterId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const requestId: string = String(req.params.requestId);
    const masterId: string = String(req.params.masterId);

    let [chat] = await db.select().from(chatsTable).where(and(eq(chatsTable.requestId, requestId), eq(chatsTable.masterId, masterId))).limit(1);
    if (!chat) {
      const role = await resolveRole({ requestId, masterId }, req.user!.id);
      if (!role) {
        res.status(403).json({ error: "Ruxsat yo'q" });
        return;
      }
      [chat] = await db.insert(chatsTable).values({ requestId, masterId }).returning();
    } else if (!(await resolveRole(chat, req.user!.id))) {
      res.status(403).json({ error: "Ruxsat yo'q" });
      return;
    }

    const messages = await db.select().from(chatMessagesTable).where(eq(chatMessagesTable.chatId, chat.id)).orderBy(asc(chatMessagesTable.createdAt));
    res.json({ chat: chatJson(chat), messages: messages.map(messageJson) });
  } catch (err) {
    console.error("Get or create chat error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

// ─── POST /:chatId/messages — send a message ────────────────────────────────
router.post("/:chatId/messages", requireAuth, async (req: AuthRequest, res) => {
  try {
    const chatId: string = String(req.params.chatId);
    const { text, attachment } = req.body as { text?: string; attachment?: { type: "image" | "file"; url: string } };
    if (!text?.trim() && !attachment) {
      res.status(400).json({ error: "text yoki attachment talab qilinadi" });
      return;
    }
    const [chat] = await db.select().from(chatsTable).where(eq(chatsTable.id, chatId)).limit(1);
    if (!chat) {
      res.status(404).json({ error: "Chat topilmadi" });
      return;
    }
    const role = await resolveRole(chat, req.user!.id);
    if (!role) {
      res.status(403).json({ error: "Ruxsat yo'q" });
      return;
    }
    const sender = role === "master" ? "master" : "customer";

    const [message] = await db
      .insert(chatMessagesTable)
      .values({
        chatId, sender,
        text: text?.trim() || null,
        attachmentType: attachment?.type ?? null,
        attachmentUrl: attachment?.url ?? null,
        deliveredAt: new Date(),
      })
      .returning();

    await db
      .update(chatsTable)
      .set(sender === "master" ? { customerUnread: sql`${chatsTable.customerUnread} + 1` } : { providerUnread: sql`${chatsTable.providerUnread} + 1` })
      .where(eq(chatsTable.id, chatId));

    res.status(201).json({ message: messageJson(message) });
  } catch (err) {
    console.error("Send chat message error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

// ─── PATCH /:chatId/read — clear the caller's unread counter ───────────────
router.patch("/:chatId/read", requireAuth, async (req: AuthRequest, res) => {
  try {
    const chatId: string = String(req.params.chatId);
    const [chat] = await db.select().from(chatsTable).where(eq(chatsTable.id, chatId)).limit(1);
    if (!chat) {
      res.status(404).json({ error: "Chat topilmadi" });
      return;
    }
    const role = await resolveRole(chat, req.user!.id);
    if (!role) {
      res.status(403).json({ error: "Ruxsat yo'q" });
      return;
    }
    await db.update(chatsTable).set(role === "master" ? { providerUnread: 0 } : { customerUnread: 0 }).where(eq(chatsTable.id, chatId));
    const now = new Date();
    await db
      .update(chatMessagesTable)
      .set({ readAt: now })
      .where(and(eq(chatMessagesTable.chatId, chatId), sql`${chatMessagesTable.readAt} is null`));
    res.json({ ok: true });
  } catch (err) {
    console.error("Mark chat read error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

// ─── PATCH /:chatId/clear — set the caller's clear-chat watermark ──────────
router.patch("/:chatId/clear", requireAuth, async (req: AuthRequest, res) => {
  try {
    const chatId: string = String(req.params.chatId);
    const [chat] = await db.select().from(chatsTable).where(eq(chatsTable.id, chatId)).limit(1);
    if (!chat) {
      res.status(404).json({ error: "Chat topilmadi" });
      return;
    }
    const role = await resolveRole(chat, req.user!.id);
    if (!role) {
      res.status(403).json({ error: "Ruxsat yo'q" });
      return;
    }
    await db.update(chatsTable).set(role === "master" ? { providerClearedAt: new Date() } : { customerClearedAt: new Date() }).where(eq(chatsTable.id, chatId));
    res.json({ ok: true });
  } catch (err) {
    console.error("Clear chat error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

// ─── DELETE /messages/:messageId — delete for everyone (own msg) or for me ─
router.delete("/messages/:messageId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const messageId: string = String(req.params.messageId);
    const mode = (req.query.mode === "everyone" ? "everyone" : "me") as "everyone" | "me";
    const [message] = await db.select().from(chatMessagesTable).where(eq(chatMessagesTable.id, messageId)).limit(1);
    if (!message) {
      res.status(404).json({ error: "Xabar topilmadi" });
      return;
    }
    const [chat] = await db.select().from(chatsTable).where(eq(chatsTable.id, message.chatId)).limit(1);
    if (!chat) {
      res.status(404).json({ error: "Chat topilmadi" });
      return;
    }
    const role = await resolveRole(chat, req.user!.id);
    if (!role) {
      res.status(403).json({ error: "Ruxsat yo'q" });
      return;
    }

    if (mode === "everyone") {
      const isOwnMessage = (role === "master" && message.sender === "master") || (role === "customer" && message.sender === "customer");
      if (!isOwnMessage) {
        res.status(403).json({ error: "Faqat o'z xabaringizni hammaga o'chira olasiz" });
        return;
      }
      await db.update(chatMessagesTable).set({ deletedForEveryone: true, deletedAt: new Date(), text: null, attachmentUrl: null, attachmentType: null }).where(eq(chatMessagesTable.id, messageId));
    } else {
      const nextDeletedFor = [...(message.deletedForUsers ?? [])];
      if (!nextDeletedFor.includes(req.user!.id)) nextDeletedFor.push(req.user!.id);
      await db.update(chatMessagesTable).set({ deletedForUsers: nextDeletedFor }).where(eq(chatMessagesTable.id, messageId));
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete chat message error:", err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

export default router;
