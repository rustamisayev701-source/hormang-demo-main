import { useState } from "react";
import { Copy, Check, Send, Scissors } from "lucide-react";

const MOCK_CODE = "HORMANG-E472F3";
const MOCK_LINK = `https://hormang.uz/auth/register?role=provider&ref=${MOCK_CODE}`;
const MOCK_COUNT = 2;
const MOCK_EARNED = 6;
const MOCK_MAX = 5;

const VIOLET = "#7C3AED";

export default function ReferralCardVariantC() {
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

  const progressPct = Math.min(100, (MOCK_COUNT / MOCK_MAX) * 100);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Label above */}
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-3 px-1">
          Referral kartasi
        </p>

        {/* Voucher card */}
        <div
          className="rounded-2xl shadow-2xl overflow-hidden flex"
          style={{ minHeight: 200 }}
        >
          {/* LEFT column — reward zone (violet) */}
          <div
            className="flex flex-col items-center justify-center px-4 py-5 relative"
            style={{ background: VIOLET, width: "38%" }}
          >
            {/* Perforation holes top */}
            <div className="absolute top-0 right-0 flex flex-col gap-1.5 py-2 -mr-px">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-gray-100"
                  style={{ marginRight: -4 }}
                />
              ))}
            </div>
            {/* Perforation holes bottom */}
            <div className="absolute bottom-0 right-0 flex flex-col gap-1.5 py-2 -mr-px">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-gray-100"
                  style={{ marginRight: -4 }}
                />
              ))}
            </div>

            {/* Scissors icon at top */}
            <div className="absolute top-2 right-0 -translate-x-1">
              <Scissors className="w-3.5 h-3.5 text-purple-300 rotate-90" />
            </div>

            <span className="text-4xl mb-1">🪙</span>
            <p className="text-white font-extrabold text-2xl leading-none">
              {MOCK_EARNED}
            </p>
            <p className="text-purple-300 text-[11px] font-semibold mt-1 text-center leading-tight">
              Tanga
              <br />
              topildi
            </p>
          </div>

          {/* Dashed vertical separator */}
          <div
            className="flex-shrink-0 flex flex-col items-center justify-center"
            style={{ width: 2, background: "repeating-linear-gradient(to bottom, transparent, transparent 6px, #d1d5db 6px, #d1d5db 12px)" }}
          />

          {/* RIGHT column — info + share (white) */}
          <div className="flex-1 bg-white px-4 py-5 flex flex-col justify-between">
            {/* Code */}
            <div className="mb-3">
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">
                Referral kod
              </p>
              <p className="font-mono font-extrabold text-gray-900 text-sm tracking-wide">
                {MOCK_CODE}
              </p>
            </div>

            {/* Progress bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-gray-500 font-semibold">
                  {MOCK_COUNT}/{MOCK_MAX} do'st
                </span>
                <span className="text-[10px] text-gray-400">
                  {MOCK_MAX - MOCK_COUNT} ta qoldi
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${progressPct}%`,
                    background: "linear-gradient(90deg, #7C3AED, #A78BFA)",
                  }}
                />
              </div>
            </div>

            {/* Compact share buttons */}
            <div className="flex flex-col gap-1.5">
              <button
                onClick={copyLink}
                className="w-full h-9 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                style={{
                  borderColor: VIOLET,
                  color: copied ? "white" : VIOLET,
                  background: copied ? VIOLET : "transparent",
                }}
              >
                {copied ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                {copied ? "Nusxalandi!" : "Havolani nusxalash"}
              </button>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={shareToTelegram}
                  className="h-9 rounded-xl text-white font-bold text-[11px] flex items-center justify-center gap-1"
                  style={{ background: "#229ED9" }}
                >
                  <Send className="w-3 h-3" />
                  Telegram
                </button>
                <button
                  onClick={shareToWhatsApp}
                  className="h-9 rounded-xl text-white font-bold text-[11px] flex items-center justify-center gap-1"
                  style={{ background: "#25D366" }}
                >
                  <Send className="w-3 h-3" />
                  WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tear-off label */}
        <p className="text-center text-xs text-gray-400 mt-3">
          ✂ kesib oling va do'stlaringizga yuboring
        </p>
      </div>
    </div>
  );
}
