/**
 * questionnaire-store.ts
 * Central configuration for all category questions + localStorage persistence.
 * Key: hormang_questions_v1 / hormang_common_questions_v1
 */
import { getActiveCategories } from "./categories";

export type QuestionType =
  | "single-select"
  | "multi-select"
  | "text"
  | "textarea"
  | "number"
  | "yes-no"
  | "date"
  | "file"
  | "range"
  | "section-header"
  | "location";

export interface QuestionOption {
  /** Primary display label (Uzbek). Use labelLocalized when available. */
  label: string;
  /** Multilingual label — maps to future DB columns option_label_uz / option_label_ru */
  labelLocalized?: import("./localization").LocalizedText;
  value: string;
  /** "other" → selecting this option reveals a free-text input below it */
  type?: "fixed" | "other";
  /** Tanga cost added when this option is selected (default 0) */
  tangaCost?: number;
}

export interface Question {
  id: string;
  /** Primary display label (Uzbek). Use labelLocalized when available. */
  label: string;
  /** Multilingual question text — maps to future DB columns label_uz / label_ru */
  labelLocalized?: import("./localization").LocalizedText;
  type: QuestionType;
  options?: QuestionOption[];
  required?: boolean;
  placeholder?: string;
  /** Multilingual placeholder — maps to future DB columns placeholder_uz / placeholder_ru */
  placeholderLocalized?: import("./localization").LocalizedText;
  helpText?: string;
  /** Multilingual help text — maps to future DB columns help_text_uz / help_text_ru */
  helpTextLocalized?: import("./localization").LocalizedText;
  min?: number;
  max?: number;
  step?: number;
  isCore?: boolean;
  /** Example texts shown as clickable autofill chips below text/textarea inputs */
  autofillExamples?: string[];
  conditional?: { questionId: string; value: string };
  /** option value → follow-up questions shown when that option is selected */
  conditionalBranches?: Record<string, Question[]>;
}

export interface CategoryConfig {
  id: string;
  /** Primary display name (Uzbek). Use nameLocalized when available. */
  name: string;
  /** Multilingual name. Use getCategoryDisplayName(cat, locale) from data/categories.ts. */
  nameLocalized?: import("./localization").LocalizedText;
  emoji: string;
  questions: Question[];
  /** Base Tanga cost for any offer in this category (default 0) */
  baseCost?: number;
}

/** Default common questions (editable via admin, persisted separately) */
export const DEFAULT_COMMON_QUESTIONS: Question[] = [
  {
    id: "location",
    label: "Manzilni kiriting",
    type: "location",
    required: true,
    isCore: true,
  },
  {
    id: "urgency",
    label: "Shoshilinchlik darajasi",
    type: "single-select",
    required: true,
    isCore: true,
    options: [
      { label: "Bugun yoki ertaga kerak", value: "today_tomorrow" },
      { label: "3–7 kun", value: "3_7_days" },
      { label: "1–2 hafta", value: "1_2_weeks" },
      { label: "Shoshilinch emas (qulay vaqt)", value: "flexible" },
    ],
  },
  {
    id: "budget",
    label: "Taxminiy byudjet",
    type: "number",
    isCore: true,
    placeholder: "Masalan: 500 000",
    helpText: "so'm",
  },
];

/** Backward compat export — always reads from persistent store */
export const COMMON_QUESTIONS = DEFAULT_COMMON_QUESTIONS;

