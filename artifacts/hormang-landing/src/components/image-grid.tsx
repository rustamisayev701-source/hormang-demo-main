/**
 * ImageGrid — reusable image thumbnail grid with full-size lightbox.
 *
 * Props:
 *   urls        — array of data: or https: image URL strings
 *   maxVisible  — how many thumbs to show before "+N more" (default 6)
 *   label       — optional section label above the grid
 *   columns     — grid columns (default 3)
 *   compact     — smaller thumbnails for list cards
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";

interface ImageGridProps {
  urls: string[];
  maxVisible?: number;
  label?: string;
  columns?: 2 | 3 | 4;
  compact?: boolean;
}

/* ─── Lightbox ─────────────────────────────────────────────────── */
function Lightbox({
  urls,
  startIndex,
  onClose,
}: {
  urls: string[];
  startIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIndex);
  const prev = () => setIdx((i) => Math.max(0, i - 1));
  const next = () => setIdx((i) => Math.min(urls.length - 1, i + 1));

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
    if (e.key === "Escape") onClose();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={handleKey}
      tabIndex={0}
      autoFocus
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Counter */}
      {urls.length > 1 && (
        <p className="absolute top-4 left-4 text-white/70 text-sm font-semibold">
          {idx + 1} / {urls.length}
        </p>
      )}

      {/* Image */}
      <div className="max-w-[90vw] max-h-[80vh] flex items-center justify-center px-12">
        <AnimatePresence mode="wait">
          <motion.img
            key={idx}
            src={urls[idx]}
            alt={`Rasm ${idx + 1}`}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
          />
        </AnimatePresence>
      </div>

      {/* Prev / Next */}
      {urls.length > 1 && (
        <>
          <button
            onClick={prev}
            disabled={idx === 0}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 disabled:opacity-20 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            disabled={idx === urls.length - 1}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 disabled:opacity-20 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dot strip */}
      {urls.length > 1 && urls.length <= 8 && (
        <div className="absolute bottom-6 flex gap-1.5">
          {urls.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? "bg-white" : "bg-white/30"}`}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ─── Grid ─────────────────────────────────────────────────────── */
export function ImageGrid({
  urls,
  maxVisible = 6,
  label,
  columns = 3,
  compact = false,
}: ImageGridProps) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const imageUrls = urls.filter((u) => u.startsWith("data:image") || u.startsWith("http") || u.startsWith("blob:"));
  if (imageUrls.length === 0) return null;

  const visible = imageUrls.slice(0, maxVisible);
  const extra = imageUrls.length - maxVisible;

  const colClass = columns === 2 ? "grid-cols-2" : columns === 4 ? "grid-cols-4" : "grid-cols-3";
  const sizeClass = compact ? "aspect-square" : "aspect-square";

  return (
    <>
      {label && (
        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1.5">{label}</p>
      )}
      <div className={`grid ${colClass} gap-2`}>
        {visible.map((url, i) => {
          const isLast = i === visible.length - 1 && extra > 0;
          return (
            <button
              key={i}
              onClick={() => setLightboxIdx(i)}
              className={`relative ${sizeClass} rounded-xl overflow-hidden border border-gray-200 bg-gray-100 group focus:outline-none focus:ring-2 focus:ring-blue-400 active:scale-95 transition-transform`}
            >
              <img
                src={url}
                alt={`Rasm ${i + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
              {isLast && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-extrabold text-lg">+{extra + 1}</span>
                </div>
              )}
              {!isLast && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {lightboxIdx !== null && (
          <Lightbox
            urls={imageUrls}
            startIndex={lightboxIdx}
            onClose={() => setLightboxIdx(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ─── Helper: extract data: image URLs from request answers + dedicated requestPhotos ─── */
export function getAnswerImageUrls(
  answers: Record<string, unknown>,
  requestPhotos?: string[],
): string[] {
  const fromAnswers = Object.values(answers)
    .filter((v): v is string => typeof v === "string" && v.startsWith("data:image"));
  const fromPhotos = (requestPhotos ?? []).filter((u) => u.startsWith("data:image") || u.startsWith("http") || u.startsWith("blob:"));
  // requestPhotos are shown first (they are the dedicated media upload)
  const combined = [...fromPhotos, ...fromAnswers];
  // deduplicate (in case same base64 appears in both)
  return [...new Set(combined)].slice(0, 12);
}

/* ─── Inline compact strip (for list cards) ────────────────────── */
export function ImageStrip({ urls, max = 3 }: { urls: string[]; max?: number }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const imageUrls = urls.filter((u) => u.startsWith("data:image") || u.startsWith("http") || u.startsWith("blob:"));
  if (imageUrls.length === 0) return null;

  const visible = imageUrls.slice(0, max);
  const extra = imageUrls.length - max;

  return (
    <>
      <div className="flex gap-1.5 items-center">
        <ImageIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <div className="flex gap-1">
          {visible.map((url, i) => {
            const isLast = i === visible.length - 1 && extra > 0;
            return (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setLightboxIdx(i); }}
                className="w-8 h-8 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 flex-shrink-0 relative active:scale-95 transition-transform"
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
                {isLast && extra > 0 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-bold text-[9px]">+{extra + 1}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        {imageUrls.length === 1 && (
          <span className="text-xs text-gray-400">Rasm</span>
        )}
        {imageUrls.length > 1 && (
          <span className="text-xs text-gray-400">{imageUrls.length} ta rasm</span>
        )}
      </div>

      <AnimatePresence>
        {lightboxIdx !== null && (
          <Lightbox
            urls={imageUrls}
            startIndex={lightboxIdx}
            onClose={() => setLightboxIdx(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
