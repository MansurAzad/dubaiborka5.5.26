import { useState, useEffect } from "react";
import { Plus, Minus, Trash2, Package, Loader2, Upload, Image as ImageIcon, Copy, Link } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

interface ProductVariant {
  id: string;
  product_id: string;
  size: string | null;
  color: string | null;
  stock: number;
  sku: string | null;
  price_adjustment: number;
  image_url: string | null;
}

interface VariantManagerProps {
  productId: string;
  productName: string;
  availableSizes: string[];
  availableColors: string[];
}

const VariantManager = ({ productId, productName, availableSizes, availableColors }: VariantManagerProps) => {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [newVariant, setNewVariant] = useState({
    size: "", color: "", stock: 0, sku: "", price_adjustment: 0,
  });
  const [customSize, setCustomSize] = useState("");
  const [customColor, setCustomColor] = useState("");
  const [newVariantImage, setNewVariantImage] = useState<File | null>(null);
  const [newVariantImageUrl, setNewVariantImageUrl] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSizes, setBulkSizes] = useState<string[]>([]);
  const [bulkColors, setBulkColors] = useState<string[]>([]);
  const [bulkStock, setBulkStock] = useState(10);
  const { toast } = useToast();

  // Merge predefined + existing variant values for suggestions
  const allSizes = [...new Set([...availableSizes, ...variants.filter(v => v.size).map(v => v.size!)])];
  const allColors = [...new Set([...availableColors, ...variants.filter(v => v.color).map(v => v.color!)])];

  const fetchVariants = async () => {
    const { data, error } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", productId)
      .order("color", { ascending: true });
    if (!error) setVariants(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchVariants(); }, [productId]);

  const uploadVariantImage = async (file: File, variantId: string): Promise<string | null> => {
    try {
      const { uploadToCloudinary } = await import("@/lib/cloudinary");
      const result = await uploadToCloudinary(file, `products/variants/${productId}`);
      if (!result.success) {
        toast({ title: "Upload Error", description: result.error || "Failed", variant: "destructive" });
        return null;
      }
      return result.url!;
    } catch (error: any) {
      toast({ title: "Upload Error", description: error.message, variant: "destructive" });
      return null;
    }
  };

  const handleAddVariant = async () => {
    const size = newVariant.size === "__custom" ? customSize.trim() : newVariant.size;
    const color = newVariant.color === "__custom" ? customColor.trim() : newVariant.color;

    if (!size && !color) {
      toast({ title: "Error", description: "সাইজ বা কালার অন্তত একটি দিন", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.from("product_variants").insert({
      product_id: productId,
      size: size || null,
      color: color || null,
      stock: newVariant.stock,
      sku: newVariant.sku || null,
      price_adjustment: newVariant.price_adjustment,
    }).select().single();

    if (error) {
      toast({ title: error.code === "23505" ? "ভেরিয়েন্ট আছে" : "Error", description: error.code === "23505" ? "এই সাইজ/কালার কম্বিনেশন আগে থেকেই আছে" : error.message, variant: "destructive" });
    } else if (data) {
      let imageUrl: string | null = null;
      if (newVariantImage) {
        imageUrl = await uploadVariantImage(newVariantImage, data.id);
      } else if (newVariantImageUrl.trim()) {
        imageUrl = newVariantImageUrl.trim();
      }
      if (imageUrl) {
        await supabase.from("product_variants").update({ image_url: imageUrl }).eq("id", data.id);
      }
      toast({ title: "সফল", description: "ভেরিয়েন্ট যোগ হয়েছে" });
      setNewVariant({ size: "", color: "", stock: 0, sku: "", price_adjustment: 0 });
      setCustomSize("");
      setCustomColor("");
      setNewVariantImage(null);
      setNewVariantImageUrl("");
      setDialogOpen(false);
      fetchVariants();
    }
    setSaving(false);
  };

  const handleBulkAdd = async () => {
    if (bulkSizes.length === 0 && bulkColors.length === 0) {
      toast({ title: "Error", description: "সাইজ বা কালার সিলেক্ট করুন", variant: "destructive" });
      return;
    }
    setSaving(true);
    const combos: { product_id: string; size: string | null; color: string | null; stock: number }[] = [];

    if (bulkSizes.length > 0 && bulkColors.length > 0) {
      bulkSizes.forEach(s => bulkColors.forEach(c => combos.push({ product_id: productId, size: s, color: c, stock: bulkStock })));
    } else if (bulkSizes.length > 0) {
      bulkSizes.forEach(s => combos.push({ product_id: productId, size: s, color: null, stock: bulkStock }));
    } else {
      bulkColors.forEach(c => combos.push({ product_id: productId, size: null, color: c, stock: bulkStock }));
    }

    const { error } = await supabase.from("product_variants").upsert(combos, { onConflict: "product_id,size,color", ignoreDuplicates: true });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "সফল", description: `${combos.length}টি ভেরিয়েন্ট যোগ হয়েছে` });
      setBulkSizes([]);
      setBulkColors([]);
      setBulkMode(false);
      fetchVariants();
    }
    setSaving(false);
  };

  const handleImageUpload = async (variantId: string, file: File) => {
    setUploadingId(variantId);
    const imageUrl = await uploadVariantImage(file, variantId);
    if (imageUrl) {
      const { error } = await supabase.from("product_variants").update({ image_url: imageUrl }).eq("id", variantId);
      if (!error) {
        toast({ title: "সফল", description: "ইমেজ আপলোড হয়েছে" });
        fetchVariants();
      }
    }
    setUploadingId(null);
  };

  const handleImageUrlSet = async (variantId: string, url: string) => {
    const { error } = await supabase.from("product_variants").update({ image_url: url }).eq("id", variantId);
    if (!error) {
      toast({ title: "সফল", description: "ইমেজ URL সেট হয়েছে" });
      fetchVariants();
    } else {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleUpdateStock = async (variantId: string, newStock: number) => {
    const { error } = await supabase.from("product_variants").update({ stock: Math.max(0, newStock) }).eq("id", variantId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else fetchVariants();
  };

  const handleDeleteVariant = async (variantId: string) => {
    const { error } = await supabase.from("product_variants").delete().eq("id", variantId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "মুছে ফেলা হয়েছে" }); fetchVariants(); }
  };

  const totalVariantStock = variants.reduce((sum, v) => sum + v.stock, 0);
  const inStockCount = variants.filter(v => v.stock > 0).length;
  const outOfStockCount = variants.filter(v => v.stock === 0).length;

  const toggleBulkItem = (item: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h4 className="font-medium">{productName} — ভেরিয়েন্ট</h4>
          <div className="flex gap-3 text-sm text-muted-foreground">
            <span>মোট: {totalVariantStock} পিস</span>
            <span className="text-green-600">{inStockCount} স্টকে</span>
            {outOfStockCount > 0 && <span className="text-destructive">{outOfStockCount} স্টক আউট</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setBulkMode(!bulkMode)}>
            <Copy className="w-4 h-4 mr-1" />{bulkMode ? "একটি করে" : "বাল্ক যোগ"}
          </Button>
          {!bulkMode && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1" />ভেরিয়েন্ট যোগ</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>নতুন ভেরিয়েন্ট যোগ করুন</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>সাইজ</Label>
                    <select className="w-full mt-1 border rounded-md p-2 bg-background" value={newVariant.size} onChange={(e) => setNewVariant({ ...newVariant, size: e.target.value })}>
                      <option value="">-- সাইজ নির্বাচন --</option>
                      {allSizes.map((s) => (<option key={s} value={s}>{s}</option>))}
                      <option value="__custom">✏️ কাস্টম সাইজ লিখুন</option>
                    </select>
                    {newVariant.size === "__custom" && (
                      <Input className="mt-2" placeholder="যেমন: 62&quot;" value={customSize} onChange={(e) => setCustomSize(e.target.value)} />
                    )}
                  </div>
                  <div>
                    <Label>কালার</Label>
                    <select className="w-full mt-1 border rounded-md p-2 bg-background" value={newVariant.color} onChange={(e) => setNewVariant({ ...newVariant, color: e.target.value })}>
                      <option value="">-- কালার নির্বাচন --</option>
                      {allColors.map((c) => (<option key={c} value={c}>{c}</option>))}
                      <option value="__custom">✏️ কাস্টম কালার লিখুন</option>
                    </select>
                    {newVariant.color === "__custom" && (
                      <Input className="mt-2" placeholder="যেমন: Maroon" value={customColor} onChange={(e) => setCustomColor(e.target.value)} />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>স্টক সংখ্যা</Label>
                      <Input type="number" min="0" value={newVariant.stock} onChange={(e) => setNewVariant({ ...newVariant, stock: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <Label>SKU (ঐচ্ছিক)</Label>
                      <Input value={newVariant.sku} onChange={(e) => setNewVariant({ ...newVariant, sku: e.target.value })} placeholder="ABC-001-M-BLK" />
                    </div>
                  </div>
                  <div>
                    <Label>মূল্য সমন্বয় (৳)</Label>
                    <Input type="number" value={newVariant.price_adjustment} onChange={(e) => setNewVariant({ ...newVariant, price_adjustment: parseFloat(e.target.value) || 0 })} placeholder="0 = কোনো পরিবর্তন নেই" />
                    <p className="text-xs text-muted-foreground mt-1">
                      ⚠️ এটি মূল দামের সাথে <strong>যোগ/বিয়োগ</strong> হবে, মূল দাম প্রতিস্থাপন করবে না। যেমন: মূল দাম ৳5,800 হলে এখানে 200 দিলে ফাইনাল দাম হবে ৳6,000। সাধারণত 0 রাখুন।
                    </p>
                  </div>
                  <div>
                    <Label>কালার ইমেজ (ঐচ্ছিক)</Label>
                    <div className="mt-1 space-y-2">
                      {newVariantImage ? (
                        <div className="flex items-center gap-3">
                          <img src={URL.createObjectURL(newVariantImage)} alt="Preview" className="w-16 h-16 object-cover rounded-md border border-border" />
                          <Button variant="outline" size="sm" onClick={() => setNewVariantImage(null)}>সরান</Button>
                        </div>
                      ) : newVariantImageUrl ? (
                        <div className="flex items-center gap-3">
                          <img src={newVariantImageUrl} alt="Preview" className="w-16 h-16 object-cover rounded-md border border-border" onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
                          <Button variant="outline" size="sm" onClick={() => setNewVariantImageUrl("")}>সরান</Button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-border rounded-lg p-4 hover:border-primary/50 transition-colors">
                          <Upload className="w-5 h-5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">ছবি আপলোড করুন</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && setNewVariantImage(e.target.files[0])} />
                        </label>
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">অথবা ইমেজ URL দিন:</p>
                        <Input placeholder="https://example.com/image.jpg" value={newVariantImageUrl} onChange={(e) => { setNewVariantImageUrl(e.target.value); setNewVariantImage(null); }} />
                      </div>
                    </div>
                  </div>
                  <Button onClick={handleAddVariant} disabled={saving} className="w-full">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    ভেরিয়েন্ট যোগ করুন
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Bulk Add Mode */}
      {bulkMode && (
        <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
          <p className="text-sm font-medium">একসাথে একাধিক সাইজ × কালার ভেরিয়েন্ট যোগ করুন</p>
          <div>
            <Label className="text-xs">সাইজ নির্বাচন করুন</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {allSizes.map(s => (
                <button key={s} onClick={() => toggleBulkItem(s, bulkSizes, setBulkSizes)}
                  className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-all ${bulkSizes.includes(s) ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs">কালার নির্বাচন করুন</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {allColors.map(c => (
                <button key={c} onClick={() => toggleBulkItem(c, bulkColors, setBulkColors)}
                  className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-all ${bulkColors.includes(c) ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <Label className="text-xs">প্রতিটির স্টক</Label>
              <Input type="number" min="0" value={bulkStock} onChange={(e) => setBulkStock(parseInt(e.target.value) || 0)} className="w-24 mt-1" />
            </div>
            <div className="text-sm text-muted-foreground pt-5">
              = {(bulkSizes.length || 1) * (bulkColors.length || 1)}টি ভেরিয়েন্ট তৈরি হবে
            </div>
          </div>
          <Button onClick={handleBulkAdd} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            বাল্ক ভেরিয়েন্ট যোগ করুন
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : variants.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <Package className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">কোনো ভেরিয়েন্ট নেই</p>
          <p className="text-sm text-muted-foreground">সাইজ/কালার অনুসারে স্টক ট্র্যাক করতে ভেরিয়েন্ট যোগ করুন</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ইমেজ</TableHead>
              <TableHead>সাইজ</TableHead>
              <TableHead>কালার</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-center">স্টক</TableHead>
              <TableHead>মূল্য সমন্বয়</TableHead>
              <TableHead className="text-right">অ্যাকশন</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variants.map((variant) => (
              <TableRow key={variant.id} className={variant.stock === 0 ? "opacity-50 bg-destructive/5" : ""}>
                <TableCell>
                  <div className="relative w-12 h-12">
                    {variant.image_url ? (
                      <img src={variant.image_url} alt={variant.color || "variant"} className="w-12 h-12 object-cover rounded-md border border-border" />
                    ) : (
                      <div className="w-12 h-12 rounded-md border border-dashed border-border flex items-center justify-center bg-muted/50">
                        <ImageIcon className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <label className="absolute inset-0 cursor-pointer opacity-0 hover:opacity-100 bg-background/80 rounded-md flex items-center justify-center transition-opacity">
                      {uploadingId === variant.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 text-primary" />
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(variant.id, e.target.files[0])} />
                    </label>
                  </div>
                </TableCell>
                <TableCell>
                  {variant.size ? <Badge variant="outline">{variant.size}</Badge> : <span className="text-muted-foreground">-</span>}
                </TableCell>
                <TableCell>
                  {variant.color ? (
                    <div className="flex items-center gap-2">
                      <span>{variant.color}</span>
                    </div>
                  ) : <span className="text-muted-foreground">-</span>}
                </TableCell>
                <TableCell className="font-mono text-sm">{variant.sku || "-"}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-2">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleUpdateStock(variant.id, variant.stock - 1)}>
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className={`font-medium min-w-[3ch] text-center ${variant.stock === 0 ? "text-destructive" : variant.stock <= 5 ? "text-orange-600" : ""}`}>{variant.stock}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleUpdateStock(variant.id, variant.stock + 1)}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  {variant.price_adjustment !== 0 ? (
                    <span className={variant.price_adjustment > 0 ? "text-green-600" : "text-destructive"}>
                      {variant.price_adjustment > 0 ? "+" : ""}৳{variant.price_adjustment}
                    </span>
                  ) : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteVariant(variant.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default VariantManager;