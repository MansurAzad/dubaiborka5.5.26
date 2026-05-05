import { motion } from "framer-motion";
import { Package, ArrowRight, Tag } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface BundleDealsProps {
  sectionData?: {
    title?: string | null;
    subtitle?: string | null;
    content?: string | null;
  };
}

const ICONS = ["👗", "🧕", "🎁", "✨", "💎", "🌙"];

const BundleDeals = ({ sectionData }: BundleDealsProps) => {
  const { data: bundles = [] } = useQuery({
    queryKey: ["bundle-deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bundle_deals")
        .select("*")
        .eq("is_active", true)
        .order("created_at");
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const heading = sectionData?.title || "Buy More, Save More!";
  const subheading = sectionData?.subtitle || "Bundle Offers";

  const displayBundles = bundles.length > 0
    ? bundles.map((b, i) => ({
        title: b.name,
        discount: `${b.discount_percent}% OFF`,
        description: b.description || `Buy ${b.min_items}+ items and save!`,
        category: b.category || "",
        icon: ICONS[i % ICONS.length],
      }))
    : [
        { title: "Buy 2 Borkas", discount: "15% OFF", description: "Get 15% discount when you buy any 2 borkas together!", category: "Borkas", icon: "👗" },
        { title: "Hijab + Scarf Combo", discount: "20% OFF", description: "Buy a hijab and scarf together and save 20%!", category: "Hijabs", icon: "🧕" },
        { title: "3+ Any Items", discount: "25% OFF", description: "Purchase 3 or more products and get 25% off!", category: "", icon: "🎁" },
      ];

  return (
    <section className="py-16 bg-gradient-to-b from-background to-card">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Package className="w-4 h-4 text-primary" />
            <span className="text-primary text-sm font-medium">{subheading}</span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            {heading}
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {displayBundles.map((bundle, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="card-luxury text-center group hover:border-primary/50 transition-colors"
            >
              <div className="text-4xl mb-4">{bundle.icon}</div>
              <h3 className="font-display text-xl font-bold text-foreground mb-2">{bundle.title}</h3>
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary/10 text-secondary font-bold text-lg mb-3">
                <Tag className="w-4 h-4" />
                {bundle.discount}
              </div>
              <p className="text-sm text-muted-foreground mb-4">{bundle.description}</p>
              <Link
                to={bundle.category ? `/shop?category=${bundle.category}` : "/shop"}
                className="text-primary text-sm font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all"
              >
                Shop Now <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BundleDeals;
