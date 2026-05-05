import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { TrendingUp, Star } from "lucide-react";
import { type Product, getProductImage } from "@/types/product";
import {
  useImageRotationTick,
  useShuffleSeed,
  useProductAlternateImages,
  seededShuffle,
} from "@/hooks/useProductRotation";

const TrendingProducts = () => {
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["trending-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, price, sale_price, image_url, category, slug, sizes, colors, stock, material, description, video_url")
        .eq("featured", true)
        .limit(12);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const tick = useImageRotationTick();
  const shuffleSeed = useShuffleSeed();
  const productIds = useMemo(() => products.map((p) => p.id), [products]);
  const { data: altImages } = useProductAlternateImages(productIds);

  const displayProducts = useMemo(
    () => seededShuffle(products, shuffleSeed + 1).slice(0, 6),
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

  if (products.length === 0) return null;

  return (
    <section className="py-12 md:py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-1.5 rounded-full text-sm font-medium mb-3">
            <TrendingUp className="w-4 h-4" /> Trending
          </div>
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">Most Popular</h2>
          <p className="text-muted-foreground mt-2">Top picks loved by our customers</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {displayProducts.map((product, i) => (
            <Link
              key={product.id}
              to={`/product/${product.slug || product.id}`}
              className="group relative rounded-xl overflow-hidden bg-card border border-border hover:shadow-xl transition-all duration-300"
            >
              <div className="aspect-square overflow-hidden">
                <img
                  src={pickImage(product)}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  loading="lazy"
                />
              </div>
              <div className="absolute top-2 left-2 bg-foreground text-background text-xs font-bold px-2 py-1 rounded-full">
                #{i + 1} Trending
              </div>
              <div className="p-3">
                <h3 className="text-sm font-semibold text-foreground truncate">{product.name}</h3>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-primary font-bold">৳{(product.sale_price || product.price).toLocaleString()}</span>
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrendingProducts;
