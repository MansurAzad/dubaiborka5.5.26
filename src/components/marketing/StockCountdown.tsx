import { AlertTriangle, Flame } from "lucide-react";
import { motion } from "framer-motion";

interface StockCountdownProps {
  stock: number | null;
}

const StockCountdown = ({ stock }: StockCountdownProps) => {
  if (stock === null || stock === undefined || stock > 10 || stock <= 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2"
    >
      {stock <= 3 ? (
        <Flame className="w-4 h-4 text-destructive animate-pulse" />
      ) : (
        <AlertTriangle className="w-4 h-4 text-orange-500" />
      )}
      <span className={`text-sm font-medium ${stock <= 3 ? "text-destructive" : "text-orange-600"}`}>
        {stock <= 3
          ? `⚡ মাত্র ${stock}টি বাকি! দ্রুত অর্ডার করুন!`
          : `⏳ মাত্র ${stock}টি স্টকে আছে!`}
      </span>
    </motion.div>
  );
};

export default StockCountdown;
