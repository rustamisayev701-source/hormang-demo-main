/**
 * data/faq.ts
 * FAQ and platform guidelines as multilingual LocalizedText objects (UZ + RU).
 *
 * Structure mirrors a future DB table:
 *   faq_items(id, question_uz, question_ru, answer_uz, answer_ru)
 */
import type { LocalizedText } from "@/lib/localization";

export interface FaqItem {
  id: string;
  question: LocalizedText;
  answer: LocalizedText;
}

export interface GuidelineItem {
  id: string;
  title: LocalizedText;
  desc: LocalizedText;
}

export const faqItems: FaqItem[] = [
  {
    id: "order_process",
    question: {
      uz: "Buyurtma qanday ishlaydi?",
      ru: "Как работает заказ?",
    },
    answer: {
      uz: "Kategoriyani tanlang, so'rov yuboring va tekshirilgan ijrochilardan takliflar oling.",
      ru: "Выберите категорию, отправьте запрос и получите предложения от проверенных исполнителей.",
    },
  },
  {
    id: "payment",
    question: {
      uz: "To'lov qanday amalga oshiriladi?",
      ru: "Как осуществляется оплата?",
    },
    answer: {
      uz: "To'lov ijrochi va mijoz o'rtasida to'g'ridan-to'g'ri kelishiladi. Hormang ichki to'lovlarni amalga oshirmaydi.",
      ru: "Оплата согласовывается напрямую между исполнителем и клиентом. Hormang не обрабатывает платежи.",
    },
  },
  {
    id: "choose_provider",
    question: {
      uz: "Ijrochini qanday tanlash mumkin?",
      ru: "Как выбрать исполнителя?",
    },
    answer: {
      uz: "Reyting, sharhlar va nishonlarga e'tibor bering. Ijrochi profilini diqqat bilan o'rganib chiqing.",
      ru: "Обращайте внимание на рейтинг, отзывы и значки. Внимательно изучайте профиль исполнителя.",
    },
  },
  {
    id: "cancel_offer",
    question: {
      uz: "Taklifni bekor qilish mumkinmi?",
      ru: "Можно ли отменить предложение?",
    },
    answer: {
      uz: "Mijoz bilan kelishgan holda taklifni bekor qilish mumkin, lekin taklif yuborishda sarflangan Tangani qaytarish imkoni mavjud emas.",
      ru: "Предложение может быть отменено по соглашению с клиентом, но возврат Tanga, потраченных на отправку предложения, невозможен.",
    },
  },
  {
    id: "become_provider",
    question: {
      uz: "Ijrochi bo'lish uchun nima qilish kerak?",
      ru: "Что нужно сделать, чтобы стать исполнителем?",
    },
    answer: {
      uz: "Bosh sahifadan 'Ijrochi bo'lish' bo'limini tanlang, HORMANGda ijrochi sifatida ro'yxatdan o'ting va profilingizni to'ldiring.",
      ru: "На главной странице перейдите в раздел «Стать исполнителем», зарегистрируйтесь как исполнитель HORMANG и заполните профиль.",
    },
  },
  {
    id: "tanga",
    question: {
      uz: "Tanga nima va nima uchun kerak?",
      ru: "Что такое Tanga и для чего она нужна?",
    },
    answer: {
      uz: "Tanga — platformadagi ichki valyuta. Ijrochilar mijozlarga taklif yuborish uchun Tanga sarflaydi.",
      ru: "Tanga — внутренняя валюта платформы. Исполнители тратят Tanga, чтобы отправлять предложения клиентам.",
    },
  },
];

export const guidelineItems: GuidelineItem[] = [
  {
    id: "respect",
    title: {
      uz: "Hurmat bilan muloqot",
      ru: "Уважительное общение",
    },
    desc: {
      uz: "HORMANG platformasida barcha foydalanuvchilar bir-biriga hurmat bilan munosabatda bo'lishi kerak. Haqorat, tahdid, kamsitish yoki bezovta qiluvchi xatti-harakatlar qat'iyan ta'qiqlanadi.",
      ru: "Все пользователи платформы HORMANG обязаны относиться друг к другу с уважением. Оскорбления, угрозы, дискриминация или домогательства строго запрещены.",
    },
  },
  {
    id: "no_fraud",
    title: {
      uz: "Halollik va soflik",
      ru: "Честность и правдивость",
    },
    desc: {
      uz: "Profilingiz, xizmatlaringiz, narxlaringiz va sharhlaringizda faqat haqiqiy va to'g'ri ma'lumotlardan foydalaning. Firibgarlik yoki yolg'on ma'lumotlar qat'iyan taqiqlanadi.",
      ru: "Используйте только достоверную и точную информацию в своем профиле, описании услуг, ценах и отзывах. Мошенничество или предоставление ложной информации строго запрещено.",
    },
  },
  {
    id: "no_threats",
    title: {
      uz: "Platformadan adolatli foydalanish",
      ru: "Добросовестное использование платформы",
    },
    desc: {
      uz: "Spam, tizimdan noto'g'ri foydalanish, soxta so'rov yoki takliflar yuborish, yoki platforma qoidalarini chetlab o'tishga urinish taqiqlanadi. Hormang barcha foydalanuvchilar uchun xavfsiz va adolatli bo'lishi kerak.",
      ru: "Спам, злоупотребление системой, отправка поддельных запросов или предложений, а также попытки обойти правила платформы запрещены. Hormang должен быть безопасным и справедливым для всех пользователей.",
    },
  },
];
