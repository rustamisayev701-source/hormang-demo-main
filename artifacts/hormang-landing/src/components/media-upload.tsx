/**
 * media-upload.tsx
 * Reusable multi-photo upload zone with:
 *  - drag-to-upload (file drop)
 *  - multi-select from file picker
 *  - thumbnail preview grid
 *  - remove individual photos
 *  - drag-to-reorder thumbnails
 *  - upload counter (N / max)
 *  - image compression via compressImage
 */

import { useRef, useState, useCallback, DragEvent } from "react";
import { Upload, X, GripVertical, ImageIcon, Loader2 } from "lucide-react";
import { compressImage } from "@/lib/image-utils";
import { useI18n } from "@/contexts/i18n-context";
import { tFormat } from "@/lib/i18n";

/* ─── Props ────────────────────────────────────────────────────── */

interface MediaUploadZoneProps {
  urls: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  label?: string;
  hint?: string;
  className?: string;
  /** Compression max dimension (default 960) */
  maxDim?: number;
  /** Compression quality 0-1 (default 0.72) */
  quality?: number;
}

/* ─── Component ─────────────────────────────────────────────────── */

export function MediaUploadZone({
  urls,
  onChange,
  max = 10,
  label,
  hint,
  className = "",
  maxDim = 960,
  quality = 0.72,
}: MediaUploadZoneProps) {
  const { t } = useI18n();
  const tm = t.mediaUpload;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [compressing, setCompressing] = useState(false);

  /* Drag-to-reorder */
  const dragSrcIdx = useRef<number | null>(null);

  const remaining = max - urls.length;
  const canAdd = remaining > 0;

  async function processFiles(files: File[]) {
    if (!canAdd) return;
    const toProcess = files.slice(0, remaining);
    setCompressing(true);
    const results: string[] = [];
    for (const file of toProcess) {
      try {
        const compressed = await compressImage(file, maxDim, quality);
        results.push(compressed);
      } catch {
        await new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            results.push(ev.target?.result as string);
            resolve();
          };
          reader.onerror = () => resolve();
          reader.readAsDataURL(file);
        });
      }
    }
    setCompressing(false);
    onChange([...urls, ...results]);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length) processFiles(files);
  }

  function handleRemove(idx: number) {
    onChange(urls.filter((_, i) => i !== idx));
  }

  /* Drop zone handlers */
  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragOver(false), []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (files.length) processFiles(files);
    },
    [urls, remaining]
  );

  /* Thumbnail drag-to-reorder */
  function handleThumbDragStart(idx: number) {
    dragSrcIdx.current = idx;
  }

  function handleThumbDragOver(e: DragEvent, idx: number) {
    e.preventDefault();
    if (dragSrcIdx.current === null || dragSrcIdx.current === idx) return;
    const next = [...urls];
    const [moved] = next.splice(dragSrcIdx.current, 1);
    next.splice(idx, 0, moved);
    dragSrcIdx.current = idx;
    onChange(next);
  }

  function handleThumbDragEnd() {
    dragSrcIdx.current = null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Label + counter */}
      {(label !== undefined || urls.length > 0) && (
        <div className="flex items-center justify-between">
          {label !== undefined && (
            <span className="text-xs font-bold text-gray-700">{label}</span>
          )}
          <span
            className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
              urls.length >= max
                ? "bg-amber-50 text-amber-600 border border-amber-100"
                : urls.length > 0
                ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            {urls.length} / {max}
          </span>
        </div>
      )}

      {/* Thumbnail grid */}
      {urls.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {urls.map((url, idx) => (
            <div
              key={idx}
              draggable
              onDragStart={() => handleThumbDragStart(idx)}
              onDragOver={(e) => handleThumbDragOver(e, idx)}
              onDragEnd={handleThumbDragEnd}
              className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-100 cursor-grab active:cursor-grabbing group"
            >
              <img
                src={url}
                alt={tFormat(tm.imageAltTpl, { n: idx + 1 })}
                className="w-full h-full object-cover"
              />
              {/* Drag handle */}
              <div className="absolute top-1 left-1 w-5 h-5 rounded bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="w-3 h-3 text-white" />
              </div>
              {/* Remove button */}
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-red-500 transition-colors"
              >
                <X className="w-2.5 h-2.5" />
              </button>
              {/* Order badge */}
              <div className="absolute bottom-1 left-1 w-4 h-4 rounded bg-black/40 flex items-center justify-center">
                <span className="text-[9px] font-bold text-white">{idx + 1}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {canAdd && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`w-full border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 py-6 transition-all text-center ${
            isDragOver
              ? "border-blue-400 bg-blue-50 text-blue-600"
              : "border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/30"
          }`}
        >
          {compressing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <ImageIcon className="w-5 h-5" />
          )}
          <div>
            <p className="text-sm font-semibold">
              {compressing
                ? tm.compressing
                : isDragOver
                ? tm.dragOver
                : urls.length === 0
                ? tm.addFirst
                : tFormat(tm.addMoreTpl, { n: remaining })}
            </p>
            {!compressing && hint && (
              <p className="text-xs mt-0.5 opacity-70">{hint}</p>
            )}
          </div>
        </button>
      )}

      {/* Full limit message */}
      {!canAdd && (
        <div className="text-center py-2">
          <p className="text-xs text-amber-600 font-semibold">
            {tFormat(tm.limitReachedTpl, { max })}
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

/* ─── Compact variant for offer form ───────────────────────────── */

interface CompactMediaUploadProps {
  urls: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}

export function CompactMediaUpload({ urls, onChange, max = 3 }: CompactMediaUploadProps) {
  const { t } = useI18n();
  const tm = t.mediaUpload;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [compressing, setCompressing] = useState(false);
  const canAdd = urls.length < max;

  async function processFiles(files: File[]) {
    const toProcess = files.slice(0, max - urls.length);
    setCompressing(true);
    const results: string[] = [];
    for (const file of toProcess) {
      try {
        const compressed = await compressImage(file, 800, 0.70);
        results.push(compressed);
      } catch {
        await new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => { results.push(ev.target?.result as string); resolve(); };
          reader.onerror = () => resolve();
          reader.readAsDataURL(file);
        });
      }
    }
    setCompressing(false);
    onChange([...urls, ...results]);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    if (files.length) processFiles(files);
  }

  function remove(idx: number) {
    onChange(urls.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-2">
      {/* Thumbnails row */}
      {urls.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {urls.map((url, idx) => (
            <div key={idx} className="relative group w-16 h-16 rounded-xl overflow-hidden border border-gray-200 bg-gray-100 flex-shrink-0">
              <img src={url} alt={tFormat(tm.imageAltTpl, { n: idx + 1 })} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => remove(idx)}
                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add button + counter */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => canAdd && fileInputRef.current?.click()}
          disabled={!canAdd || compressing}
          className={`flex-1 h-11 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 text-sm font-semibold transition-colors ${
            canAdd
              ? "border-violet-200 text-violet-500 hover:border-violet-400 hover:bg-violet-50"
              : "border-gray-100 text-gray-300 cursor-not-allowed"
          }`}
        >
          {compressing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          {compressing ? tm.compressingShort : canAdd ? tm.upload : tm.full}
        </button>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
          urls.length >= max ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-gray-100 text-gray-500"
        }`}>
          {urls.length} / {max}
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
