/**
 * lib/categories
 * Single source of truth for service categories.
 *
 * - Identifies categories by immutable string IDs (e.g. "tozalash").
 * - Stores multilingual display name (UZ + RU) + emoji + color + active flag.
 * - Persists to localStorage key `hormang_categories_v1`; seeds from
 *   CATEGORY_META in data/categories.ts on first load.
 * - Built-in categories are protected from hard delete (only deactivation).
 *
 * Provides a migration layer that maps legacy translated category names
 * stored on provider profiles / requests to canonical IDs.
 */
import type { LocalizedText, Locale } from "@/lib/localization";
import { getLocalizedText } from "@/lib/localization";
import { CATEGORY_META } from "@/data/categories";
import { emitStoreChange } from "@/lib/store-events";
import { migrateLegacyCategoryValueWith } from "./categoryMigration";

export { LEGACY_NAME_MAP } from "./categoryMigration";

/**
 * Canonical category model (CategoryModel).
 * Identified by an immutable string ID; carries multilingual display name and
 * optional description, taxonomy (parentCategoryId, future-proof), pricing
 * (baseCost in Tanga), and lifecycle (active, builtIn).
 */
export interface Category {
  id: string;
  /** Multilingual display name (UZ + RU). */
  nameLocalized: LocalizedText;
  /** Optional multilingual short description (UZ + RU). */
  descriptionLocalized?: LocalizedText;
  /**
   * Legacy emoji glyph. Kept as a fallback for categories created before
   * the icon system existed. New categories should set `icon` instead;
   * renderers prefer `icon` over `emoji` when both are present.
   */
  emoji: string;
  /**
   * Name of a curated icon (e.g. "Wrench"). When set, takes precedence over
   * `emoji` in `<CategoryIcon />`. See `lib/categories/icon-registry.tsx`.
   */
  icon?: string;
  /** Icon family identifier — currently only "phosphor". Future-proof for Iconify. */
  iconFamily?: string;
  /** Hex color used as the icon chip background (when no gradient is set). */
  color: string;
  /**
   * Optional gradient preset id (e.g. "blue-indigo"). When set, the chip
   * background is the resolved gradient and overrides solid `color`.
   * See `lib/categories/gradient-presets.ts`.
   */
  gradient?: string | null;
  /** Base Tanga cost for any offer in this category. */
  baseCost: number;
  /** When false, hidden from selectors / new requests but kept for history. */
  active: boolean;
  /** Original built-in categories cannot be hard-deleted (only deactivated). */
  builtIn: boolean;
  /** Optional parent category ID (reserved for future subcategory support; flat for now). */
  parentCategoryId?: string | null;
  createdAt: string;
}

/** Backwards-compatible alias. */
export type CategoryModel = Category;

export const CATEGORIES_STORAGE_KEY = "hormang_categories_v1";

/** Default hex colors for built-in categories. */
const DEFAULT_COLORS: Record<string, string> = {
  tamirlash:  "#3B82F6",
  tozalash:   "#10B981",
  avto:       "#F59E0B",
  kochirish:  "#8B5CF6",
  repetitor:  "#EC4899",
  tadbir:     "#F43F5E",
  gozallik:   "#EAB308",
  enaga:      "#06B6D4",
  ustachilik: "#64748B",
};

const FALLBACK_COLOR = "#3B82F6";

function seedCategories(): Category[] {
  return CATEGORY_META.map((m) => ({
    id: m.id,
    nameLocalized: m.name,
    emoji: m.emoji,
    color: DEFAULT_COLORS[m.id] ?? FALLBACK_COLOR,
    baseCost: 0,
    active: true,
    builtIn: true,
    createdAt: new Date(0).toISOString(),
  }));
}

/* ─── Storage ────────────────────────────────────────────────────── */

function readStore(): Category[] | null {
  try {
    const raw = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Category[];
    if (!Array.isArray(parsed)) return null;
    return parsed.map((c) => ({
      id: c.id,
      nameLocalized: c.nameLocalized ?? { uz: c.id },
      descriptionLocalized: c.descriptionLocalized,
      emoji: c.emoji ?? "📋",
      icon: c.icon,
      iconFamily: c.iconFamily,
      color: c.color ?? DEFAULT_COLORS[c.id] ?? FALLBACK_COLOR,
      gradient: c.gradient ?? null,
      baseCost: typeof c.baseCost === "number" ? c.baseCost : 0,
      active: c.active !== false,
      builtIn: !!c.builtIn,
      parentCategoryId: c.parentCategoryId ?? null,
      createdAt: c.createdAt ?? new Date().toISOString(),
    }));
  } catch {
    return null;
  }
}

function writeStore(cats: Category[]): void {
  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(cats));
    emitStoreChange();
  } catch (e) {
    console.warn("[Hormang] categories saqlanmadi:", e);
  }
}

/* ─── Public API ─────────────────────────────────────────────────── */

