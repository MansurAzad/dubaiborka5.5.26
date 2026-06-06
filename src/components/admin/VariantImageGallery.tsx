import { useState } from "react";
import { ImageIcon, Upload, Star, Trash2, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadProductImage, type ProgressEvent } from "@/lib/storage-upload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface VariantImageGalleryProps {
  variantId: string;
  productId: string;
  mainImage: string | null;
  images: string[];
  onUpdated: () => void;
}

interface FileProg { name: string; prog: ProgressEvent }

export const VariantImageGallery = ({
  variantId, productId, mainImage, images, onUpdated,
}: VariantImageGalleryProps) => {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progresses, setProgresses] = useState<FileProg[]>([]);
  const { toast } = useToast();

  const gallery = images && images.length > 0 ? images : (mainImage ? [mainImage] : []);

  const persist = async (next: string[], nextMain?: string | null) => {
    const main = nextMain !== undefined ? nextMain : (next[0] || null);
    const { error } = await supabase
      .from("product_variants")
      .update({ image_urls: next, image_url: main })
      .eq("id", variantId);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return false;
    }
    onUpdated();
    return true;
  };

  const handleUpload = async (files: FileList) => {
    const valid = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (!valid.length) return;
    setUploading(true);
    setProgresses(valid.map(f => ({ name: f.name, prog: { stage: "compress", progress: 0, message: "Queued" } })));

    const uploaded: string[] = [];
    let mirrored = 0;
    for (let i = 0; i < valid.length; i++) {
      const f = valid[i];
      const r = await uploadProductImage(f, {
        folder: `products/variants/${productId}`,
        onProgress: (e) => setProgresses(prev => {
          const n = [...prev]; n[i] = { name: f.name, prog: e }; return n;
        }),
      });
      if (r.success && r.url) {
        uploaded.push(r.url);
        if (r.cloudinaryUrl) mirrored++;
      } else {
        toast({ title: "Upload failed", description: `${f.name}: ${r.error}`, variant: "destructive" });
      }
    }
    if (uploaded.length) {
      const next = [...gallery, ...uploaded];
      const ok = await persist(next);
      if (ok) toast({
        title: `${uploaded.length}টি ইমেজ যোগ হয়েছে`,
        description: `Cloudinary mirror: ${mirrored}/${uploaded.length}`,
      });
    }
    setUploading(false);
    setProgresses([]);
  };

  const setMain = async (url: string) => {
    const reordered = [url, ...gallery.filter(u => u !== url)];
    const ok = await persist(reordered, url);
    if (ok) toast({ title: "Main ইমেজ সেট হয়েছে" });
  };

  const remove = async (url: string) => {
    const next = gallery.filter(u => u !== url);
    const ok = await persist(next, next[0] || null);
    if (ok) toast({ title: "ইমেজ মুছে ফেলা হয়েছে" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="relative w-12 h-12 group">
          {mainImage ? (
            <img src={mainImage} alt="variant" className="w-12 h-12 object-cover rounded-md border border-border" />
          ) : (
            <div className="w-12 h-12 rounded-md border border-dashed border-border flex items-center justify-center bg-muted/50">
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
          {gallery.length > 1 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] font-medium rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
              {gallery.length}
            </span>
          )}
          <div className="absolute inset-0 bg-background/70 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-md transition-opacity">
            <Upload className="w-4 h-4 text-primary" />
          </div>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>ভেরিয়েন্ট ইমেজ গ্যালারি ({gallery.length})</DialogTitle>
        </DialogHeader>

        {gallery.length > 0 && (
          <div className="grid grid-cols-4 gap-3">
            {gallery.map((url) => {
              const isMain = url === mainImage;
              return (
                <div key={url} className={cn(
                  "relative group aspect-square rounded-md border-2",
                  isMain ? "border-primary ring-2 ring-primary/30" : "border-border"
                )}>
                  <img src={url} alt="" className="w-full h-full object-cover rounded-md" />
                  {isMain && (
                    <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[9px] px-1.5 py-0.5 rounded">
                      MAIN
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center gap-1">
                    {!isMain && (
                      <Button type="button" size="icon" variant="secondary" className="h-7 w-7" onClick={() => setMain(url)} title="Set as main">
                        <Star className="w-3 h-3" />
                      </Button>
                    )}
                    <Button type="button" size="icon" variant="destructive" className="h-7 w-7" onClick={() => remove(url)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <label className={cn(
          "border-2 border-dashed rounded-lg p-4 text-center transition-colors block",
          uploading ? "opacity-80 pointer-events-none" : "cursor-pointer hover:border-primary/50 border-muted-foreground/30"
        )}>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
          />
          {uploading ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">আপলোড চলছে…</span>
              </div>
              {progresses.map((p, i) => (
                <div key={i} className="text-xs text-left border rounded p-1.5">
                  <div className="flex justify-between"><span className="truncate">{p.name}</span><span className="text-muted-foreground">{p.prog.stage} {Math.round(p.prog.progress)}%</span></div>
                  <Progress value={p.prog.progress} className="h-1 mt-1" />
                  {p.prog.detail && <p className="text-[10px] text-muted-foreground truncate">{p.prog.detail}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <Upload className="w-5 h-5 text-muted-foreground" />
              <p className="text-sm">একাধিক ইমেজ আপলোড করুন</p>
              <p className="text-xs text-muted-foreground">Auto-compress to ~256KB • Click thumbnail star to set main</p>
            </div>
          )}
        </label>
      </DialogContent>
    </Dialog>
  );
};

export default VariantImageGallery;
