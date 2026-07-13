/**
 * data/questions.ts
 * Mock multilingual question data for all platform content types.
 *
 * Structure mirrors future DB tables:
 *   survey_questions(id, category_id, type, label_uz, label_ru, placeholder_uz, placeholder_ru, ...)
 *   question_options(id, question_id, value, label_uz, label_ru, tanga_cost)
 *
 * Replace mock data → real API calls without any frontend rewrites.
 *
 * Supported question types: text | textarea | select | multi-select |
 *   number | slider | boolean | date | image-upload | price | location
 */
import type { LocalizedText } from "@/lib/localization";

/* ─── Core types ────────────────────────────────────────────────── */

export type DynQuestionType =
  | "text"
  | "textarea"
  | "select"
  | "multi-select"
  | "number"
  | "slider"
  | "boolean"
  | "date"
  | "image-upload"
  | "price"
  | "location";

export interface DynQuestionOption {
  id: string;
  value: string;
  label: LocalizedText;
  tangaCost?: number;
}

export interface ShowIfCondition {
  questionId: string;
  equals: string;
}

export interface DynQuestion {
  id: string;
  type: DynQuestionType;
  question: LocalizedText;
  placeholder?: LocalizedText;
  helpText?: LocalizedText;
  options?: DynQuestionOption[];
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  showIf?: ShowIfCondition;
}

/* ─── Survey questions — Cleaning (tozalash) ────────────────────── */

export const TOZALASH_QUESTIONS: DynQuestion[] = [
  {
    id: "clean_type",
    type: "select",
    required: true,
    question: {
      uz: "Tozalash turi qanday?",
      ru: "Какой тип уборки?",
    },
    placeholder: {
      uz: "Tanlang",
      ru: "Выберите",
    },
    options: [
      { id: "oddiy",        value: "oddiy",        label: { uz: "Oddiy",               ru: "Обычная"        } },
      { id: "chuqur",       value: "chuqur",       label: { uz: "Chuqur",              ru: "Генеральная"    } },
      { id: "kochib_kirish",value: "kochib_kirish", label: { uz: "Ko'chib kirishdan oldin", ru: "Перед въездом" } },
      { id: "boshqa",       value: "boshqa",       label: { uz: "Boshqa",              ru: "Другое"         } },
    ],
  },
  {
    id: "clean_place",
    type: "select",
    question: {
      uz: "Joy turi?",
      ru: "Тип помещения?",
    },
    options: [
      { id: "kvartira", value: "kvartira", label: { uz: "Kvartira", ru: "Квартира" } },
      { id: "ofis",     value: "ofis",     label: { uz: "Ofis",     ru: "Офис"     } },
      { id: "hovli",    value: "hovli",    label: { uz: "Hovli",    ru: "Двор"     } },
      { id: "boshqa",   value: "boshqa",   label: { uz: "Boshqa",   ru: "Другое"   } },
    ],
  },
  {
    id: "clean_size",
    type: "number",
    question: {
      uz: "Joy hajmi? (xona soni yoki kvm)",
      ru: "Площадь помещения? (комнат или кв.м)",
    },
    placeholder: {
      uz: "Masalan: 3 (xona) yoki 80 (kvm)",
      ru: "Например: 3 (комнаты) или 80 (кв.м)",
    },
    min: 1,
    max: 999,
  },
  {
    id: "clean_date",
    type: "date",
    question: {
      uz: "Qachon kerak?",
      ru: "Когда нужно?",
    },
  },
  {
    id: "clean_extras",
    type: "multi-select",
    question: {
      uz: "Qo'shimcha xizmatlar kerakmi?",
      ru: "Нужны ли дополнительные услуги?",
    },
    options: [
      { id: "derazalar", value: "derazalar", label: { uz: "Derazalar",    ru: "Окна"             }, tangaCost: 2 },
      { id: "muzlatgich",value: "muzlatgich", label: { uz: "Muzlatgich",  ru: "Холодильник"      }, tangaCost: 2 },
      { id: "pech",      value: "pech",       label: { uz: "Pech/plita",  ru: "Плита/духовка"    }, tangaCost: 2 },
      { id: "shkaf",     value: "shkaf",       label: { uz: "Shkaflar",    ru: "Шкафы"            }, tangaCost: 1 },
    ],
  },
  {
    id: "clean_photo",
    type: "image-upload",
    question: {
      uz: "Fotosuratlar yuklang (ixtiyoriy)",
      ru: "Загрузите фотографии (по желанию)",
    },
    helpText: {
      uz: "Tozalanishi kerak bo'lgan joyning rasmi",
      ru: "Фото помещения, которое нужно убрать",
    },
  },
];

/* ─── Survey questions — Repair (tamirlash) ─────────────────────── */

export const TAMIRLASH_QUESTIONS: DynQuestion[] = [
  {
    id: "repair_items",
    type: "multi-select",
    required: true,
    question: {
      uz: "Nimani ta'mirlash kerak?",
      ru: "Что нужно починить?",
    },
    options: [
      { id: "santexnika", value: "santexnika", label: { uz: "Santexnika",          ru: "Сантехника"        } },
      { id: "elektr",     value: "elektr",     label: { uz: "Elektr jihozlari",    ru: "Электрооборудование" } },
      { id: "mebel",      value: "mebel",      label: { uz: "Mebel",               ru: "Мебель"            } },
      { id: "konditsioner",value:"konditsioner",label: { uz: "Konditsioner",        ru: "Кондиционер"       } },
      { id: "muzlatgich", value: "muzlatgich", label: { uz: "Muzlatgich",          ru: "Холодильник"       } },
      { id: "kir_yuvish", value: "kir_yuvish", label: { uz: "Kir yuvish mashinasi",ru: "Стиральная машина"  } },
      { id: "boshqa",     value: "boshqa",     label: { uz: "Boshqa",              ru: "Другое"            } },
    ],
  },
  {
    id: "repair_desc",
    type: "textarea",
    question: {
      uz: "Muammoni qisqacha tasvirlab bering",
      ru: "Кратко опишите проблему",
    },
    placeholder: {
      uz: "Muammo haqida batafsil yozing...",
      ru: "Подробно опишите проблему...",
    },
  },
  {
    id: "repair_photo",
    type: "image-upload",
    question: {
      uz: "Rasm yuklash",
      ru: "Загрузить фото",
    },
  },
];

