import { Check } from "lucide-react";
import { BottomSheet } from "./bottom-sheet";
import { useI18n } from "@/contexts/i18n-context";
import { LOCALES, type Locale } from "@/lib/i18n";

interface LanguageSelectorProps {
  open: boolean;
  onClose: () => void;
}

const FLAGS: Record<Locale, string> = { uz: "🇺🇿", ru: "🇷🇺", en: "🇬🇧" };

export function LanguageSelector({ open, onClose }: LanguageSelectorProps) {
  const { locale, setLocale, t } = useI18n();

  function pick(l: Locale) {
    setLocale(l);
    setTimeout(onClose, 150);
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={t.language.pickerTitle}>
      <div className="space-y-2 mt-2">
        {LOCALES.map((l) => {
          const active = l.code === locale;
          return (
            <button
              key={l.code}
              onClick={() => pick(l.code)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition-all ${
                active
                  ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 dark:border-blue-400"
                  : "bg-white dark:bg-[hsl(var(--surface-2))] border-gray-100 dark:border-[hsl(var(--hairline))] hover:border-gray-200 dark:hover:border-gray-600"
              }`}
            >
              <span className="text-2xl flex-shrink-0">{FLAGS[l.code]}</span>
              <div className="flex-1 text-left">
                <p className={`font-bold text-sm ${active ? "text-blue-700 dark:text-blue-300" : "text-gray-900 dark:text-[hsl(var(--text-primary))]"}`}>
                  {l.name}
                </p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase font-semibold mt-0.5">
                  {l.code}
                </p>
              </div>
              {active && (
                <div className="w-7 h-7 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-white" strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}
