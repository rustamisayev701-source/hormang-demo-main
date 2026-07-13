import { uz, type Dict } from "./locales/uz";
import { ru } from "./locales/ru";

export type Locale = "uz" | "ru";

export const LOCALES: { code: Locale; name: string }[] = [
  { code: "uz", name: "O'zbekcha" },
  { code: "ru", name: "Русский" },
];

export const dictionaries: Record<Locale, Dict> = { uz, ru };

export function tFormat(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ""));
}

export function getAuthError(code: string, t: Dict): string {
  if (!code) return t.common.errorGeneric;
  const errors = t.authErrors as Record<string, string>;
  return errors[code] ?? t.common.errorGeneric;
}

export function getBudgetLabel(raw: string | undefined, t: Dict): string {
  if (!raw) return "";
  if (raw === "Taklifga ochiq" || raw === "BUDGET_OPEN") return t.misc.openToOffers;
  if (raw === "Kelishiladi" || raw === "BUDGET_NEGOTIABLE") return t.misc.budgetNegotiable;
  return raw;
}

export type { Dict };
