import { useState, useRef } from "react";
import { Plus, Trash2, Loader2, Image as ImageIcon, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { useToast } from "@/hooks/use-toast";

interface GalleryImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
}

const GalleryImageUpload = ({ images, onChange }: GalleryImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (files: FileList) => {
    const validFiles = Array.from(files).filter(f => {
      if (!f.type.startsWith("image/")) {
        toast({ title: "স্কিপ করা হয়েছে", description: `${f.name} ইমেজ ফাইল নয়`, variant: "destructive" });
        return false;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast({ title: "স্কিপ করা হয়েছে", description: `${f.name} 5MB এর বেশি`, variant: "destructive" });
        return false;
      }
      return true;
    });
    if (!validFiles.length) return;

    setUploading(true);
    const newUrls: string[] = [];
    for (const file of validFiles) {
      try {
        const result = await uploadToCloudinary(file, "products");
        if (result.success && result.url) {
          newUrls.push(result.url);
        } else {
          toast({ title: "আপলোড ব্যর্থ", description: result.error || file.name, variant: "destructive" });
        }
      } catch (err: any) {
        toast({ title: "আপলোড ব্যর্থ", description: err.message, variant: "destructive" });
      }
    }
    if (newUrls.length) {
      onChange([...images, ...newUrls]);
      toast({ title: "সফল", description: `${newUrls.length}টি ছবি আপলোড হয়েছে` });
    }
    setUploading(false);
  };

  const addUrl = () => {
    const url = urlValue.trim();
    if (url) {
      onChange([...images, url]);
      setUrlValue("");
      setShowUrlInput(false);
    }
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {/* Thumbnail grid */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((url, i) => (
            <div key={i} className="relative group w-16 h-16">
              <img src={url} alt="" className="w-full h-full object-cover rounded border border-border" />
              <button
                type="button"
                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeImage(i)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <ImageIcon className="w-3 h-3 mr-1" />}
          {uploading ? "আপলোড হচ্ছে..." : "ছবি আপলোড"}
        </Button>
        {showUrlInput ? (
          <div className="flex items-center gap-1">
            <Input
              className="h-8 text-xs w-48"
              placeholder="https://... ইমেজ URL"
              value={urlValue}
              onChange={e => setUrlValue(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } }}
              autoFocus
            />
            <Button type="button" size="sm" variant="ghost" onClick={addUrl}>✓</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowUrlInput(false)}>✕</Button>
          </div>
        ) : (
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowUrlInput(true)}>
            <Link className="w-3 h-3 mr-1" /> URL দিন
          </Button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => { if (e.target.files?.length) handleFileUpload(e.target.files); e.target.value = ""; }}
      />
      <p className="text-xs text-muted-foreground">
        মোবাইল/কম্পিউটার থেকে ছবি আপলোড করুন অথবা URL পেস্ট করুন। একাধিক ছবি সিলেক্ট করা যাবে।
      </p>
    </div>
  );
};

export default GalleryImageUpload;
