/**
 * components/category-icon
 *
 * Shared rendering primitive for a category's visual chip. Resolution order:
 *   1. Explicit `icon` prop (with optional `color`/`gradient`).
 *   2. Look up by `categoryId` from the live categories store.
 *   3. Explicit `emoji` prop / category's legacy emoji glyph.
 *   4. Generic 📋 fallback.
 *
 * The chip is a rounded square (matches the existing emoji boxes used across
 * the app). When `bare` is true, only the icon glyph / emoji character is
 * rendered (no background) — useful for inline text contexts.
 */
import { getCategory } from "@/lib/categories";
import { getCategoryIconDef } from "@/lib/categories/icon-registry";
import { getGradientPreset } from "@/lib/categories/gradient-presets";

export interface CategoryIconProps {
  /** Looks up icon/color/gradient/emoji from the live categories store. */
  categoryId?: string | null;
  /** Curated icon name (e.g. "Wrench"). Overrides categoryId lookup. */
  icon?: string | null;
  /** Future-proof — currently only "phosphor". */
  iconFamily?: string | null;
  /** Solid hex background. Used when no gradient is set. */
  color?: string | null;
  /** Gradient preset id. Overrides `color` when set. */
  gradient?: string | null;
  /** Legacy emoji fallback. */
  emoji?: string | null;
  /** Chip edge length in px. Defaults to 40. */
  size?: number;
  /** Rounded square (default) or circle. */
  shape?: "square" | "circle";
  /** Render only the glyph (no background chip). */
  bare?: boolean;
  /** Extra classes applied to the outer wrapper. */
  className?: string;
  /** Optional drop shadow. */
  shadow?: boolean;
}

const FALLBACK_COLOR = "#3B82F6";

export function CategoryIcon({
  categoryId, icon, iconFamily, color, gradient, emoji,
  size = 40, shape = "square", bare = false, className = "", shadow = false,
}: CategoryIconProps) {
  // Resolve from category store when explicit props are absent.
  const cat = categoryId ? getCategory(categoryId) : undefined;
  const resolvedIcon       = icon       ?? cat?.icon       ?? undefined;
  const resolvedIconFamily = iconFamily ?? cat?.iconFamily ?? "phosphor";
  const resolvedGradient   = gradient   ?? cat?.gradient   ?? null;
  const resolvedColor      = color      ?? cat?.color      ?? FALLBACK_COLOR;
  const resolvedEmoji      = emoji      ?? cat?.emoji      ?? "📋";

  const iconDef = resolvedIconFamily === "phosphor"
    ? getCategoryIconDef(resolvedIcon)
    : undefined;

  const radius = shape === "circle" ? "9999px" : `${Math.max(6, Math.round(size * 0.28))}px`;
  const glyphSize = Math.round(size * 0.55);

  // ── Bare mode: just the glyph, no chip background ─────────────────────
  if (bare) {
    if (iconDef) {
      const Icon = iconDef.Component;
      return (
        <Icon
          size={glyphSize}
          weight="fill"
          className={className}
          aria-hidden="true"
        />
      );
    }
    return (
      <span
        className={className}
        style={{ fontSize: `${glyphSize}px`, lineHeight: 1 }}
        aria-hidden="true"
      >
        {resolvedEmoji}
      </span>
    );
  }

  // ── Chip mode: rounded background + centered glyph ────────────────────
  const background = resolvedGradient
    ? (getGradientPreset(resolvedGradient)?.css ?? resolvedColor)
    : resolvedColor;

  const wrapperStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: radius,
    background,
  };

  if (iconDef) {
    const Icon = iconDef.Component;
    return (
      <span
        className={`inline-flex items-center justify-center flex-shrink-0 ${shadow ? "shadow-sm" : ""} ${className}`}
        style={wrapperStyle}
        aria-hidden="true"
      >
        <Icon size={glyphSize} weight="fill" color="#FFFFFF" />
      </span>
    );
  }

  // No icon set → render the emoji centered, on a soft tint of the color so
  // legacy categories keep their familiar look. (Emoji glyphs already carry
  // their own color; a white background mute would clash.)
  const tintBg = resolvedGradient
    ? background
    : `${resolvedColor}1A`; // ~10% alpha
  const tintBorder = resolvedGradient ? "transparent" : `${resolvedColor}33`;

  return (
    <span
      className={`inline-flex items-center justify-center flex-shrink-0 ${shadow ? "shadow-sm" : ""} ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: tintBg,
        border: `1px solid ${tintBorder}`,
        fontSize: `${glyphSize}px`,
        lineHeight: 1,
      }}
      aria-hidden="true"
    >
      {resolvedEmoji}
    </span>
  );
}
