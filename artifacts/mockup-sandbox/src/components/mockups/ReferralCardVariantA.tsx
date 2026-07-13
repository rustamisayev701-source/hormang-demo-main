import { useState } from "react";
import { Copy, Check, Send } from "lucide-react";

const MOCK_CODE = "HORMANG-E472F3";
const MOCK_LINK = `https://hormang.uz/auth/register?role=provider&ref=${MOCK_CODE}`;
const MOCK_COUNT = 2;
const MOCK_EARNED = 6;
const MOCK_MAX = 5;
const TANGA_PER_REFERRAL = 3;

export default function ReferralCardVariantA() {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(MOCK_LINK).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareToTelegram() {
    const text = `Hormangda ijrochi bo'ling va pul ishlang! Mening havolam orqali ro'yxatdan o'ting: ${MOCK_LINK}`;
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(MOCK_LINK)}&text=${encodeURIComponent(text)}`,
      "_blank"
    );
  }

  function shareToWhatsApp() {
    const text = `Hormangda ijrochi bo'ling! Havolam orqali ro'yxatdan o'ting: ${MOCK_LINK}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-xl p-6 w-full max-w-sm border border-gray-100">
        {/* Header */}
        <div className="text-center mb-6">
          <span className="text-3xl block mb-2">🪙</span>
          <h2 className="font-extrabold text-gray-900 text-xl leading-tight">
            Do'stlaringizni taklif qiling
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Har bir taklif uchun {TANGA_PER_REFERRAL} Tanga
          </p>
        </div>

        {/* Earned badge */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center justify-between mb-6">
          <span className="text-amber-700 text-sm font-semibold">Jami topildi</span>
          <span className="text-amber-600 font-extrabold text-xl">{MOCK_EARNED} 🪙</span>
        </div>

        {/* Milestone slots */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 text-center">
            {MOCK_COUNT}/{MOCK_MAX} do'st taklif qilindi
          </p>
          <div className="flex items-center justify-between gap-2">
            {Array.from({ length: MOCK_MAX }).map((_, i) => {
              const filled = i < MOCK_COUNT;
              return (
                <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                  <div
                    className={[
                      "w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all",
                      filled
                        ? "border-amber-400 bg-amber-400 shadow-lg shadow-amber-200"
                        : "border-gray-200 bg-white",
                    ].join(" ")}
                    style={
                      filled
                        ? { boxShadow: "0 0 0 4px rgba(251,191,36,0.2)" }
                        : undefined
                    }
                  >
                    {filled ? (
                      <Check className="w-5 h-5 text-white" strokeWidth={3} />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-gray-200 block" />
                    )}
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap">
                    Do'st {i + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Referral code */}
        <div className="border border-gray-200 rounded-xl px-4 py-3 mb-4 flex items-center justify-between bg-gray-50">
          <div>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">
              Referral kod
            </p>
            <p className="font-extrabold text-gray-900 text-sm tracking-wide font-mono">
              {MOCK_CODE}
            </p>
          </div>
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 transition-colors text-white rounded-lg px-3 py-2"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span className="text-xs font-bold">
              {copied ? "Nusxalandi!" : "Nusxa"}
            </span>
          </button>
        </div>

        {/* Primary CTA */}
        <button
          onClick={copyLink}
          className="w-full h-12 rounded-2xl bg-amber-500 hover:bg-amber-600 transition-colors text-white font-extrabold text-sm flex items-center justify-center gap-2 mb-3 shadow-lg shadow-amber-200"
        >
          <Send className="w-4 h-4" />
          Do'stingizni taklif qiling
        </button>

        {/* Secondary share row */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={shareToTelegram}
            className="h-10 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5"
            style={{ background: "linear-gradient(135deg, #2AABEE, #229ED9)" }}
          >
            <Send className="w-3.5 h-3.5" />
            Telegram
          </button>
          <button
            onClick={shareToWhatsApp}
            className="h-10 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5"
            style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}
          >
            <Send className="w-3.5 h-3.5" />
            WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
