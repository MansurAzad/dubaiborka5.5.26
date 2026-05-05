import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { type Product, getProductImage } from "@/types/product";

interface RecentlyViewedProps {
  productIds: string[];
  currentProductId?: string;
}

const RecentlyViewed = ({ productIds, currentProductId }: RecentlyViewedProps) => {
  const [products, setProducts] = useState<Product[]>([]);

  const filteredIds = productIds.filter((id) => id !== currentProductId).slice(0, 6);

  useEffect(() => {
    if (filteredIds.length === 0) return;

    const fetchProducts = async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, price, sale_price, image_url, category, slug, sizes, colors, stock, material, description, video_url")
        .in("id", filteredIds);

      if (data) {
        const ordered = filteredIds
          .map((id) => data.find((p) => p.id === id))
          .filter(Boolean) as Product[];
        setProducts(ordered);
      }
    };

    fetchProducts();
  }, [filteredIds.join(",")]);

  if (products.length === 0) return null;

  return (
    <section className="mt-16">
      <div className="flex items-center gap-2 mb-6">
        <Clock className="w-5 h-5 text-primary" />
        <h2 className="font-display text-2xl font-bold text-foreground">সম্প্রতি দেখা পণ্য</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {products.map((product) => (
          <Link
            key={product.id}
            to={`/product/${product.slug || product.id}`}
            className="group"
          >
            <div className="aspect-square rounded-xl overflow-hidden bg-muted mb-2">
              <img
                src={getProductImage(product)}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
            </div>
            <h3 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
              {product.name}
            </h3>
            <span className="text-sm font-bold text-gradient-gold">
              ৳{(product.sale_price || product.price).toLocaleString()}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default RecentlyViewed;
