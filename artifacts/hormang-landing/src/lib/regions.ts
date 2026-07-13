/**
 * Unified regions list for Uzbekistan (Toshkent viloyati focus).
 * Used across profile settings, questionnaire, requests, etc.
 */

export interface Region {
  value: string;
  label: string;
  labelRu?: string;
  isCapital?: boolean;
  districts?: string[];
}

export const TOSHKENT_DISTRICTS = [
  "Bektemir",
  "Chilonzor",
  "Mirobod",
  "Mirzo Ulug'bek",
  "Olmazor",
  "Sergeli",
  "Shayxontohur",
  "Uchtepa",
  "Yakkasaroy",
  "Yangihayot",
  "Yashnobod",
  "Yunusobod",
];

/** Russian display names for Tashkent city districts (value → Russian label) */
export const DISTRICT_LABELS_RU: Record<string, string> = {
  "Bektemir":       "Бектемир",
  "Chilonzor":      "Чиланзар",
  "Mirobod":        "Мирабад",
  "Mirzo Ulug'bek": "Мирзо Улугбек",
  "Olmazor":        "Алмазар",
  "Sergeli":        "Сергели",
  "Shayxontohur":   "Шайхантахур",
  "Uchtepa":        "Учтепа",
  "Yakkasaroy":     "Яккасарай",
  "Yangihayot":     "Янгихаёт",
  "Yashnobod":      "Яшнобод",
  "Yunusobod":      "Юнусабад",
};

/** Get a district's display label in the given locale */
export function getDistrictLabel(name: string, locale: string): string {
  if (locale === "ru") return DISTRICT_LABELS_RU[name] ?? name;
  return name;
}

/**
 * Get a fully-localized location string from a ProviderRequest-like object.
 * Prefers district + region codes (translated) over the raw stored location string.
 */
export function getRequestLocation(
  r: { location: string; region?: string; district?: string },
  locale: string,
): string {
  if (r.district && r.region) {
    return `${getDistrictLabel(r.district, locale)}, ${getRegionLabel(r.region, locale)}`;
  }
  if (r.district) return getDistrictLabel(r.district, locale);
  if (r.region)   return getRegionLabel(r.region, locale);
  return r.location;
}

/** Get a region's display label in the given locale */
export function getRegionLabel(value: string, locale: string): string {
  if (locale === "ru") {
    const r = regionsList.find((x) => x.value === value);
    return r?.labelRu ?? r?.label ?? value;
  }
  return regionsList.find((x) => x.value === value)?.label ?? value;
}

export const regionsList: Region[] = [
  {
    value: "Toshkent shahri",
    label: "Toshkent shahri",
    labelRu: "Ташкент",
    isCapital: true,
    districts: TOSHKENT_DISTRICTS,
  },
  { value: "Angren",          label: "Angren",          labelRu: "Ангрен" },
  { value: "Bekobod",         label: "Bekobod",         labelRu: "Бекабад" },
  { value: "Bo'ka",           label: "Bo'ka",           labelRu: "Бука" },
  { value: "Bo'stonliq",      label: "Bo'stonliq",      labelRu: "Бустонлик" },
  { value: "Chinoz",          label: "Chinoz",          labelRu: "Чиноз" },
  { value: "Chirchiq",        label: "Chirchiq",        labelRu: "Чирчик" },
  { value: "Chorvoq",         label: "Chorvoq",         labelRu: "Чарвак" },
  { value: "Do'stobod",       label: "Do'stobod",       labelRu: "Дустабад" },
  { value: "G'azalkent",      label: "G'azalkent",      labelRu: "Газалкент" },
  { value: "Keles",           label: "Keles",           labelRu: "Келес" },
  { value: "Ohangaron",       label: "Ohangaron",       labelRu: "Ахангаран" },
  { value: "Olmaliq",         label: "Olmaliq",         labelRu: "Алмалык" },
  { value: "Oqqo'rg'on",      label: "Oqqo'rg'on",      labelRu: "Аккурган" },
  { value: "O'rta Chirchiq",  label: "O'rta Chirchiq",  labelRu: "Урта Чирчик" },
  { value: "Parkent",         label: "Parkent",         labelRu: "Паркент" },
  { value: "Piskent",         label: "Piskent",         labelRu: "Пискент" },
  { value: "Qibray",          label: "Qibray",          labelRu: "Кибрай" },
  { value: "Quyi Chirchiq",   label: "Quyi Chirchiq",   labelRu: "Куйи Чирчик" },
  { value: "To'ytepa",        label: "To'ytepa",        labelRu: "Тойтепа" },
  { value: "Yangiobod",       label: "Yangiobod",       labelRu: "Янгиобод" },
  { value: "Yangiyо'l",       label: "Yangiyо'l",       labelRu: "Янгиюль" },
  { value: "Yuqori Chirchiq", label: "Yuqori Chirchiq", labelRu: "Юкори Чирчик" },
  { value: "Zangiota",        label: "Zangiota",        labelRu: "Зангиата" },
];
