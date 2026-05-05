import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star, Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const CustomerReviewsShowcase = () => {
  const { data: reviews = [] } = useQuery({
    queryKey: ["showcase-reviews"],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_reviews")
        .select("*, products(name, image_url)")
        .gte("rating", 4)
        .order("created_at", { ascending: false })
        .limit(6);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (reviews.length === 0) return null;

  return (
    <section className="py-12 md:py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">What Customers Say</h2>
          <p className="text-muted-foreground mt-2">Feedback from our satisfied customers</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {reviews.map((review: any) => (
            <Card key={review.id} className="group hover:shadow-lg transition-shadow">
              <CardContent className="p-5">
                <Quote className="w-8 h-8 text-primary/20 mb-3" />
                <div className="flex gap-0.5 mb-3">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                {review.title && (
                  <h4 className="font-semibold text-foreground mb-1">{review.title}</h4>
                )}
                <p className="text-sm text-muted-foreground line-clamp-3">{review.comment || "Great product!"}</p>
                {review.products && (
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                    <img
                      src={review.products.image_url || "/placeholder.svg"}
                      alt={review.products.name}
                      className="w-10 h-10 rounded-md object-cover"
                    />
                    <span className="text-xs text-muted-foreground truncate">{review.products.name}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CustomerReviewsShowcase;
