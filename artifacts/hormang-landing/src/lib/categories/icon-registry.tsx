/**
 * lib/categories/icon-registry
 *
 * Curated set of Phosphor icons available for category configuration in the
 * admin editor. Keep this list intentionally short and product-relevant so the
 * picker stays mobile-friendly. Icons are referenced by their string name in
 * `Category.icon` so they remain serialisable to localStorage.
 *
 * To add a new icon: import it from `@phosphor-icons/react`, add it to
 * `CATEGORY_ICONS` with its display label, and (optionally) extend
 * `EMOJI_TO_ICON` so legacy emoji-only categories auto-suggest it on edit.
 */
import type { Icon } from "@phosphor-icons/react";
import {
  Wrench, Broom, Car, Truck, Sparkle, BookOpen, Hammer, Heartbeat, PaintBrush,
  Scissors, Camera, Laptop, Package, Gift, CookingPot, Dog, Baby, Flower,
  Couch, Plug, PaintRoller, ShieldCheck, MapPin, Storefront, Briefcase,
  Basket, Shower, Fan, House, DeviceMobile,
} from "@phosphor-icons/react";

export interface CategoryIconDef {
  /** Stable string id stored on Category.icon. */
  name: string;
  /** Short UZ label shown under the picker tile. */
  label: string;
  /** Phosphor component to render. */
  Component: Icon;
}

/**
 * Curated 30 icons. The first 9 directly cover the current built-in Hormang
 * categories (Ta'mirlash, Tozalash, Avto, Ko'chirish, Go'zallik, Ta'lim,
 * Qurilish, Hamshiralik, Bo'yoq). The remaining 21 cover likely future
 * categories so admins rarely need a custom icon.
 */
export const CATEGORY_ICONS: CategoryIconDef[] = [
  // Priority 9 — mapped to current categories
  { name: "Wrench",       label: "Ta'mirlash",   Component: Wrench       },
  { name: "Broom",        label: "Tozalash",     Component: Broom        },
  { name: "Car",          label: "Avto",         Component: Car          },
  { name: "Truck",        label: "Ko'chirish",   Component: Truck        },
  { name: "Sparkle",      label: "Go'zallik",    Component: Sparkle      },
  { name: "BookOpen",     label: "Ta'lim",       Component: BookOpen     },
  { name: "Hammer",       label: "Qurilish",     Component: Hammer       },
  { name: "Heartbeat",    label: "Salomatlik",   Component: Heartbeat    },
  { name: "PaintBrush",   label: "Dizayn",       Component: PaintBrush   },
  // Additional 21 — future-ready
  { name: "Scissors",     label: "Soch",         Component: Scissors     },
  { name: "Camera",       label: "Foto",         Component: Camera       },
  { name: "Laptop",       label: "IT",           Component: Laptop       },
  { name: "Package",      label: "Yetkazib b.",  Component: Package      },
  { name: "Gift",         label: "Sovg'a",       Component: Gift         },
  { name: "CookingPot",   label: "Oshxona",      Component: CookingPot   },
  { name: "Dog",          label: "Hayvonlar",    Component: Dog          },
  { name: "Baby",         label: "Bolalar",      Component: Baby         },
  { name: "Flower",       label: "Gullar",       Component: Flower       },
  { name: "Couch",        label: "Mebel",        Component: Couch        },
  { name: "Plug",         label: "Elektr",       Component: Plug         },
  { name: "PaintRoller",  label: "Bo'yoq",       Component: PaintRoller  },
  { name: "ShieldCheck",  label: "Xavfsizlik",   Component: ShieldCheck  },
  { name: "MapPin",       label: "Lokatsiya",    Component: MapPin       },
  { name: "Storefront",   label: "Do'kon",       Component: Storefront   },
  { name: "Briefcase",    label: "Biznes",       Component: Briefcase    },
  { name: "Basket",       label: "Xarid",        Component: Basket       },
  { name: "Shower",       label: "Santexnika",   Component: Shower       },
  { name: "Fan",          label: "Konditsioner", Component: Fan          },
  { name: "House",        label: "Uy",           Component: House        },
  { name: "DeviceMobile", label: "Telefon",      Component: DeviceMobile },
];

const ICON_INDEX: Record<string, CategoryIconDef> = Object.fromEntries(
  CATEGORY_ICONS.map((i) => [i.name, i]),
);

/** Look up a curated icon by name. Returns undefined for unknown names. */
export function getCategoryIconDef(name: string | undefined | null): CategoryIconDef | undefined {
  if (!name) return undefined;
  return ICON_INDEX[name];
}

/**
 * Legacy emoji → curated icon name. Used by the admin editor to auto-suggest
 * an icon when opening a category that only has an emoji set. Admins can
 * always override the suggestion before saving.
 */
export const EMOJI_TO_ICON: Record<string, string> = {
  "🔧": "Wrench",
  "🛠️": "Wrench",
  "🧰": "Wrench",
  "🧹": "Broom",
  "🚗": "Car",
  "🚙": "Car",
  "🚚": "Truck",
  "📚": "BookOpen",
  "📖": "BookOpen",
  "🎉": "Gift",
  "💄": "Sparkle",
  "✨": "Sparkle",
  "👶": "Baby",
  "🏗️": "Hammer",
  "🔨": "Hammer",
  "🏥": "Heartbeat",
  "❤️": "Heartbeat",
  "🎨": "PaintBrush",
  "🖌️": "PaintBrush",
  "✂️": "Scissors",
  "💇": "Scissors",
  "📷": "Camera",
  "📸": "Camera",
  "💻": "Laptop",
  "🖥️": "Laptop",
  "📦": "Package",
  "🎁": "Gift",
  "🍳": "CookingPot",
  "🐶": "Dog",
  "🐾": "Dog",
  "🌸": "Flower",
  "🌱": "Flower",
  "🛋️": "Couch",
  "🔌": "Plug",
  "🛡️": "ShieldCheck",
  "📍": "MapPin",
  "🏪": "Storefront",
  "💼": "Briefcase",
  "🛒": "Basket",
  "🚿": "Shower",
  "🏠": "House",
  "🏡": "House",
  "📱": "DeviceMobile",
};

/** Suggest a curated icon name from an emoji glyph. */
export function suggestIconFromEmoji(emoji: string | undefined | null): string | undefined {
  if (!emoji) return undefined;
  return EMOJI_TO_ICON[emoji];
}
