import { useState } from "react";
import { Tag, Loader2, CheckCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  minimum_order_amount: number | null;
  current_uses?: number;
}

interface CouponInputProps {
  subtotal: number;
  appliedCoupon: Coupon | null;
  onApplyCoupon: (coupon: Coupon, discountAmount: number) => void;
  onRemoveCoupon: () => void;
}

const CouponInput = ({ subtotal, appliedCoupon, onApplyCoupon, onRemoveCoupon }: CouponInputProps) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const calculateDiscount = (coupon: Coupon): number => {
    if (coupon.discount_type === "percentage") {
      return Math.round((subtotal * coupon.discount_value) / 100);
    }
    return coupon.discount_value;
  };

  const handleApply = async () => {
    if (!code.trim()) {
      toast({
        title: "Enter a code",
        description: "Please enter a coupon code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", code.toUpperCase().trim())
        .eq("is_active", true)
        .limit(1);

      const coupon = data?.[0] ?? null;

      if (error || !coupon) {
        toast({
          title: "Coupon not found",
          description: "This code is invalid or has expired",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Check validity
      const now = new Date();
      if (coupon.valid_from && new Date(coupon.valid_from) > now) {
        toast({
          title: "Coupon not yet active",
          description: "This coupon is not available yet",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (coupon.valid_until && new Date(coupon.valid_until) < now) {
        toast({
          title: "Coupon expired",
          description: "This coupon has expired",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Check usage limit
      if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
        toast({
          title: "Coupon exhausted",
          description: "This coupon has reached its usage limit",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Check minimum order amount
      if (coupon.minimum_order_amount && subtotal < coupon.minimum_order_amount) {
        toast({
          title: "Minimum order required",
          description: `You need at least ৳${Number(coupon.minimum_order_amount).toLocaleString()} to use this coupon`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const discountAmount = calculateDiscount(coupon);
      onApplyCoupon(coupon, discountAmount);
      setCode("");

      toast({
        title: "Coupon applied! 🎉",
        description: `You saved ৳${discountAmount.toLocaleString()}`,
      });
    } catch (error) {
      console.error("Coupon error:", error);
      toast({
        title: "Something went wrong",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (appliedCoupon) {
    return (
      <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-primary" />
            <div>
              <span className="font-medium text-primary">{appliedCoupon.code}</span>
              <p className="text-xs text-muted-foreground">{appliedCoupon.description}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemoveCoupon}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Coupon code"
            className="pl-10 uppercase"
            onKeyDown={(e) => e.key === "Enter" && handleApply()}
          />
        </div>
        <Button onClick={handleApply} disabled={loading} variant="outline">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Enter your coupon code here
      </p>
    </div>
  );
};

export default CouponInput;
