import type { Locale } from "@/lib/i18n";

export type { Locale };

/**
 * Multilingual content object — covers the three supported platform languages.
 *
 * Uzbek is the primary language and should always be present.
 * Russian and English are strongly recommended for all user-facing content.
 *
 * This structure maps 1-to-1 with future DB columns:
 *   title_uz TEXT, title_ru TEXT, title_en TEXT
 * or JSONB:
 *   title JSONB  -- { "uz": "...", "ru": "...", "en": "..." }
 */
export type LocalizedText = {
  uz?: string;
  ru?: string;
  en?: string;
};

/**
 * Backward-compatible union — accepts either a plain string (legacy data)
 * or a full LocalizedText object (new data).
 *
 * `getLocalizedText()` handles both cases transparently.
 */
export type Translatable = string | LocalizedText;

/**
 * Per-language completeness status used for admin translation indicators.
 */
export type TranslationStatus = "filled" | "missing";

export interface TranslationCompleteness {
  uz: "filled" | "empty";
  ru: "filled" | "empty";
  en: "filled" | "empty";
  /** Percentage of supported languages that have content (0–100). */
  pct: number;
}
