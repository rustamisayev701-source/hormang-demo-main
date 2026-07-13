import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Eye, Image as ImageIcon, MessageCircle, ThumbsDown, ThumbsUp, UserRound, X } from "lucide-react";
import { StarRating } from "@/components/star-rating";
import { BottomNav } from "@/components/bottom-nav";
import { PublicProfilePreviewModal } from "@/components/public-profile-preview-modal";
import { useAuth } from "@/contexts/auth-context";
import { useStoreRefresh } from "@/hooks/use-store-refresh";
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
const VIOLET = "linear-gradient(135deg, hsl(262,80%,54%) 0%, hsl(236,76%,60%) 100%)";

function useMetricLabels(): Array<{ key: keyof ProviderReviewMetrics; label: string }> {
  const { t } = useI18n();
  const tt = t.providerReviewsPage;
  return [
    { key: "serviceQuality", label: tt.metricServiceQuality },
    { key: "providerAttitude", label: tt.metricProviderAttitude },
    { key: "servicePrice", label: tt.metricServicePrice },
  ];
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2) || "X";
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
    region: request?.region,
    district: request?.district,
  };
}


function MetricScale({
  label,
  value,
  variant = "light",
}: {
  label: string;
  value: number;
  variant?: "light" | "dark";
}) {
  const { t } = useI18n();
  const tt = t.providerReviewsPage;
  const safeValue = Math.max(0, Math.min(100, Math.round(value || 0)));
  const isDark = variant === "dark";

  return (
    <div className={isDark ? "text-white" : "text-gray-900"}>
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <p className={`text-xs font-black ${isDark ? "text-white/90" : "text-gray-800"}`}>{label}</p>
        
      </div>
      <div className={`relative h-3 rounded-full overflow-hidden ${isDark ? "bg-white/20" : "bg-gray-100"}`}>
        <div
          className={isDark ? "h-full bg-white rounded-full" : "h-full rounded-full bg-gradient-to-r from-gray-100 to-violet-400"}
          style={{ width: `${safeValue}%` }}
        />
        <span
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-[9px] font-black text-gray-100 bg-violet-400 rounded-full px-1.5 py-0.5 shadow-sm"
          style={{ left: `${Math.max(12, Math.min(88, safeValue))}%` }}
        >
          {safeValue}%
        </span>
      </div>
      <div className={`flex justify-between text-[10px] font-bold mt-1 ${isDark ? "text-white/65" : "text-gray-400"}`}>
        <span>{tt.metricLow}</span>
        <span>{tt.metricHigh}</span>
      </div>
    </div>
  );
}

function ReviewMetricsBlock({
  metrics,
  variant = "light",
}: {
  metrics?: ProviderReviewMetrics;
  variant?: "light" | "dark";
}) {
  const METRIC_LABELS = useMetricLabels();
  if (!metrics) return null;
  return (
    <div className={variant === "dark" ? "space-y-3 mt-4" : "space-y-3 rounded-2xl border border-gray-100 bg-white p-4"}>
      {METRIC_LABELS.map((metric) => (
        <MetricScale
          key={metric.key}
          label={metric.label}
          value={metrics[metric.key]}
          variant={variant}
        />
      ))}
    </div>
  );
}

