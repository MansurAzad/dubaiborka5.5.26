import { useState, useEffect } from "react";
import { Heart, ShoppingBag, Check } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { type Product, getProductImage } from "@/types/product";

interface Variant {
  id: string;
  size: string | null;
  color: string | null;
  stock: number;
  image_url: string | null;
  price_adjustment: number | null;
}

interface ProductImage {
  id: string;
  image_url: string;
  alt_text: string | null;
  display_order: number;
}

interface QuickViewModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QuickViewModal = ({ product, open, onOpenChange }: QuickViewModalProps) => {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [activeImage, setActiveImage] = useState<string>("");
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { toast } = useToast();

  useEffect(() => {
    if (!product || !open) return;
    setSelectedSize(null);
    setSelectedColor(null);
    setQuantity(1);
    setActiveImage(getProductImage(product));

    const fetchData = async () => {
      const [variantsRes, imagesRes] = await Promise.all([
        supabase.from("product_variants").select("id, size, color, stock, image_url, price_adjustment").eq("product_id", product.id),
        supabase.from("product_images").select("id, image_url, alt_text, display_order").eq("product_id", product.id).order("display_order"),
      ]);
      setVariants(variantsRes.data || []);
      setProductImages(imagesRes.data || []);
    };
    fetchData();
  }, [product, open]);

  if (!product) return null;

  const allColors = variants.length > 0
    ? [...new Set(variants.filter(v => v.color).map(v => v.color!))]
    : (product.colors || []);

  const isColorInStock = (color: string) => {
    if (variants.length === 0) return true;
    return variants.some(v => v.color === color && v.stock > 0);
  };

  const allSizes = (() => {
    if (variants.length === 0) return product.sizes?.filter(Boolean) || [];
    if (selectedColor) {
      return [...new Set(variants.filter(v => v.color === selectedColor && v.size).map(v => v.size!))];
    }
    return [...new Set(variants.filter(v => v.size).map(v => v.size!))];
  })();

  const isSizeInStock = (size: string) => {
    if (variants.length === 0) return true;
    if (selectedColor) {
      return variants.some(v => v.size === size && v.color === selectedColor && v.stock > 0);
    }
    return variants.some(v => v.size === size && v.stock > 0);
  };

  // Get selected variant
  const getSelectedVariant = (): Variant | undefined => {
    if (variants.length === 0) return undefined;
    return variants.find(v =>
      (selectedColor ? v.color === selectedColor : true) &&
      (selectedSize ? v.size === selectedSize : true) &&
      (selectedColor || selectedSize)
    );
  };

  // Current price with variant adjustment
  const basePrice = product.sale_price || product.price;
  const variant = getSelectedVariant();
  const currentPrice = variant?.price_adjustment ? basePrice + variant.price_adjustment : basePrice;
  const discount = product.sale_price
    ? Math.round((1 - product.sale_price / product.price) * 100)
    : 0;
  const inWishlist = isInWishlist(product.id);

  // Variant stock check
  const getVariantStock = (): number | null => {
    const v = getSelectedVariant();
    if (v) return v.stock;
    if (selectedColor) {
      const colorVariants = variants.filter(v => v.color === selectedColor);
      if (colorVariants.length > 0) return colorVariants.reduce((sum, v) => sum + v.stock, 0);
    }
    return product.stock ?? null;
  };

  const handleColorClick = (color: string) => {
    if (!isColorInStock(color)) return;
    setSelectedColor(color);
    setSelectedSize(null);
    const v = variants.find(v => v.color === color && v.image_url);
    if (v?.image_url) setActiveImage(v.image_url);
  };

  const handleSizeClick = (size: string) => {
    if (!isSizeInStock(size)) return;
    setSelectedSize(size);
  };

  // Thumbnails
  const thumbnails: { url: string; label?: string }[] = [];
  const seenColors = new Set<string>();
  variants.forEach(v => {
    if (v.color && v.image_url && !seenColors.has(v.color)) {
      seenColors.add(v.color);
      thumbnails.push({ url: v.image_url, label: v.color });
    }
  });
  productImages.forEach(img => {
    if (!thumbnails.some(t => t.url === img.image_url)) {
      thumbnails.push({ url: img.image_url, label: img.alt_text || undefined });
    }
  });

  const handleAddToCart = async () => {
    // Require size selection if sizes exist
    if (allSizes.length > 0 && !selectedSize) {
      toast({ title: "সাইজ সিলেক্ট করুন", description: "কার্টে যোগ করার আগে একটি সাইজ বেছে নিন", variant: "destructive" });
      return;
    }
    // Require color selection if colors exist
    if (allColors.length > 0 && !selectedColor) {
      toast({ title: "কালার সিলেক্ট করুন", description: "কার্টে যোগ করার আগে একটি কালার বেছে নিন", variant: "destructive" });
      return;
    }
    // Stock check
    const vStock = getVariantStock();
    if (vStock !== null && vStock < quantity) {
      toast({ title: "স্টক অপর্যাপ্ত", description: `মাত্র ${vStock}টি পণ্য আছে`, variant: "destructive" });
      return;
    }
    await addToCart(product.id, quantity, selectedSize || undefined, selectedColor || undefined);
    onOpenChange(false);
  };

