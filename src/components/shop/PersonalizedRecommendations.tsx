import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { getProductImage, type Product } from "@/types/product";
import StockBadge from "./StockBadge";

const PersonalizedRecommendations = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { recentlyViewed } = useRecentlyViewed();

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        let categories: string[] = [];
        if (recentlyViewed.length > 0) {
          const { data: viewedProducts } = await supabase
            .from("products")
            .select("category")
            .in("id", recentlyViewed.slice(0, 5));
          if (viewedProducts) {
            categories = [...new Set(viewedProducts.map(p => p.category))];
          }
        }

        let query = supabase.from("products").select("id, name, price, sale_price, image_url, category, stock, slug, sizes, colors, material, description, video_url");
        
        if (categories.length > 0) {
          query = query.in("category", categories);
          if (recentlyViewed.length > 0) {
            query = query.not("id", "in", `(${recentlyViewed.join(",")})`);
          }
        } else {
          query = query.eq("featured", true);
        }

        const { data } = await query.limit(8);
        setProducts(data || []);
      } catch (e) {
        console.error("Error fetching recommendations:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchRecommendations();
  }, [recentlyViewed]);

  if (loading || products.length === 0) return null;

  return (
    <section className="py-12">
      <div className="flex items-center gap-3 mb-8">
        <Sparkles className="w-6 h-6 text-primary" />
        <h2 className="font-display text-2xl font-bold text-foreground">আপনার জন্য সাজেস্টেড</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05 }}
            className="group"
          >
            <Link to={`/product/${product.slug || product.id}`} className="block">
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-muted mb-3">
                <img
                  src={getProductImage(product)}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                {product.sale_price && (
                  <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded-full">
                    -{Math.round((1 - product.sale_price / product.price) * 100)}%
                  </span>
                )}
                <div className="absolute bottom-2 left-2">
                  <StockBadge stock={product.stock} compact />
                </div>
              </div>
              <h3 className="text-sm font-medium text-foreground line-clamp-2 mb-1">{product.name}</h3>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-primary">৳{(product.sale_price || product.price).toLocaleString()}</span>
                {product.sale_price && (
                  <span className="text-xs text-muted-foreground line-through">৳{product.price.toLocaleString()}</span>
                )}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default PersonalizedRecommendations;