const INITIAL_CATEGORIES: CategoryConfig[] = [
  {
    id: "tamirlash",
    name: "Ta'mirlash",
    emoji: "🔧",
    questions: [
      {
        id: "repair_items",
        label: "Nimani ta'mirlash kerak?",
        type: "multi-select",
        required: true,
        options: [
          { label: "Santexnika", value: "santexnika" },
          { label: "Elektr jihozlari", value: "elektr" },
          { label: "Mebel", value: "mebel" },
          { label: "Konditsioner", value: "konditsioner" },
          { label: "Muzlatgich", value: "muzlatgich" },
          { label: "Kir yuvish mashinasi", value: "kir_yuvish" },
          { label: "Boshqa", value: "boshqa", type: "other" as const },
        ],
      },
      {
        id: "repair_desc",
        label: "Muammoni qisqacha tasvirlab bering.",
        type: "textarea",
        placeholder: "Muammo haqida batafsil yozing...",
      },
      { id: "repair_photo", label: "Rasm yuklash", type: "file" },
    ],
  },
  {
    id: "tozalash",
    name: "Tozalash",
    emoji: "🧹",
    questions: [
      {
        id: "clean_type",
        label: "Tozalash turi?",
        type: "single-select",
        required: true,
        options: [
          { label: "Oddiy", value: "oddiy" },
          { label: "Chuqur", value: "chuqur" },
          { label: "Ko'chib kirishdan oldin", value: "kochib_kirish" },
          { label: "Boshqa", value: "boshqa", type: "other" as const },
        ],
      },
      {
        id: "clean_place",
        label: "Joy turi?",
        type: "single-select",
        options: [
          { label: "Kvartira", value: "kvartira" },
          { label: "Ofis", value: "ofis" },
          { label: "Hovli", value: "hovli" },
          { label: "Boshqa", value: "boshqa", type: "other" as const },
        ],
      },
      {
        id: "clean_size",
        label: "Joy hajmi? (xona soni yoki kvm)",
        type: "number",
        placeholder: "Masalan: 3 (xona) yoki 80 (kvm)",
      },
      {
        id: "clean_notes",
        label: "Qo'shimcha ma'lumotlar",
        type: "textarea",
        placeholder: "Boshqa ma'lumotlar...",
      },
      { id: "clean_photo", label: "Rasm yuklash", type: "file" },
    ],
  },
  {
    id: "avto",
    name: "Avto xizmat",
    emoji: "🚗",
    questions: [
      {
        id: "avto_type",
        label: "Xizmat turi?",
        type: "single-select",
        required: true,
        options: [
          { label: "Yuvish", value: "yuvish" },
          { label: "Ta'mirlash", value: "tamirlash" },
          { label: "Diagnostika", value: "diagnostika" },
          { label: "Boshqa", value: "boshqa", type: "other" as const },
        ],
      },
      {
        id: "avto_car",
        label: "Mashina markasi?",
        type: "text",
        placeholder: "Masalan: Chevrolet Cobalt",
      },
      {
        id: "avto_notes",
        label: "Qo'shimcha ma'lumotlar",
        type: "textarea",
        placeholder: "Boshqa ma'lumotlar...",
      },
      { id: "avto_photo", label: "Rasm yuklash", type: "file" },
    ],
  },
  {
    id: "kochirish",
    name: "Ko'chirish / yuk yetkazish",
    emoji: "🚚",
    questions: [
      {
        id: "move_cargo",
        label: "Yuk turi?",
        type: "single-select",
        required: true,
        options: [
          { label: "Xonadon jihozlari", value: "xonadon" },
          { label: "Ofis jihozlari", value: "ofis" },
          { label: "Oziq-ovqat mahsulotlari", value: "oziq_ovqat" },
          { label: "Boshqa", value: "boshqa", type: "other" as const },
        ],
      },
      {
        id: "move_from",
        label: "Qayerdan? (manzil)",
        type: "text",
        placeholder: "Yuk olinadigan manzil...",
      },
      {
        id: "move_to",
        label: "Qayerga? (manzil)",
        type: "text",
        placeholder: "Yuk yetkaziladigan manzil...",
      },
      { id: "move_lift", label: "Lift mavjudmi?", type: "yes-no" },
      {
        id: "move_floor",
        label: "Nechanchi qavat?",
        type: "number",
        placeholder: "Qavat raqami",
      },
      {
        id: "move_notes",
        label: "Qo'shimcha ma'lumotlar",
        type: "textarea",
        placeholder: "Boshqa ma'lumotlar...",
      },
      { id: "move_photo", label: "Rasm yuklash", type: "file" },
    ],
  },
  {
    id: "repetitor",
    name: "Repetitorlar",
    emoji: "📚",
    questions: [
      {
        id: "rep_subject",
        label: "Fan turi?",
        type: "single-select",
        required: true,
        options: [
          { label: "Ingliz tili", value: "ingliz" },
          { label: "Rus tili", value: "rus" },
          { label: "Matematika", value: "matematika" },
          { label: "Musiqa", value: "musiqa" },
          { label: "Boshqa", value: "boshqa", type: "other" as const },
        ],
      },
      {
        id: "rep_level",
        label: "Hozirgi darajangiz?",
        type: "single-select",
        options: [
          { label: "Boshlang'ich", value: "boshlangich" },
          { label: "O'rta", value: "orta" },
          { label: "Yuqori", value: "yuqori" },
        ],
      },
      {
        id: "rep_format",
        label: "Dars formati?",
        type: "single-select",
        options: [
          { label: "Online", value: "online" },
          { label: "Offline", value: "offline" },
        ],
      },
      {
        id: "rep_notes",
        label: "Qo'shimcha ma'lumotlar",
        type: "textarea",
        placeholder: "Boshqa ma'lumotlar...",
      },
    ],
  },
  {
    id: "tadbir",
    name: "Tadbir xizmatlari",
    emoji: "🎉",
    questions: [
      {
        id: "event_type",
        label: "Tadbir turi?",
        type: "single-select",
        required: true,
        options: [
          { label: "To'y", value: "toy" },
          { label: "Tug'ilgan kun", value: "tugilgan_kun" },
          { label: "Kelin salom", value: "kelin_salom" },
          { label: "Gap", value: "gap" },
          { label: "Korporativ", value: "korporativ" },
          { label: "Boshqa", value: "boshqa", type: "other" as const },
        ],
      },
      {
        id: "event_services",
        label: "Xizmat turi?",
        type: "multi-select",
        options: [
          { label: "Ovqat pishirish", value: "ovqat" },
          { label: "Bezash xizmati", value: "bezash" },
          { label: "Video/rasm xizmati", value: "video_rasm" },
          { label: "Tashkillashtirish xizmati", value: "tashkil" },
          { label: "Ijara xizmati", value: "ijara" },
          { label: "Tozalash xizmati", value: "tozalash" },
          { label: "Kortej xizmati", value: "kortej" },
          { label: "Musiqiy xizmatlar", value: "musiqa" },
          { label: "Boshqa", value: "boshqa", type: "other" as const },
        ],
      },
      { id: "event_date", label: "Belgilangan sana?", type: "date" },
      {
        id: "event_notes",
        label: "Qo'shimcha ma'lumotlar",
        type: "textarea",
        placeholder: "Boshqa ma'lumotlar...",
      },
    ],
  },
  {
    id: "gozallik",
    name: "Go'zallik",
    emoji: "💄",
    questions: [
      {
        id: "beauty_service",
        label: "Xizmat turi?",
        type: "single-select",
        required: true,
        options: [
          { label: "Makiyaj", value: "makiyaj" },
          { label: "Manikyur/pedikyur", value: "manikyur" },
          { label: "Soch turmak", value: "soch" },
          { label: "Qosh/kiprik", value: "qosh_kiprik" },
          { label: "Boshqa", value: "boshqa", type: "other" as const },
        ],
      },
      {
        id: "beauty_reason",
        label: "Xizmat sababi?",
        type: "single-select",
        options: [
          { label: "Kundalik", value: "kundalik" },
          { label: "To'y marosimlari", value: "toy" },
          { label: "Boshqa tadbirlar", value: "boshqa_tadbir" },
        ],
      },
      {
        id: "beauty_location",
        label: "Xizmat joyi?",
        type: "single-select",
        options: [
          { label: "Uyda", value: "uyda" },
          { label: "Salonda", value: "salon" },
        ],
      },
      {
        id: "beauty_notes",
        label: "Qo'shimcha ma'lumotlar",
        type: "textarea",
        placeholder: "Boshqa ma'lumotlar...",
      },
      { id: "beauty_photo", label: "Rasm yuklash", type: "file" },
    ],
  },
  {
    id: "enaga",
    name: "Enagalik",
    emoji: "👶",
    questions: [
      {
        id: "nanny_type",
        label: "Enagalik turi?",
        type: "single-select",
        required: true,
        options: [
          { label: "Yosh bola", value: "yosh_bola" },
          { label: "Qariya", value: "qariya" },
        ],
      },
      {
        id: "nanny_gender",
        label: "Enaga jinsi?",
        type: "single-select",
        options: [
          { label: "Erkak", value: "erkak" },
          { label: "Ayol", value: "ayol" },
        ],
      },
      {
        id: "nanny_notes",
        label: "Qo'shimcha ma'lumotlar",
        type: "textarea",
        placeholder: "Boshqa ma'lumotlar...",
      },
    ],
  },
  {
    id: "ustachilik",
    name: "Ustachilik",
    emoji: "🏗️",
    questions: [
      {
        id: "craft_service",
        label: "Xizmat turi?",
        type: "single-select",
        required: true,
        options: [
          { label: "Qurilish va tashqi fasad", value: "qurilish" },
          { label: "Ichki pardozlash ishlari", value: "pardozlash" },
          { label: "Kommunikatsiya ishlari", value: "kommunikatsiya" },
          { label: "Duradgorlik ishlari", value: "duradgorlik" },
          { label: "Landshaft va dizayn", value: "landshaft" },
          { label: "Boshqa", value: "boshqa", type: "other" as const },
        ],
      },
      {
        id: "craft_place",
        label: "Joy turi?",
        type: "single-select",
        options: [
          { label: "Kvartira", value: "kvartira" },
          { label: "Hovli", value: "hovli" },
          { label: "Noturar bino", value: "noturar" },
        ],
      },
      {
        id: "craft_accommodation",
        label: "Ovqat va yotoq bilan ta'minlash?",
        type: "single-select",
        options: [
          { label: "Ha", value: "ha" },
          { label: "Faqat ovqat", value: "faqat_ovqat" },
          { label: "Faqat yotoq", value: "faqat_yotoq" },
          { label: "Yo'q", value: "yoq" },
        ],
      },
      {
        id: "craft_notes",
        label: "Boshqa ma'lumotlar",
        type: "textarea",
        placeholder: "Boshqa ma'lumotlar...",
      },
    ],
  },
];

