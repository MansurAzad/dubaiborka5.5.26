import { useEffect, useState, memo, useMemo } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Heart, ShoppingBag } from "lucide-react";
import StockBadge from "@/components/shop/StockBadge";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { type Product, getProductImage } from "@/types/product";
import {
  useImageRotationTick,
  useShuffleSeed,
  useProductAlternateImages,
  seededShuffle,
} from "@/hooks/useProductRotation";

interface FeaturedProductsProps {
  sectionData?: {
    title?: string | null;
    subtitle?: string | null;
    content?: string | null;
  };
}

const ProductCard = memo(({ product, index, isInWishlist, toggleWishlist, onAddToCart, navigate, displayImage }: {
  product: Product;
  index: number;
  isInWishlist: (id: string) => boolean;
  toggleWishlist: (id: string) => void;
  onAddToCart: (p: Product) => void;
  navigate: (path: string) => void;
  displayImage: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.25) }}
    className="group"
  >
    <div className="card-luxury overflow-hidden">
      <div
        className="relative aspect-[3/4] overflow-hidden rounded-xl mb-3 md:mb-4 cursor-pointer"
        onClick={() => navigate(`/product/${product.slug || product.id}`)}
      >
        <img
          src={displayImage}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy" decoding="async"
        />
        {product.sale_price && (
          <span className="absolute top-2 left-2 md:top-4 md:left-4 px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-semibold bg-secondary text-secondary-foreground">Sale</span>
        )}
        <div className="absolute bottom-2 left-2 md:bottom-3 md:left-3">
          <StockBadge stock={product.stock} compact />
        </div>
        <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 md:gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); toggleWishlist(product.id); }}
            className={`w-9 h-9 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-colors ${
              isInWishlist(product.id) ? "bg-primary text-primary-foreground" : "bg-foreground text-background hover:bg-primary hover:text-primary-foreground"
            }`}
          >
            <Heart className={`w-4 h-4 md:w-5 md:h-5 ${isInWishlist(product.id) ? "fill-current" : ""}`} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
            className="w-9 h-9 md:w-12 md:h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-accent transition-colors"
          >
            <ShoppingBag className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </div>
      <div className="space-y-1 md:space-y-2">
        <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">{product.category}</span>
        <Link to={`/product/${product.slug || product.id}`}>
          <h3 className="font-display text-sm md:text-lg font-semibold text-foreground hover:text-primary transition-colors line-clamp-2">{product.name}</h3>
        </Link>
        <div className="flex items-center gap-2 md:gap-3 pt-1 md:pt-2">
          <span className="font-display text-sm md:text-xl font-bold text-gradient-gold">৳{(product.sale_price || product.price).toLocaleString()}</span>
          {product.sale_price && (
            <span className="text-[10px] md:text-sm text-muted-foreground line-through">৳{product.price.toLocaleString()}</span>
          )}
        </div>
      </div>
    </div>
  </motion.div>
));

ProductCard.displayName = "ProductCard";

const FeaturedProducts = ({ sectionData }: FeaturedProductsProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const navigate = useNavigate();

  const heading = sectionData?.title || "Featured Products";
  const subheading = sectionData?.subtitle || "Handpicked For You";

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, name, price, sale_price, image_url, category, sizes, colors, slug, stock, material, description, video_url")
          .eq("featured", true)
          .limit(12);
        if (error) throw error;
        setProducts(data || []);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const tick = useImageRotationTick();
  const shuffleSeed = useShuffleSeed();
  const productIds = useMemo(() => products.map((p) => p.id), [products]);
  const { data: altImages } = useProductAlternateImages(productIds);

  const displayProducts = useMemo(
    () => seededShuffle(products, shuffleSeed).slice(0, 6),
    [products, shuffleSeed]
  );

  const pickImage = (product: Product) => {
    const main = getProductImage(product);
    const alts = altImages?.[product.id] || [];
    const all = [main, ...alts.filter((u) => u && u !== main)];
    if (all.length <= 1) return main;
    let hash = 0;
    for (let i = 0; i < product.id.length; i++) hash = (hash * 31 + product.id.charCodeAt(i)) | 0;
    return all[Math.abs(hash + tick) % all.length];
  };

  const handleAddToCart = async (product: Product) => {
    await addToCart(product.id, 1, product.sizes?.[0] || undefined, product.colors?.[0] || undefined);
  };

  return (
    <section className="py-12 md:py-20 bg-card">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-16"
        >
          <div>
            <span className="text-primary text-xs md:text-sm uppercase tracking-widest font-medium">{subheading}</span>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mt-2 md:mt-4 text-foreground">
              {heading}
            </h2>
          </div>
          <Link to="/shop" className="mt-4 md:mt-0 text-primary font-medium gold-underline text-sm md:text-base">
            View All Products →
          </Link>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[3/4] bg-muted rounded-xl mb-3" />
                <div className="h-3 bg-muted rounded w-1/4 mb-2" />
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-8">
            {displayProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                isInWishlist={isInWishlist}
                toggleWishlist={toggleWishlist}
                onAddToCart={handleAddToCart}
                navigate={navigate}
                displayImage={pickImage(product)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedProducts;
