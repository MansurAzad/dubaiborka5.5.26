import { useState, useMemo, useCallback } from "react";
import { Plus, Pencil, Trash2, Search, AlertTriangle, Layers, Images } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import ImageUpload from "@/components/admin/ImageUpload";
import MultiImageUpload from "@/components/admin/MultiImageUpload";
import GalleryImageUpload from "@/components/admin/GalleryImageUpload";
import ProductImportExport from "@/components/admin/ProductImportExport";
import VariantManager from "@/components/admin/VariantManager";
import VideoUpload from "@/components/admin/VideoUpload";

const LOW_STOCK_THRESHOLD = 1;
const ITEMS_PER_PAGE = 20;

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  sale_price: number | null;
  stock: number;
  featured: boolean;
  image_url: string | null;
  description: string | null;
  sizes: string[] | null;
  colors: string[] | null;
  material: string | null;
  video_url: string | null;
}

const emptyProduct: Omit<Product, "id"> = {
  name: "", category: "", price: 0, sale_price: null, stock: 0,
  featured: false, image_url: "", description: "", sizes: [], colors: [],
  material: "", video_url: "",
};

// Gallery image URLs for new product creation
const EMPTY_GALLERY: string[] = [];

const Products = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Omit<Product, "id">>(emptyProduct);
  const [galleryUrls, setGalleryUrls] = useState<string[]>(EMPTY_GALLERY);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);
  const [galleryProduct, setGalleryProduct] = useState<Product | null>(null);
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [zoomImage, setZoomImage] = useState<{ url: string; name: string } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products = [], isLoading: loading } = useQuery({
    queryKey: ["admin-products-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Product[];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const invalidateProducts = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-products-list"] });
    queryClient.invalidateQueries({ queryKey: ["admin-products-count"] });
  }, [queryClient]);

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return Array.from(cats).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    }
    if (categoryFilter) {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }
    if (minPrice) {
      filtered = filtered.filter(p => (p.sale_price || p.price) >= Number(minPrice));
    }
    if (maxPrice) {
      filtered = filtered.filter(p => (p.sale_price || p.price) <= Number(maxPrice));
    }
    return filtered;
  }, [products, searchQuery, categoryFilter, minPrice, maxPrice]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const resetPage = useCallback(() => setCurrentPage(1), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const productData = {
      ...formData,
      price: Number(formData.price),
      sale_price: formData.sale_price ? Number(formData.sale_price) : null,
      stock: Number(formData.stock),
      sizes: formData.sizes?.filter(Boolean) || [],
      colors: formData.colors?.filter(Boolean) || [],
      material: formData.material || null,
      video_url: formData.video_url || null,
    };

    if (editingProduct) {
      const { error } = await supabase.from("products").update(productData).eq("id", editingProduct.id);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        // Save new gallery URLs if any
        const validUrls = galleryUrls.filter(u => u.trim());
        if (validUrls.length > 0) {
          const { data: existing } = await supabase.from("product_images").select("display_order").eq("product_id", editingProduct.id).order("display_order", { ascending: false }).limit(1);
          const startOrder = (existing?.[0]?.display_order ?? -1) + 1;
          await supabase.from("product_images").insert(
            validUrls.map((url, i) => ({ product_id: editingProduct.id, image_url: url.trim(), display_order: startOrder + i }))
          );
        }
        toast({ title: "Success", description: "Product updated successfully" });
        invalidateProducts();
        setIsDialogOpen(false);
      }
    } else {
      const { data: newProduct, error } = await supabase.from("products").insert(productData).select().single();
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        // Save gallery URLs for new product
        const validUrls = galleryUrls.filter(u => u.trim());
        if (validUrls.length > 0 && newProduct) {
          await supabase.from("product_images").insert(
            validUrls.map((url, i) => ({ product_id: newProduct.id, image_url: url.trim(), display_order: i }))
          );
        }
        toast({ title: "Success", description: "Product created successfully" });
        invalidateProducts();
        setIsDialogOpen(false);
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("products").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Product deleted successfully" });
      invalidateProducts();
    }
    setDeleteId(null);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setGalleryUrls([]);
    setFormData({
      name: product.name, category: product.category, price: product.price,
      sale_price: product.sale_price, stock: product.stock || 0,
      featured: product.featured || false, image_url: product.image_url || "",
      description: product.description || "", sizes: product.sizes || [], colors: product.colors || [],
      material: product.material || "", video_url: product.video_url || "",
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingProduct(null);
    setFormData(emptyProduct);
    setGalleryUrls([]);
    setIsDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Products</h1>
            <p className="text-muted-foreground">Manage your product catalog</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" /> Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input id="category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} required />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (৳)</Label>
                    <Input id="price" type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sale_price">Sale Price (৳)</Label>
                    <Input id="sale_price" type="number" value={formData.sale_price || ""} onChange={(e) => setFormData({ ...formData, sale_price: e.target.value ? Number(e.target.value) : null })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stock">Stock</Label>
                    <Input id="stock" type="number" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Product Image</Label>
                  <ImageUpload value={formData.image_url || ""} onChange={(url) => setFormData({ ...formData, image_url: url })} />
                  <p className="text-xs text-muted-foreground">Or paste an image URL:</p>
                  <Input id="image_url" placeholder="https://example.com/image.jpg" value={formData.image_url || ""} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>গ্যালারি ইমেজ (একাধিক ছবি যুক্ত করুন)</Label>
                  <GalleryImageUpload images={galleryUrls} onChange={setGalleryUrls} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={formData.description || ""} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sizes">Sizes (comma-separated)</Label>
                    <Input id="sizes" value={formData.sizes?.join(", ") || ""} onChange={(e) => setFormData({ ...formData, sizes: e.target.value.split(",").map((s) => s.trim()) })} placeholder='52", 54", 56", 58", 60"' />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="colors">Colors (comma-separated)</Label>
                    <Input id="colors" value={formData.colors?.join(", ") || ""} onChange={(e) => setFormData({ ...formData, colors: e.target.value.split(",").map((c) => c.trim()) })} placeholder="Black, White, Navy" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="material">Material / Fabric</Label>
                    <Input id="material" value={formData.material || ""} onChange={(e) => setFormData({ ...formData, material: e.target.value })} placeholder="Nida, Zoom, Jorjet..." />
                  </div>
                  <div className="space-y-2">
                    <Label>প্রোডাক্ট ভিডিও</Label>
                    <VideoUpload value={formData.video_url || ""} onChange={(url) => setFormData({ ...formData, video_url: url })} />
                    <p className="text-xs text-muted-foreground">অথবা ভিডিও URL পেস্ট করুন:</p>
                    <Input id="video_url" placeholder="https://example.com/video.mp4" value={formData.video_url || ""} onChange={(e) => setFormData({ ...formData, video_url: e.target.value })} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="featured" checked={formData.featured} onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })} />
                  <Label htmlFor="featured">Featured Product</Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">{editingProduct ? "Update" : "Create"} Product</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search products..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); resetPage(); }} className="pl-10" />
          </div>
          <Select value={categoryFilter || "all"} onValueChange={v => { setCategoryFilter(v === "all" ? "" : v); resetPage(); }}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Input type="number" placeholder="Min ৳" value={minPrice} onChange={e => { setMinPrice(e.target.value); resetPage(); }} className="w-24" />
            <span className="text-muted-foreground">-</span>
            <Input type="number" placeholder="Max ৳" value={maxPrice} onChange={e => { setMaxPrice(e.target.value); resetPage(); }} className="w-24" />
          </div>
          <ProductImportExport onImportComplete={invalidateProducts} />
        </div>

        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="hidden sm:table-cell">Stock</TableHead>
                <TableHead className="hidden lg:table-cell">Featured</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No products found</TableCell></TableRow>
              ) : (
                paginatedProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => setZoomImage({ url: product.image_url || "/placeholder.svg", name: product.name })}
                        className="block focus:outline-none focus:ring-2 focus:ring-primary rounded overflow-hidden"
                        title="ক্লিক করে জুম করুন"
                      >
                        <img
                          src={product.image_url || "/placeholder.svg"}
                          alt={product.name}
                          loading="lazy"
                          className="w-[45px] h-[60px] sm:w-[52px] sm:h-[68px] object-cover rounded border border-border bg-muted hover:opacity-80 transition cursor-zoom-in"
                        />
                      </button>
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{product.category}</TableCell>
                    <TableCell>
                      {product.sale_price ? (
                        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                          <span className="line-through text-muted-foreground text-xs sm:text-sm">৳{product.price}</span>
                          <span className="text-primary font-medium">৳{product.sale_price}</span>
                        </div>
                      ) : `৳${product.price}`}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <span>{product.stock}</span>
                        {product.stock === 0 ? (
                          <Badge variant="destructive" className="text-xs">Out of stock</Badge>
                        ) : product.stock <= LOW_STOCK_THRESHOLD ? (
                          <Badge variant="outline" className="text-xs border-orange-300 text-orange-600">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Low
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {product.featured ? <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Yes</span> : "No"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end flex-wrap gap-0.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={async () => {
                          setGalleryProduct(product);
                          const { data } = await supabase.from("product_images").select("*").eq("product_id", product.id).order("display_order");
                          setGalleryImages(data || []);
                        }} title="Manage Gallery">
                          <Images className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setVariantProduct(product)} title="Manage Variants">
                          <Layers className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(product)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(product.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} of {filteredProducts.length}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>Previous</Button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let page: number;
                if (totalPages <= 7) page = i + 1;
                else if (currentPage <= 4) page = i + 1;
                else if (currentPage >= totalPages - 3) page = totalPages - 6 + i;
                else page = currentPage - 3 + i;
                return (
                  <Button key={page} variant={currentPage === page ? "default" : "outline"} size="sm" className="w-9" onClick={() => setCurrentPage(page)}>
                    {page}
                  </Button>
                );
              })}
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete the product.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!variantProduct} onOpenChange={() => setVariantProduct(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Manage Variants</DialogTitle></DialogHeader>
          {variantProduct && (
            <VariantManager productId={variantProduct.id} productName={variantProduct.name}
              availableSizes={variantProduct.sizes || ['50"', '52"', '54"', '56"', '58"', '60"']}
              availableColors={variantProduct.colors || ["Black", "White", "Navy", "Red"]} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!galleryProduct} onOpenChange={() => setGalleryProduct(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Product Gallery — {galleryProduct?.name}</DialogTitle></DialogHeader>
          {galleryProduct && <MultiImageUpload productId={galleryProduct.id} images={galleryImages} onImagesChange={setGalleryImages} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!zoomImage} onOpenChange={() => setZoomImage(null)}>
        <DialogContent className="max-w-md p-4">
          <DialogHeader>
            <DialogTitle className="text-base truncate">{zoomImage?.name}</DialogTitle>
          </DialogHeader>
          {zoomImage && (
            <div className="flex justify-center">
              <img
                src={zoomImage.url}
                alt={zoomImage.name}
                className="max-h-[75vh] w-auto object-contain rounded-lg border border-border"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Products;
