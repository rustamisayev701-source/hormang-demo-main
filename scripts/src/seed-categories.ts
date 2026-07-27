import { db, categoriesTable, categoryQuestionsTable, commonQuestionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const CATEGORIES = [
  { id: "tamirlash", nameUz: "Ta'mirlash", nameRu: "Ремонт", emoji: "🔧", color: "#3B82F6" },
  { id: "tozalash", nameUz: "Tozalash", nameRu: "Уборка", emoji: "🧹", color: "#10B981" },
  { id: "avto", nameUz: "Avto xizmat", nameRu: "Авто услуги", emoji: "🚗", color: "#F59E0B" },
  { id: "kochirish", nameUz: "Ko'chirish / yuk", nameRu: "Переезд / доставка", emoji: "🚚", color: "#8B5CF6" },
  { id: "repetitor", nameUz: "Repetitorlar", nameRu: "Репетиторы", emoji: "📚", color: "#EC4899" },
  { id: "tadbir", nameUz: "Tadbir xizmatlari", nameRu: "Ивент услуги", emoji: "🎉", color: "#F43F5E" },
  { id: "gozallik", nameUz: "Go'zallik", nameRu: "Красота", emoji: "💄", color: "#EAB308" },
  { id: "enaga", nameUz: "Enagalik", nameRu: "Няня", emoji: "👶", color: "#06B6D4" },
  { id: "ustachilik", nameUz: "Ustachilik", nameRu: "Строительство", emoji: "🏗️", color: "#64748B" },
];

const CATEGORY_QUESTIONS: Record<string, unknown[]> = {
  tamirlash: [
    {
      id: "repair_items", label: "Nimani ta'mirlash kerak?", type: "multi-select", required: true,
      options: [
        { label: "Santexnika", value: "santexnika" },
        { label: "Elektr jihozlari", value: "elektr" },
        { label: "Mebel", value: "mebel" },
        { label: "Konditsioner", value: "konditsioner" },
        { label: "Muzlatgich", value: "muzlatgich" },
        { label: "Kir yuvish mashinasi", value: "kir_yuvish" },
        { label: "Boshqa", value: "boshqa", type: "other" },
      ],
    },
    { id: "repair_desc", label: "Muammoni qisqacha tasvirlab bering.", type: "textarea", placeholder: "Muammo haqida batafsil yozing..." },
    { id: "repair_photo", label: "Rasm yuklash", type: "file" },
  ],
  tozalash: [
    {
      id: "clean_type", label: "Tozalash turi?", type: "single-select", required: true,
      options: [
        { label: "Oddiy", value: "oddiy" },
        { label: "Chuqur", value: "chuqur" },
        { label: "Ko'chib kirishdan oldin", value: "kochib_kirish" },
        { label: "Boshqa", value: "boshqa", type: "other" },
      ],
    },
    {
      id: "clean_place", label: "Joy turi?", type: "single-select",
      options: [
        { label: "Kvartira", value: "kvartira" },
        { label: "Ofis", value: "ofis" },
        { label: "Hovli", value: "hovli" },
        { label: "Boshqa", value: "boshqa", type: "other" },
      ],
    },
    { id: "clean_size", label: "Joy hajmi? (xona soni yoki kvm)", type: "number", placeholder: "Masalan: 3 (xona) yoki 80 (kvm)" },
    { id: "clean_notes", label: "Qo'shimcha ma'lumotlar", type: "textarea", placeholder: "Boshqa ma'lumotlar..." },
    { id: "clean_photo", label: "Rasm yuklash", type: "file" },
  ],
  avto: [
    {
      id: "avto_type", label: "Xizmat turi?", type: "single-select", required: true,
      options: [
        { label: "Yuvish", value: "yuvish" },
        { label: "Ta'mirlash", value: "tamirlash" },
        { label: "Diagnostika", value: "diagnostika" },
        { label: "Boshqa", value: "boshqa", type: "other" },
      ],
    },
    { id: "avto_car", label: "Mashina markasi?", type: "text", placeholder: "Masalan: Chevrolet Cobalt" },
    { id: "avto_notes", label: "Qo'shimcha ma'lumotlar", type: "textarea", placeholder: "Boshqa ma'lumotlar..." },
    { id: "avto_photo", label: "Rasm yuklash", type: "file" },
  ],
  kochirish: [
    {
      id: "move_cargo", label: "Yuk turi?", type: "single-select", required: true,
      options: [
        { label: "Xonadon jihozlari", value: "xonadon" },
        { label: "Ofis jihozlari", value: "ofis" },
        { label: "Oziq-ovqat mahsulotlari", value: "oziq_ovqat" },
        { label: "Boshqa", value: "boshqa", type: "other" },
      ],
    },
    { id: "move_from", label: "Qayerdan? (manzil)", type: "text", placeholder: "Yuk olinadigan manzil..." },
    { id: "move_to", label: "Qayerga? (manzil)", type: "text", placeholder: "Yuk yetkaziladigan manzil..." },
    { id: "move_lift", label: "Lift mavjudmi?", type: "yes-no" },
    { id: "move_floor", label: "Nechanchi qavat?", type: "number", placeholder: "Qavat raqami" },
    { id: "move_notes", label: "Qo'shimcha ma'lumotlar", type: "textarea", placeholder: "Boshqa ma'lumotlar..." },
    { id: "move_photo", label: "Rasm yuklash", type: "file" },
  ],
  repetitor: [
    {
      id: "rep_subject", label: "Fan turi?", type: "single-select", required: true,
      options: [
        { label: "Ingliz tili", value: "ingliz" },
        { label: "Rus tili", value: "rus" },
        { label: "Matematika", value: "matematika" },
        { label: "Musiqa", value: "musiqa" },
        { label: "Boshqa", value: "boshqa", type: "other" },
      ],
    },
    {
      id: "rep_level", label: "Hozirgi darajangiz?", type: "single-select",
      options: [
        { label: "Boshlang'ich", value: "boshlangich" },
        { label: "O'rta", value: "orta" },
        { label: "Yuqori", value: "yuqori" },
      ],
    },
    {
      id: "rep_format", label: "Dars formati?", type: "single-select",
      options: [
        { label: "Online", value: "online" },
        { label: "Offline", value: "offline" },
      ],
    },
    { id: "rep_notes", label: "Qo'shimcha ma'lumotlar", type: "textarea", placeholder: "Boshqa ma'lumotlar..." },
  ],
  tadbir: [
    {
      id: "event_type", label: "Tadbir turi?", type: "single-select", required: true,
      options: [
        { label: "To'y", value: "toy" },
        { label: "Tug'ilgan kun", value: "tugilgan_kun" },
        { label: "Kelin salom", value: "kelin_salom" },
        { label: "Gap", value: "gap" },
        { label: "Korporativ", value: "korporativ" },
        { label: "Boshqa", value: "boshqa", type: "other" },
      ],
    },
    {
      id: "event_services", label: "Xizmat turi?", type: "multi-select",
      options: [
        { label: "Ovqat pishirish", value: "ovqat" },
        { label: "Bezash xizmati", value: "bezash" },
        { label: "Video/rasm xizmati", value: "video_rasm" },
        { label: "Tashkillashtirish xizmati", value: "tashkil" },
        { label: "Ijara xizmati", value: "ijara" },
        { label: "Tozalash xizmati", value: "tozalash" },
        { label: "Kortej xizmati", value: "kortej" },
        { label: "Musiqiy xizmatlar", value: "musiqa" },
        { label: "Boshqa", value: "boshqa", type: "other" },
      ],
    },
    { id: "event_date", label: "Belgilangan sana?", type: "date" },
    { id: "event_notes", label: "Qo'shimcha ma'lumotlar", type: "textarea", placeholder: "Boshqa ma'lumotlar..." },
  ],
  gozallik: [
    {
      id: "beauty_service", label: "Xizmat turi?", type: "single-select", required: true,
      options: [
        { label: "Makiyaj", value: "makiyaj" },
        { label: "Manikyur/pedikyur", value: "manikyur" },
        { label: "Soch turmak", value: "soch" },
        { label: "Qosh/kiprik", value: "qosh_kiprik" },
        { label: "Boshqa", value: "boshqa", type: "other" },
      ],
    },
    {
      id: "beauty_reason", label: "Xizmat sababi?", type: "single-select",
      options: [
        { label: "Kundalik", value: "kundalik" },
        { label: "To'y marosimlari", value: "toy" },
        { label: "Boshqa tadbirlar", value: "boshqa_tadbir" },
      ],
    },
    {
      id: "beauty_location", label: "Xizmat joyi?", type: "single-select",
      options: [
        { label: "Uyda", value: "uyda" },
        { label: "Salonda", value: "salon" },
      ],
    },
    { id: "beauty_notes", label: "Qo'shimcha ma'lumotlar", type: "textarea", placeholder: "Boshqa ma'lumotlar..." },
    { id: "beauty_photo", label: "Rasm yuklash", type: "file" },
  ],
  enaga: [
    {
      id: "nanny_type", label: "Enagalik turi?", type: "single-select", required: true,
      options: [
        { label: "Yosh bola", value: "yosh_bola" },
        { label: "Qariya", value: "qariya" },
      ],
    },
    {
      id: "nanny_gender", label: "Enaga jinsi?", type: "single-select",
      options: [
        { label: "Erkak", value: "erkak" },
        { label: "Ayol", value: "ayol" },
      ],
    },
    { id: "nanny_notes", label: "Qo'shimcha ma'lumotlar", type: "textarea", placeholder: "Boshqa ma'lumotlar..." },
  ],
  ustachilik: [
    {
      id: "craft_service", label: "Xizmat turi?", type: "single-select", required: true,
      options: [
        { label: "Qurilish va tashqi fasad", value: "qurilish" },
        { label: "Ichki pardozlash ishlari", value: "pardozlash" },
        { label: "Kommunikatsiya ishlari", value: "kommunikatsiya" },
        { label: "Duradgorlik ishlari", value: "duradgorlik" },
        { label: "Landshaft va dizayn", value: "landshaft" },
        { label: "Boshqa", value: "boshqa", type: "other" },
      ],
    },
    {
      id: "craft_place", label: "Joy turi?", type: "single-select",
      options: [
        { label: "Kvartira", value: "kvartira" },
        { label: "Hovli", value: "hovli" },
        { label: "Noturar bino", value: "noturar" },
      ],
    },
    {
      id: "craft_accommodation", label: "Ovqat va yotoq bilan ta'minlash?", type: "single-select",
      options: [
        { label: "Ha", value: "ha" },
        { label: "Faqat ovqat", value: "faqat_ovqat" },
        { label: "Faqat yotoq", value: "faqat_yotoq" },
        { label: "Yo'q", value: "yoq" },
      ],
    },
    { id: "craft_notes", label: "Boshqa ma'lumotlar", type: "textarea", placeholder: "Boshqa ma'lumotlar..." },
  ],
};

const COMMON_QUESTIONS: unknown[] = [
  { id: "location", label: "Manzilni kiriting", type: "location", required: true, isCore: true },
  {
    id: "urgency", label: "Shoshilinchlik darajasi", type: "single-select", required: true, isCore: true,
    options: [
      { label: "Bugun yoki ertaga kerak", value: "today_tomorrow" },
      { label: "3–7 kun", value: "3_7_days" },
      { label: "1–2 hafta", value: "1_2_weeks" },
      { label: "Shoshilinch emas (qulay vaqt)", value: "flexible" },
    ],
  },
  { id: "budget", label: "Taxminiy byudjet", type: "number", isCore: true, placeholder: "Masalan: 500 000", helpText: "so'm" },
];

async function main() {
  for (const cat of CATEGORIES) {
    const [existing] = await db.select({ id: categoriesTable.id }).from(categoriesTable).where(eq(categoriesTable.id, cat.id)).limit(1);
    if (existing) {
      console.log(`Category already exists, skipping: ${cat.id}`);
    } else {
      await db.insert(categoriesTable).values({ ...cat, builtin: true, baseCost: 0, active: true });
      console.log(`Inserted category: ${cat.id}`);
    }

    const [existingQ] = await db
      .select({ categoryId: categoryQuestionsTable.categoryId })
      .from(categoryQuestionsTable)
      .where(eq(categoryQuestionsTable.categoryId, cat.id))
      .limit(1);
    if (!existingQ) {
      await db.insert(categoryQuestionsTable).values({ categoryId: cat.id, questions: CATEGORY_QUESTIONS[cat.id] ?? [] });
      console.log(`Inserted questions for: ${cat.id}`);
    }
  }

  const [existingCommon] = await db.select({ id: commonQuestionsTable.id }).from(commonQuestionsTable).where(eq(commonQuestionsTable.id, "singleton")).limit(1);
  if (!existingCommon) {
    await db.insert(commonQuestionsTable).values({ id: "singleton", questions: COMMON_QUESTIONS });
    console.log("Inserted common questions");
  } else {
    console.log("Common questions already exist, skipping");
  }

  console.log("Done seeding categories.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
