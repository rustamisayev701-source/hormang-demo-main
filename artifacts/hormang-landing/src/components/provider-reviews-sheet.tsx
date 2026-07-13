/**
 * ProviderReviewsSheet — bottom-sheet that shows all reviews for a given
 * provider. Layered at z-[72] so it appears on top of the public profile
 * modal (z-[61]).
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ImageIcon,
  MessageCircle,
  ThumbsDown,
  ThumbsUp,
  UserRound,
} from "lucide-react";
import { StarRating } from "@/components/star-rating";
import {
  getAverageRatingForUser,
  getProviderReviewAverages,
  getReviewsForUser,
  type ProviderReviewMetrics,
  type Review,
} from "@/lib/completion-store";
import { getCustomerFromRegistry, getRequestById } from "@/lib/requests-store";
import { getLocalProfile } from "@/lib/local-profile";
import { formatDate } from "@/lib/date-utils";
import { useI18n } from "@/contexts/i18n-context";
import { tFormat } from "@/lib/i18n";
import { getCategoryDisplayName } from "@/lib/categories";

const BLUE = "hsl(221,78%,48%)";

function useMetricLabels(): Array<{ key: keyof ProviderReviewMetrics; label: string }> {
  const { t } = useI18n();
  return [
    { key: "serviceQuality", label: t.providerReviewsSheet.metricServiceQuality },
    { key: "providerAttitude", label: t.providerReviewsSheet.metricProviderAttitude },
    { key: "servicePrice", label: t.providerReviewsSheet.metricServicePrice },
  ];
}

function initials(name: string): string {
  return name.split(" ").map((p) => p[0] ?? "").join("").toUpperCase().slice(0, 2) || "X";
}

function getReviewerMeta(review: Review, fallback: string) {
  const registry = getCustomerFromRegistry(review.reviewerId);
  const request = getRequestById(review.requestId);
  const local = getLocalProfile(review.reviewerId);
  const name = review.reviewerName || registry?.name || request?.customerName || fallback;
  return {
    name,
    initials: review.reviewerInitials || registry?.initials || initials(name),
    color: review.reviewerColor || BLUE,
    photoUrl: local.photoUrl,
  };
}

function MetricBar({ label, value }: { label: string; value: number }) {
  const safe = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-bold text-gray-500">{label}</span>
        <span className="text-[11px] font-black text-violet-700">{safe}%</span>
      </div>
      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-gray-50 to-violet-500"
          style={{ width: `${safe}%` }}
        />
      </div>
    </div>
  );
}

function ReviewDetailModal({
  review,
  onClose,
}: {
  review: Review;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const tt = t.providerReviewsSheet;
  const METRIC_LABELS = useMetricLabels();
  const meta = getReviewerMeta(review, tt.fallbackCustomer);
  const [expandedPhoto, setExpandedPhoto] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80]"
        style={{ background: "rgba(10,10,30,0.62)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%", opacity: 0.7 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 38 }}
        className="fixed inset-x-0 bottom-0 z-[81] flex justify-center"
      >
        
        <div
          className="bg-white w-full max-w-lg rounded-t-3xl flex flex-col"
          style={{ maxHeight: "88dvh", boxShadow: "0 -8px 40px rgba(0,0,0,0.18)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-4 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>

          {/* Header — fixed, does not scroll */}
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {meta.photoUrl ? (
                <img src={meta.photoUrl} alt={meta.name} className="w-12 h-12 rounded-2xl object-cover flex-shrink-0" />
              ) : (
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black flex-shrink-0"
                  style={{ background: meta.color }}
                >
                  {meta.initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-black text-gray-900 truncate">{meta.name}</p>
                <p className="text-xs font-semibold text-gray-400">{formatDate(review.createdAt, { months: t.shared.months })}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 px-5 py-4 pb-8 space-y-3">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <StarRating rating={review.rating} size="w-5 h-5" />
                {review.serviceCategory && (
                  <span className="text-[11px] font-black text-violet-700 bg-violet-50 border border-violet-100 rounded-full px-2.5 py-1">
                    {getCategoryDisplayName(review.serviceCategory, locale)}
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed text-gray-700">
                {review.comment || tt.noComment}
              </p>
            </div>

            {review.providerMetrics && (
              <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
                {METRIC_LABELS.map((m) => (
                  <MetricBar key={m.key} label={m.label} value={review.providerMetrics![m.key] ?? 0} />
                ))}
              </div>
            )}

            {review.photoUrl && (
              <button
                onClick={() => setExpandedPhoto(true)}
                className="w-full overflow-hidden rounded-2xl border border-gray-100 bg-gray-50"
              >
                <img src={review.photoUrl} alt={tt.photoAlt} className="w-full h-52 object-cover" />
              </button>
            )}

            {(review.platformSentiment || review.platformFeedback) && (
              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  {review.platformSentiment === "positive" ? (
                    <ThumbsUp className="w-4 h-4 text-emerald-600" />
                  ) : review.platformSentiment === "negative" ? (
                    <ThumbsDown className="w-4 h-4 text-red-500" />
                  ) : (
                    <MessageCircle className="w-4 h-4 text-gray-400" />
                  )}
                  <p className="text-sm font-black text-gray-900">{tt.aboutHormang}</p>
                </div>
                <p className="text-sm text-gray-600">{review.platformFeedback || tt.noExtraComment}</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {expandedPhoto && review.photoUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setExpandedPhoto(false)}
          >
            <img src={review.photoUrl} alt={tt.photoAlt} className="max-w-full max-h-full object-contain rounded-2xl" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ReviewRow({ review, onOpen }: { review: Review; onOpen: () => void }) {
  const { t } = useI18n();
  const tt = t.providerReviewsSheet;
  const METRIC_LABELS = useMetricLabels();
  const meta = getReviewerMeta(review, tt.fallbackCustomer);
  const metrics = review.providerMetrics;

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
        {review.photoUrl && (
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
            <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
          </div>
        )}
      </div>

      {review.comment && (
        <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 mb-2">
          {review.comment}
        </p>
      )}

      {metrics && (
        <div className="space-y-1.5 mb-3">
          {METRIC_LABELS.map((m) => (
            <div key={m.key} className="flex items-center gap-2">
              <span className="w-28 text-[10px] font-bold text-gray-400 truncate">{m.label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-gray-50 to-violet-500"
                  style={{ width: `${metrics[m.key] ?? 0}%` }}
                />
              </div>
              <span className="w-8 text-right text-[10px] font-black text-violet-700">
                {metrics[m.key] ?? 0}%
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onOpen}
        className="w-full h-9 rounded-xl bg-violet-50 text-violet-700 text-xs font-black flex items-center justify-center gap-1.5 hover:bg-violet-100 transition-colors"
      >
        {tt.detailsBtn}
      </button>
    </div>
  );
}

export function ProviderReviewsSheet({
  providerId,
  providerName,
  onClose,
}: {
  providerId: string;
  providerName: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const tt = t.providerReviewsSheet;
  const METRIC_LABELS = useMetricLabels();
  const reviews = getReviewsForUser(providerId, "provider").sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const avg = getAverageRatingForUser(providerId, "provider");
  const metricAverages = getProviderReviewAverages(providerId);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);

  const hasMetrics =
    metricAverages.serviceQuality > 0 ||
    metricAverages.providerAttitude > 0 ||
    metricAverages.servicePrice > 0;

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
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-gray-300" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-100 flex-shrink-0">
            <div>
              <p className="font-black text-gray-900">{providerName}</p>
              <p className="text-xs text-gray-400">{tt.customersFeedback}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 px-4 py-4 space-y-3 pb-6">

            {/* Summary card */}
            <div className="bg-gradient-to-br from-violet-50 to-white rounded-2xl border border-gray-100 p-4 shadow-sm mb-4"
              style={{ background: "linear-gradient(-55deg, #ddcaff, #ffffff)" }}>
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wide mb-2">{tt.overallLabel}</p>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl font-black text-gray-900">
                  {avg > 0 ? avg.toFixed(1) : "—"}
                </span>
                <StarRating rating={avg} size="w-5 h-5" />
                <span className="text-sm text-gray-500 ml-1">{tFormat(tt.reviewsCountTpl, { n: reviews.length })}</span>
              </div>
              {hasMetrics && (
                <div className="space-y-2.5 pt-3">
                  {METRIC_LABELS.map((m) => (
                    <MetricBar key={m.key} label={m.label} value={metricAverages[m.key]} />
                  ))}
                </div>
              )}
            </div>

            {/* Review list */}
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
                <ReviewRow
                  key={review.id}
                  review={review}
                  onOpen={() => setSelectedReview(review)}
                />
              ))
            )}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedReview && (
          <ReviewDetailModal
            key={selectedReview.id}
            review={selectedReview}
            onClose={() => setSelectedReview(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
