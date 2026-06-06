import { supabase } from "@/integrations/supabase/client";
import { uploadToCloudinary } from "@/lib/cloudinary";

export interface DualUploadResult {
  success: boolean;
  url?: string;            // Primary (Supabase) URL — saved to DB
  storagePath?: string;    // Path inside Supabase bucket
  cloudinaryUrl?: string;  // Mirror URL (if Cloudinary upload succeeded)
  cloudinaryError?: string;
  error?: string;
}

/**
 * Dual upload: Lovable Cloud Storage (primary) + Cloudinary (mirror backup).
 *
 * - Supabase Storage is the source of truth — its URL is returned and saved to DB.
 * - Cloudinary mirror runs in parallel; failure does NOT block the upload.
 * - When Cloudinary credentials are rotated, the edge function picks them up automatically.
 */
export async function uploadProductImage(
  file: File,
  folder: string = "products",
  bucket: string = "product-images"
): Promise<DualUploadResult> {
  if (!file.type.startsWith("image/")) {
    return { success: false, error: "Only image files are allowed" };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { success: false, error: "Image must be less than 10MB" };
  }

  // Build a safe, unique storage path
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const safeBase = file.name
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "image";
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const storagePath = `${folder}/${safeBase}-${unique}.${ext}`;

  // 1) Primary: upload to Supabase Storage
  const { error: upErr } = await supabase.storage
    .from(bucket)
    .upload(storagePath, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type,
    });

  if (upErr) {
    return { success: false, error: `Storage upload failed: ${upErr.message}` };
  }

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  const primaryUrl = pub.publicUrl;

  // 2) Mirror to Cloudinary (best-effort, non-blocking failure)
  let cloudinaryUrl: string | undefined;
  let cloudinaryError: string | undefined;
  try {
    const mirror = await uploadToCloudinary(file, folder);
    if (mirror.success && mirror.url) {
      cloudinaryUrl = mirror.url;
    } else {
      cloudinaryError = mirror.error || "Unknown Cloudinary error";
      console.warn("[storage-upload] Cloudinary mirror failed:", cloudinaryError);
    }
  } catch (err: any) {
    cloudinaryError = err?.message || String(err);
    console.warn("[storage-upload] Cloudinary mirror exception:", cloudinaryError);
  }

  return {
    success: true,
    url: primaryUrl,
    storagePath,
    cloudinaryUrl,
    cloudinaryError,
  };
}
