import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";
import { BottomNav } from "@/components/bottom-nav";
import { useSettingsPrefs } from "@/lib/settings-prefs-store";

interface SettingsPageShellProps {
  title: string;
  subtitle?: string;
  back?: string;
  children: ReactNode;
  hideBottomNav?: boolean;
}

export function SettingsPageShell({
  title,
  subtitle,
  back = "/settings",
  children,
  hideBottomNav,
}: SettingsPageShellProps) {
  const [, setLocation] = useLocation();
  const [prefs] = useSettingsPrefs();
  const reduce = prefs.reduceMotion;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[hsl(var(--background))] pb-24 transition-colors">
      <div className="bg-white/95 dark:bg-[hsl(var(--surface))]/95 backdrop-blur border-b border-gray-100 dark:border-[hsl(var(--hairline))] sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setLocation(back)}
            className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-[hsl(var(--surface-3))] border border-gray-100 dark:border-[hsl(var(--hairline))] flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[hsl(var(--surface-2))] transition-colors flex-shrink-0"
            aria-label="Back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-extrabold text-base text-gray-900 dark:text-[hsl(var(--text-primary))] leading-tight truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{subtitle}</p>
            )}
          </div>
        </div>
      </div>

      <motion.main
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.22 }}
        className="max-w-lg mx-auto px-4 py-5 space-y-5"
      >
        {children}
      </motion.main>

      {!hideBottomNav && <BottomNav />}
    </div>
  );
}
