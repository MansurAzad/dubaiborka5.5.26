import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Heart, ShoppingBag } from "lucide-react";
import StockBadge from "@/components/shop/StockBadge";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { type Product, getProductImage } from "@/types/product";

interface RelatedProductsProps {
  currentProductId: string;
  category: string;
}

const RelatedProducts = ({ currentProductId, category }: RelatedProductsProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  useEffect(() => {
    const fetchRelated = async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, price, sale_price, image_url, category, sizes, colors, slug, stock")
        .eq("category", category)
        .neq("id", currentProductId)
        .limit(4);

      setProducts(data || []);
    };

    fetchRelated();
  }, [currentProductId, category]);

  if (products.length === 0) return null;

  return (
    <section className="mt-16 pt-16 border-t border-border">
      <div className="flex items-center gap-2 mb-8">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="font-display text-2xl font-bold text-foreground">সম্পর্কিত পণ্য</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {products.map((product) => {
          const isOutOfStock = product.stock !== null && product.stock !== undefined && product.stock <= 0;
          return (
            <div key={product.id} className="group">
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-muted mb-3">
                <img
                  src={getProductImage(product)}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                {product.sale_price && (
                  <span className="absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-semibold bg-secondary text-secondary-foreground">
                    Sale
                  </span>
                )}
                <div className="absolute bottom-2 left-2">
                  <StockBadge stock={product.stock} compact />
                </div>
                <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => toggleWishlist(product.id)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                      isInWishlist(product.id)
                        ? "bg-primary text-primary-foreground"
                        : "bg-foreground text-background hover:bg-primary hover:text-primary-foreground"
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isInWishlist(product.id) ? "fill-current" : ""}`} />
                  </button>
                  {!isOutOfStock && (
                    <button
                      onClick={() =>
                        addToCart(product.id, 1, product.sizes?.[0] || undefined, product.colors?.[0] || undefined)
                      }
                      className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-accent transition-colors"
                    >
                      <ShoppingBag className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <span className="text-xs text-muted-foreground uppercase">{product.category}</span>
              <Link to={`/product/${product.slug || product.id}`}>
                <h3 className="font-display text-base font-semibold text-foreground mt-1 hover:text-primary transition-colors truncate">
                  {product.name}
                </h3>
              </Link>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-display font-bold text-gradient-gold">
                  ৳{(product.sale_price || product.price).toLocaleString()}
                </span>
                {product.sale_price && (
                  <span className="text-xs text-muted-foreground line-through">
                    ৳{product.price.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default RelatedProducts;
