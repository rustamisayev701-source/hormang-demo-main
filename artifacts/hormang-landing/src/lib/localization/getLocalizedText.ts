import type { Locale } from "@/lib/i18n";
import type { LocalizedText, Translatable, TranslationCompleteness } from "./localizationTypes";

/**
 * Resolves a Translatable field to a plain string for the given locale.
 *
 * Fallback chain: requested language → uz → ru → ""
 *
 * Backward-compatible: if `field` is already a plain string (legacy data)
 * it is returned as-is regardless of `lang`.
 *
 * Never crashes — always returns a string, even for undefined/null input.
 *
 * @example
 *   getLocalizedText(category.title, "ru")
 *   // "Уборка"  (or falls back to "Tozalash" if ru is missing)
 */
export function getLocalizedText(
  field: Translatable | undefined | null,
  lang: Locale,
): string {
  if (field === undefined || field === null) return "";
  if (typeof field === "string") return field;

  return field[lang] || field.uz || field.ru || "";
}

/**
 * Returns translation completeness information for a LocalizedText field.
 * Useful for rendering per-language status indicators in the admin panel.
 *
 * @example
 *   const s = getTranslationCompleteness(tier.nameLocalized);
 *   // { uz: "filled", ru: "empty", pct: 50 }
 */
export function getTranslationCompleteness(
  field: LocalizedText | undefined | null,
): TranslationCompleteness {
  const uz = !!field?.uz?.trim();
  const ru = !!field?.ru?.trim();
  const filled = [uz, ru].filter(Boolean).length;
  return {
    uz: uz ? "filled" : "empty",
    ru: ru ? "filled" : "empty",
    pct: Math.round((filled / 2) * 100),
  };
}

/**
 * Merges a partial LocalizedText update into an existing LocalizedText object.
 * Safe to call with undefined existing value.
 */
export function mergeLocalizedText(
  existing: LocalizedText | undefined,
  update: Partial<LocalizedText>,
): LocalizedText {
  return { ...existing, ...update };
}
