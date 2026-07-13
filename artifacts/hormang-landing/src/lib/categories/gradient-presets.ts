/**
 * lib/categories/gradient-presets
 *
 * Curated gradient + solid-color palette used by the category editor and the
 * shared `<CategoryIcon />` chip. Gradients are stored as a stable preset id
 * (e.g. "blue-indigo") on `Category.gradient`, so the CSS can evolve without
 * touching stored data.
 */

export interface GradientPreset {
  id: string;
  label: string;
  /** CSS `background-image` value (linear-gradient). */
  css: string;
  /** Representative dot colors for the swatch (start/end). */
  from: string;
  to: string;
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  { id: "blue-indigo",    label: "Blue → Indigo",   css: "linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)", from: "#3B82F6", to: "#6366F1" },
  { id: "sky-cyan",       label: "Sky → Cyan",      css: "linear-gradient(135deg, #0EA5E9 0%, #06B6D4 100%)", from: "#0EA5E9", to: "#06B6D4" },
  { id: "emerald-green",  label: "Emerald → Green", css: "linear-gradient(135deg, #10B981 0%, #22C55E 100%)", from: "#10B981", to: "#22C55E" },
  { id: "amber-orange",   label: "Amber → Orange",  css: "linear-gradient(135deg, #F59E0B 0%, #F97316 100%)", from: "#F59E0B", to: "#F97316" },
  { id: "pink-rose",      label: "Pink → Rose",     css: "linear-gradient(135deg, #EC4899 0%, #F43F5E 100%)", from: "#EC4899", to: "#F43F5E" },
  { id: "purple-violet",  label: "Purple → Violet", css: "linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)", from: "#8B5CF6", to: "#A855F7" },
  { id: "slate-gray",     label: "Slate → Gray",    css: "linear-gradient(135deg, #475569 0%, #64748B 100%)", from: "#475569", to: "#64748B" },
];

const GRADIENT_INDEX: Record<string, GradientPreset> = Object.fromEntries(
  GRADIENT_PRESETS.map((g) => [g.id, g]),
);

export function getGradientPreset(id: string | null | undefined): GradientPreset | undefined {
  if (!id) return undefined;
  return GRADIENT_INDEX[id];
}

/** Curated solid color palette for the editor. */
export const CATEGORY_COLOR_PRESETS: string[] = [
  "#3B82F6", "#6366F1", "#10B981", "#F59E0B",
  "#EC4899", "#8B5CF6", "#EF4444", "#14B8A6", "#64748B",
];
