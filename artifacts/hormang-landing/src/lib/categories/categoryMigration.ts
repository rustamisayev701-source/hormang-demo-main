/**
 * lib/categories/categoryMigration
 *
 * Backwards-compatibility layer that maps legacy translated category names
 * (UZ / RU strings stored on old provider profiles and customer requests)
 * to canonical category IDs from the central category store.
 *
 * Two public surfaces:
 *   - `migrateLegacyCategoryValue(v)` — single value → canonical ID or null
 *   - `resolveCategoryIds(values)`    — strict, drops unknowns (display/match)
 *   - `migrateCategoryValuesSafe(values)` — preserves unknown values (persistence)
 */
import type { Category } from "./index";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/['ʻʼ’`]/g, "")
    .replace(/[\s/]+/g, "")
    .trim();
}

/**
 * Hardcoded map of legacy translated names that appeared in old provider
 * profiles & locale files. Keys are normalized (lowercased, no spaces / quotes).
 */
export const LEGACY_NAME_MAP: Record<string, string> = {
  // ── Tozalash / Уборка ──
  "tozalash":                 "tozalash",
  "tozalik":                  "tozalash",
  "уборка":                   "tozalash",
  "клининг":                  "tozalash",

  // ── Ta'mirlash / Ремонт ──
  "tamirlash":                "tamirlash",
  "tamirlashusta":            "tamirlash",
  "tamirlashustachilik":      "tamirlash",
  "ремонт":                   "tamirlash",
  "ремонтмастер":             "tamirlash",   // "Ремонт / Мастер"

  // ── Enaga / Няня ──
  "enagalik":                 "enaga",
  "enaga":                    "enaga",
  "enagabolaparvarishi":      "enaga",
  "няня":                     "enaga",
  "няни":                     "enaga",
  "нянябоналенка":            "enaga",
  "няняуходзадетьми":         "enaga",       // "Няня / Уход за детьми"

  // ── Tadbir / Услуги для мероприятий ──
  "tadbir":                   "tadbir",
  "tadbirlar":                "tadbir",
  "tadbirxizmatlari":         "tadbir",
  "ovqatpishirish":           "tadbir",
  "dizaynyaratuvchanlik":     "tadbir",
  "ивентуслуги":              "tadbir",
  "услугидлямероприятий":     "tadbir",
  "готовка":                  "tadbir",
  "мероприятия":              "tadbir",

  // ── Ko'chirish / Переезд ──
  "kochirish":                "kochirish",
  "kochirishyukyetkazish":    "kochirish",
  "kochirishtransport":       "kochirish",
  "kochirishyuk":             "kochirish",
  "переезддоставка":          "kochirish",   // "Переезд / доставка"
  "переездтранспорт":         "kochirish",   // "Переезд / Транспорт"
  "переезд":                  "kochirish",
  "доставка":                 "kochirish",

  // ── Go'zallik / Красота ──
  "gozallik":                 "gozallik",
  "gozalliksartaroshlik":     "gozallik",
  "красота":                  "gozallik",
  "красотапарикмахерская":    "gozallik",    // "Красота / Парикмахерская"
  "парикмахерская":           "gozallik",

  // ── Avto / Авто услуги ──
  "avto":                     "avto",
  "avtoxizmat":               "avto",
  "автоуслуги":               "avto",
  "автосервис":               "avto",

  // ── Repetitor / Репетитор ──
  "repetitor":                "repetitor",
  "repetitorlar":             "repetitor",
  "repetitoroqituvchi":       "repetitor",
  "репетиторы":               "repetitor",
  "репетитор":                "repetitor",
  "репетиторучитель":         "repetitor",   // "Репетитор / Учитель"
  "учитель":                  "repetitor",

  // ── Ustachilik / Мастер / Электрика ──
  "ustachilik":               "ustachilik",
  "elektrishlari":            "ustachilik",
  "santexnika":               "ustachilik",
  "строительство":            "ustachilik",
  "электрика":                "ustachilik",
  "мастер":                   "ustachilik",
  "мастеровые":               "ustachilik",
  "сантехника":               "ustachilik",
};

/**
 * Resolve a single legacy value (id or translated name) to a canonical id,
 * using the currently registered canonical category set + the legacy map.
 * Returns null when no mapping exists.
 */
export function migrateLegacyCategoryValueWith(
  value: string,
  canonical: Pick<Category, "id" | "nameLocalized">[],
): string | null {
  if (!value) return null;
  // 1. Exact id match against current store
  if (canonical.some((c) => c.id === value)) return value;
  const norm = normalize(value);
  // 2. Match against localized names on the current store
  for (const c of canonical) {
    if (normalize(c.nameLocalized.uz ?? "") === norm) return c.id;
    if (normalize(c.nameLocalized.ru ?? "") === norm) return c.id;
  }
  // 3. Legacy hardcoded map
  return LEGACY_NAME_MAP[norm] ?? null;
}
