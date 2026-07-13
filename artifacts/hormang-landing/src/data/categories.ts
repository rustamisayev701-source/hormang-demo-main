/**
 * data/categories.ts
 * Canonical multilingual display names for all built-in service categories (UZ + RU).
 *
 * IDs must match CategoryConfig.id in lib/questionnaire-store.ts.
 */
import type { LocalizedText } from "@/lib/localization";
import { getLocalizedText, type Locale } from "@/lib/localization";
import type { CategoryConfig } from "@/lib/questionnaire-store";

export interface CategoryMeta {
  id: string;
  name: LocalizedText;
  emoji: string;
}

export const CATEGORY_META: CategoryMeta[] = [
  { id: "tamirlash",  name: { uz: "Ta'mirlash",           ru: "Ремонт"          }, emoji: "🔧" },
  { id: "tozalash",   name: { uz: "Tozalash",             ru: "Уборка"          }, emoji: "🧹" },
  { id: "avto",       name: { uz: "Avto xizmat",          ru: "Авто услуги"     }, emoji: "🚗" },
  { id: "kochirish",  name: { uz: "Ko'chirish / yuk",     ru: "Переезд / доставка" }, emoji: "🚚" },
  { id: "repetitor",  name: { uz: "Repetitorlar",         ru: "Репетиторы"      }, emoji: "📚" },
  { id: "tadbir",     name: { uz: "Tadbir xizmatlari",    ru: "Ивент услуги"    }, emoji: "🎉" },
  { id: "gozallik",   name: { uz: "Go'zallik",            ru: "Красота"         }, emoji: "💄" },
  { id: "enaga",      name: { uz: "Enagalik",             ru: "Няня"            }, emoji: "👶" },
  { id: "ustachilik", name: { uz: "Ustachilik",           ru: "Строительство"   }, emoji: "🏗️" },
];

/** Returns the LocalizedText name for a built-in category. */
export function getCategoryMeta(id: string): CategoryMeta | undefined {
  return CATEGORY_META.find((c) => c.id === id);
}

/**
 * Resolves the display name for a CategoryConfig in the given locale.
 * Priority: config.nameLocalized → CATEGORY_META → config.name (Uzbek string)
 */
export function getCategoryDisplayName(cat: CategoryConfig, lang: Locale): string {
  if (cat.nameLocalized) return getLocalizedText(cat.nameLocalized, lang);
  const meta = getCategoryMeta(cat.id);
  if (meta) return getLocalizedText(meta.name, lang);
  return cat.name;
}