export function getAllCategories(): Category[] {
  const stored = readStore();
  if (stored && stored.length) {
    // Ensure built-in seeds are always present (admin should not be able to
    // accidentally lose them by clearing the array).
    const haveIds = new Set(stored.map((c) => c.id));
    const missingSeeds = seedCategories().filter((s) => !haveIds.has(s.id));
    if (missingSeeds.length > 0) {
      const merged = [...stored, ...missingSeeds];
      writeStore(merged);
      return merged;
    }
    return stored;
  }
  const seed = seedCategories();
  writeStore(seed);
  return seed;
}

export function getActiveCategories(): Category[] {
  return getAllCategories().filter((c) => c.active);
}

export function getCategory(id: string): Category | undefined {
  return getAllCategories().find((c) => c.id === id);
}

export function saveCategories(cats: Category[]): void {
  writeStore(cats);
}

export function upsertCategory(input: Partial<Category> & { id: string }): Category {
  const all = getAllCategories();
  const idx = all.findIndex((c) => c.id === input.id);
  if (idx >= 0) {
    const next: Category = {
      ...all[idx],
      ...input,
      // builtIn flag is immutable
      builtIn: all[idx].builtIn,
      nameLocalized: input.nameLocalized ?? all[idx].nameLocalized,
    };
    all[idx] = next;
    writeStore(all);
    return next;
  }
  const created: Category = {
    id: input.id,
    nameLocalized: input.nameLocalized ?? { uz: input.id },
    descriptionLocalized: input.descriptionLocalized,
    emoji: input.emoji ?? "📋",
    icon: input.icon,
    iconFamily: input.iconFamily,
    color: input.color ?? FALLBACK_COLOR,
    gradient: input.gradient ?? null,
    baseCost: input.baseCost ?? 0,
    active: input.active !== false,
    builtIn: false,
    parentCategoryId: input.parentCategoryId ?? null,
    createdAt: new Date().toISOString(),
  };
  all.push(created);
  writeStore(all);
  return created;
}

export function setCategoryActive(id: string, active: boolean): void {
  const all = getAllCategories();
  const idx = all.findIndex((c) => c.id === id);
  if (idx < 0) return;
  all[idx] = { ...all[idx], active };
  writeStore(all);
}

/**
 * Permanently removes a category. Built-in categories can never be
 * hard-deleted (use {@link setCategoryActive}(id, false) instead, which
 * hides them while preserving historical requests/offers/profiles that
 * reference the ID) — only categories created via the admin panel
 * (`builtIn: false`) can actually be deleted.
 */
export function deleteCategory(id: string): { ok: boolean; reason?: string } {
  const all = getAllCategories();
  const idx = all.findIndex((c) => c.id === id);
  if (idx < 0) return { ok: false, reason: "not_found" };
  if (all[idx].builtIn) return { ok: false, reason: "builtin_protected" };
  all.splice(idx, 1);
  writeStore(all);
  return { ok: true };
}

export function resetCategoriesToSeed(): void {
  writeStore(seedCategories());
}

/* ─── Display helpers ────────────────────────────────────────────── */

export function getCategoryDisplayName(id: string, locale: Locale, fallback?: string): string {
  const cat = getCategory(id) ?? getCategory(migrateLegacyCategoryValue(id) ?? "");
  if (cat) return getLocalizedText(cat.nameLocalized, locale);
  return fallback ?? id;
}

export function getCategoryEmoji(id: string): string {
  return getCategory(id)?.emoji ?? "📋";
}

export function getCategoryColor(id: string): string {
  return getCategory(id)?.color ?? FALLBACK_COLOR;
}

/* ─── Migration: legacy translated names → canonical IDs ─────────── */

/**
 * Resolve a single legacy value (id or translated name) to a canonical id.
 * Returns null when no mapping exists (caller decides whether to drop or keep as legacy).
 */
export function migrateLegacyCategoryValue(value: string): string | null {
  return migrateLegacyCategoryValueWith(value, getAllCategories());
}

/**
 * Resolve an array of legacy/id values to a unique list of canonical IDs.
 * Unknown values are silently dropped — use only for display / matching where
 * unrecognized values would be meaningless. For data persistence prefer
 * `migrateCategoryValuesSafe` which preserves unknowns.
 */
export function resolveCategoryIds(values: string[] | undefined | null): string[] {
  if (!values || values.length === 0) return [];
  const out: string[] = [];
  for (const v of values) {
    const id = migrateLegacyCategoryValue(v);
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

/**
 * Safer migration for persistence: maps known values to canonical IDs and
 * **preserves unknown values verbatim**. Guarantees no provider data is lost
 * if a legacy label is missing from the migration map. Dedupes the result.
 */
export function migrateCategoryValuesSafe(values: string[] | undefined | null): string[] {
  if (!values || values.length === 0) return [];
  const out: string[] = [];
  for (const v of values) {
    if (!v) continue;
    const id = migrateLegacyCategoryValue(v);
    const resolved = id ?? v;
    if (!out.includes(resolved)) out.push(resolved);
  }
  return out;
}
