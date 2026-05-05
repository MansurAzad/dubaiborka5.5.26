import { useState } from "react";
import { Bell, BellRing } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BackInStockAlertProps {
  productName: string;
  productId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BackInStockAlert = ({ productName, productId, open, onOpenChange }: BackInStockAlertProps) => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from("back_in_stock_alerts")
        .insert({ product_id: productId, email });

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: "অ্যালার্ট সেট করা হয়েছে!",
        description: `${productName} স্টকে এলে আপনাকে ইমেইলে জানানো হবে।`,
      });
    } catch (err: any) {
      console.error("Back in stock alert error:", err);
      toast({
        title: "সমস্যা হয়েছে",
        description: err.message || "আবার চেষ্টা করুন।",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setSubmitted(false); }}>
      <DialogContent className="max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-lg text-foreground flex items-center gap-2">
            <BellRing className="w-5 h-5 text-primary" />
            স্টক অ্যালার্ট
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            {productName} স্টকে ফিরে এলে ইমেইলে জানানো হবে
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="text-center py-6">
            <Bell className="w-12 h-12 text-primary mx-auto mb-3" />
            <p className="text-foreground font-medium">সফলভাবে সাবস্ক্রাইব করা হয়েছে!</p>
            <p className="text-sm text-muted-foreground mt-1">
              পণ্যটি স্টকে আসলে আপনাকে ইমেইলে জানানো হবে।
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <Input
              type="email"
              placeholder="আপনার ইমেইল দিন"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-input border-border"
            />
            <Button type="submit" className="btn-gold w-full h-10" disabled={loading}>
              <Bell className="w-4 h-4 mr-2" />
              {loading ? "সাবমিট হচ্ছে..." : "অ্যালার্ট সেট করুন"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BackInStockAlert;
