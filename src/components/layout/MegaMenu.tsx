import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Sparkles, TrendingUp, Tag } from "lucide-react";
import productAbaya from "@/assets/product-abaya-1.jpg";
import productHijab from "@/assets/product-hijab-1.jpg";
import productBorka from "@/assets/product-borka-1.jpg";
import productKaftan from "@/assets/product-kaftan-1.jpg";
import productScarf from "@/assets/product-scarf-1.jpg";
import productFabric from "@/assets/product-fabric-1.jpg";

const categories = [
  { name: "Abayas", namebn: "আবায়া", image: productAbaya, desc: "প্রিমিয়াম দুবাই আবায়া", count: "50+" },
  { name: "Borkas", namebn: "বোরকা", image: productBorka, desc: "স্টাইলিশ বোরকা কালেকশন", count: "80+" },
  { name: "Hijabs", namebn: "হিজাব", image: productHijab, desc: "এলিগ্যান্ট হিজাব", count: "120+" },
  { name: "Kaftans", namebn: "কাফতান", image: productKaftan, desc: "লাক্সারি কাফতান", count: "30+" },
  { name: "Scarves", namebn: "স্কার্ফ", image: productScarf, desc: "সিল্ক ও শিফন স্কার্ফ", count: "60+" },
  { name: "Fabrics", namebn: "কাপড়", image: productFabric, desc: "প্রিমিয়াম ফেব্রিক", count: "40+" },
];

const quickFilters = [
  { label: "নতুন আগমন", icon: Sparkles, path: "/shop?sort=newest" },
  { label: "বেস্ট সেলার", icon: TrendingUp, path: "/shop?sort=newest" },
  { label: "সেল আইটেম", icon: Tag, path: "/shop" },
];

const MegaMenu = () => {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className="flex items-center gap-1 text-sm font-medium tracking-wide uppercase transition-colors text-foreground hover:text-primary"
        onClick={() => setOpen(!open)}
      >
        Shop
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="absolute left-1/2 -translate-x-1/2 top-full pt-4 z-50"
            style={{ width: "min(90vw, 800px)" }}
          >
            <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
              {/* Quick Filters */}
              <div className="flex items-center gap-4 px-6 pt-5 pb-3">
                {quickFilters.map((f) => (
                  <Link
                    key={f.label}
                    to={f.path}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-muted hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    <f.icon className="w-3.5 h-3.5" />
                    {f.label}
                  </Link>
                ))}
              </div>

              {/* Categories Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1 p-4">
                {categories.map((cat) => (
                  <Link
                    key={cat.name}
                    to={`/shop?category=${cat.name}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors group"
                  >
                    <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border border-border">
                      <img
                        src={cat.image}
                        alt={cat.namebn}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {cat.namebn}
                      </h4>
                      <p className="text-xs text-muted-foreground truncate">{cat.desc}</p>
                      <span className="text-xs text-primary font-medium">{cat.count} পণ্য</span>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-between">
                <Link
                  to="/shop"
                  onClick={() => setOpen(false)}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  সব পণ্য দেখুন →
                </Link>
                <Link
                  to="/categories"
                  onClick={() => setOpen(false)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  সব ক্যাটাগরি
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MegaMenu;
