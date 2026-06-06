import { useState, useRef, forwardRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { uploadProductImage, type ProgressEvent } from "@/lib/storage-upload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { formatBytes } from "@/lib/image-compress";
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
    const [prog, setProg] = useState<ProgressEvent | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const uploadImage = async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast({ title: "ভুল ফাইল টাইপ", description: "শুধু ইমেজ ফাইল আপলোড করুন", variant: "destructive" });
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast({ title: "ফাইল অনেক বড়", description: `${formatBytes(file.size)} — সর্বোচ্চ 20MB`, variant: "destructive" });
        return;
      }

      setUploading(true);
      setProg({ stage: "compress", progress: 0, message: "শুরু হচ্ছে…" });
      try {
        const result = await uploadProductImage(file, {
          folder: "products",
          bucket,
          onProgress: (e) => setProg(e),
        });
        if (!result.success) {
          toast({
            title: "আপলোড ব্যর্থ",
            description: result.error || "Unknown error",
            variant: "destructive",
          });
          return;
        }
        onChange(result.url!);

        const sizeReport =
          result.originalSize && result.finalSize
            ? ` • ${formatBytes(result.originalSize)} → ${formatBytes(result.finalSize)}`
            : "";

        if (result.cloudinaryUrl) {
          toast({
            title: "সফল ✓",
            description: `Lovable Cloud + Cloudinary mirror${sizeReport}`,
          });
        } else if (result.cloudinaryError) {
          toast({
            title: "Lovable Cloud ✓ • Cloudinary ✗",
            description: `Primary সফল হয়েছে কিন্তু mirror ব্যর্থ: ${result.cloudinaryError}${sizeReport}`,
          });
        } else {
          toast({ title: "সফল", description: `Lovable Cloud-এ আপলোড হয়েছে${sizeReport}` });
        }
      } catch (error: any) {
        toast({ title: "আপলোড ব্যর্থ", description: error?.message || String(error), variant: "destructive" });
      } finally {
        setUploading(false);
        setProg(null);
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
        {value && !uploading ? (
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
              uploading && "pointer-events-none opacity-80"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !uploading && inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" accept="image/*" onChange={handleChange} className="hidden" />
            {uploading ? (
              <div className="flex flex-col items-center gap-2 w-full">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm font-medium">{prog?.message || "Uploading…"}</p>
                {prog?.detail && <p className="text-xs text-muted-foreground">{prog.detail}</p>}
                <Progress value={prog?.progress ?? 0} className="h-2 w-full max-w-xs" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {prog?.stage} • {Math.round(prog?.progress ?? 0)}%
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Drag & drop or click to upload</p>
                <p className="text-xs text-muted-foreground/70">Auto-compressed to ~256KB • Max 20MB</p>
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
