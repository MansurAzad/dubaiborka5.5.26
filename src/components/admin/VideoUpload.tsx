import { useState, forwardRef, useRef } from "react";
import { Upload, X, Loader2, Video, Play } from "lucide-react";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface VideoUploadProps {
  value?: string;
  onChange: (url: string) => void;
  bucket?: string;
  maxSizeMB?: number;
}

const VideoUpload = forwardRef<HTMLDivElement, VideoUploadProps>(
  ({ value, onChange, bucket = "product-videos", maxSizeMB = 50 }, ref) => {
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [progress, setProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const uploadVideo = async (file: File) => {
      if (!file.type.startsWith("video/")) {
        toast({ title: "ভুল ফাইল", description: "শুধুমাত্র ভিডিও ফাইল আপলোড করুন", variant: "destructive" });
        return;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast({ title: "ফাইল বড়", description: `ভিডিও ${maxSizeMB}MB এর বেশি হতে পারবে না`, variant: "destructive" });
        return;
      }

      setUploading(true);
      setProgress(10);

      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

      try {
        setProgress(30);
        const result = await uploadToCloudinary(file, "videos", "video");
        setProgress(80);

        if (!result.success) throw new Error(result.error || "Upload failed");
        setProgress(100);

        onChange(result.url!);
        toast({ title: "সফল!", description: result.existing ? "ভিডিও ইতিমধ্যে আছে (ডুপ্লিকেট এড়ানো হয়েছে)" : "ভিডিও আপলোড হয়েছে" });
      } catch (error: any) {
        toast({ title: "আপলোড ব্যর্থ", description: error.message, variant: "destructive" });
      } finally {
        setTimeout(() => {
          setUploading(false);
          setProgress(0);
        }, 500);
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
      if (e.dataTransfer.files?.[0]) uploadVideo(e.dataTransfer.files[0]);
    };

    if (value) {
      return (
        <div ref={ref} className="relative rounded-lg overflow-hidden border border-border bg-muted">
          <video src={value} className="w-full max-h-48 object-cover" muted />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <Play className="w-10 h-10 text-white/80" />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7"
            onClick={() => onChange("")}
          >
            <X className="w-4 h-4" />
          </Button>
          <p className="text-xs text-muted-foreground p-2 truncate">{value.split("/").pop()}</p>
        </div>
      );
    }

    return (
      <div ref={ref}>
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/ogg,video/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && uploadVideo(e.target.files[0])}
          />
          {uploading ? (
            <div className="space-y-3">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">আপলোড হচ্ছে...</p>
              <Progress value={progress} className="h-2 max-w-xs mx-auto" />
            </div>
          ) : (
            <>
              <Video className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">ভিডিও আপলোড করুন</p>
              <p className="text-xs text-muted-foreground mt-1">
                MP4, WebM — সর্বোচ্চ {maxSizeMB}MB
              </p>
            </>
          )}
        </div>
      </div>
    );
  }
);

VideoUpload.displayName = "VideoUpload";
export default VideoUpload;