const LS_KEY = "hormang_questions_v1";
const COMMON_LS_KEY = "hormang_common_questions_v1";

/**
 * Returns the list of categories for the questionnaire flow.
 *
 * The canonical list of categories lives in `lib/categories` (admin-managed,
 * ID-based). This store holds only per-category *questions*. We merge the two:
 *
 *  - Only active canonical categories are returned (admin can hide one).
 *  - Display name / emoji / baseCost are sourced from the canonical store, so
 *    admin edits propagate instantly to customer-facing screens.
 *  - Categories created via the admin panel that have no questions yet are
 *    auto-included with an empty question list.
 *  - Categories without a canonical entry fall back to the stored value
 *    (defensive: keeps old data visible until cleanup).
 */
function readStoredCategoryConfigs(): CategoryConfig[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as CategoryConfig[];
  } catch (_) { /* ignore */ }
  return INITIAL_CATEGORIES;
}

/**
 * Customer-facing + admin-facing category list. Returns ONLY canonical
 * active categories, sourced from `lib/categories` for display metadata and
 * augmented with question configs from this store. Deactivated categories
 * are intentionally excluded so they cannot appear in selectors or new
 * request flows. Their question configs are still preserved in storage and
 * merged back on save (see {@link saveCategories}).
 */
export function getCategories(): CategoryConfig[] {
  const stored = readStoredCategoryConfigs();

  let canonical: ReturnType<typeof getActiveCategories> = [];
  try {
    canonical = getActiveCategories();
  } catch {
    // Canonical store unavailable (test/SSR) — fall back to raw configs.
    return stored;
  }
  // Empty canonical list = every category is deactivated. Respect that and
  // return an empty list rather than leaking deactivated category configs
  // to customer-facing selectors.
  if (canonical.length === 0) return [];

  const storedById = new Map(stored.map((c) => [c.id, c]));
  return canonical.map((cn) => {
    const base = storedById.get(cn.id);
    return {
      id: cn.id,
      name: cn.nameLocalized.uz ?? base?.name ?? cn.id,
      emoji: cn.emoji,
      baseCost: cn.baseCost ?? base?.baseCost ?? 0,
      questions: base?.questions ?? [],
    };
  });
}

