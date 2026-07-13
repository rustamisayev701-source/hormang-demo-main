import { useState } from "react";
import { useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, UserRound } from "lucide-react";
import { StarRating } from "@/components/star-rating";
import { BottomNav } from "@/components/bottom-nav";
import { PublicProfilePreviewModal } from "@/components/public-profile-preview-modal";
import { useAuth } from "@/contexts/auth-context";
import { useStoreRefresh } from "@/hooks/use-store-refresh";
import {
  getAverageRatingForUser,
  getReviewsForUser,
  type Review,
} from "@/lib/completion-store";
import { getLocalProfile } from "@/lib/local-profile";
import { getOfferById } from "@/lib/requests-store";
import { formatDate } from "@/lib/date-utils";
import { useI18n } from "@/contexts/i18n-context";
import { tFormat } from "@/lib/i18n";
import { getCategoryDisplayName } from "@/lib/categories";

const VIOLET = "hsl(262,80%,54%)";

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2) || "X";
}

function getReviewerMeta(review: Review, fallback: string) {
  const local = getLocalProfile(review.reviewerId);
  const offer = review.offerId ? getOfferById(review.offerId) : null;
  const name = review.reviewerName || offer?.masterName || fallback;
  return {
    name,
    initials: review.reviewerInitials || offer?.masterInitials || initials(name),
    color: review.reviewerColor || offer?.masterColor || VIOLET,
    photoUrl: local.photoUrl,
  };
}

/* ── Review card ──────────────────────────────────────────────────────── */
function ReviewCard({
  review,
  onProfile,
}: {
  review: Review;
  onProfile: () => void;
}) {
  const { t, locale } = useI18n();
  const meta = getReviewerMeta(review, t.customerReviewsPage.fallbackProvider);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl border border-gray-100 card-shadow p-4"
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
            <p className="text-[11px] font-bold text-blue-600 mt-1">{getCategoryDisplayName(review.serviceCategory, locale)}</p>
          )}
        </div>
      </div>

      {review.comment && (
        <p className="text-sm text-gray-600 leading-relaxed mt-3">
          {review.comment}
        </p>
      )}
    </motion.div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */
export default function CustomerReviewsPage() {
  useStoreRefresh();
  const { user } = useAuth();
  const { t } = useI18n();
  const tt = t.customerReviewsPage;
  const [, navigate] = useLocation();
  const customerId = user?.id ?? "";

  const reviews = getReviewsForUser(customerId, "customer").sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const avg = getAverageRatingForUser(customerId, "customer");

  const [profileReview, setProfileReview] = useState<Review | null>(null);
  const profileMeta = profileReview ? getReviewerMeta(profileReview, tt.fallbackProvider) : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => { sessionStorage.setItem("request_history_referrer", "/customer-reviews"); navigate("/request-history"); }}
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
        <div
          className="rounded-2xl border border-gray-100 p-4 shadow-sm mb-4"
          style={{ background: "linear-gradient(-55deg, #c9d9ff, #ffffff)" }}
        >
          <p className="text-[11px] uppercase font-bold tracking-wide text-gray-500 mb-1">{tt.overallLabel}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-3xl font-bold text-gray-900">
              {avg > 0 ? avg.toFixed(1) : "—"}
            </span>
            <StarRating rating={avg} size="w-5 h-5" />
            <span className="text-sm text-gray-500">{tFormat(tt.reviewsCountTpl, { n: reviews.length })}</span>
          </div>
        </div>

        {reviews.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 card-shadow p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <UserRound className="w-7 h-7 text-gray-400" />
            </div>
            <h2 className="font-bold text-gray-800 mb-1">{tt.emptyTitle}</h2>
            <p className="text-sm text-gray-400">
              {tt.emptyDesc}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onProfile={() => setProfileReview(review)}
              />
            ))}
          </div>
        )}
      </main>

      <AnimatePresence>
        {profileReview && profileMeta && (
          <PublicProfilePreviewModal
            key={`reviewer-${profileReview.reviewerId}`}
            mode="provider"
            providerData={{
              masterId: profileReview.reviewerId,
              masterName: profileMeta.name,
              masterInitials: profileMeta.initials,
              masterColor: profileMeta.color,
            }}
            onClose={() => setProfileReview(null)}
          />
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
