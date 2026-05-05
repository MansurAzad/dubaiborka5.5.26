import { useState, useRef, forwardRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  bucket?: string;
}

const ImageUpload = forwardRef<HTMLDivElement, ImageUploadProps>(
  ({ value, onChange, bucket = "product-images" }, ref) => {
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const uploadImage = async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Error", description: "Please upload an image file", variant: "destructive" });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Error", description: "Image must be less than 5MB", variant: "destructive" });
        return;
      }

      setUploading(true);
      try {
        const result = await uploadToCloudinary(file, "products");
        if (!result.success) {
          toast({ title: "Upload failed", description: result.error || "Unknown error", variant: "destructive" });
          return;
        }
        onChange(result.url!);
        toast({ title: "Success", description: result.existing ? "Image already exists (deduplicated)" : "Image uploaded successfully" });
      } catch (error: any) {
        toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      } finally {
        setUploading(false);
      }
    };

    const handleDrag = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(e.type === "dragenter" || e.type === "dragover");
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files?.[0]) uploadImage(e.dataTransfer.files[0]);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) uploadImage(e.target.files[0]);
    };

    return (
      <div ref={ref} className="space-y-2">
        {value ? (
          <div className="relative inline-block">
            <img src={value} alt="Product" className="w-32 h-32 object-cover rounded-lg border" />
            <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6" onClick={() => onChange("")}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
              dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
              uploading && "pointer-events-none opacity-50"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" accept="image/*" onChange={handleChange} className="hidden" />
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Uploading...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Drag & drop or click to upload</p>
                <p className="text-xs text-muted-foreground/70">Max size: 5MB</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

ImageUpload.displayName = "ImageUpload";

export default ImageUpload;
