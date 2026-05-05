import { supabase } from "@/integrations/supabase/client";

interface CloudinaryUploadResult {
  success: boolean;
  url?: string;
  public_id?: string;
  existing?: boolean;
  error?: string;
}

export async function uploadToCloudinary(
  file: File,
  folder: string = "products",
  resourceType: string = "image"
): Promise<CloudinaryUploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);
  formData.append("resource_type", resourceType);

  const { data, error } = await supabase.functions.invoke("cloudinary-upload", {
    body: formData,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data as CloudinaryUploadResult;
}

export async function uploadUrlToCloudinary(
  fileUrl: string,
  folder: string = "products",
  resourceType: string = "image"
): Promise<CloudinaryUploadResult> {
  const formData = new FormData();
  formData.append("file_url", fileUrl);
  formData.append("folder", folder);
  formData.append("resource_type", resourceType);

  const { data, error } = await supabase.functions.invoke("cloudinary-upload", {
    body: formData,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data as CloudinaryUploadResult;
}

export async function migrateToCloudinary(): Promise<any> {
  const { data, error } = await supabase.functions.invoke("cloudinary-migrate");

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
