/**
 * Client-side image compression / resize.
 * Tries to fit the output under `targetBytes` (default 256 KB) by iteratively
 * lowering JPEG/WebP quality and downscaling. Falls back to original file
 * if compression somehow inflates size.
 */
export interface CompressOptions {
  targetBytes?: number;   // default 256 * 1024
  maxDimension?: number;  // default 1920
  mimeType?: string;      // default "image/webp" (best ratio), fallback "image/jpeg"
}

export interface CompressResult {
  file: File;
  originalSize: number;
  finalSize: number;
  width: number;
  height: number;
  attempts: number;
}

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

export async function compressImage(
  file: File,
  opts: CompressOptions = {}
): Promise<CompressResult> {
  const targetBytes = opts.targetBytes ?? 256 * 1024;
  let maxDim = opts.maxDimension ?? 1920;
  const preferredType = opts.mimeType ?? "image/webp";

  // GIFs (animated) and SVG should not be re-encoded
  if (file.type === "image/gif" || file.type === "image/svg+xml") {
    return { file, originalSize: file.size, finalSize: file.size, width: 0, height: 0, attempts: 0 };
  }

  // Already small enough — skip
  if (file.size <= targetBytes) {
    return { file, originalSize: file.size, finalSize: file.size, width: 0, height: 0, attempts: 0 };
  }

  const img = await loadImage(file);
  let { width, height } = img;

  // Scale so the long edge ≤ maxDim
  const scaleToFit = () => {
    if (width > maxDim || height > maxDim) {
      const ratio = Math.min(maxDim / width, maxDim / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }
  };
  scaleToFit();

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return { file, originalSize: file.size, finalSize: file.size, width, height, attempts: 0 };

  let quality = 0.82;
  let attempts = 0;
  let best: Blob | null = null;

  // Up to 8 iterations: drop quality, then downscale if still too big
  while (attempts < 8) {
    attempts++;
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    let blob = await canvasToBlob(canvas, preferredType, quality);
    // Some browsers refuse webp encoding — fall back to jpeg
    if (!blob || blob.type === "image/png") {
      blob = await canvasToBlob(canvas, "image/jpeg", quality);
    }
    if (!blob) break;

    if (!best || blob.size < best.size) best = blob;

    if (blob.size <= targetBytes) break;

    // Strategy: first lower quality, then shrink
    if (quality > 0.45) {
      quality -= 0.12;
    } else {
      maxDim = Math.round(Math.max(width, height) * 0.8);
      scaleToFit();
      quality = 0.7;
    }
  }

  if (!best || best.size >= file.size) {
    return { file, originalSize: file.size, finalSize: file.size, width, height, attempts };
  }

  const ext = best.type === "image/webp" ? "webp" : "jpg";
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  const compressed = new File([best], `${baseName}.${ext}`, {
    type: best.type,
    lastModified: Date.now(),
  });

  return {
    file: compressed,
    originalSize: file.size,
    finalSize: compressed.size,
    width,
    height,
    attempts,
  };
}

export const formatBytes = (b: number) =>
  b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(2)} MB`;