/* ─── Onboarding texts ───────────────────────────────────────────── */

export interface OnboardingSlide {
  id: string;
  title: LocalizedText;
  body: LocalizedText;
  emoji: string;
}

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: "welcome",
    emoji: "👋",
    title: {
      uz: "Hormangga xush kelibsiz!",
      ru: "Добро пожаловать в Hormang!",
    },
    body: {
      uz: "Mahalliy xizmat ko'rsatuvchilarni tez va oson toping.",
      ru: "Находите местных специалистов быстро и удобно.",
    },
  },
  {
    id: "how_it_works",
    emoji: "🔍",
    title: {
      uz: "Qanday ishlaydi?",
      ru: "Как это работает?",
    },
    body: {
      uz: "So'rovingizni yuboring — tekshirilgan ustalar o'zlari murojaat qiladi.",
      ru: "Оставьте запрос — проверенные мастера откликнутся сами.",
    },
  },
  {
    id: "tanga",
    emoji: "🪙",
    title: {
      uz: "Tanga nima?",
      ru: "Что такое Tanga?",
    },
    body: {
      uz: "Tanga — platformaning ichki valyutasi. Ijrochilar taklif yuborish uchun Tanga sarflaydi.",
      ru: "Tanga — внутренняя валюта платформы. Исполнители тратят Tanga для отправки предложений.",
    },
  },
  {
    id: "safe",
    emoji: "🛡️",
    title: {
      uz: "Xavfsiz va qulay",
      ru: "Безопасно и удобно",
    },
    body: {
      uz: "Barcha ustalar tekshirilgan. Sharhlar va reytinglar orqali to'g'ri tanlash imkoniyati.",
      ru: "Все мастера проверены. Рейтинги и отзывы помогут сделать правильный выбор.",
    },
  },
];

/* ─── Category descriptions ─────────────────────────────────────── */

export interface CategoryDescription {
  id: string;
  shortDesc: LocalizedText;
  longDesc: LocalizedText;
}

export const CATEGORY_DESCRIPTIONS: CategoryDescription[] = [
  {
    id: "tamirlash",
    shortDesc: { uz: "Uy-joy ta'mirlash xizmatlari", ru: "Услуги по ремонту жилья" },
    longDesc: {
      uz: "Santexnika, elektr, mebel va boshqa ta'mirlash ishlarini bajaradigan mutaxassislar.",
      ru: "Специалисты по сантехнике, электрике, мебели и другим ремонтным работам.",
    },
  },
  {
    id: "tozalash",
    shortDesc: { uz: "Professional tozalash", ru: "Профессиональная уборка" },
    longDesc: {
      uz: "Kvartira, ofis va tijorat binolarini professional tozalash xizmatlari.",
      ru: "Профессиональная уборка квартир, офисов и коммерческих помещений.",
    },
  },
  {
    id: "repetitor",
    shortDesc: { uz: "Xususiy darslar va repetitorlik", ru: "Частные уроки и репетиторство" },
    longDesc: {
      uz: "Maktab, universitet va til o'rganish bo'yicha tajribali repetitorlar.",
      ru: "Опытные репетиторы по школьным предметам, вузовским дисциплинам и языкам.",
    },
  },
];

/* ─── Plan descriptions ─────────────────────────────────────────── */

export interface PlanDescription {
  id: string;
  name: LocalizedText;
  desc: LocalizedText;
  features: LocalizedText[];
}

export const PLAN_DESCRIPTIONS: PlanDescription[] = [
  {
    id: "starter",
    name: { uz: "Boshlang'ich",  ru: "Стартовый"  },
    desc: { uz: "Yangi boshlayotganlar uchun",  ru: "Для начинающих" },
    features: [
      { uz: "5 ta taklif yuborish",        ru: "5 предложений"          },
      { uz: "Asosiy profil",               ru: "Базовый профиль"        },
      { uz: "24-soatlik texnik yordam",    ru: "Техподдержка 24/7"      },
    ],
  },
  {
    id: "pro",
    name: { uz: "Professional",  ru: "Профессиональный" },
    desc: { uz: "Faol ustalar uchun",  ru: "Для активных мастеров" },
    features: [
      { uz: "30 ta taklif yuborish",       ru: "30 предложений"         },
      { uz: "Tasdiqlangan nishon",         ru: "Значок верификации"     },
      { uz: "Qidiruv natijalarida ustuvorlik", ru: "Приоритет в поиске" },
    ],
  },
  {
    id: "business",
    name: { uz: "Biznes",  ru: "Бизнес" },
    desc: { uz: "Kompaniyalar uchun",  ru: "Для компаний" },
    features: [
      { uz: "Cheksiz takliflar",           ru: "Безлимитные предложения"},
      { uz: "Shaxsiy menejer",             ru: "Персональный менеджер"  },
      { uz: "Maxsus reklama imkoniyatlari",ru: "Рекламные возможности"  },
    ],
  },
];
