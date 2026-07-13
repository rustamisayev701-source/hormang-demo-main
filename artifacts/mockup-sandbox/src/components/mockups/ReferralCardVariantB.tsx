import { useState } from "react";
import { Copy, Check, Send, User } from "lucide-react";

const MOCK_CODE = "HORMANG-E472F3";
const MOCK_LINK = `https://hormang.uz/auth/register?role=provider&ref=${MOCK_CODE}`;
const MOCK_COUNT = 2;
const MOCK_EARNED = 6;
const MOCK_MAX = 5;

const VIOLET = "#7C3AED";

export default function ReferralCardVariantB() {
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
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-100">
        {/* Violet header strip */}
        <div
          className="px-5 py-4"
          style={{ background: VIOLET }}
        >
          <h2 className="font-extrabold text-white text-base leading-tight">
            Taklif qilgan do'stlaringiz
          </h2>
          <p className="text-purple-200 text-xs mt-0.5">
            {MOCK_COUNT} ta do'st qo'shildi · {MOCK_EARNED} 🪙 topildi
          </p>
        </div>

        {/* Top zone — social avatars */}
        <div className="px-5 py-5">
          <div className="flex items-center gap-3 mb-1">
            {Array.from({ length: MOCK_MAX }).map((_, i) => {
              const filled = i < MOCK_COUNT;
              return (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div
                    className={[
                      "w-11 h-11 rounded-full border-2 flex items-center justify-center transition-all",
                      filled
                        ? "border-purple-400 bg-purple-100"
                        : "border-gray-200 bg-gray-50",
                    ].join(" ")}
                  >
                    {filled ? (
                      <User
                        className="w-5 h-5"
                        style={{ color: VIOLET }}
                        strokeWidth={2.5}
                      />
                    ) : (
                      <User className="w-5 h-5 text-gray-300" strokeWidth={2} />
                    )}
                  </div>
                  <span className="text-[9px] text-gray-400">
                    {filled ? "✓" : `${i + 1}`}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {MOCK_MAX - MOCK_COUNT} ta do'st yana taklif qilinishi mumkin
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100 mx-5" />

        {/* Bottom zone — action */}
        <div className="px-5 py-5">
          {/* Code input */}
          <div className="mb-4">
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
              Referral kodingiz
            </p>
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
              <input
                readOnly
                value={MOCK_CODE}
                className="flex-1 px-3 py-2.5 font-mono text-sm font-bold text-gray-900 bg-transparent outline-none tracking-wide"
              />
              <button
                onClick={copyLink}
                className="px-3 py-2.5 flex items-center gap-1.5 border-l border-gray-200 hover:bg-gray-100 transition-colors"
                style={{ color: VIOLET }}
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span className="text-xs font-bold">
                  {copied ? "Nusxalandi" : "Nusxa"}
                </span>
              </button>
            </div>
          </div>

          {/* Share buttons — full-width stacked */}
          <div className="flex flex-col gap-2">
            <button
              onClick={shareToTelegram}
              className="w-full h-11 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #2AABEE, #229ED9)" }}
            >
              <Send className="w-4 h-4" />
              Telegram orqali ulashish
            </button>
            <button
              onClick={shareToWhatsApp}
              className="w-full h-11 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}
            >
              <Send className="w-4 h-4" />
              WhatsApp orqali ulashish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
