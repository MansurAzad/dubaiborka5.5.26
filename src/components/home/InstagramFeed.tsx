import { motion } from "framer-motion";
import { Instagram } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import productAbaya from "@/assets/product-abaya-1.jpg";
import productHijab from "@/assets/product-hijab-1.jpg";
import productBorka from "@/assets/product-borka-1.jpg";
import productKaftan from "@/assets/product-kaftan-1.jpg";
import productScarf from "@/assets/product-scarf-1.jpg";
import productFabric from "@/assets/product-fabric-1.jpg";

const fallbackImages = [productAbaya, productHijab, productBorka, productKaftan, productScarf, productFabric];

const InstagramFeed = () => {
  const { data: products } = useQuery({
    queryKey: ["instagram-feed-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, image_url")
        .not("image_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(6);
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const images = products && products.length >= 4
    ? products.map(p => p.image_url!)
    : fallbackImages;

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="text-primary text-sm uppercase tracking-widest font-medium">
            Follow Us On Instagram
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-4 mb-4">
            <span className="text-gradient-gold">@DubaiBorkaHouse</span>
          </h2>
          <p className="text-muted-foreground">
            Tag us in your photos for a chance to be featured
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {images.map((image, index) => (
            <motion.a
              key={index}
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative aspect-square rounded-xl overflow-hidden"
            >
              <img
                src={image}
                alt={`Instagram post ${index + 1}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <Instagram className="w-8 h-8 text-primary" />
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default InstagramFeed;
