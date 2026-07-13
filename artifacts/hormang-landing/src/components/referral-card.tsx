import { useState, useEffect } from "react";
import { TangaCoin } from "@/components/tanga-coin";
import { motion } from "framer-motion";
import { Gift, Check, Copy, Send } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import {
  getReferralCode, getReferralLink, getReferralStats,
  ensureReferralIndex, TANGA_PER_REFERRAL, MAX_REFERRALS, MAX_REFERRAL_TANGA,
} from "@/lib/referral-store";
import { useI18n } from "@/contexts/i18n-context";
import { tFormat } from "@/lib/i18n";

export function ReferralCard({ title }: { title?: string } = {}) {
  const { t } = useI18n();
  const tt = t.referralCard;
  const headingTitle = title ?? tt.titleProvider;
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const userId = user?.id ?? "";
  const referralCode = userId ? getReferralCode(userId) : "";
  const referralLink = userId ? getReferralLink(userId) : "";
  const stats = userId ? getReferralStats(userId) : { count: 0, earned: 0, invitees: [] };

  useEffect(() => {
    if (userId) ensureReferralIndex(userId);
  }, [userId]);

  const progressPct = Math.min(100, (stats.count / MAX_REFERRALS) * 100);
  const remaining = MAX_REFERRALS - stats.count;
  const canEarnMore = stats.count < MAX_REFERRALS;

  function copyLink() {
    navigator.clipboard.writeText(referralLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: tt.toastCopiedTitle, description: tt.toastCopiedDesc });
  }

  function shareToTelegram() {
    const text = `${tt.shareTextTelegram} ${referralLink}`;
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`,
      "_blank"
    );
  }

  function shareToWhatsApp() {
    const text = `${tt.shareTextWhatsapp} ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <div className="mb-6">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <Gift className="w-4 h-4 text-amber-500" />
        <h2 className="font-bold text-sm text-gray-900">{headingTitle}</h2>
      </div>

      {/* Main golden card */}
      <div
        className="rounded-2xl overflow-hidden shadow-lg relative before:absolute before:inset-0 before:bg-[radial-gradient(circle,rgba(255,248,211,0.15)_1px,transparent_1px)] before:bg-[size:10px_10px]"
        style={{ background: "linear-gradient(135deg, #f59e0b 0%, #92400e 100%)" }}
      >
        {/* Decorative shimmer */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 10% 0%, rgba(255,255,255,0.18) 0%, transparent 55%)",
          }}
        />

        <div className="relative p-5">
          {/* Top row — emoji + headline */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TangaCoin size="lg" />
                <span className="font-extrabold text-white text-lg leading-tight">
                  {tFormat(tt.bonusTpl, { n: MAX_REFERRAL_TANGA })}
                </span>
              </div>
              <p className="text-amber-100 text-xs leading-relaxed">
                {tFormat(tt.bonusDescTpl, { per: TANGA_PER_REFERRAL, max: MAX_REFERRAL_TANGA })}
              </p>
            </div>
            <div className="bg-white/20 rounded-xl px-3 py-1.5 text-center flex-shrink-0">
              <p className="text-[10px] text-amber-100 font-semibold uppercase tracking-wide">{tt.totalEarned}</p>
              <p className="text-white font-extrabold text-lg leading-none">
                {stats.earned}&nbsp;<TangaCoin size="md" />
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-amber-100 text-xs font-semibold">
                {tFormat(tt.progressTpl, { count: stats.count, max: MAX_REFERRALS })}
              </span>
              {canEarnMore ? (
                <span className="text-amber-200 text-[11px]">
                  {tFormat(tt.remainingTpl, { n: remaining })}
                </span>
              ) : (
                <span className="text-amber-200 text-[11px] font-bold">{tt.maxReached}</span>
              )}
            </div>
            <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #FCD34D, #FBBF24)" }}
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Referral code pill */}
          <div className="bg-white/15 rounded-xl px-3 py-2 flex items-center justify-between mb-4 border border-white/20">
            <div>
              <p className="text-[10px] text-amber-200 font-semibold uppercase tracking-wider mb-0.5">
                {tt.yourCode}
              </p>
              <p className="text-white font-extrabold text-sm tracking-wide">{referralCode}</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={copyLink}
              className="flex items-center gap-1.5 bg-white/25 hover:bg-white/35 transition-colors rounded-lg px-3 py-1.5"
            >
              {copied
                ? <Check className="w-3.5 h-3.5 text-white" />
                : <Copy className="w-3.5 h-3.5 text-white" />}
              <span className="text-white text-xs font-bold">
                {copied ? tt.copied : tt.copy}
              </span>
            </motion.button>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={copyLink}
              className="h-10 rounded-xl bg-white text-amber-700 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm hover:bg-amber-50 transition-colors col-span-1"
            >
              <Copy className="w-3.5 h-3.5" />
              {tt.linkBtn}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={shareToTelegram}
              className="h-10 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors col-span-1"
              style={{ background: "linear-gradient(135deg, #2AABEE, #229ED9)" }}
            >
              <Send className="w-3.5 h-3.5" />
              {tt.telegram}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={shareToWhatsApp}
              className="h-10 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors col-span-1"
              style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}
            >
              <Send className="w-3.5 h-3.5" />
              {tt.whatsapp}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
