import { useEffect } from "react";
import { useLocation } from "wouter";
import { Home, LayoutGrid, ClipboardList, MessageCircle, LayoutDashboard, Wallet, List } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useI18n } from "@/contexts/i18n-context";
import { getOffersByCustomer, getTotalCustomerUnread } from "@/lib/requests-store";
import { getTotalUnread, getUnseenRequests } from "@/lib/provider-store";
import { getLocalProfile } from "@/lib/local-profile";
import { useStoreRefresh } from "@/hooks/use-store-refresh";
import { useToast } from "@/hooks/use-toast";

export function BottomNav() {
  const [location, setLocation] = useLocation();
  const { user, activeRole, providerProfile } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  useStoreRefresh();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [window.location.pathname]);

  if (!user) return null;

  const isProvider = activeRole === "provider";
  const selectedCategories = providerProfile?.categories ?? [];

  const localProfile = isProvider && user?.id ? getLocalProfile(user.id) : null;
  const serviceAreas = localProfile?.serviceAreas ?? [];
  const serviceAreaV2 = localProfile?.serviceAreaV2;

  const pendingOffers = isProvider ? 0 : getOffersByCustomer(user?.id ?? "").filter((o) => o.status === "pending").length;
  const customerChatUnread = isProvider ? 0 : getTotalCustomerUnread(user?.id ?? "");
  const unseenCount = isProvider ? getUnseenRequests(selectedCategories, serviceAreas, user?.id ?? "", serviceAreaV2).length : 0;
  const unreadChats = isProvider ? getTotalUnread(user?.id ?? "") : 0;

  const BUYER_TABS = [
    { label: t.bottomNav.buyer.home,       icon: Home,            href: "/customer-home" },
    { label: t.bottomNav.buyer.categories, icon: LayoutGrid,      href: "/questionnaire" },
    { label: t.bottomNav.buyer.requests,   icon: ClipboardList,   href: "/my-requests" },
    { label: t.bottomNav.buyer.chats,      icon: MessageCircle,   href: "/chat-offers" },
    { label: t.bottomNav.buyer.profile,    icon: LayoutDashboard, href: "/dashboard" },
  ];

  const PROVIDER_TABS = [
    { label: t.bottomNav.provider.home,     icon: Home,            href: "/provider-home", disabled: false },
    { label: t.bottomNav.provider.requests, icon: List,            href: "/provider/requests", disabled: false },
    { label: t.bottomNav.provider.wallet,   icon: Wallet,          href: "/plans", disabled: false },
    { label: t.bottomNav.provider.chats,    icon: MessageCircle,   href: "/provider/chats", disabled: false },
    { label: t.bottomNav.provider.profile,  icon: LayoutDashboard, href: "/dashboard", disabled: false },
  ];

  function isActive(href: string): boolean {
    if (href === "/") return location === "/";
    if (href === "/provider-home") return location === "/provider-home" || location === "/";
    if (href === "/chat-offers") return location.startsWith("/chat-offers") || location.startsWith("/chat/");
    if (href === "/provider/chats") return location.startsWith("/provider/chats") || location.startsWith("/provider/chat/");
    if (href === "/provider/requests") return location.startsWith("/provider/requests");
    if (href === "/questionnaire") return location.startsWith("/questionnaire");
    if (href === "/customer-home") return location === "/customer-home";
    if (href === "/dashboard") return location.startsWith("/dashboard") || location.startsWith("/settings") || location.startsWith("/profile/settings");
    if (href === "/my-requests") return location.startsWith("/my-requests");
    return location.startsWith(href);
  }

  function getBadge(href: string): number {
    if (!isProvider && href === "/my-requests") return pendingOffers;
    if (!isProvider && href === "/chat-offers") return customerChatUnread;
    if (isProvider && href === "/provider/requests") return unseenCount;
    if (isProvider && href === "/provider/chats") return unreadChats;
    return 0;
  }

  const tabs = isProvider ? PROVIDER_TABS : BUYER_TABS;
  const activeColor = isProvider ? "#7C3AED" : "#2563EB";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-[hsl(var(--surface))] border-t border-gray-100 dark:border-[hsl(var(--hairline))] shadow-[0_-2px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_-2px_12px_rgba(0,0,0,0.4)]">
      <div className="max-w-lg mx-auto flex">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          const badge = getBadge(tab.href);
          const disabled = "disabled" in tab && tab.disabled;

          return (
            <button
              key={tab.label}
              onClick={() => {
                if (disabled) {
                  toast({ title: t.common.soon, description: t.bottomNav.smartSoon });
                  return;
                }
                setLocation(tab.href);
              }}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-1 relative transition-colors ${
                disabled
                  ? "text-gray-300 dark:text-gray-600 cursor-default"
                  : active
                  ? "text-[var(--tab-color)]"
                  : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
              style={{ "--tab-color": activeColor } as React.CSSProperties}
            >
              <div className="relative">
                <tab.icon className={`w-5 h-5 transition-all ${active && !disabled ? "scale-110" : ""}`} />
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-semibold leading-none ${active && !disabled ? "text-[var(--tab-color)]" : ""}`}
                style={{ color: active && !disabled ? activeColor : undefined }}>
                {tab.label}
              </span>
              {active && !disabled && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ background: activeColor }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
