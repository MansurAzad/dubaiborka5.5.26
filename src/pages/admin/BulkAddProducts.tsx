import { useState, useCallback, useRef, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus, Trash2, Upload, Download, PackagePlus, Copy, CheckCircle, AlertCircle,
  FileSpreadsheet, Loader2, ChevronDown, ChevronUp, X, Layers, Image as ImageIcon,
  Pencil, Save, RefreshCw, Search,
} from "lucide-react";

// ============ TYPES ============
interface VariantRow {
  id: string;
  size: string;
  color: string;
  stock: number;
  sku: string;
  price_adjustment: number;
  image_url: string;
  _dbId?: string; // for existing variants
}

interface ProductRow {
  id: string;
  name: string;
  category: string;
  price: number;
  sale_price: number | null;
  stock: number;
  description: string;
  material: string;
  sizes: string;
  colors: string;
  featured: boolean;
  image_url: string;
  variants: VariantRow[];
  expanded: boolean;
  _dbId?: string; // for existing products
  _dirty?: boolean; // track if edited
}

const generateId = () => Math.random().toString(36).slice(2, 10);

const createEmptyProduct = (): ProductRow => ({
  id: generateId(),
  name: "", category: "", price: 0, sale_price: null, stock: 0,
  description: "", material: "", sizes: "", colors: "",
  featured: false, image_url: "", variants: [], expanded: false,
});

const createEmptyVariant = (): VariantRow => ({
  id: generateId(), size: "", color: "", stock: 0, sku: "", price_adjustment: 0, image_url: "",
});

// ============ CONSTANTS ============
const CATEGORIES = [
  "Borkas", "Abayas", "Hijabs", "Kaftans", "Scarves", "Fabrics",
  "Niqab", "Accessories", "Gift Sets", "Prayer Dress", "Kids Collection",
];
const COMMON_SIZES = ['50"', '52"', '54"', '56"', '58"', '60"', "S", "M", "L", "XL", "XXL", "Free Size"];
const COMMON_COLORS = ["Black", "White", "Navy", "Maroon", "Grey", "Beige", "Brown", "Red", "Green", "Blue", "Purple", "Pink"];
const COMMON_MATERIALS = ["Nida", "Zoom", "Jorjet", "Chiffon", "Silk", "Cotton", "Linen", "Crepe", "Satin"];
const BATCH_SIZE = 25;

// ============ CSV HELPERS ============
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else current += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { result.push(current.trim()); current = ""; }
      else current += c;
    }
  }
  result.push(current.trim());
  return result;
};

// ============ INLINE IMAGE UPLOAD COMPONENT ============
const InlineImageUpload = ({ value, onChange }: { value: string; onChange: (url: string) => void }) => {
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("ইমেজ ফাইল দিন"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("সর্বোচ্চ 5MB"); return; }
    setUploading(true);
    try {
      const { uploadToCloudinary } = await import("@/lib/cloudinary");
      const result = await uploadToCloudinary(file, "products");
      if (!result.success) { toast.error(result.error || "Upload failed"); setUploading(false); return; }
      onChange(result.url!);
    } catch (err: any) {
      toast.error(err.message);
    }
    setUploading(false);
  };

  const applyUrl = () => {
    if (urlValue.trim()) {
      onChange(urlValue.trim());
      setUrlValue("");
      setShowUrlInput(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {value ? (
        <div className="relative group">
          <img src={value} alt="" className="w-10 h-10 rounded object-cover border" />
          <button
            type="button"
            className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onChange("")}
          >×</button>
        </div>
      ) : showUrlInput ? (
        <div className="flex items-center gap-1">
          <Input
            className="h-8 text-[11px] w-32 sm:w-40"
            placeholder="https://... URL"
            value={urlValue}
            onChange={e => setUrlValue(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); applyUrl(); } }}
            autoFocus
          />
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={applyUrl}>
            <CheckCircle className="w-3.5 h-3.5 text-primary" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowUrlInput(false)}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className="w-10 h-10 rounded border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary/50 transition-colors"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            title="ফাইল আপলোড"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <ImageIcon className="w-4 h-4 text-muted-foreground" />}
          </button>
          <button
            type="button"
            className="text-[9px] text-primary hover:underline whitespace-nowrap"
            onClick={() => setShowUrlInput(true)}
            title="URL দিন"
          >URL</button>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) upload(e.target.files[0]); e.target.value = ""; }} />
    </div>
  );
};

