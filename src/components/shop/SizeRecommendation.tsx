import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";

interface SizeRecommendationProps {
  productCategory?: string;
}

const SizeRecommendation = ({ productCategory }: SizeRecommendationProps) => {
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleRecommend = async () => {
    if (!height || !weight) return;
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("size-recommendation", {
        body: {
          height: parseFloat(height),
          weight: parseFloat(weight),
          category: productCategory || "Abaya",
        },
      });

      if (error) throw error;
      setResult(data?.recommendation || "সাইজ সাজেশন পাওয়া যায়নি।");
    } catch (err) {
      console.error("Size recommendation error:", err);
      setResult("দুঃখিত, সাইজ সাজেশন দিতে সমস্যা হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 text-sm text-primary hover:underline">
          <Sparkles className="w-4 h-4" />
          AI সাইজ সাজেশন
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI সাইজ রেকমেন্ডেশন
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            আপনার উচ্চতা ও ওজন দিন, আমরা সেরা সাইজ সাজেস্ট করবো
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="height">উচ্চতা (ফুট.ইঞ্চি)</Label>
              <Input
                id="height"
                placeholder="যেমন: 5.4"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                type="number"
                step="0.1"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="weight">ওজন (কেজি)</Label>
              <Input
                id="weight"
                placeholder="যেমন: 65"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                type="number"
                className="mt-1.5"
              />
            </div>
          </div>

          <Button
            onClick={handleRecommend}
            disabled={loading || !height || !weight}
            className="w-full btn-gold"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                বিশ্লেষণ করছি...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                সাইজ সাজেস্ট করুন
              </>
            )}
          </Button>

          {result && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm text-foreground whitespace-pre-line">{result}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SizeRecommendation;
