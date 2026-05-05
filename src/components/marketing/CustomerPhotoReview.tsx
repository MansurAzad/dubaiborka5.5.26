import { useState } from "react";
import { Camera, X, Upload } from "lucide-react";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface CustomerPhotoReviewProps {
  onPhotoUploaded: (url: string) => void;
}

const CustomerPhotoReview = ({ onPhotoUploaded }: CustomerPhotoReviewProps) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "ফাইল খুব বড়", description: "সর্বোচ্চ ৫MB আপলোড করা যাবে", variant: "destructive" });
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({ title: "শুধু ছবি আপলোড করুন", variant: "destructive" });
      return;
    }

    setPreview(URL.createObjectURL(file));
    setUploading(true);

    try {
      const result = await uploadToCloudinary(file, "reviews");
      if (!result.success) throw new Error(result.error);

      onPhotoUploaded(result.url!);
      toast({ title: "ছবি আপলোড হয়েছে!" });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "আপলোড ব্যর্থ হয়েছে", variant: "destructive" });
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">ছবি যোগ করুন (ঐচ্ছিক)</label>
      
      {preview ? (
        <div className="relative inline-block">
          <img src={preview} alt="Preview" className="w-20 h-20 object-cover rounded-lg border border-border" />
          <button
            onClick={() => setPreview(null)}
            className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
          <Camera className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {uploading ? "আপলোড হচ্ছে..." : "ছবি আপলোড করুন"}
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
};

export default CustomerPhotoReview;
