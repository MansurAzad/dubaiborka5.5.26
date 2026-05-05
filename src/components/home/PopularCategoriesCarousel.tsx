import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";

const PopularCategoriesCarousel = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["popular-categories-carousel"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "left" ? -280 : 280, behavior: "smooth" });
  };

  if (categories.length === 0) return null;

  return (
    <section className="py-12 md:py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">Popular Categories</h2>
            <p className="text-muted-foreground mt-1 text-sm">Browse your favorite categories</p>
          </div>
          <div className="hidden md:flex gap-2">
            <Button size="icon" variant="outline" onClick={() => scroll("left")}><ChevronLeft className="w-4 h-4" /></Button>
            <Button size="icon" variant="outline" onClick={() => scroll("right")}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2"
          style={{ scrollbarWidth: "none" }}
        >
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/shop?category=${cat.slug || cat.name}`}
              className="flex-shrink-0 w-40 md:w-52 snap-start group"
            >
              <div className="aspect-square rounded-2xl overflow-hidden bg-card border border-border relative">
                <img
                  src={cat.image_url || "/placeholder.svg"}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3 text-background">
                  <h3 className="font-semibold text-sm">{cat.name}</h3>
                  <p className="text-xs opacity-80">{cat.item_count}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PopularCategoriesCarousel;
