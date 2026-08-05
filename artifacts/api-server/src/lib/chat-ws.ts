import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { eq } from "drizzle-orm";
import { db, chatsTable, requestsTable } from "@workspace/db";
import { verifyAccessToken } from "./auth.js";

interface Client {
  ws: WebSocket;
  userId: string;
  chatIds: Set<string>;
}

/** chatId → every connected client currently viewing that chat. */
const subscribersByChat = new Map<string, Set<Client>>();

async function canAccessChat(chatId: string, userId: string): Promise<boolean> {
  const [chat] = await db.select().from(chatsTable).where(eq(chatsTable.id, chatId)).limit(1);
  if (!chat) return false;
  if (chat.masterId === userId) return true;
  const [request] = await db
    .select({ customerId: requestsTable.customerId })
    .from(requestsTable)
    .where(eq(requestsTable.id, chat.requestId))
    .limit(1);
  return request?.customerId === userId;
}

function subscribe(chatId: string, client: Client): void {
  client.chatIds.add(chatId);
  if (!subscribersByChat.has(chatId)) subscribersByChat.set(chatId, new Set());
  subscribersByChat.get(chatId)!.add(client);
}

function unsubscribe(chatId: string, client: Client): void {
  client.chatIds.delete(chatId);
  const set = subscribersByChat.get(chatId);
  set?.delete(client);
  if (set && set.size === 0) subscribersByChat.delete(chatId);
}

/** Push an event to every other client currently viewing this chat. */
export function broadcastToChat(chatId: string, payload: unknown, excludeUserId?: string): void {
  const subs = subscribersByChat.get(chatId);
  if (!subs || subs.size === 0) return;
  const data = JSON.stringify(payload);
  for (const client of subs) {
    if (excludeUserId && client.userId === excludeUserId) continue;
    if (client.ws.readyState === WebSocket.OPEN) client.ws.send(data);
  }
}

export function attachChatWebSocket(server: Server): void {
  const wss = new WebSocketServer({ server, path: "/api/ws/chat" });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url ?? "", "http://internal");
    const token = url.searchParams.get("token") ?? "";

    let userId: string;
    try {
      const payload = verifyAccessToken(token);
      if (typeof payload.sub !== "string") throw new Error("no sub");
      userId = payload.sub;
    } catch {
      ws.close(4001, "unauthorized");
      return;
    }

    const client: Client = { ws, userId, chatIds: new Set() };

    ws.on("message", (raw) => {
      (async () => {
        let msg: { type?: string; chatId?: string };
        try {
          msg = JSON.parse(raw.toString());
        } catch {
          return;
        }
        if (msg.type === "join" && typeof msg.chatId === "string") {
          if (await canAccessChat(msg.chatId, userId)) subscribe(msg.chatId, client);
        } else if (msg.type === "leave" && typeof msg.chatId === "string") {
          unsubscribe(msg.chatId, client);
        }
      })().catch(() => {});
    });

    ws.on("close", () => {
      for (const chatId of client.chatIds) unsubscribe(chatId, client);
    });
  });
}
