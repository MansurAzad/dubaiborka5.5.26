import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, X, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const FloatingTrustBadge = () => {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="fixed bottom-24 left-4 z-50 md:bottom-8 md:left-8">
      <AnimatePresence mode="wait">
        {!expanded ? (
          <motion.button
            key="badge"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            onClick={() => setExpanded(true)}
            className="relative w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-primary to-accent shadow-[0_0_30px_hsl(var(--primary)/0.4)] flex items-center justify-center group"
          >
            <ShieldCheck className="w-7 h-7 md:w-8 md:h-8 text-primary-foreground" />
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-30" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full border-2 border-background" />
          </motion.button>
        ) : (
          <motion.div
            key="card"
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-72 md:w-80 bg-card border border-border rounded-2xl shadow-[0_20px_60px_hsl(var(--primary)/0.2)] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary/20 to-accent/20 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <span className="font-display text-sm font-bold text-primary">১০০% গ্যারান্টি</span>
              </div>
              <button onClick={() => setDismissed(true)} className="p-1 hover:bg-muted rounded-full transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-start gap-3"
              >
                <span className="text-2xl">💰</span>
                <div>
                  <p className="font-semibold text-sm text-foreground">১ টাকাও অগ্রিম নয়!</p>
                  <p className="text-xs text-muted-foreground">পণ্য হাতে পেয়ে টাকা দিন</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-start gap-3"
              >
                <span className="text-2xl">📦</span>
                <div>
                  <p className="font-semibold text-sm text-foreground">যা দেখবেন তাই পাবেন</p>
                  <p className="text-xs text-muted-foreground">ইনশাআল্লাহ, হুবহু একই পণ্য</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-start gap-3"
              >
                <span className="text-2xl">🔄</span>
                <div>
                  <p className="font-semibold text-sm text-foreground">ইজি রিটার্ন পলিসি</p>
                  <p className="text-xs text-muted-foreground">সমস্যা হলে ফেরত দিন</p>
                </div>
              </motion.div>

              <Link
                to="/shop"
                onClick={() => setDismissed(true)}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                এখনই অর্ডার করুন
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FloatingTrustBadge;