/**
 * Save category question configs from the admin editor. Preserves the
 * question configs of any stored category whose ID is not in `cats` (e.g.
 * a deactivated category) so toggling active/inactive never drops the
 * admin's work.
 */
export function saveCategories(cats: CategoryConfig[]): void {
  const prevStored = readStoredCategoryConfigs();
  const incomingIds = new Set(cats.map((c) => c.id));
  const preserved = prevStored.filter((c) => !incomingIds.has(c.id));
  const next = [...cats, ...preserved];
  localStorage.setItem(LS_KEY, JSON.stringify(next));
}

export function getCategoryById(id: string): CategoryConfig | undefined {
  return getCategories().find((c) => c.id === id);
}

/**
 * Read a stored category config by ID **regardless of active status**.
 * Use this in admin/back-office paths where you must surface configs for
 * deactivated categories (which `getCategoryById` intentionally hides).
 */
export function getStoredCategoryConfigById(id: string): CategoryConfig | undefined {
  return readStoredCategoryConfigs().find((c) => c.id === id);
}

/** Count of questions linked specifically to a category (excludes common ones). */
export function getCategorySpecificQuestionCount(id: string): number {
  return getStoredCategoryConfigById(id)?.questions.length ?? 0;
}

/** Migrate old region+district questions to single location question */
function migrateCommonQuestions(qs: Question[]): Question[] {
  const hasLocation = qs.some((q) => q.id === "location");
  if (hasLocation) return qs;
  const hasLegacyRegion = qs.some((q) => q.id === "region");
  if (!hasLegacyRegion) return qs;
  const locationQ: Question = {
    id: "location",
    label: "Manzilni kiriting",
    type: "location",
    required: true,
    isCore: true,
  };
  return [locationQ, ...qs.filter((q) => q.id !== "region" && q.id !== "district")];
}

