import { useState, useRef } from "react";
import { Upload, X, Loader2, GripVertical, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ProductImage {
  id?: string;
  image_url: string;
  alt_text?: string;
  display_order: number;
}

interface MultiImageUploadProps {
  productId: string;
  images: ProductImage[];
  onImagesChange: (images: ProductImage[]) => void;
  bucket?: string;
}

const MultiImageUpload = ({ productId, images, onImagesChange, bucket = "product-images" }: MultiImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadImages = async (files: FileList) => {
    const validFiles = Array.from(files).filter(f => {
      if (!f.type.startsWith("image/")) {
        toast({ title: "Skipped", description: `${f.name} is not an image`, variant: "destructive" });
        return false;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast({ title: "Skipped", description: `${f.name} exceeds 5MB limit`, variant: "destructive" });
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setUploading(true);
    const newImages: ProductImage[] = [];

    for (const file of validFiles) {
      try {
        const result = await uploadToCloudinary(file, `products/${productId}`);
        if (!result.success) {
          toast({ title: "Upload failed", description: `${file.name}: ${result.error}`, variant: "destructive" });
          continue;
        }

        newImages.push({
          image_url: result.url!,
          alt_text: file.name.replace(/\.[^/.]+$/, ""),
          display_order: images.length + newImages.length,
        });
      } catch (err: any) {
        toast({ title: "Upload failed", description: `${file.name}: ${err.message}`, variant: "destructive" });
      }
    }

    if (newImages.length > 0) {
      // Save to product_images table
      const inserts = newImages.map(img => ({
        product_id: productId,
        image_url: img.image_url,
        alt_text: img.alt_text || null,
        display_order: img.display_order,
      }));

      const { data: savedImages, error } = await supabase
        .from("product_images")
        .insert(inserts)
        .select();

      if (error) {
        toast({ title: "Error saving images", description: error.message, variant: "destructive" });
      } else {
        const allImages = [...images, ...(savedImages || []).map((s: any) => ({
          id: s.id,
          image_url: s.image_url,
          alt_text: s.alt_text,
          display_order: s.display_order,
        }))];
        onImagesChange(allImages);
        toast({ title: "Success", description: `${newImages.length} image(s) uploaded` });
      }
    }

    setUploading(false);
  };

  const removeImage = async (index: number) => {
    const img = images[index];
    if (img.id) {
      await supabase.from("product_images").delete().eq("id", img.id);
    }
    const updated = images.filter((_, i) => i !== index).map((img, i) => ({
      ...img,
      display_order: i,
    }));
    onImagesChange(updated);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) uploadImages(e.dataTransfer.files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) uploadImages(e.target.files);
  };

  return (
    <div className="space-y-3">
      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {images.map((img, index) => (
            <div key={img.id || index} className="relative group aspect-square">
              <img
                src={img.image_url}
                alt={img.alt_text || "Product"}
                className="w-full h-full object-cover rounded-lg border border-border"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => removeImage(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {index === 0 && (
                <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded">
                  Main
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
          uploading && "pointer-events-none opacity-50"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleChange}
          className="hidden"
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Plus className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drop images here or click to upload
            </p>
            <p className="text-xs text-muted-foreground/70">
              Multiple files supported • Max 5MB each
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiImageUpload;
