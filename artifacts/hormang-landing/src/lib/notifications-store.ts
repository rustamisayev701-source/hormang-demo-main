import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { adminFetch } from "@/lib/admin-client";
import { getSettingsPrefs } from "./settings-prefs-store";
import { getLocalizedText, type LocalizedText } from "@/lib/localization";

export interface AppNotification {
  id: string;
  userId?: string;
  target: "all" | "providers" | "customers";
  announcementId?: string;
  type: "news" | "event" | "system" | "offer" | "request";
  title: string;
  titleLocalized?: LocalizedText;
  content: string;
  contentLocalized?: LocalizedText;
  ctaText?: string;
  ctaTextLocalized?: LocalizedText;
  ctaLink?: string;
  image?: string;
  isRead: boolean;
  createdAt: string;
}

let notificationCache: AppNotification[] = [];

function emitNotificationChange() {
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("hormang:notifications-change"));
    } catch {
      /* noop */
    }
  }
}

export async function fetchUserNotifications(
  role: string = "all",
  userId?: string
): Promise<AppNotification[]> {
  try {
    const prefs = getSettingsPrefs();
    if (!prefs.notifApp) {
      notificationCache = [];
      emitNotificationChange();
      return [];
    }

    const query = new URLSearchParams();
    if (role) query.set("role", role);
    if (userId) query.set("userId", userId);

    const res = await apiFetch<{ notifications: AppNotification[] }>(
      `/notifications?${query.toString()}`,
      { auth: false }
    );
    notificationCache = res.notifications || [];
    emitNotificationChange();
    return notificationCache;
  } catch (err) {
    console.warn("Failed to fetch user notifications:", err);
    return notificationCache;
  }
}

export async function markNotificationAsRead(id: string): Promise<void> {
  try {
    await apiFetch(`/notifications/${id}/read`, { method: "PATCH", auth: false });
    notificationCache = notificationCache.map((n) =>
      n.id === id ? { ...n, isRead: true } : n
    );
    emitNotificationChange();
  } catch (err) {
    console.error("Mark notification read error:", err);
  }
}

export async function markAllNotificationsAsRead(): Promise<void> {
  try {
    await apiFetch(`/notifications/read-all`, { method: "POST", auth: false });
    notificationCache = notificationCache.map((n) => ({ ...n, isRead: true }));
    emitNotificationChange();
  } catch (err) {
    console.error("Mark all notifications read error:", err);
  }
}

export async function sendAdminNotification(data: {
  userId?: string;
  target?: "all" | "providers" | "customers";
  type?: "news" | "event" | "system";
  titleUz: string;
  titleRu?: string;
  titleEn?: string;
  contentUz: string;
  contentRu?: string;
  contentEn?: string;
  ctaTextUz?: string;
  ctaTextRu?: string;
  ctaTextEn?: string;
  ctaLink?: string;
}): Promise<void> {
  await adminFetch("/notifications/send", { method: "POST", body: data });
}

export function useNotifications(role: string = "all", userId?: string) {
  const [notifications, setNotifications] = useState<AppNotification[]>(
    () => notificationCache
  );

  const load = () => {
    fetchUserNotifications(role, userId).then(setNotifications);
  };

  useEffect(() => {
    load();

    const onChange = () => {
      const prefs = getSettingsPrefs();
      if (!prefs.notifApp) {
        setNotifications([]);
      } else {
        setNotifications([...notificationCache]);
      }
    };

    window.addEventListener("hormang:notifications-change", onChange);
    window.addEventListener("hormang:settings-prefs-change", onChange);

    return () => {
      window.removeEventListener("hormang:notifications-change", onChange);
      window.removeEventListener("hormang:settings-prefs-change", onChange);
    };
  }, [role, userId]);

  const prefs = getSettingsPrefs();
  const activeNotifications = prefs.notifApp ? notifications : [];
  const unreadCount = activeNotifications.filter((n) => !n.isRead).length;

  return {
    notifications: activeNotifications,
    unreadCount,
    reload: load,
    markAsRead: markNotificationAsRead,
    markAllAsRead: markAllNotificationsAsRead,
  };
}
