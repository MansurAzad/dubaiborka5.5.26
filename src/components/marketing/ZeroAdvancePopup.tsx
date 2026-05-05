import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldCheck, Package, Banknote, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

interface ZeroAdvancePopupProps {
  sectionData?: {
    title: string | null;
    subtitle: string | null;
    content: string | null;
    image_url: string | null;
  };
}

const defaultFeatures = [
  {
    icon: Banknote,
    title: "সম্পূর্ণ ক্যাশ অন ডেলিভারি",
    desc: "পণ্য হাতে পেয়ে মূল্য পরিশোধ করুন",
    delay: 0.5,
  },
  {
    icon: Package,
    title: "যেমন দেখবেন, তেমন পাবেন",
    desc: "ইনশাআল্লাহ, ছবির সাথে হুবহু মিল",
    delay: 0.6,
  },
  {
    icon: ShieldCheck,
    title: "১০০% সন্তুষ্টির গ্যারান্টি",
    desc: "পছন্দ না হলে সহজ রিটার্ন পলিসি",
    delay: 0.7,
  },
];

const ZeroAdvancePopup = ({ sectionData }: ZeroAdvancePopupProps) => {
  const [show, setShow] = useState(false);

  const contentLines = sectionData?.content?.split("\n").map((line) => line.trim()).filter(Boolean) || [];
  const features = contentLines.length > 0
    ? contentLines.slice(0, 3).map((line, index) => ({
        ...defaultFeatures[index % defaultFeatures.length],
        title: line,
      }))
    : defaultFeatures;

  useEffect(() => {
    if (sessionStorage.getItem("zeroAdvanceShown")) return;

    const timer = setTimeout(() => {
      setShow(true);
      sessionStorage.setItem("zeroAdvanceShown", "true");
    }, 8000);

    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
        onClick={() => setShow(false)}
      >
        <motion.div
          initial={{ scale: 0.3, rotate: -10, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          exit={{ scale: 0.3, rotate: 10, opacity: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card border border-border rounded-3xl max-w-md w-full shadow-[0_30px_80px_hsl(var(--primary)/0.3)] overflow-hidden relative"
        >
          <button
            onClick={() => setShow(false)}
            className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-muted/50 backdrop-blur-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Top decorative band */}
          <div className="h-2 bg-gradient-to-r from-primary via-accent to-secondary" />

          {sectionData?.image_url && (
            <img
              src={sectionData.image_url}
              alt={sectionData.title || "Zero advance popup"}
              className="w-full h-44 object-cover"
              loading="lazy"
            />
          )}

          <div className="p-6 md:p-8">
            {/* Animated icon */}
            <motion.div
              initial={{ y: -30 }}
              animate={{ y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.2 }}
              className="flex justify-center mb-5"
            >
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <Banknote className="w-10 h-10 text-primary" />
                </div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-accent flex items-center justify-center"
                >
                  <span className="text-accent-foreground font-bold text-xs">৳০</span>
                </motion.div>
              </div>
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="font-display text-2xl md:text-3xl font-bold text-center mb-2"
            >
              <span className="text-gradient-gold">{sectionData?.title || "১ টাকাও অগ্রিম দিতে হবে না!"}</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center text-muted-foreground text-sm mb-6"
            >
              {sectionData?.subtitle || "আপনার পছন্দের বোরকা বা আবায়াটি নিশ্চিন্তে অর্ডার করুন"}
            </motion.p>

            {/* Feature cards */}
            <div className="space-y-3 mb-6">
              {features.map((item) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: item.delay, type: "spring", stiffness: 200 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">{item.title}</p>
                    {item.desc && <p className="text-xs text-muted-foreground">{item.desc}</p>}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Link
                to="/shop"
                onClick={() => setShow(false)}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold text-base hover:opacity-90 transition-opacity shadow-[0_8px_30px_hsl(var(--primary)/0.3)]"
              >
                <Sparkles className="w-5 h-5" />
                এখনই শপিং শুরু করুন
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>

            <button
              onClick={() => setShow(false)}
              className="w-full text-center text-xs text-muted-foreground mt-3 hover:text-foreground transition-colors"
            >
              পরে দেখবো
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ZeroAdvancePopup;
