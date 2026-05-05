import { useState, useEffect } from "react";
import { Gift, Copy, Check, Star, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface RewardPoint {
  id: string;
  points: number;
  type: string;
  description: string | null;
  created_at: string;
}

const RewardsReferral = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [points, setPoints] = useState<RewardPoint[]>([]);
  const [referralCode, setReferralCode] = useState("");
  const [referralCount, setReferralCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const totalPoints = points.reduce((sum, p) => sum + p.points, 0);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Fetch reward points
      const { data: pointsData } = await supabase
        .from("reward_points")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setPoints(pointsData || []);

      // Fetch profile referral code
      const { data: profile } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("user_id", user.id)
        .maybeSingle();

      setReferralCode(profile?.referral_code || "");

      // Count successful referrals
      const { count } = await supabase
        .from("referrals")
        .select("*", { count: "exact", head: true })
        .eq("referrer_id", user.id)
        .eq("is_used", true);

      setReferralCount(count || 0);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const handleCopy = () => {
    const link = `${window.location.origin}/auth?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast({ title: "কপি হয়েছে!", description: "রেফারেল লিংক কপি হয়েছে" });
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="space-y-4 animate-pulse">
      {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-lg" />)}
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Points Summary */}
      <div className="card-luxury bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Star className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">আপনার পয়েন্ট</p>
            <p className="font-display text-3xl font-bold text-gradient-gold">{totalPoints}</p>
            <p className="text-xs text-muted-foreground">প্রতি ১০০ পয়েন্ট = ৳১০ ডিসকাউন্ট</p>
          </div>
        </div>
      </div>

      {/* Referral Section */}
      <div className="card-luxury">
        <div className="flex items-center gap-3 mb-4">
          <Gift className="w-6 h-6 text-primary" />
          <h3 className="font-display text-lg font-semibold">রেফারেল প্রোগ্রাম</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          বন্ধুদের শেয়ার করুন, দুজনেই পাবেন ১০% ডিসকাউন্ট!
        </p>

        <div className="flex gap-2 mb-4">
          <Input
            readOnly
            value={`${window.location.origin}/auth?ref=${referralCode}`}
            className="font-mono text-sm"
          />
          <Button variant="outline" onClick={handleCopy} className="shrink-0">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{referralCount}</span> জন আপনার কোড ব্যবহার করেছে
        </div>
      </div>

      {/* Points History */}
      <div className="card-luxury">
        <h3 className="font-display text-lg font-semibold mb-4">পয়েন্ট হিস্ট্রি</h3>
        {points.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">কোনো পয়েন্ট নেই এখনো</p>
        ) : (
          <div className="space-y-3">
            {points.slice(0, 10).map((point) => (
              <div key={point.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{point.description || point.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(point.created_at).toLocaleDateString("bn-BD")}
                  </p>
                </div>
                <span className={`font-mono font-semibold ${point.points > 0 ? "text-green-600" : "text-red-600"}`}>
                  {point.points > 0 ? "+" : ""}{point.points}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RewardsReferral;
