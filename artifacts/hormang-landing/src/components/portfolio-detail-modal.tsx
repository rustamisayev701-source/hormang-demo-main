import { useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Clock, Pin, Star, X } from "lucide-react";
import { useI18n } from "@/contexts/i18n-context";
import { formatDate } from "@/lib/date-utils";
import { getCategoryDisplayName } from "@/lib/categories";
import { CategoryIcon } from "@/components/category-icon";
import { StarRating } from "@/components/star-rating";
import type { PublicPortfolioProject } from "@/lib/service-history-store";

interface PortfolioDetailModalProps {
  project: PublicPortfolioProject;
  onClose: () => void;
}

export function PortfolioDetailModal({ project, onClose }: PortfolioDetailModalProps) {
  const { t, locale } = useI18n();
  const tt = t.providerProfilePage.portfolioDetail;
  const photos = project.photos.length > 0 ? project.photos : project.coverPhoto ? [project.coverPhoto] : [];
  const [active, setActive] = useState(photos[0] ?? "");

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80]"
        style={{ background: "rgba(10,10,30,0.6)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%", opacity: 0.8 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 38 }}
        className="fixed inset-x-0 bottom-0 z-[81] flex justify-center"
      >
        <div
          className="bg-white w-full max-w-lg rounded-t-3xl flex flex-col max-h-[92vh]"
          style={{ boxShadow: "0 -8px 40px rgba(0,0,0,0.16)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-start gap-3">
            <div className="flex justify-center absolute left-0 right-0 -top-0.5">
              <div className="w-10 h-1 rounded-full bg-gray-200 mt-2.5" />
            </div>
            <CategoryIcon
              categoryId={project.categoryId}
              emoji={project.emoji}
              size={44}
              shape="square"
              className="flex-shrink-0"
            />
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-gray-900 text-base leading-snug truncate">{project.title}</h3>
                {project.featured && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded-full bg-fuchsia-600 text-white flex-shrink-0">
                    <Pin className="w-2.5 h-2.5" />
                    {tt.featured}
                  </span>
                )}
              </div>
              <p className="text-xs text-violet-600 font-bold">
                {getCategoryDisplayName(project.categoryId, locale, project.categoryName)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 py-4 space-y-4 overflow-y-auto">
            {/* Gallery */}
            {photos.length > 0 && (
              <div>
                <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100">
                  <img src={active} alt={project.title} className="w-full h-full object-cover" />
                </div>
                {photos.length > 1 && (
                  <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                    {photos.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActive(url)}
                        className={`w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-colors ${
                          active === url ? "border-violet-500" : "border-transparent"
                        }`}
                      >
                        <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                {formatDate(project.completedAt, { months: t.shared.months })}
              </span>
              {typeof project.durationMinutes === "number" && project.durationMinutes > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  {project.durationMinutes} {tt.minutesSuffix}
                </span>
              )}
              {typeof project.rating === "number" && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-3 py-1.5">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {project.rating.toFixed(1)}
                </span>
              )}
            </div>

            {/* Description */}
            {project.description && (
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">{tt.aboutLabel}</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{project.description}</p>
              </div>
            )}

            {/* Review */}
            {project.review && (
              <div className="rounded-2xl bg-amber-50/60 border border-amber-100 p-3.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <StarRating rating={project.rating ?? 0} />
                  <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">{tt.reviewLabel}</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{project.review}</p>
              </div>
            )}
          </div>

          <div className="px-5 pt-3 pb-8 border-t border-gray-100">
            <button
              onClick={onClose}
              className="w-full h-12 rounded-2xl text-sm font-bold text-white shadow-sm"
              style={{ background: "linear-gradient(135deg, hsl(262,80%,54%) 0%, hsl(236,76%,60%) 100%)" }}
            >
              {tt.close}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
