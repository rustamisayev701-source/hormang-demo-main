/**
 * ReviewModal — bottom-sheet for leaving a star rating + optional comment.
 * Used after offer completion on both customer and provider sides.
 */
import { useRef, useState, type ChangeEvent } from "react";
import { motion } from "framer-motion";
import { Camera, ImagePlus, Star, ThumbsDown, ThumbsUp, X } from "lucide-react";
import React from "react";
import { useI18n } from "@/contexts/i18n-context";
import type { Dict } from "@/lib/i18n/locales/uz";

export interface ReviewSubmitData {
  rating: number;
  text: string;
  photoUrl?: string;
  platformSentiment?: "positive" | "negative";
  platformFeedback?: string;
  providerMetrics?: {
    serviceQuality: number;
    providerAttitude: number;
    servicePrice: number;
  };
}

interface ReviewModalProps {
  subjectName: string;
  subjectInitials: string;
  subjectColor: string;
  subjectPhotoUrl?: string;
  prompt?: string;
  showProviderSliders?: boolean;
  onSubmit: (data: ReviewSubmitData) => void;
  onSkip: () => void;
}

async function compressReviewPhoto(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });

  const maxSide = 1024;
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.72);
}

export function ReviewModal({
  subjectName,
  subjectInitials,
  subjectColor,
  subjectPhotoUrl,
  prompt,
  showProviderSliders = false,
  onSubmit,
  onSkip,
}: ReviewModalProps) {
  const { t } = useI18n();
  const effectivePrompt = prompt ?? t.reviewModal.defaultPrompt;
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [text, setText] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [photoError, setPhotoError] = useState("");
  const [photoLoading, setPhotoLoading] = useState(false);
  const [platformSentiment, setPlatformSentiment] = useState<"positive" | "negative" | undefined>();
  const [platformFeedback, setPlatformFeedback] = useState("");
  const [serviceQuality, setServiceQuality] = useState(50);
  const [providerAttitude, setProviderAttitude] = useState(50);
  const [servicePrice, setServicePrice] = useState(50);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleSubmit() {
    if (rating === 0) return;
    onSubmit({
      rating,
      text: text.trim(),
      photoUrl,
      platformSentiment,
      platformFeedback: platformFeedback.trim() || undefined,
      providerMetrics: showProviderSliders
        ? { serviceQuality, providerAttitude, servicePrice }
        : undefined,
    });
  }

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError(t.reviewModal.photoOnlyImage);
      return;
    }
    setPhotoError("");
    setPhotoLoading(true);
    try {
      setPhotoUrl(await compressReviewPhoto(file));
    } catch {
      setPhotoError(t.reviewModal.photoFailed);
    } finally {
      setPhotoLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const display = hovered || rating;

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70]"
        style={{ background: "rgba(10,10,30,0.60)", backdropFilter: "blur(4px)" }}
        onClick={onSkip}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: "100%", opacity: 0.7 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 38 }}
        className="fixed inset-x-0 bottom-0 z-[71] flex justify-center"
      >
        <div
          className="bg-white w-full max-w-lg rounded-t-3xl px-5 pb-8 pt-4 max-h-[92dvh] overflow-y-auto"
          style={{ boxShadow: "0 -8px 40px rgba(0,0,0,0.16)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div className="flex justify-center mb-4">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>

          {/* Skip button */}
          <div className="flex justify-end mb-2">
            <button
              onClick={onSkip}
              className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Avatar */}
          <div className="flex flex-col items-center mb-5">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-xl mb-3 shadow-sm overflow-hidden"
              style={{ background: subjectColor }}
            >
              {subjectPhotoUrl ? (
                <img
                  src={subjectPhotoUrl}
                  alt={subjectName}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                subjectInitials
              )}
            </div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">
              {effectivePrompt}
            </p>
            <p className="font-extrabold text-gray-900 text-lg leading-tight text-center">
              {subjectName}
            </p>
          </div>

          {/* Stars */}
          <div className="flex items-center justify-center gap-3 mb-5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(star)}
                className="transition-transform active:scale-90"
              >
                <Star
                  className="w-9 h-9 transition-colors"
                  fill={star <= display ? "#F59E0B" : "none"}
                  stroke={star <= display ? "#F59E0B" : "#D1D5DB"}
                  strokeWidth={1.5}
                />
              </button>
            ))}
          </div>

          {showProviderSliders && (
              <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4 mb-4 space-y-4">
              <p className="text-sm font-black text-gray-500">{t.reviewModal.metricsTitle}</p>
              <MetricSlider
                label={t.reviewModal.metric.serviceQuality}
                value={serviceQuality}
                onChange={setServiceQuality}
                t={t}
              />
              <MetricSlider
                label={t.reviewModal.metric.providerAttitude}
                value={providerAttitude}
                onChange={setProviderAttitude}
                t={t}
              />
              <MetricSlider
                label={t.reviewModal.metric.servicePrice}
                value={servicePrice}
                onChange={setServicePrice}
                t={t}
              />
            </div>
          )}

          {/* Optional comment */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t.reviewModal.commentPlaceholder}
            rows={3}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 resize-none transition-all mb-3"
          />

          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
            {photoUrl ? (
              <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                <img src={photoUrl} alt={t.reviewModal.photoAlt} className="w-full h-36 object-cover" />
                <button
                  onClick={() => setPhotoUrl(undefined)}
                  className="absolute top-2 right-2 w-8 h-8 rounded-xl bg-black/55 text-white flex items-center justify-center backdrop-blur-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={photoLoading}
                className="w-full h-12 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 text-gray-500 flex items-center justify-center gap-2 text-sm font-bold hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                {photoLoading ? <Camera className="w-4 h-4 animate-pulse" /> : <ImagePlus className="w-4 h-4" />}
                {photoLoading ? t.reviewModal.photoLoading : t.reviewModal.photoBtn}
              </button>
            )}
            {photoError && <p className="text-xs font-semibold text-red-500 mt-1.5">{photoError}</p>}
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 mb-4">
            <p className="text-sm font-black text-gray-900 mb-2">{t.reviewModal.platformTitle}</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                onClick={() => setPlatformSentiment(platformSentiment === "positive" ? undefined : "positive")}
                className={`h-10 rounded-xl border text-sm font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  platformSentiment === "positive"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-white border-gray-200 text-gray-500"
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPlatformSentiment(platformSentiment === "negative" ? undefined : "negative")}
                className={`h-10 rounded-xl border text-sm font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  platformSentiment === "negative"
                    ? "bg-red-50 border-red-200 text-red-600"
                    : "bg-white border-gray-200 text-gray-500"
                }`}
              >
                <ThumbsDown className="w-4 h-4" />
              </button>
            </div>
            <textarea
              value={platformFeedback}
              onChange={(e) => setPlatformFeedback(e.target.value)}
              placeholder={t.reviewModal.platformPlaceholder}
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onSkip}
              className="flex-1 h-11 rounded-2xl border-2 border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors"
            >
              {t.reviewModal.skip}
            </button>
            <button
              onClick={handleSubmit}
              disabled={rating === 0}
              className="flex-1 h-11 rounded-2xl text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t.reviewModal.submit}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}


function MetricSlider({
  label,
  value,
  onChange,
  t,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  t: Dict;
}) {
  const getLabel = (value: number) => {
    if (value < 40) return t.reviewModal.metricLabel.poor;
    if (value < 70) return t.reviewModal.metricLabel.average;
    return t.reviewModal.metricLabel.excellent;
  };

  const getEmoji = (value: number) => {
    if (value < 40) return "👎";
    if (value < 70) return "🙂";
    return "👍";
  };

  return (
    <div>
      {/* Top Row */}
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <p className="text-xs font-black text-gray-800">{label}</p>

        <div className="flex items-center gap-2">
          <span className="text-lg">{getEmoji(value)}</span>

          <span className="text-sm font-bold text-white bg-gradient-to-r from-violet-500 to-purple-600 rounded-full px-3 py-1 shadow">
            {value}%
          </span>
        </div>
      </div>

      {/* Slider */}
      <div className="relative">
        {/* Gradient Track */}
        <div className="absolute top-1/2 -translate-y-1/2 w-full h-2 rounded-full bg-gradient-to-r from-red-500 via-yellow-100 to-green-500" />

        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="relative w-full appearance-none bg-transparent h-3.5 cursor-pointer"
        />

        {/* Custom Thumb Style */}
        <style>
          {`
            input[type="range"]::-webkit-slider-thumb {
              appearance: none;
              height: 16px;
              width: 16px;
              border-radius: 9999px;
              background: #7c3aed;
              cursor: pointer;
              transition: transform 0.2s;
            }

            input[type="range"]::-webkit-slider-thumb:hover {
              transform: scale(1.2);
            }

            input[type="range"]::-moz-range-thumb {
              height: 16px;
              width: 16px;
              border-radius: 9999px;
              background: #7c3aed;
              cursor: pointer;
            }
          `}
        </style>
      </div>

      {/* Bottom Labels */}
      <div className="flex justify-between items-center mt-1">
        <span className="text-[10px] font-bold text-gray-400">
          {t.reviewModal.metricLabel.poor}
        </span>

        <span className="text-[11px] font-bold text-violet-600">
          {getLabel(value)}
        </span>

        <span className="text-[10px] font-bold text-gray-400">
          {t.reviewModal.metricLabel.excellent}
        </span>
      </div>
    </div>
  );
}

export default MetricSlider;
