/**
 * chat-socket.ts
 * Real-time push for an open chat conversation. Falls back gracefully —
 * callers should keep a slow polling interval running alongside this as a
 * safety net for the rare case a socket silently drops (mobile background,
 * flaky network) without firing a close event.
 */
import { toChatMessage, type ChatMessage } from "./requests-store";
import type { BackendChatMessage } from "./requests-client";

// Duplicated from api-client.ts's TOKEN_KEY on purpose — see that file's own
// comment for why (avoids a circular import).
const TOKEN_KEY = "hormang_access_token";

export interface ChatSocketHandlers {
  onMessage: (message: ChatMessage) => void;
  onRead: (readAt: string) => void;
}

export interface ChatSocketHandle {
  close: () => void;
}

function wsBaseUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/api/ws/chat`;
}

/** Opens a socket, joins `chatId`, and wires the given handlers. Auto-reconnects
 * with backoff until `close()` is called. */
export function openChatSocket(chatId: string, handlers: ChatSocketHandlers): ChatSocketHandle {
  let ws: WebSocket | null = null;
  let closed = false;
  let retryDelay = 1000;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  function connect() {
    if (closed) return;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    ws = new WebSocket(`${wsBaseUrl()}?token=${encodeURIComponent(token)}`);

    ws.onopen = () => {
      retryDelay = 1000;
      ws?.send(JSON.stringify({ type: "join", chatId }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as
          | { type: "message"; message: BackendChatMessage }
          | { type: "read"; readAt: string };
        if (data.type === "message") handlers.onMessage(toChatMessage(data.message));
        else if (data.type === "read") handlers.onRead(data.readAt);
      } catch {
        /* ignore malformed frame */
      }
    };

    ws.onclose = () => {
      if (closed) return;
      retryTimer = setTimeout(connect, retryDelay);
      retryDelay = Math.min(retryDelay * 2, 15000);
    };

    ws.onerror = () => {
      ws?.close();
    };
  }

  connect();

  return {
    close: () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (ws) {
        try {
          ws.send(JSON.stringify({ type: "leave", chatId }));
        } catch {
          /* socket may already be closed */
        }
        ws.close();
      }
    },
  };
}
