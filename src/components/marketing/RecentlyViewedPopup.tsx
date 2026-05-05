import { useState, useEffect, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Eye, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { type Product, getProductImage } from "@/types/product";

const RecentlyViewedPopup = forwardRef<HTMLDivElement>((_, ref) => {
  const [visible, setVisible] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const { recentlyViewed } = useRecentlyViewed();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (recentlyViewed.length < 2 || dismissed) return;

    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const fetchProducts = async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, price, sale_price, image_url, category, slug, sizes, colors, stock, material, description, video_url")
        .in("id", recentlyViewed.slice(0, 4));
      
      if (!cancelled && data && data.length >= 2) {
        setProducts(data);
        timer = setTimeout(() => setVisible(true), 20000);
      }
    };

    fetchProducts();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [recentlyViewed, dismissed]);

  if (!visible || products.length < 2) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-4 right-4 z-50 bg-card border border-border rounded-xl shadow-elegant max-w-xs w-full p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Eye className="w-4 h-4 text-primary" />
            সম্প্রতি দেখেছেন
          </div>
          <button onClick={() => { setVisible(false); setDismissed(true); }} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {products.slice(0, 3).map((p) => (
            <Link
              key={p.id}
              to={`/product/${p.slug || p.id}`}
              onClick={() => setVisible(false)}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <img
                src={getProductImage(p)}
                alt={p.name}
                className="w-10 h-10 rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                <p className="text-xs text-gradient-gold font-bold">
                  ৳{(p.sale_price || p.price).toLocaleString()}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <Link
          to="/shop"
          onClick={() => setVisible(false)}
          className="flex items-center justify-center gap-1 text-primary text-sm font-medium mt-3 pt-3 border-t border-border hover:gap-2 transition-all"
        >
          আরো দেখুন <ArrowRight className="w-3 h-3" />
        </Link>
      </motion.div>
    </AnimatePresence>
  );
});

RecentlyViewedPopup.displayName = "RecentlyViewedPopup";

export default RecentlyViewedPopup;
