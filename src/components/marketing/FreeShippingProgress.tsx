import { Truck, Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface FreeShippingProgressProps {
  currentTotal: number;
  threshold?: number;
}

const FreeShippingProgress = ({ currentTotal, threshold = 5000 }: FreeShippingProgressProps) => {
  const remaining = Math.max(0, threshold - currentTotal);
  const progress = Math.min(100, (currentTotal / threshold) * 100);
  const qualified = remaining <= 0;

  return (
    <div className="bg-muted/50 rounded-xl p-4 border border-border">
      <div className="flex items-center gap-2 mb-2">
        <Truck className={`w-5 h-5 ${qualified ? "text-green-500" : "text-primary"}`} />
        {qualified ? (
          <span className="text-sm font-medium text-green-600 flex items-center gap-1">
            <Check className="w-4 h-4" /> ফ্রি শিপিং পাচ্ছেন! 🎉
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">
            আর <strong className="text-primary">৳{remaining.toLocaleString()}</strong> অর্ডার করলে <strong>ফ্রি শিপিং</strong>!
          </span>
        )}
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
};

export default FreeShippingProgress;
