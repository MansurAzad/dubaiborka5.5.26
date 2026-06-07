import { supabase } from "@/integrations/supabase/client";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { compressImage, formatBytes } from "@/lib/image-compress";

const CLOUDINARY_LOG_KEY = "cloudinary_recent_failures";

function logCloudinaryFailure(message: string, reason?: string) {
  try {
    const raw = localStorage.getItem(CLOUDINARY_LOG_KEY);
    const arr: Array<{ at: string; message: string; reason?: string }> = raw ? JSON.parse(raw) : [];
    arr.unshift({ at: new Date().toISOString(), message, reason });
    localStorage.setItem(CLOUDINARY_LOG_KEY, JSON.stringify(arr.slice(0, 20)));
  } catch {
    /* ignore */
  }
}

export function getCloudinaryRecentFailures(): Array<{ at: string; message: string; reason?: string }> {
  try {
    const raw = localStorage.getItem(CLOUDINARY_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearCloudinaryFailures() {
  try {
    localStorage.removeItem(CLOUDINARY_LOG_KEY);
  } catch {
    /* ignore */
  }
}

export interface DualUploadResult {
  success: boolean;
  url?: string;
  storagePath?: string;
  cloudinaryUrl?: string;
  cloudinaryError?: string;
  error?: string;
  /** Compression report */
  originalSize?: number;
  finalSize?: number;
}

export type UploadStage =
  | "compress"
  | "supabase"
  | "cloudinary"
  | "done"
  | "error";

export interface ProgressEvent {
  stage: UploadStage;
  progress: number; // 0-100 overall
  message?: string;
  detail?: string;
}

export type ProgressCallback = (e: ProgressEvent) => void;

interface UploadOptions {
  folder?: string;
  bucket?: string;
  onProgress?: ProgressCallback;
  /** Skip Cloudinary mirror entirely */
  skipCloudinary?: boolean;
  /** Compression target — default 256 KB */
  targetBytes?: number;
}

/**
 * Dual upload with auto-compression + real-time progress.
 *
 * Stages (progress %):
 *  - compress  (0 → 25)
 *  - supabase  (25 → 70)
 *  - cloudinary(70 → 100)
 */
export async function uploadProductImage(
  file: File,
  folderOrOpts: string | UploadOptions = "products",
  bucketArg: string = "product-images"
): Promise<DualUploadResult> {
  const opts: UploadOptions =
    typeof folderOrOpts === "string"
      ? { folder: folderOrOpts, bucket: bucketArg }
      : { bucket: bucketArg, ...folderOrOpts };

  const folder = opts.folder ?? "products";
  const bucket = opts.bucket ?? "product-images";
  const emit = opts.onProgress ?? (() => {});

  if (!file.type.startsWith("image/")) {
    emit({ stage: "error", progress: 0, message: "Only image files are allowed" });
    return { success: false, error: "Only image files are allowed" };
  }
  if (file.size > 20 * 1024 * 1024) {
    emit({ stage: "error", progress: 0, message: "Image must be less than 20MB" });
    return { success: false, error: "Image must be less than 20MB" };
  }

  // ── 1) Compress ──────────────────────────────────────────────
  emit({ stage: "compress", progress: 5, message: "ছবি কম্প্রেস হচ্ছে…" });
  let workingFile = file;
  let compressReport = "";
  try {
    const r = await compressImage(file, { targetBytes: opts.targetBytes ?? 256 * 1024 });
    workingFile = r.file;
    compressReport = `${formatBytes(r.originalSize)} → ${formatBytes(r.finalSize)}`;
    emit({
      stage: "compress",
      progress: 25,
      message: "কম্প্রেশন সম্পন্ন",
      detail: compressReport,
    });
  } catch (err: any) {
    console.warn("[storage-upload] compression failed, uploading original:", err);
    emit({ stage: "compress", progress: 25, message: "কম্প্রেশন স্কিপ হয়েছে", detail: err?.message });
  }

  // ── 2) Build storage path ────────────────────────────────────
  const ext = (workingFile.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const safeBase =
    file.name
      .replace(/\.[^/.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "image";
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const storagePath = `${folder}/${safeBase}-${unique}.${ext}`;

  // ── 3) Upload to Supabase Storage ────────────────────────────
  emit({ stage: "supabase", progress: 35, message: "Lovable Cloud-এ আপলোড হচ্ছে…" });
  const { error: upErr } = await supabase.storage
    .from(bucket)
    .upload(storagePath, workingFile, {
      cacheControl: "31536000",
      upsert: false,
      contentType: workingFile.type || file.type,
    });

  if (upErr) {
    emit({ stage: "error", progress: 35, message: "Supabase আপলোড ব্যর্থ", detail: upErr.message });
    return { success: false, error: `Storage upload failed: ${upErr.message}` };
  }

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  const primaryUrl = pub.publicUrl;
  emit({ stage: "supabase", progress: 70, message: "Lovable Cloud ✓", detail: compressReport });

  // ── 4) Cloudinary mirror (non-blocking) ──────────────────────
  let cloudinaryUrl: string | undefined;
  let cloudinaryError: string | undefined;

  if (!opts.skipCloudinary) {
    emit({ stage: "cloudinary", progress: 80, message: "Cloudinary mirror চলছে…" });
    try {
      const mirror = await uploadToCloudinary(workingFile, folder);
      if (mirror.success && mirror.url) {
        cloudinaryUrl = mirror.url;
        emit({ stage: "cloudinary", progress: 100, message: "Cloudinary mirror ✓" });
      } else {
        cloudinaryError = mirror.error || "Unknown Cloudinary error";
        logCloudinaryFailure(cloudinaryError, (mirror as any).reason);
        console.warn("[storage-upload] Cloudinary mirror failed — fallback to Lovable Cloud URL:", cloudinaryError);
        emit({ stage: "cloudinary", progress: 100, message: "Cloudinary mirror ব্যর্থ — Lovable Cloud fallback সক্রিয়", detail: cloudinaryError });
      }
    } catch (err: any) {
      cloudinaryError = err?.message || String(err);
      logCloudinaryFailure(cloudinaryError, "exception");
      console.warn("[storage-upload] Cloudinary mirror exception — fallback to Lovable Cloud URL:", cloudinaryError);
      emit({ stage: "cloudinary", progress: 100, message: "Cloudinary mirror ব্যর্থ — Lovable Cloud fallback সক্রিয়", detail: cloudinaryError });
    }
  } else {
    emit({ stage: "cloudinary", progress: 100, message: "Cloudinary mirror স্কিপ" });
  }

  emit({ stage: "done", progress: 100, message: "সম্পন্ন" });

  return {
    success: true,
    url: primaryUrl,
    storagePath,
    cloudinaryUrl,
    cloudinaryError,
    originalSize: file.size,
    finalSize: workingFile.size,
  };
}
