import { useState, useRef, useEffect } from "react";
import { Bell, CheckCheck, Sparkles, Calendar, Newspaper, ExternalLink, X, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications, type AppNotification } from "@/lib/notifications-store";
import { useI18n } from "@/contexts/i18n-context";
import { getLocalizedText } from "@/lib/localization";
import { useLocation } from "wouter";

interface NotificationBellProps {
  role?: string;
  userId?: string;
  className?: string;
}

export function NotificationBell({ role = "all", userId, className = "" }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(role, userId);
  const { t, locale } = useI18n();
  const [, setLocation] = useLocation();
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const filtered = tab === "unread" ? notifications.filter((n) => !n.isRead) : notifications;

  const handleNotificationClick = (n: AppNotification) => {
    if (!n.isRead) {
      markAsRead(n.id);
    }
    if (n.ctaLink) {
      if (n.ctaLink.startsWith("http://") || n.ctaLink.startsWith("https://")) {
        window.open(n.ctaLink, "_blank");
      } else {
        setLocation(n.ctaLink);
      }
      setIsOpen(false);
    }
  };

  const getIcon = (type: AppNotification["type"]) => {
    switch (type) {
      case "event":
        return <Calendar className="w-4 h-4 text-orange-500" />;
      case "news":
        return <Newspaper className="w-4 h-4 text-blue-500" />;
      default:
        return <Sparkles className="w-4 h-4 text-violet-500" />;
    }
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-100/80 active:scale-95 transition-all ${className}`}
        aria-label={t.notifications.bellTitle}
        title={t.notifications.bellTitle}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-extrabold text-white shadow-sm ring-2 ring-white"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed inset-x-3 top-16 z-[100] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[520px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-gray-700" />
                <h3 className="font-extrabold text-sm text-gray-900">{t.notifications.bellTitle}</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsRead()}
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>{t.notifications.markAllRead}</span>
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center border-b border-gray-100 px-4 py-2 bg-white gap-2">
              <button
                onClick={() => setTab("all")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                  tab === "all" ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {t.notifications.tabAll} ({notifications.length})
              </button>
              <button
                onClick={() => setTab("unread")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                  tab === "unread" ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {t.notifications.tabUnread} ({unreadCount})
              </button>
              <div className="flex-1" />
              <button
                onClick={() => {
                  setIsOpen(false);
                  setLocation("/settings/notifications");
                }}
                className="p-1 text-gray-400 hover:text-gray-700 transition-colors"
                title={t.notifications.title}
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Notification List */}
            <div className="overflow-y-auto flex-1 divide-y divide-gray-50 p-2 space-y-1">
              {filtered.length === 0 ? (
                <div className="py-12 text-center px-4">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3 text-gray-400">
                    <Bell className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-gray-700">{t.notifications.empty}</p>
                  <p className="text-xs text-gray-400 mt-1">{t.notifications.emptyDesc}</p>
                </div>
              ) : (
                filtered.map((n) => {
                  const titleStr = getLocalizedText(n.titleLocalized ?? n.title, locale);
                  const contentStr = getLocalizedText(n.contentLocalized ?? n.content, locale);
                  const ctaStr = getLocalizedText(n.ctaTextLocalized ?? n.ctaText, locale);

                  return (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`group relative p-3 rounded-xl transition-all cursor-pointer border ${
                        !n.isRead
                          ? "bg-blue-50/40 border-blue-100/70 hover:bg-blue-50"
                          : "bg-white border-transparent hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex gap-3 items-start">
                        <div className="w-8 h-8 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                          {getIcon(n.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className={`text-xs font-bold text-gray-900 truncate ${!n.isRead ? "text-blue-900" : ""}`}>
                              {titleStr}
                            </h4>
                            <span className="text-[10px] text-gray-400 whitespace-nowrap">
                              {new Date(n.createdAt).toLocaleDateString(locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "uz-UZ", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed font-normal">
                            {contentStr}
                          </p>

                          {ctaStr && (
                            <div className="mt-2.5 flex items-center gap-1 text-[11px] font-bold text-blue-600 group-hover:underline">
                              <span>{ctaStr}</span>
                              <ExternalLink className="w-3 h-3" />
                            </div>
                          )}
                        </div>

                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
