/**
 * image-utils.ts
 * Compress and resize images before storing as base64 in localStorage.
 * Reduces a typical 3–5 MB phone photo to ~80–150 KB.
 */

/**
 * Compress a File/Blob image to a JPEG data URL.
 * @param file     The image file to compress.
 * @param maxDim   Max width or height in pixels (default 1024).
 * @param quality  JPEG quality 0–1 (default 0.72).
 */
export function compressImage(
  file: File,
  maxDim = 1024,
  quality = 0.72,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new Image();

      img.onerror = () => reject(new Error("Image load failed"));
      img.onload = () => {
        let { width: w, height: h } = img;

        /* Downscale if needed */
        if (w > maxDim || h > maxDim) {
          if (w >= h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas ctx unavailable")); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };

      img.src = src;
    };

    reader.readAsDataURL(file);
  });
}
