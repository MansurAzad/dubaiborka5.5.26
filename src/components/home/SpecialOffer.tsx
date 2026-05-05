import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Clock, ArrowRight, Flame } from "lucide-react";
import { useState, useEffect } from "react";
import productKaftan from "@/assets/product-kaftan-1.jpg";

interface SpecialOfferProps {
  sectionData?: {
    title?: string | null;
    subtitle?: string | null;
    content?: string | null;
    image_url?: string | null;
  };
}

const SpecialOffer = ({ sectionData }: SpecialOfferProps) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 3,
    hours: 12,
    minutes: 45,
    seconds: 30,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { days, hours, minutes, seconds } = prev;
        if (seconds > 0) { seconds--; }
        else { seconds = 59; if (minutes > 0) { minutes--; }
        else { minutes = 59; if (hours > 0) { hours--; }
        else { hours = 23; if (days > 0) { days--; } } } }
        return { days, hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const title = sectionData?.title || "Up to 40% Off on Premium Kaftans";
  const subtitle = sectionData?.subtitle || "Limited Time Offer";
  const description = sectionData?.content || "Don't miss our exclusive sale on handcrafted Arabian kaftans. Limited stock available!";
  const image = sectionData?.image_url || productKaftan;

  return (
    <section className="py-20 bg-gradient-to-br from-card via-background to-card relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl" />
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/20 border border-secondary mb-6">
              <Flame className="w-5 h-5 text-secondary" />
              <span className="text-secondary font-medium">{subtitle}</span>
            </div>
            
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4 text-foreground">
              {title}
            </h2>
            
            <p className="text-muted-foreground text-lg mb-8 max-w-md">
              {description}
            </p>
            
            <div className="flex gap-4 mb-8">
              {Object.entries(timeLeft).map(([label, value]) => (
                <div key={label} className="text-center">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-muted flex items-center justify-center border border-border">
                    <span className="font-display text-2xl md:text-3xl font-bold text-gradient-gold">
                      {String(value).padStart(2, "0")}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground uppercase mt-2 block">{label}</span>
                </div>
              ))}
            </div>
            
            <Link to="/shop" className="btn-gold inline-flex items-center gap-2 group">
              Shop The Sale
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden animate-pulse-gold">
              <img src={image} alt={title} className="w-full h-[500px] object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default SpecialOffer;