// ============ MAIN COMPONENT ============
const BulkAddProducts = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State - Add tab
  const [products, setProducts] = useState<ProductRow[]>(() => Array.from({ length: 5 }, createEmptyProduct));
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ success: number; failed: number; variants: number; errors: string[] } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [duplicateCheck, setDuplicateCheck] = useState(true);

  // State - Edit tab
  const [editSearch, setEditSearch] = useState("");
  const [editProducts, setEditProducts] = useState<ProductRow[]>([]);
  const [editLoaded, setEditLoaded] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<Set<string>>(new Set());
  const [editPage, setEditPage] = useState(1);
  const EDIT_PAGE_SIZE = 20;

  // Template state
  const [templateCategory, setTemplateCategory] = useState("");
  const [templateMaterial, setTemplateMaterial] = useState("");
  const [templateSizes, setTemplateSizes] = useState("");
  const [templateColors, setTemplateColors] = useState("");
  const [templateStock, setTemplateStock] = useState("");
  const [templatePrice, setTemplatePrice] = useState("");

  // Fetch categories
  const { data: dbCategories = [] } = useQuery({
    queryKey: ["bulk-add-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("name").eq("is_active", true);
      return (data || []).map(c => c.name);
    },
    staleTime: 5 * 60 * 1000,
  });

  const allCategories = useMemo(() => {
    const merged = new Set([...CATEGORIES, ...dbCategories]);
    return Array.from(merged).sort();
  }, [dbCategories]);

  // Existing products for multi-field duplicate check
  const { data: existingProducts = [] } = useQuery({
    queryKey: ["existing-product-fingerprints"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("name, material, price, sale_price, category, image_url");
      return (data || []).map(p => ({
        name: (p.name || "").toLowerCase().trim(),
        material: (p.material || "").toLowerCase().trim(),
        price: Number(p.price) || 0,
        sale_price: p.sale_price != null ? Number(p.sale_price) : null,
        category: (p.category || "").toLowerCase().trim(),
        image_url: (p.image_url || "").trim(),
      }));
    },
    staleTime: 2 * 60 * 1000,
  });

  // ============ ADD TAB - PRODUCT CRUD ============
  const updateProduct = useCallback((id: string, field: string, value: any) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  }, []);

  const removeProduct = useCallback((id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  }, []);

  const addProducts = useCallback((count: number) => {
    setProducts(prev => [...prev, ...Array.from({ length: count }, createEmptyProduct)]);
  }, []);

  const duplicateProduct = useCallback((product: ProductRow) => {
    const copy = { ...product, id: generateId(), name: product.name + " (কপি)", variants: product.variants.map(v => ({ ...v, id: generateId() })), _dbId: undefined, _dirty: undefined };
    setProducts(prev => [...prev, copy]);
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, expanded: !p.expanded } : p));
  }, []);

  // Variant CRUD (Add tab)
  const addVariant = useCallback((productId: string) => {
    setProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, variants: [...p.variants, createEmptyVariant()], expanded: true } : p
    ));
  }, []);

  const updateVariant = useCallback((productId: string, variantId: string, field: string, value: any) => {
    setProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, variants: p.variants.map(v => v.id === variantId ? { ...v, [field]: value } : v) } : p
    ));
  }, []);

  const removeVariant = useCallback((productId: string, variantId: string) => {
    setProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, variants: p.variants.filter(v => v.id !== variantId) } : p
    ));
  }, []);

  const autoGenerateVariants = useCallback((productId: string) => {
    setProducts(prev => prev.map(p => {
      if (p.id !== productId) return p;
      const sizes = p.sizes ? p.sizes.split(",").map(s => s.trim()).filter(Boolean) : [];
      const colors = p.colors ? p.colors.split(",").map(c => c.trim()).filter(Boolean) : [];
      if (!sizes.length && !colors.length) { toast.error("সাইজ বা কালার দিন আগে"); return p; }
      const newVariants: VariantRow[] = [];
      const addV = (size: string, color: string) => newVariants.push({ id: generateId(), size, color, stock: p.stock || 10, sku: "", price_adjustment: 0, image_url: "" });
      if (sizes.length && colors.length) sizes.forEach(s => colors.forEach(c => addV(s, c)));
      else if (sizes.length) sizes.forEach(s => addV(s, ""));
      else colors.forEach(c => addV("", c));
      toast.success(`${newVariants.length}টি ভেরিয়েন্ট তৈরি হয়েছে`);
      return { ...p, variants: newVariants, expanded: true };
    }));
  }, []);

  // Template
  const applyTemplate = useCallback(() => {
    setProducts(prev => prev.map(p => ({
      ...p,
      ...(templateCategory && { category: templateCategory }),
      ...(templateMaterial && { material: templateMaterial }),
      ...(templateSizes && { sizes: templateSizes }),
      ...(templateColors && { colors: templateColors }),
      ...(templateStock && { stock: Number(templateStock) }),
      ...(templatePrice && { price: Number(templatePrice) }),
    })));
    toast.success("টেমপ্লেট প্রয়োগ হয়েছে");
  }, [templateCategory, templateMaterial, templateSizes, templateColors, templateStock, templatePrice]);

  // Validation
  const validProducts = useMemo(() => products.filter(p => p.name.trim() && p.category.trim() && p.price > 0), [products]);
  const duplicates = useMemo(() => {
    if (!duplicateCheck) return new Set<string>();
    return new Set(validProducts.filter(p => {
      const pName = p.name.toLowerCase().trim();
      const pMaterial = (p.material || "").toLowerCase().trim();
      const pPrice = Number(p.price) || 0;
      const pSalePrice = p.sale_price != null ? Number(p.sale_price) : null;
      const pCategory = (p.category || "").toLowerCase().trim();
      const pImage = (p.image_url || "").trim();
      return existingProducts.some(ep =>
        ep.name === pName &&
        ep.material === pMaterial &&
        ep.price === pPrice &&
        ep.sale_price === pSalePrice &&
        ep.category === pCategory &&
        ep.image_url === pImage
      );
    }).map(p => p.id));
  }, [validProducts, existingProducts, duplicateCheck]);

  const totalVariants = products.reduce((sum, p) => sum + p.variants.length, 0);

  // ============ SUBMIT (Add) ============
  const handleSubmit = async () => {
    const toSubmit = duplicateCheck ? validProducts.filter(p => !duplicates.has(p.id)) : validProducts;
    if (toSubmit.length === 0) { toast.error("কোনো বৈধ প্রোডাক্ট নেই"); return; }

    setSubmitting(true); setProgress(0); setResults(null);
    const res = { success: 0, failed: 0, variants: 0, errors: [] as string[] };

    for (let i = 0; i < toSubmit.length; i += BATCH_SIZE) {
      const batch = toSubmit.slice(i, i + BATCH_SIZE);
      const productData = batch.map(p => ({
        name: p.name.trim(), category: p.category.trim(), price: p.price,
        sale_price: p.sale_price || null, stock: p.stock,
        description: p.description || null, material: p.material || null,
        sizes: p.sizes ? p.sizes.split(",").map(s => s.trim()).filter(Boolean) : [],
        colors: p.colors ? p.colors.split(",").map(c => c.trim()).filter(Boolean) : [],
        featured: p.featured, image_url: p.image_url || null,
      }));

      const { data, error } = await supabase.from("products").insert(productData as any).select("id, name");
      if (error) {
        res.failed += batch.length;
        res.errors.push(`ব্যাচ ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
      } else {
        res.success += (data || []).length;
        const nameToId = Object.fromEntries((data || []).map(d => [d.name, d.id]));
        const variantsToInsert: any[] = [];
        for (const p of batch) {
          const productId = nameToId[p.name.trim()];
          if (!productId) continue;
          for (const v of p.variants) {
            if (!v.size && !v.color) continue;
            variantsToInsert.push({ product_id: productId, size: v.size || null, color: v.color || null, stock: v.stock, sku: v.sku || null, price_adjustment: v.price_adjustment || 0, image_url: v.image_url || null });
          }
        }
        if (variantsToInsert.length > 0) {
          for (let vi = 0; vi < variantsToInsert.length; vi += 100) {
            const vBatch = variantsToInsert.slice(vi, vi + 100);
            const { data: vData, error: vError } = await supabase.from("product_variants").insert(vBatch).select();
            if (vError) res.errors.push(`ভেরিয়েন্ট: ${vError.message}`);
            else res.variants += (vData || []).length;
          }
        }
      }
      setProgress(Math.round(((i + batch.length) / toSubmit.length) * 100));
    }

    setResults(res); setSubmitting(false);
    if (res.success > 0) {
      queryClient.invalidateQueries({ queryKey: ["admin-products-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-products-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bulk-products"] });
      queryClient.invalidateQueries({ queryKey: ["existing-product-fingerprints"] });
      toast.success(`${res.success}টি প্রোডাক্ট ও ${res.variants}টি ভেরিয়েন্ট যুক্ত হয়েছে!`);
    }
  };

  // ============ CSV IMPORT ============
  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith(".csv")) { toast.error("CSV ফাইল দিন"); if (fileInputRef.current) fileInputRef.current.value = ""; return; }
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) { toast.error("CSV-এ ডেটা নেই"); return; }
      const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, "_"));
      const productMap = new Map<string, ProductRow>();
      for (let i = 1; i < lines.length; i++) {
        const vals = parseCSVLine(lines[i]);
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = vals[idx] || ""; });
        const name = row.name?.trim();
        if (!name) continue;
        if (!productMap.has(name)) {
          const p = createEmptyProduct();
          p.name = name; p.category = row.category || ""; p.price = parseFloat(row.price) || 0;
          p.sale_price = parseFloat(row.sale_price) || null; p.stock = parseInt(row.stock) || 0;
          p.description = row.description || ""; p.material = row.material || "";
          p.image_url = row.image_url || ""; p.featured = row.featured?.toLowerCase() === "true";
          p.sizes = (row.sizes || "").replace(/;/g, ","); p.colors = (row.colors || "").replace(/;/g, ",");
          productMap.set(name, p);
        }
        if (row.variant_size || row.variant_color) {
          productMap.get(name)!.variants.push({
            id: generateId(), size: row.variant_size || "", color: row.variant_color || "",
            stock: parseInt(row.variant_stock) || 0, sku: row.variant_sku || "",
            price_adjustment: parseFloat(row.variant_price_adjustment) || 0,
            image_url: row.variant_image_url || "",
          });
        }
      }
      const imported = Array.from(productMap.values());
      if (!imported.length) { toast.error("কোনো প্রোডাক্ট পাওয়া যায়নি"); return; }
      setProducts(prev => [...prev.filter(p => p.name.trim()), ...imported]);
      toast.success(`${imported.length}টি প্রোডাক্ট CSV থেকে লোড হয়েছে`);
    } catch (err: any) { toast.error(`CSV পার্স ব্যর্থ: ${err.message}`); }
    finally { if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const downloadTemplate = () => {
    const h = "name,category,price,sale_price,stock,featured,description,image_url,sizes,colors,material,variant_size,variant_color,variant_stock,variant_sku,variant_price_adjustment";
    const r = [
      '"Premium Borka","Borkas",2500,2200,50,true,"Description","","S; M; L","Black; White","Nida","S","Black",20,"SKU-001",0',
      '"Premium Borka","Borkas",2500,2200,50,true,"Description","","S; M; L","Black; White","Nida","M","Black",15,"SKU-002",0',
    ];
    const blob = new Blob(["\uFEFF" + [h, ...r].join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "bulk_products_template.csv"; a.click();
  };

  // ============ EDIT TAB - Load existing products ============
  const loadExistingProducts = async () => {
    setEditLoaded(false);
    const { data: prods, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    if (error) { toast.error(error.message); return; }

    const productIds = (prods || []).map(p => p.id);
    let allVariants: any[] = [];
    if (productIds.length > 0) {
      // Fetch variants in chunks to avoid query limits
      for (let i = 0; i < productIds.length; i += 50) {
        const chunk = productIds.slice(i, i + 50);
        const { data: vars } = await supabase.from("product_variants").select("*").in("product_id", chunk);
        if (vars) allVariants.push(...vars);
      }
    }

    const variantsByProduct: Record<string, any[]> = {};
    allVariants.forEach(v => {
      if (!variantsByProduct[v.product_id]) variantsByProduct[v.product_id] = [];
      variantsByProduct[v.product_id].push(v);
    });

    const mapped: ProductRow[] = (prods || []).map(p => ({
      id: generateId(),
      _dbId: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      sale_price: p.sale_price,
      stock: p.stock || 0,
      description: p.description || "",
      material: p.material || "",
      sizes: (p.sizes || []).join(", "),
      colors: (p.colors || []).join(", "),
      featured: p.featured || false,
      image_url: p.image_url || "",
      expanded: false,
      _dirty: false,
      variants: (variantsByProduct[p.id] || []).map(v => ({
        id: generateId(),
        _dbId: v.id,
        size: v.size || "",
        color: v.color || "",
        stock: v.stock || 0,
        sku: v.sku || "",
        price_adjustment: v.price_adjustment || 0,
        image_url: v.image_url || "",
      })),
    }));

    setEditProducts(mapped);
    setEditLoaded(true);
    toast.success(`${mapped.length}টি প্রোডাক্ট লোড হয়েছে`);
  };

  // Edit tab CRUD
  const updateEditProduct = useCallback((id: string, field: string, value: any) => {
    setEditProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value, _dirty: true } : p));
  }, []);

  const toggleEditExpand = useCallback((id: string) => {
    setEditProducts(prev => prev.map(p => p.id === id ? { ...p, expanded: !p.expanded } : p));
  }, []);

  const addEditVariant = useCallback((productId: string) => {
    setEditProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, variants: [...p.variants, createEmptyVariant()], expanded: true, _dirty: true } : p
    ));
  }, []);

  const updateEditVariant = useCallback((productId: string, variantId: string, field: string, value: any) => {
    setEditProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, _dirty: true, variants: p.variants.map(v => v.id === variantId ? { ...v, [field]: value } : v) } : p
    ));
  }, []);

  const removeEditVariant = useCallback((productId: string, variantId: string) => {
    setEditProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, _dirty: true, variants: p.variants.filter(v => v.id !== variantId) } : p
    ));
  }, []);

  const autoGenerateEditVariants = useCallback((productId: string) => {
    setEditProducts(prev => prev.map(p => {
      if (p.id !== productId) return p;
      const sizes = p.sizes ? p.sizes.split(",").map(s => s.trim()).filter(Boolean) : [];
      const colors = p.colors ? p.colors.split(",").map(c => c.trim()).filter(Boolean) : [];
      if (!sizes.length && !colors.length) { toast.error("সাইজ বা কালার দিন"); return p; }
      const newV: VariantRow[] = [];
      const add = (s: string, c: string) => newV.push({ id: generateId(), size: s, color: c, stock: p.stock || 10, sku: "", price_adjustment: 0, image_url: "" });
      if (sizes.length && colors.length) sizes.forEach(s => colors.forEach(c => add(s, c)));
      else if (sizes.length) sizes.forEach(s => add(s, ""));
      else colors.forEach(c => add("", c));
      toast.success(`${newV.length}টি ভেরিয়েন্ট তৈরি হয়েছে`);
      return { ...p, variants: newV, expanded: true, _dirty: true };
    }));
  }, []);

  // Save edited products
  const saveEditedProducts = async () => {
    const dirty = editProducts.filter(p => p._dirty && p._dbId);
    if (!dirty.length) { toast.error("কোনো পরিবর্তন নেই"); return; }

    setEditSaving(true);
    let savedCount = 0;
    let variantCount = 0;

    for (const p of dirty) {
      // Update product
      const { error } = await supabase.from("products").update({
        name: p.name.trim(), category: p.category.trim(), price: p.price,
        sale_price: p.sale_price || null, stock: p.stock,
        description: p.description || null, material: p.material || null,
        sizes: p.sizes ? p.sizes.split(",").map(s => s.trim()).filter(Boolean) : [],
        colors: p.colors ? p.colors.split(",").map(c => c.trim()).filter(Boolean) : [],
        featured: p.featured, image_url: p.image_url || null,
      }).eq("id", p._dbId!);

      if (error) { toast.error(`${p.name}: ${error.message}`); continue; }
      savedCount++;

      // Sync variants: delete existing, re-insert all
      await supabase.from("product_variants").delete().eq("product_id", p._dbId!);
      const newVariants = p.variants.filter(v => v.size || v.color).map(v => ({
        product_id: p._dbId!,
        size: v.size || null, color: v.color || null, stock: v.stock,
        sku: v.sku || null, price_adjustment: v.price_adjustment || 0,
        image_url: v.image_url || null,
      }));
      if (newVariants.length > 0) {
        const { data: vData } = await supabase.from("product_variants").insert(newVariants).select();
        variantCount += (vData || []).length;
      }
    }

    setEditSaving(false);
    queryClient.invalidateQueries({ queryKey: ["admin-products-list"] });
    queryClient.invalidateQueries({ queryKey: ["admin-bulk-products"] });
    toast.success(`${savedCount}টি প্রোডাক্ট ও ${variantCount}টি ভেরিয়েন্ট আপডেট হয়েছে`);
    // Mark all as clean
    setEditProducts(prev => prev.map(p => ({ ...p, _dirty: false })));
  };

  // Delete product
  const handleDeleteProduct = async () => {
    if (!deleteId) return;
    const product = editProducts.find(p => p.id === deleteId);
    if (!product?._dbId) { setDeleteId(null); return; }

    await supabase.from("product_variants").delete().eq("product_id", product._dbId);
    await supabase.from("product_images").delete().eq("product_id", product._dbId);
    const { error } = await supabase.from("products").delete().eq("id", product._dbId);
    if (error) { toast.error(error.message); } else {
      setEditProducts(prev => prev.filter(p => p.id !== deleteId));
      queryClient.invalidateQueries({ queryKey: ["admin-products-list"] });
      toast.success("প্রোডাক্ট ডিলিট হয়েছে");
    }
    setDeleteId(null);
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    const toDelete = editProducts.filter(p => bulkDeleteIds.has(p.id) && p._dbId);
    if (!toDelete.length) return;

    let deleted = 0;
    for (const p of toDelete) {
      await supabase.from("product_variants").delete().eq("product_id", p._dbId!);
      await supabase.from("product_images").delete().eq("product_id", p._dbId!);
      const { error } = await supabase.from("products").delete().eq("id", p._dbId!);
      if (!error) deleted++;
    }
    setEditProducts(prev => prev.filter(p => !bulkDeleteIds.has(p.id)));
    setBulkDeleteIds(new Set());
    queryClient.invalidateQueries({ queryKey: ["admin-products-list"] });
    toast.success(`${deleted}টি প্রোডাক্ট ডিলিট হয়েছে`);
  };

  // Filtered edit products
  const filteredEditProducts = useMemo(() => {
    if (!editSearch) return editProducts;
    const q = editSearch.toLowerCase();
    return editProducts.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }, [editProducts, editSearch]);

  const editTotalPages = Math.ceil(filteredEditProducts.length / EDIT_PAGE_SIZE);
  const paginatedEditProducts = useMemo(() => {
    const start = (editPage - 1) * EDIT_PAGE_SIZE;
    return filteredEditProducts.slice(start, start + EDIT_PAGE_SIZE);
  }, [filteredEditProducts, editPage, EDIT_PAGE_SIZE]);

  const dirtyCount = editProducts.filter(p => p._dirty).length;

  // ============ SHARED PRODUCT ROW RENDERER ============
  const renderProductRow = (
    product: ProductRow, index: number, isEdit: boolean,
    updateFn: (id: string, field: string, value: any) => void,
    expandFn: (id: string) => void,
    addVFn: (id: string) => void,
    updateVFn: (pid: string, vid: string, f: string, v: any) => void,
    removeVFn: (pid: string, vid: string) => void,
    autoVFn: (id: string) => void,
  ) => (
    <Card key={product.id} className={`border ${!isEdit && duplicates.has(product.id) ? "border-destructive/50 bg-destructive/5" : ""} ${isEdit && product._dirty ? "border-primary/30 bg-primary/5" : ""}`}>
      <CardContent className="p-2 sm:p-3">
        {/* Mobile layout */}
        <div className="block sm:hidden space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground font-mono w-5">#{index + 1}</span>
            <InlineImageUpload value={product.image_url} onChange={url => updateFn(product.id, "image_url", url)} />
            <div className="flex-1 min-w-0">
              <Input className="h-8 text-xs" placeholder="প্রোডাক্টের নাম *" value={product.name}
                onChange={e => updateFn(product.id, "name", e.target.value)} />
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => expandFn(product.id)}>
                {product.expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => isEdit ? setDeleteId(product.id) : removeProduct(product.id)}>
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Select value={product.category} onValueChange={v => updateFn(product.id, "category", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="ক্যাটাগরি" /></SelectTrigger>
              <SelectContent>{allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Input className="h-8 text-xs" type="number" placeholder="মূল্য" value={product.price || ""}
              onChange={e => updateFn(product.id, "price", Number(e.target.value))} />
            <Input className="h-8 text-xs" type="number" placeholder="স্টক" value={product.stock}
              onChange={e => updateFn(product.id, "stock", Number(e.target.value))} />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {isEdit && (
              <input type="checkbox" className="w-3.5 h-3.5 rounded" checked={bulkDeleteIds.has(product.id)}
                onChange={() => setBulkDeleteIds(prev => { const n = new Set(prev); n.has(product.id) ? n.delete(product.id) : n.add(product.id); return n; })} />
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => autoVFn(product.id)} title="অটো ভেরিয়েন্ট">
              <Layers className="w-3.5 h-3.5" />
            </Button>
            {!isEdit && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateProduct(product)} title="কপি">
                <Copy className="w-3.5 h-3.5" />
              </Button>
            )}
            {product.variants.length > 0 && <Badge variant="secondary" className="text-[10px]">{product.variants.length}V</Badge>}
            {!isEdit && duplicates.has(product.id) && <Badge variant="destructive" className="text-[10px]">ডুপ্লিকেট</Badge>}
            {isEdit && product._dirty && <Badge variant="outline" className="text-[10px] border-primary text-primary">পরিবর্তিত</Badge>}
          </div>
        </div>

        {/* Desktop layout */}
        <div className="hidden sm:grid grid-cols-12 gap-2 items-end">
          {/* # + image */}
          <div className="col-span-1 flex flex-col items-center gap-1">
            <span className="text-[10px] text-muted-foreground font-mono">#{index + 1}</span>
            <InlineImageUpload value={product.image_url} onChange={url => updateFn(product.id, "image_url", url)} />
          </div>
          <div className="col-span-3">
            <Label className="text-xs">নাম *</Label>
            <Input className="h-8 text-xs" placeholder="প্রোডাক্টের নাম" value={product.name}
              onChange={e => updateFn(product.id, "name", e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">ক্যাটাগরি *</Label>
            <Select value={product.category} onValueChange={v => updateFn(product.id, "category", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="সিলেক্ট" /></SelectTrigger>
              <SelectContent>{allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-1">
            <Label className="text-xs">মূল্য *</Label>
            <Input className="h-8 text-xs" type="number" value={product.price || ""}
              onChange={e => updateFn(product.id, "price", Number(e.target.value))} />
          </div>
          <div className="col-span-1">
            <Label className="text-xs">সেল</Label>
            <Input className="h-8 text-xs" type="number" value={product.sale_price || ""}
              onChange={e => updateFn(product.id, "sale_price", e.target.value ? Number(e.target.value) : null)} />
          </div>
          <div className="col-span-1">
            <Label className="text-xs">স্টক</Label>
            <Input className="h-8 text-xs" type="number" value={product.stock}
              onChange={e => updateFn(product.id, "stock", Number(e.target.value))} />
          </div>
          <div className="col-span-3 flex items-center gap-1 pt-4 flex-wrap">
            {isEdit && (
              <input type="checkbox" className="w-3.5 h-3.5 rounded" checked={bulkDeleteIds.has(product.id)}
                onChange={() => setBulkDeleteIds(prev => { const n = new Set(prev); n.has(product.id) ? n.delete(product.id) : n.add(product.id); return n; })} />
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => expandFn(product.id)} title="বিস্তারিত">
              {product.expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => autoVFn(product.id)} title="অটো ভেরিয়েন্ট">
              <Layers className="w-3.5 h-3.5" />
            </Button>
            {!isEdit && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateProduct(product)} title="কপি">
                <Copy className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => isEdit ? setDeleteId(product.id) : removeProduct(product.id)} title="মুছুন">
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
            {product.variants.length > 0 && <Badge variant="secondary" className="text-[10px]">{product.variants.length}V</Badge>}
            {!isEdit && duplicates.has(product.id) && <Badge variant="destructive" className="text-[10px]">ডুপ্লিকেট</Badge>}
            {isEdit && product._dirty && <Badge variant="outline" className="text-[10px] border-primary text-primary">পরিবর্তিত</Badge>}
          </div>
        </div>

        {product.expanded && (
          <div className="mt-3 pt-3 border-t border-border space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <Label className="text-xs">ম্যাটেরিয়াল</Label>
                <Select value={product.material} onValueChange={v => updateFn(product.id, "material", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="সিলেক্ট" /></SelectTrigger>
                  <SelectContent>{COMMON_MATERIALS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">সাইজ</Label>
                <Input className="h-8 text-xs" placeholder='52", 54"' value={product.sizes}
                  onChange={e => updateFn(product.id, "sizes", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">কালার</Label>
                <Input className="h-8 text-xs" placeholder="Black, White" value={product.colors}
                  onChange={e => updateFn(product.id, "colors", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">ইমেজ URL</Label>
                <Input className="h-8 text-xs" placeholder="https://..." value={product.image_url}
                  onChange={e => updateFn(product.id, "image_url", e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">বিবরণ</Label>
              <Textarea className="text-xs min-h-[50px]" value={product.description}
                onChange={e => updateFn(product.id, "description", e.target.value)} rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={product.featured} onCheckedChange={v => updateFn(product.id, "featured", v)} />
              <Label className="text-xs">ফিচার্ড</Label>
            </div>

            {/* Variants */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-semibold">ভেরিয়েন্ট ({product.variants.length})</Label>
                <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => addVFn(product.id)}>
                  <Plus className="w-3 h-3 mr-1" /> ভেরিয়েন্ট
                </Button>
                <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => autoVFn(product.id)}>
                  <Layers className="w-3 h-3 mr-1" /> অটো
                </Button>
              </div>
              {product.variants.length > 0 && (
                <div className="bg-muted/50 rounded-md p-2 space-y-1 overflow-x-auto">
                  <div className="hidden sm:grid grid-cols-[1fr_1fr_0.7fr_1fr_0.7fr_auto_auto] gap-1.5 text-[10px] text-muted-foreground font-medium px-1 min-w-[560px]">
                    <span>সাইজ</span><span>কালার</span><span>স্টক</span><span>SKU</span><span>± মূল্য</span><span>ইমেজ</span><span></span>
                  </div>
                  {product.variants.map(v => (
                    <div key={v.id} className="grid grid-cols-[1fr_1fr_auto_auto] sm:grid-cols-[1fr_1fr_0.7fr_1fr_0.7fr_auto_auto] gap-1.5 items-center min-w-0">
                      <Input className="h-7 text-[11px]" placeholder="সাইজ" value={v.size}
                        onChange={e => updateVFn(product.id, v.id, "size", e.target.value)} />
                      <Input className="h-7 text-[11px]" placeholder="কালার" value={v.color}
                        onChange={e => updateVFn(product.id, v.id, "color", e.target.value)} />
                      <Input className="h-7 text-[11px] hidden sm:block" type="number" placeholder="স্টক" value={v.stock}
                        onChange={e => updateVFn(product.id, v.id, "stock", Number(e.target.value))} />
                      <Input className="h-7 text-[11px] hidden sm:block" placeholder="SKU" value={v.sku}
                        onChange={e => updateVFn(product.id, v.id, "sku", e.target.value)} />
                      <Input className="h-7 text-[11px] hidden sm:block" type="number" placeholder="±" value={v.price_adjustment}
                        onChange={e => updateVFn(product.id, v.id, "price_adjustment", Number(e.target.value))} />
                      <InlineImageUpload value={v.image_url || ""} onChange={url => updateVFn(product.id, v.id, "image_url", url)} />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeVFn(product.id, v.id)}>
                        <X className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-3xl font-display font-bold flex items-center gap-2">
              <PackagePlus className="w-6 h-6 sm:w-8 sm:h-8 text-primary" /> Bulk Add Products
            </h1>
            <p className="text-muted-foreground">প্রোডাক্ট যুক্ত, এডিট, আপডেট ও ডিলিট করুন</p>
          </div>
        </div>

        {/* Results */}
        {results && (
          <Alert variant={results.failed > 0 ? "destructive" : "default"} className="border-2">
            <AlertDescription>
              <div className="flex items-center gap-2 mb-1">
                {results.failed === 0 ? <CheckCircle className="w-5 h-5 text-primary" /> : <AlertCircle className="w-5 h-5" />}
                <strong>{results.success}টি প্রোডাক্ট ও {results.variants}টি ভেরিয়েন্ট যুক্ত হয়েছে{results.failed > 0 && ` | ${results.failed}টি ব্যর্থ`}</strong>
              </div>
              {results.errors.length > 0 && <ScrollArea className="max-h-24">{results.errors.map((e, i) => <p key={i} className="text-xs text-destructive">{e}</p>)}</ScrollArea>}
            </AlertDescription>
          </Alert>
        )}

        {submitting && (
          <div className="space-y-2">
            <div className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">যুক্ত হচ্ছে... {progress}%</span></div>
            <Progress value={progress} className="h-3" />
          </div>
        )}

        <Tabs defaultValue="add" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="add">নতুন যুক্ত</TabsTrigger>
            <TabsTrigger value="edit">এডিট/আপডেট/ডিলিট</TabsTrigger>
            <TabsTrigger value="csv">CSV ইম্পোর্ট</TabsTrigger>
          </TabsList>

          {/* ====== CSV TAB ====== */}
          <TabsContent value="csv" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5" /> CSV ইম্পোর্ট</CardTitle>
                <CardDescription>CSV ফাইলে প্রোডাক্ট ও ভেরিয়েন্ট ডেটা দিয়ে আপলোড করুন</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3 flex-wrap">
                  <Button variant="outline" onClick={downloadTemplate}><Download className="w-4 h-4 mr-2" /> টেমপ্লেট</Button>
                  <div>
                    <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />
                    <Button onClick={() => fileInputRef.current?.click()}><Upload className="w-4 h-4 mr-2" /> CSV আপলোড</Button>
                  </div>
                </div>
                <Alert>
                  <AlertDescription className="text-xs space-y-1">
                    <p><strong>কলাম:</strong> name, category, price, sale_price, stock, featured, description, image_url, sizes, colors, material</p>
                    <p><strong>ভেরিয়েন্ট:</strong> variant_size, variant_color, variant_stock, variant_sku, variant_price_adjustment</p>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ====== ADD TAB ====== */}
          <TabsContent value="add" className="space-y-4">
            {/* Template */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">কুইক টেমপ্লেট</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div>
                    <Label className="text-xs">ক্যাটাগরি</Label>
                    <Select value={templateCategory} onValueChange={setTemplateCategory}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="সিলেক্ট" /></SelectTrigger>
                      <SelectContent>{allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">ম্যাটেরিয়াল</Label>
                    <Select value={templateMaterial} onValueChange={setTemplateMaterial}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="সিলেক্ট" /></SelectTrigger>
                      <SelectContent>{COMMON_MATERIALS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">সাইজ</Label><Input className="h-8 text-xs" value={templateSizes} onChange={e => setTemplateSizes(e.target.value)} /></div>
                  <div><Label className="text-xs">কালার</Label><Input className="h-8 text-xs" value={templateColors} onChange={e => setTemplateColors(e.target.value)} /></div>
                  <div><Label className="text-xs">স্টক</Label><Input className="h-8 text-xs" type="number" value={templateStock} onChange={e => setTemplateStock(e.target.value)} /></div>
                  <div><Label className="text-xs">মূল্য</Label><Input className="h-8 text-xs" type="number" value={templatePrice} onChange={e => setTemplatePrice(e.target.value)} /></div>
                </div>
                <Button size="sm" className="mt-3" onClick={applyTemplate}>সব প্রোডাক্টে প্রয়োগ</Button>
              </CardContent>
            </Card>

            {/* Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => addProducts(1)}><Plus className="w-3 h-3 mr-1" /> ১</Button>
              <Button variant="outline" size="sm" onClick={() => addProducts(10)}><Plus className="w-3 h-3 mr-1" /> ১০</Button>
              <Button variant="outline" size="sm" onClick={() => addProducts(25)}><Plus className="w-3 h-3 mr-1" /> ২৫</Button>
              <Button variant="outline" size="sm" onClick={() => addProducts(50)}><Plus className="w-3 h-3 mr-1" /> ৫০</Button>
              <Button variant="outline" size="sm" onClick={() => addProducts(100)}><Plus className="w-3 h-3 mr-1" /> ১০০</Button>
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <Switch checked={duplicateCheck} onCheckedChange={setDuplicateCheck} id="dup" />
                <Label htmlFor="dup" className="text-xs">ডুপ্লিকেট চেক</Label>
              </div>
              <Button variant="outline" size="sm" onClick={() => setProducts(products.filter(p => p.name.trim()))}><X className="w-3 h-3 mr-1" /> খালি সরান</Button>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{validProducts.length} বৈধ</Badge>
              <Badge variant="outline">{totalVariants} ভেরিয়েন্ট</Badge>
              {duplicates.size > 0 && <Badge variant="destructive">{duplicates.size} ডুপ্লিকেট</Badge>}
            </div>

            <div className="overflow-auto max-h-[75vh] border rounded-md p-2">
              <div className="space-y-3">
                {products.map((p, i) => renderProductRow(p, i, false, updateProduct, toggleExpand, addVariant, updateVariant, removeVariant, autoGenerateVariants))}
              </div>
            </div>

            {/* Submit */}
            <Card className="sticky bottom-4 z-10 border-2 border-primary/20 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="text-sm">
                    <span className="font-semibold">{validProducts.length}</span> বৈধ
                    {duplicates.size > 0 && <span className="text-destructive ml-2">({duplicates.size}টি বাদ)</span>}
                    {totalVariants > 0 && <span className="ml-2">| {totalVariants} ভেরিয়েন্ট</span>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setPreviewOpen(true)} disabled={!validProducts.length}>প্রিভিউ</Button>
                    <Button onClick={handleSubmit} disabled={submitting || !validProducts.length} className="min-w-[160px]">
                      {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {progress}%</> : <><PackagePlus className="w-4 h-4 mr-2" /> {validProducts.length - duplicates.size}টি যুক্ত করুন</>}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ====== EDIT TAB ====== */}
          <TabsContent value="edit" className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Button onClick={loadExistingProducts} variant={editLoaded ? "outline" : "default"}>
                <RefreshCw className="w-4 h-4 mr-2" /> {editLoaded ? "রিফ্রেশ" : "প্রোডাক্ট লোড করুন"}
              </Button>
              {editLoaded && (
                <>
                  <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="সার্চ..." value={editSearch} onChange={e => { setEditSearch(e.target.value); setEditPage(1); }} className="pl-10 h-9" />
                  </div>
                  <Badge variant="outline">{editProducts.length} প্রোডাক্ট</Badge>
                  {dirtyCount > 0 && <Badge variant="outline" className="border-primary text-primary">{dirtyCount} পরিবর্তিত</Badge>}
                  {bulkDeleteIds.size > 0 && (
                    <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                      <Trash2 className="w-3 h-3 mr-1" /> {bulkDeleteIds.size}টি ডিলিট
                    </Button>
                  )}
                </>
              )}
            </div>

            {editLoaded && (
              <>
                <div className="overflow-auto max-h-[75vh] border rounded-md p-2">
                  <div className="space-y-3">
                    {paginatedEditProducts.map((p, i) => renderProductRow(p, i + (editPage - 1) * EDIT_PAGE_SIZE, true, updateEditProduct, toggleEditExpand, addEditVariant, updateEditVariant, removeEditVariant, autoGenerateEditVariants))}
                  </div>
                </div>

                {/* Pagination */}
                {editTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-muted-foreground">
                      {(editPage - 1) * EDIT_PAGE_SIZE + 1}-{Math.min(editPage * EDIT_PAGE_SIZE, filteredEditProducts.length)} / {filteredEditProducts.length}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" disabled={editPage <= 1} onClick={() => setEditPage(p => p - 1)}>পূর্ববর্তী</Button>
                      {Array.from({ length: Math.min(editTotalPages, 7) }, (_, i) => {
                        let page: number;
                        if (editTotalPages <= 7) page = i + 1;
                        else if (editPage <= 4) page = i + 1;
                        else if (editPage >= editTotalPages - 3) page = editTotalPages - 6 + i;
                        else page = editPage - 3 + i;
                        return (
                          <Button key={page} variant={editPage === page ? "default" : "outline"} size="sm" className="w-9 h-8 text-xs" onClick={() => setEditPage(page)}>
                            {page}
                          </Button>
                        );
                      })}
                      <Button variant="outline" size="sm" disabled={editPage >= editTotalPages} onClick={() => setEditPage(p => p + 1)}>পরবর্তী</Button>
                    </div>
                  </div>
                )}

                {dirtyCount > 0 && (
                  <Card className="sticky bottom-4 z-10 border-2 border-primary/20 shadow-lg">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm"><span className="font-semibold">{dirtyCount}</span>টি প্রোডাক্ট পরিবর্তিত</span>
                        <Button onClick={saveEditedProducts} disabled={editSaving}>
                          {editSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> সেভ হচ্ছে...</> : <><Save className="w-4 h-4 mr-2" /> সব পরিবর্তন সেভ</>}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {!editLoaded && (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center text-muted-foreground">
                  <Pencil className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>"প্রোডাক্ট লোড করুন" বাটনে ক্লিক করে বিদ্যমান প্রোডাক্ট এডিট, আপডেট ও ডিলিট করুন</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>প্রিভিউ — {validProducts.length}টি প্রোডাক্ট</DialogTitle></DialogHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead><TableHead>ইমেজ</TableHead><TableHead>নাম</TableHead>
                  <TableHead>ক্যাটাগরি</TableHead><TableHead>মূল্য</TableHead><TableHead>স্টক</TableHead>
                  <TableHead>ভেরিয়েন্ট</TableHead><TableHead>স্ট্যাটাস</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {validProducts.map((p, i) => (
                  <TableRow key={p.id} className={duplicates.has(p.id) ? "bg-destructive/5" : ""}>
                    <TableCell className="text-xs">{i + 1}</TableCell>
                    <TableCell>{p.image_url ? <img src={p.image_url} alt="" className="w-8 h-8 rounded object-cover" /> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-xs font-medium">{p.name}</TableCell>
                    <TableCell className="text-xs">{p.category}</TableCell>
                    <TableCell className="text-xs">৳{p.price}{p.sale_price && <span className="text-muted-foreground ml-1">(৳{p.sale_price})</span>}</TableCell>
                    <TableCell className="text-xs">{p.stock}</TableCell>
                    <TableCell className="text-xs">{p.variants.length}</TableCell>
                    <TableCell>
                      {duplicates.has(p.id)
                        ? <Badge variant="destructive" className="text-[10px]">ডুপ্লিকেট</Badge>
                        : <Badge variant="outline" className="text-[10px]">OK</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>প্রোডাক্ট ডিলিট করবেন?</AlertDialogTitle>
              <AlertDialogDescription>এই প্রোডাক্ট ও এর সব ভেরিয়েন্ট স্থায়ীভাবে মুছে যাবে।</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>বাতিল</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteProduct} className="bg-destructive text-destructive-foreground">ডিলিট</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default BulkAddProducts;