function ReviewPreviewModal({
  review,
  onClose,
}: {
  review: Review;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const tt = t.providerReviewsPage;
  const meta = getReviewerMeta(review, tt.fallbackCustomer);
  const [expandedPhoto, setExpandedPhoto] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70]"
        style={{ background: "rgba(10,10,30,0.62)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%", opacity: 0.7 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 38 }}
        className="fixed inset-x-0 bottom-0 z-[71] flex justify-center"
      >
        <div
          className="bg-white w-full max-w-lg rounded-t-3xl px-5 pt-4 pb-8 max-h-[88dvh] overflow-y-auto"
          style={{ boxShadow: "0 -8px 40px rgba(0,0,0,0.18)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-center mb-4">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>
          <div className="flex items-start justify-between gap-3 mb-4">
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
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 mb-4">
            <div className="flex items-center justify-between gap-3 mb-3">
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
            <div className="mb-4">
              <ReviewMetricsBlock metrics={review.providerMetrics} />
            </div>
          )}
          {review.photoUrl && (
            <button
              onClick={() => setExpandedPhoto(true)}
              className="w-full overflow-hidden rounded-2xl border border-gray-100 mb-4 bg-gray-50"
            >
              <img src={review.photoUrl} alt={tt.reviewPhotoAlt} className="w-full h-52 object-cover" />
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
                <p className="text-sm font-black text-gray-900">{tt.platformOpinion}</p>
              </div>
              <p className="text-sm text-gray-600">{review.platformFeedback || tt.noExtraComment}</p>
            </div>
          )}
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
            <img src={review.photoUrl} alt={tt.reviewPhotoAlt} className="max-w-full max-h-full object-contain rounded-2xl" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ReviewCard({
  review,
  onPreview,
  onProfile,
  highlighted = false,
  cardRef,
}: {
  review: Review;
  onPreview: () => void;
  onProfile: () => void;
  highlighted?: boolean;
  cardRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const { t, locale } = useI18n();
  const tt = t.providerReviewsPage;
  const META_LABELS = useMetricLabels();
  const meta = getReviewerMeta(review, tt.fallbackCustomer);
  const metrics = review.providerMetrics;

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-3xl border card-shadow p-4 transition-colors ${
        highlighted ? "border-violet-400 ring-2 ring-violet-200" : "border-gray-100"
      }`}
    >
      <div className="flex items-start gap-3">
        <button onClick={onProfile} className="flex-shrink-0 active:scale-95 transition-transform">
          {meta.photoUrl ? (
            <img src={meta.photoUrl} alt={meta.name} className="w-12 h-12 rounded-2xl object-cover" />
          ) : (
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black"
              style={{ background: meta.color }}
            >
              {meta.initials}
            </div>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <button onClick={onProfile} className="font-black text-gray-900 text-left truncate block w-full">
            {meta.name}
          </button>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <StarRating rating={review.rating} />
            <span className="text-xs text-gray-400">{formatDate(review.createdAt, { months: t.shared.months })}</span>
          </div>
          {review.serviceCategory && (
            <p className="text-[11px] font-bold text-violet-600 mt-1">{getCategoryDisplayName(review.serviceCategory, locale)}</p>
          )}
        </div>
        {review.photoUrl && (
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
            <ImageIcon className="w-4 h-4 text-emerald-600" />
          </div>
        )}
      </div>
      <p className="text-sm text-gray-600 leading-relaxed mt-3 line-clamp-3">
        {review.comment || tt.noComment}
      </p>
      {metrics && (
        <div className="mt-3 space-y-2 rounded-2xl bg-gray-50 border border-gray-100 p-3">
          {META_LABELS.map((metric) => (
            <div key={metric.key} className="flex items-center gap-2">
              <span className="w-24 text-[10px] font-black text-gray-500 truncate">{metric.label}</span>
              <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-gray-50 to-violet-400"
                  style={{ width: `${metrics[metric.key] ?? 0}%` }}
                />
              </div>
              <span className="w-9 text-right text-[10px] font-black text-violet-700">
                {metrics[metric.key] ?? 0}%
              </span>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={onPreview}
        className="mt-3 w-full h-10 rounded-2xl bg-violet-50 text-violet-700 text-sm font-black flex items-center justify-center gap-2 hover:bg-violet-100 transition-colors"
      >
        <Eye className="w-4 h-4" />
        {tt.viewReview}
      </button>
    </motion.div>
  );
}
function CompactMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs">
        <span className="text-white/80 font-semibold">{label}</span>
        <span className="text-white font-bold">{value}%</span>
      </div>

      <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-violet-300 via-white/80 to-white rounded-full transition-all duration-300"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
export default function ProviderReviewsPage() {
  useStoreRefresh();
  const { t } = useI18n();
  const tt = t.providerReviewsPage;
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const providerId = user?.id ?? "";
  const reviews = getReviewsForUser(providerId, "provider").sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const avg = getAverageRatingForUser(providerId, "provider");
  const metricAverages = getProviderReviewAverages(providerId);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [profileReview, setProfileReview] = useState<Review | null>(null);
  const profileMeta = profileReview ? getReviewerMeta(profileReview, tt.fallbackCustomer) : null;

  const targetRequestId = useMemo(
    () => new URLSearchParams(window.location.search).get("requestId"),
    []
  );
  const highlightedReview = useMemo(
    () => (targetRequestId ? reviews.find((r) => r.requestId === targetRequestId) : null),
    [targetRequestId, reviews]
  );
  const highlightedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!highlightedRef.current) return;
    const timer = setTimeout(() => {
      highlightedRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
    return () => clearTimeout(timer);
  }, [highlightedReview]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard/provider")}
            className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-gray-900 text-lg">{tt.title}</h1>
            <p className="text-xs text-gray-400">{tt.subtitle}</p>
          </div>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 py-4">
        {/* Summary Card */}
        <div className="bg-gradient-to-br from-violet-50 to-white rounded-2xl border border-gray-100 p-4 shadow-sm mb-4"
          style={{ background: "linear-gradient(-55deg, #ddcaff, #ffffff)" }}>

          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[11px] uppercase font-bold tracking-wide text-gray-500">
                {tt.overallLabel}
              </p>

              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-3xl font-bold text-gray-900">
                  {avg > 0 ? avg.toFixed(1) : "—"}
                </span>

                <StarRating rating={avg} size="w-5 h-5" />

                <span className="text-sm text-gray-500">
                  {tFormat(tt.reviewsCountTpl, { n: reviews.length })}
                </span>
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="space-y-3">
            {[
              { label: tt.metricServiceQuality, value: metricAverages.serviceQuality },
              { label: tt.metricProviderAttitude, value: metricAverages.providerAttitude },
              { label: tt.metricServicePriceShort, value: metricAverages.servicePrice },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 font-medium">
                    {item.label}
                  </span>
                  <span className="text-gray-900 font-semibold">
                    {item.value}%
                  </span>
                </div>

                {/* Compact Bar */}
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full"
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reviews */}
        {reviews.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 card-shadow p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <UserRound className="w-7 h-7 text-gray-400" />
            </div>

            <h2 className="font-bold text-gray-800 mb-1">
              {tt.emptyTitle}
            </h2>

            <p className="text-sm text-gray-400">
              {tt.emptyDesc}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => {
              const isHighlighted = review.id === highlightedReview?.id;
              return (
                <ReviewCard
                  key={review.id}
                  review={review}
                  onPreview={() => setSelectedReview(review)}
                  onProfile={() => setProfileReview(review)}
                  highlighted={isHighlighted}
                  cardRef={isHighlighted ? highlightedRef : undefined}
                />
              );
            })}
          </div>
        )}
      </main>

      

      <AnimatePresence>
        {selectedReview && (
          <ReviewPreviewModal
            key={selectedReview.id}
            review={selectedReview}
            onClose={() => setSelectedReview(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {profileReview && profileMeta && (
          <PublicProfilePreviewModal
            key={`reviewer-${profileReview.reviewerId}`}
            mode="customer"
            customerData={{
              customerId: profileReview.reviewerId,
              customerName: profileMeta.name,
              customerInitials: profileMeta.initials,
              customerColor: profileMeta.color,
              photoUrl: profileMeta.photoUrl,
              region: profileMeta.region,
              district: profileMeta.district,
            }}
            onClose={() => setProfileReview(null)}
          />
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}