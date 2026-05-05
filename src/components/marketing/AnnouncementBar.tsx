import { useState } from "react";
import { X, Truck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const AnnouncementBar = () => {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="bg-primary text-primary-foreground relative z-[60]"
      >
        <div className="container mx-auto px-4 py-2 flex items-center justify-center gap-3 text-sm">
          <Sparkles className="w-4 h-4 hidden sm:block" />
          <span className="font-medium text-center">
            🎉 ৳৫,০০০+ অর্ডারে <strong>ফ্রি শিপিং</strong>! কোড ব্যবহার করুন: <strong>DUBAI10</strong> — ১০% ছাড়!
          </span>
          <Link to="/shop" className="hidden sm:inline-flex items-center gap-1 underline font-semibold hover:opacity-80">
            Shop Now
          </Link>
          <button
            onClick={() => setVisible(false)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:opacity-70 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AnnouncementBar;