  const mainImg = getProductImage(product);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-card border-border max-h-[90vh]">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Image Section */}
          <div className="flex flex-col">
            <div className="relative aspect-square">
              <img
                src={activeImage || mainImg}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {discount > 0 && (
                <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold bg-secondary text-secondary-foreground">
                  {discount}% OFF
                </span>
              )}
            </div>
            {thumbnails.length > 0 && (
              <div className="flex gap-1.5 p-3 overflow-x-auto">
                <button
                  onClick={() => setActiveImage(mainImg)}
                  className={`w-14 h-14 rounded-md overflow-hidden border-2 flex-shrink-0 transition-colors ${
                    activeImage === mainImg ? "border-primary" : "border-border"
                  }`}
                >
                  <img src={mainImg} alt="Main" className="w-full h-full object-cover" />
                </button>
                {thumbnails.map((thumb, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(thumb.url)}
                    className={`w-14 h-14 rounded-md overflow-hidden border-2 flex-shrink-0 transition-colors ${
                      activeImage === thumb.url ? "border-primary" : "border-border"
                    }`}
                    title={thumb.label}
                  >
                    <img src={thumb.url} alt={thumb.label || ""} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-6 flex flex-col justify-between overflow-y-auto max-h-[80vh]">
            <div className="space-y-4">
              <div>
                <span className="text-primary text-xs uppercase tracking-widest font-medium">
                  {product.category}
                </span>
                <h2 className="font-display text-2xl font-bold text-foreground mt-1">
                  {product.name}
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-display text-2xl font-bold text-gradient-gold">
                  ৳{currentPrice.toLocaleString()}
                </span>
                {product.sale_price && (
                  <span className="text-muted-foreground line-through">
                    ৳{product.price.toLocaleString()}
                  </span>
                )}
                {variant?.price_adjustment && variant.price_adjustment !== 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${variant.price_adjustment > 0 ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary"}`}>
                    {variant.price_adjustment > 0 ? "+" : ""}৳{variant.price_adjustment.toLocaleString()}
                  </span>
                )}
              </div>

              {product.description && (
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {product.description}
                </p>
              )}

              {/* Colors */}
              {allColors.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-foreground mb-2 block">
                    কালার: <span className="text-primary">{selectedColor || "বেছে নিন"}</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {allColors.map((color) => {
                      const inStock = isColorInStock(color);
                      return (
                        <button
                          key={color}
                          onClick={() => handleColorClick(color)}
                          disabled={!inStock}
                          className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-all flex items-center gap-1 relative ${
                            !inStock
                              ? "border-border text-muted-foreground/50 cursor-not-allowed line-through"
                              : selectedColor === color
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border hover:border-primary/50 text-foreground"
                          }`}
                        >
                          {selectedColor === color && <Check className="w-3 h-3" />}
                          {color}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sizes */}
              {allSizes.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-foreground mb-2 block">
                    সাইজ: <span className="text-primary">{selectedSize || "বেছে নিন"}</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {allSizes.map((size) => {
                      const inStock = isSizeInStock(size);
                      return (
                        <button
                          key={size}
                          onClick={() => handleSizeClick(size)}
                          disabled={!inStock}
                          className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-all relative ${
                            !inStock
                              ? "border-border text-muted-foreground/50 cursor-not-allowed line-through"
                              : selectedSize === size
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border hover:border-primary/50 text-foreground"
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-border rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-9 h-9 flex items-center justify-center hover:bg-muted transition-colors text-sm"
                  >
                    -
                  </button>
                  <span className="w-9 text-center text-sm font-medium">{quantity}</span>
                  <button
                    onClick={() => {
                      const maxStock = getVariantStock() ?? product.stock ?? 999;
                      if (quantity < maxStock) setQuantity(quantity + 1);
                    }}
                    className="w-9 h-9 flex items-center justify-center hover:bg-muted transition-colors text-sm"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <Button onClick={handleAddToCart} className="btn-gold flex-1 h-11">
                <ShoppingBag className="w-4 h-4 mr-2" />
                কার্টে যোগ করুন
              </Button>
              <button
                onClick={() => toggleWishlist(product.id)}
                className={`w-11 h-11 rounded-lg border-2 flex items-center justify-center transition-colors ${
                  inWishlist
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary hover:text-primary"
                }`}
              >
                <Heart className={`w-4 h-4 ${inWishlist ? "fill-current" : ""}`} />
              </button>
            </div>

            <Link
              to={`/product/${product.slug || product.id}`}
              className="text-center text-sm text-primary hover:underline mt-3 block"
              onClick={() => onOpenChange(false)}
            >
              সম্পূর্ণ বিবরণ দেখুন →
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickViewModal;
