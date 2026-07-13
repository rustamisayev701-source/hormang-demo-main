/**
 * CustomerReviewsSheet — bottom-sheet showing all reviews about a customer.
 * Layered at z-[72]/z-[73] so it appears above the public profile modal (z-[61]).
 * Customer reviews never have metric sliders.
 */
import { motion } from "framer-motion";
import { X, UserRound } from "lucide-react";
import { StarRating } from "@/components/star-rating";
import { useI18n } from "@/contexts/i18n-context";
import { tFormat } from "@/lib/i18n";
import {
  getAverageRatingForUser,
  getReviewsForUser,
  type Review,
} from "@/lib/completion-store";
import { getLocalProfile } from "@/lib/local-profile";
import { getOfferById } from "@/lib/requests-store";
import { formatDate } from "@/lib/date-utils";

const VIOLET = "hsl(262,80%,54%)";

function initials(name: string): string {
  return name.split(" ").map((p) => p[0] ?? "").join("").toUpperCase().slice(0, 2) || "X";
}

function getReviewerMeta(review: Review, fallbackName: string) {
  const local = getLocalProfile(review.reviewerId);
  const offer = review.offerId ? getOfferById(review.offerId) : null;
  const name = review.reviewerName || offer?.masterName || fallbackName;
  return {
    name,
    initials: review.reviewerInitials || offer?.masterInitials || initials(name),
    color: review.reviewerColor || offer?.masterColor || VIOLET,
    photoUrl: local.photoUrl,
  };
}

function ReviewRow({ review, fallbackName }: { review: Review; fallbackName: string }) {
  const { t } = useI18n();
  const meta = getReviewerMeta(review, fallbackName);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center gap-3 mb-2">
        {meta.photoUrl ? (
          <img src={meta.photoUrl} alt={meta.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
        ) : (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
            style={{ background: meta.color }}
          >
            {meta.initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-black text-gray-900 text-sm truncate">{meta.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <StarRating rating={review.rating} size="w-3.5 h-3.5" />
            <span className="text-[11px] text-gray-400">{formatDate(review.createdAt, { months: t.shared.months })}</span>
          </div>
        </div>
      </div>

      {review.comment && (
        <p className="text-sm text-gray-600 leading-relaxed">
          {review.comment}
        </p>
      )}
    </div>
  );
}

/* ── Main export ──────────────────────────────────────────────────────── */
export function CustomerReviewsSheet({
  customerId,
  customerName,
  onClose,
}: {
  customerId: string;
  customerName: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const tt = t.customerReviewsSheet;
  const reviews = getReviewsForUser(customerId, "customer").sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const avg = getAverageRatingForUser(customerId, "customer");

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[72]"
        style={{ background: "rgba(10,10,30,0.45)", backdropFilter: "blur(2px)" }}
        onClick={onClose}
      />

      <motion.div
        initial={{ y: "100%", opacity: 0.7 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 38 }}
        className="fixed inset-x-0 bottom-0 z-[73] flex justify-center"
      >
        <div
          className="bg-gray-50 w-full max-w-lg rounded-t-3xl flex flex-col"
          style={{ maxHeight: "88dvh", boxShadow: "0 -8px 40px rgba(0,0,0,0.20)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-gray-300" />
          </div>

          <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-100 flex-shrink-0">
            <div>
              <p className="font-black text-gray-900">{customerName}</p>
              <p className="text-xs text-gray-400">{tt.subtitle}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 px-4 py-4 space-y-3 pb-6">
            <div
              className="rounded-2xl border border-gray-100 p-4 shadow-sm"
              style={{ background: "linear-gradient(-55deg, #c9d9ff, #ffffff)" }}
            >
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wide mb-2">{tt.overallLabel}</p>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-black text-gray-900">
                  {avg > 0 ? avg.toFixed(1) : "—"}
                </span>
                <StarRating rating={avg} size="w-5 h-5" />
                <span className="text-sm text-gray-500 ml-1">{tFormat(tt.reviewsCountTpl, { n: reviews.length })}</span>
              </div>
            </div>

            {reviews.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <UserRound className="w-7 h-7 text-gray-400" />
                </div>
                <p className="font-black text-gray-700 mb-1">{tt.emptyTitle}</p>
                <p className="text-xs text-gray-400">{tt.emptyDesc}</p>
              </div>
            ) : (
              reviews.map((review) => (
                <ReviewRow key={review.id} review={review} fallbackName={tt.fallbackProvider} />
              ))
            )}
          </div>
        </div>
      </motion.div>

    </>
  );
}