export function getCommonQuestions(): Question[] {
  try {
    const stored = localStorage.getItem(COMMON_LS_KEY);
    if (stored) return migrateCommonQuestions(JSON.parse(stored) as Question[]);
  } catch (_) { /* ignore */ }
  return DEFAULT_COMMON_QUESTIONS;
}

export function saveCommonQuestions(qs: Question[]): void {
  localStorage.setItem(COMMON_LS_KEY, JSON.stringify(qs));
}

export function resetCommonQuestions(): void {
  localStorage.removeItem(COMMON_LS_KEY);
}

/** Full list: category-specific questions + common ones */
export function getAllQuestionsForCategory(categoryId: string): Question[] {
  const cat = getCategoryById(categoryId);
  if (!cat) return getCommonQuestions();
  return [...cat.questions, ...getCommonQuestions()];
}

export function resetCategories(): void {
  localStorage.removeItem(LS_KEY);
  localStorage.removeItem(COMMON_LS_KEY);
}

/**
 * Recursively collect all questions that are currently active/visible
 * given the provided answers. Branch questions are included only when their
 * triggering option is selected. The returned list is flat (no nesting).
 */
export function collectActiveQuestions(
  questions: Question[],
  answers: Record<string, unknown>,
): Question[] {
  const result: Question[] = [];
  for (const q of questions) {
    result.push(q);
    if (!q.conditionalBranches) continue;
    if (q.type === "single-select") {
      const val = answers[q.id] as string | null;
      if (val && q.conditionalBranches[val]?.length) {
        result.push(...collectActiveQuestions(q.conditionalBranches[val], answers));
      }
    } else if (q.type === "multi-select") {
      const vals = (answers[q.id] as string[]) ?? [];
      const seen = new Set<string>();
      for (const v of vals) {
        for (const bq of q.conditionalBranches[v] ?? []) {
          if (!seen.has(bq.id)) {
            seen.add(bq.id);
            result.push(...collectActiveQuestions([bq], answers));
          }
        }
      }
    }
  }
  return result;
}
