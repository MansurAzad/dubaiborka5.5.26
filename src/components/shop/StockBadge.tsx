import { Package, AlertTriangle, XCircle } from "lucide-react";

interface StockBadgeProps {
  stock: number | null | undefined;
  className?: string;
  compact?: boolean;
}

const StockBadge = ({ stock, className = "", compact = false }: StockBadgeProps) => {
  if (stock === null || stock === undefined) return null;

  if (stock <= 0) {
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] md:text-xs font-medium bg-destructive/15 text-destructive ${className}`}>
        <XCircle className="w-3 h-3" />
        {!compact && "Out of Stock"}
        {compact && "স্টক নেই"}
      </span>
    );
  }

  if (stock <= 5) {
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] md:text-xs font-medium bg-orange-500/15 text-orange-600 dark:text-orange-400 ${className}`}>
        <AlertTriangle className="w-3 h-3" />
        {!compact && `Only ${stock} left`}
        {compact && `মাত্র ${stock}টি`}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] md:text-xs font-medium bg-green-500/15 text-green-600 dark:text-green-400 ${className}`}>
      <Package className="w-3 h-3" />
      {!compact && "In Stock"}
      {compact && "স্টকে আছে"}
    </span>
  );
};

export default StockBadge;
