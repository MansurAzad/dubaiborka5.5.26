import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Clock, Flame } from "lucide-react";
import { useState, useEffect } from "react";
import { getProductImage } from "@/types/product";

const DealOfTheDay = () => {
  const { data: product } = useQuery({
    queryKey: ["deal-of-the-day"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .not("sale_price", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!product) return null;

  const discount = product.sale_price
    ? Math.round(((product.price - product.sale_price) / product.price) * 100)
    : 0;

  return (
    <section className="py-12 md:py-16 bg-gradient-to-r from-primary/5 via-background to-primary/5">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-destructive text-destructive-foreground px-4 py-1.5 rounded-full text-sm font-bold mb-3 animate-pulse">
            <Flame className="w-4 h-4" /> Deal of the Day
          </div>
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">Limited Time Offer</h2>
        </div>

        <div className="max-w-4xl mx-auto bg-card rounded-2xl border border-border overflow-hidden shadow-lg">
          <div className="grid md:grid-cols-2 gap-0">
            <div className="aspect-square md:aspect-auto overflow-hidden">
              <img
                src={getProductImage(product)}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6 md:p-8 flex flex-col justify-center">
              <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">{product.name}</h3>
              <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{product.description}</p>

              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl font-bold text-primary">৳{product.sale_price}</span>
                <span className="text-lg text-muted-foreground line-through">৳{product.price}</span>
                <span className="bg-destructive text-destructive-foreground text-sm font-bold px-2 py-0.5 rounded">
                  -{discount}%
                </span>
              </div>

              <div className="flex items-center gap-2 mb-6">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Offer ends in:</span>
                <div className="flex gap-1.5">
                  {[
                    { val: timeLeft.hours, label: "h" },
                    { val: timeLeft.minutes, label: "m" },
                    { val: timeLeft.seconds, label: "s" },
                  ].map((t) => (
                    <span key={t.label} className="bg-foreground text-background text-sm font-mono font-bold px-2 py-1 rounded">
                      {String(t.val).padStart(2, "0")}{t.label}
                    </span>
                  ))}
                </div>
              </div>

              <Link to={`/product/${product.slug || product.id}`}>
                <Button className="w-full" size="lg">Shop Now</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DealOfTheDay;
