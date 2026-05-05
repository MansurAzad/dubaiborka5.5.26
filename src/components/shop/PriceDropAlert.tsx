import { useState, useEffect } from "react";
import { BellRing, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface PriceDropAlertProps {
  productId: string;
  currentPrice: number;
}

const PriceDropAlert = ({ productId, currentPrice }: PriceDropAlertProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const { data } = await supabase
        .from("price_drop_alerts")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .maybeSingle();
      setSubscribed(!!data);
    };
    check();
  }, [user, productId]);

  const handleToggle = async () => {
    if (!user) {
      toast({ title: "লগইন করুন", description: "প্রাইস অ্যালার্ট পেতে লগইন করুন", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      if (subscribed) {
        await supabase
          .from("price_drop_alerts")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);
        setSubscribed(false);
        toast({ title: "অ্যালার্ট বাতিল হয়েছে" });
      } else {
        await supabase
          .from("price_drop_alerts")
          .insert({ user_id: user.id, product_id: productId, target_price: currentPrice });
        setSubscribed(true);
        toast({ title: "অ্যালার্ট সেট হয়েছে!", description: "দাম কমলে আপনাকে জানানো হবে" });
      }
    } catch {
      toast({ title: "সমস্যা হয়েছে", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className={subscribed ? "text-primary border-primary" : ""}
    >
      {subscribed ? <Check className="w-4 h-4 mr-1.5" /> : <BellRing className="w-4 h-4 mr-1.5" />}
      {subscribed ? "অ্যালার্ট সেট আছে" : "দাম কমলে জানান"}
    </Button>
  );
};

export default PriceDropAlert;
