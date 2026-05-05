import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { CheckCircle, ArrowRight } from "lucide-react";
import aboutShowroom from "@/assets/about-showroom.jpg";

const defaultFeatures = [
  "100% Authentic Dubai Imports",
  "Premium Quality Fabrics",
  "Handcrafted Embroidery",
  "Fast Nationwide Delivery",
  "Easy Returns & Exchanges",
  "Secure Payment Options",
];

interface AboutSectionProps {
  sectionData?: {
    title?: string | null;
    subtitle?: string | null;
    content?: string | null;
    image_url?: string | null;
  };
}

const AboutSection = ({ sectionData }: AboutSectionProps) => {
  const title = sectionData?.title || "Where Dubai Luxury Meets Bangladeshi Elegance";
  const subtitle = sectionData?.subtitle || "About Us";
  const description = sectionData?.content || "Dubai Borka House is Bangladesh's premier destination for authentic Dubai-imported fashion. We bring you the finest abayas, borkas, hijabs, and fabrics, carefully curated to blend international elegance with local sensibilities.";
  const image = sectionData?.image_url || aboutShowroom;

  return (
    <section className="py-20 bg-background overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden">
              <img src={image} alt="Dubai Borka House Showroom" className="w-full h-[500px] object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="absolute -bottom-6 -right-6 md:right-10 bg-card border border-border rounded-2xl p-6 shadow-elegant max-w-xs"
            >
              <div className="text-gradient-gold font-display text-4xl font-bold mb-2">15+</div>
              <div className="text-foreground font-medium">Years of Excellence</div>
              <div className="text-muted-foreground text-sm mt-1">Serving Bangladeshi fashion since 2009</div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="lg:pl-8"
          >
            <span className="text-primary text-sm uppercase tracking-widest font-medium">{subtitle}</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold mt-4 mb-6 text-foreground">
              {title}
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">{description}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {defaultFeatures.map((feature, index) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-foreground">{feature}</span>
                </motion.div>
              ))}
            </div>
            <Link to="/about" className="btn-gold inline-flex items-center gap-2 group">
              Learn More About Us
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
