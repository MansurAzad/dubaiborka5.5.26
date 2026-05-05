import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { type Product, getProductImage } from "@/types/product";
import {
  useImageRotationTick,
  useShuffleSeed,
  useProductAlternateImages,
  seededShuffle,
} from "@/hooks/useProductRotation";

const NewArrivals = () => {
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["new-arrivals"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, price, sale_price, image_url, category, slug, sizes, colors, stock, material, description, video_url")
        .order("created_at", { ascending: false })
        .limit(16);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const tick = useImageRotationTick();
  const shuffleSeed = useShuffleSeed();
  const productIds = useMemo(() => products.map((p) => p.id), [products]);
  const { data: altImages } = useProductAlternateImages(productIds);

  const displayProducts = useMemo(
    () => seededShuffle(products, shuffleSeed + 2).slice(0, 8),
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
    <section className="py-12 md:py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-3">
            <Sparkles className="w-4 h-4" /> New Arrivals
          </div>
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">Just Landed</h2>
          <p className="text-muted-foreground mt-2">Explore our latest collection</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {displayProducts.map((product) => (
            <Link
              key={product.id}
              to={`/product/${product.slug || product.id}`}
              className="group relative rounded-xl overflow-hidden bg-card border border-border hover:shadow-lg transition-all duration-300"
            >
              <div className="aspect-[3/4] overflow-hidden">
                <img
                  src={pickImage(product)}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs">NEW</Badge>
              <div className="p-3">
                <h3 className="text-sm font-medium text-foreground truncate">{product.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {product.sale_price ? (
                    <>
                      <span className="text-primary font-bold text-sm">৳{product.sale_price.toLocaleString()}</span>
                      <span className="text-muted-foreground line-through text-xs">৳{product.price.toLocaleString()}</span>
                    </>
                  ) : (
                    <span className="text-primary font-bold text-sm">৳{product.price.toLocaleString()}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default NewArrivals;
