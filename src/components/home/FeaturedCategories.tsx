import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { categoryImages, defaultFallbackImage } from "@/types/product";

const FeaturedCategories = () => {
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const getCategoryImage = (cat: any) => {
    if (cat.image_url) return cat.image_url;
    // Try matching by name (DB stores "Borka", "Abaya" etc.)
    return categoryImages[cat.name] || categoryImages[cat.slug] || defaultFallbackImage;
  };

  const displayCategories = categories.length > 0
    ? categories.map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description || "",
        image: getCategoryImage(c),
        count: c.item_count || "0+ Items",
        slug: c.slug || c.name,
      }))
    : [
        { id: "1", name: "Abaya", description: "Dubai Style Abayas", image: categoryImages.Abaya, count: "40+ Items", slug: "Abaya" },
        { id: "2", name: "Hijab", description: "Premium Hijabs", image: categoryImages.Hijab, count: "200+ Items", slug: "Hijab" },
        { id: "3", name: "Fabric", description: "Imported Fabrics", image: categoryImages.Fabric, count: "80+ Items", slug: "Fabric" },
        { id: "4", name: "Kaftan", description: "Arabian Kaftans", image: categoryImages.Kaftan, count: "60+ Items", slug: "Kaftan" },
      ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-primary text-sm uppercase tracking-widest font-medium">
            Browse By Category
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-4 mb-6">
            <span className="text-foreground">Our </span>
            <span className="text-gradient-gold">Collection</span>
          </h2>
          <div className="section-divider" />
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {displayCategories.slice(0, 8).map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Link
                to={`/shop?category=${category.slug}`}
                className="group block relative h-[280px] md:h-[400px] rounded-2xl overflow-hidden card-luxury"
              >
                <img
                  src={category.image}
                  alt={category.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
                  <span className="inline-block px-2 py-0.5 md:px-3 md:py-1 bg-primary/20 backdrop-blur-sm rounded-full text-primary text-[10px] md:text-xs font-medium mb-2 md:mb-3">
                    {category.count}
                  </span>
                  <h3 className="font-display text-lg md:text-2xl font-semibold text-foreground mb-1 md:mb-2">
                    {category.name}
                  </h3>
                  <p className="text-muted-foreground text-xs md:text-sm mb-2 md:mb-4 line-clamp-2 hidden sm:block">
                    {category.description}
                  </p>
                  <div className="flex items-center gap-2 text-primary font-medium text-xs md:text-sm group-hover:gap-4 transition-all">
                    <span>Explore</span>
                    <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedCategories;
