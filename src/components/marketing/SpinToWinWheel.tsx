import { useState, useEffect, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, Copy, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PopupSectionData {
  title: string | null;
  subtitle: string | null;
  content: string | null;
  image_url: string | null;
}

interface Segment {
  label: string;
  code: string;
  color: string;
}

const FALLBACK_SEGMENTS: Segment[] = [
  { label: "৫% ছাড়", code: "SPIN5", color: "hsl(var(--primary))" },
  { label: "ফ্রি শিপিং", code: "FREESHIP", color: "hsl(var(--secondary))" },
  { label: "১০% ছাড়", code: "SPIN10", color: "hsl(var(--accent))" },
  { label: "পরে চেষ্টা করুন", code: "", color: "hsl(var(--muted))" },
  { label: "১৫% ছাড়", code: "SPIN15", color: "hsl(var(--primary))" },
  { label: "৳২০০ ছাড়", code: "SPIN200", color: "hsl(var(--secondary))" },
];

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--accent))",
  "hsl(var(--muted))",
];

const SpinToWinWheel = forwardRef<HTMLDivElement, { sectionData?: PopupSectionData }>(({ sectionData }, ref) => {
  const [showWheel, setShowWheel] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Segment | null>(null);
  const [rotation, setRotation] = useState(0);
  const [copied, setCopied] = useState(false);
  const [hasSpun, setHasSpun] = useState(() => localStorage.getItem("spinUsed") === "true");
  const [segments, setSegments] = useState<Segment[]>(FALLBACK_SEGMENTS);
  const [loading, setLoading] = useState(true);

  // Only fetch coupons when wheel is opened, not on mount
  useEffect(() => {
    if (!showWheel || segments !== FALLBACK_SEGMENTS) return;
    const fetchCoupons = async () => {
      const { data } = await supabase
        .from("coupons")
        .select("code, discount_type, discount_value, description, valid_from, valid_until, current_uses, max_uses")
        .eq("is_active", true)
        .limit(10);

      const now = new Date();
      const eligibleCoupons = (data || []).filter((coupon) => {
        const startsOk = !coupon.valid_from || new Date(coupon.valid_from) <= now;
        const endsOk = !coupon.valid_until || new Date(coupon.valid_until) >= now;
        const usesOk = !coupon.max_uses || coupon.current_uses < coupon.max_uses;
        return startsOk && endsOk && usesOk;
      }).slice(0, 5);

      if (eligibleCoupons.length > 0) {
        const dbSegments: Segment[] = eligibleCoupons.map((c, i) => ({
          label: c.description || (c.discount_type === "percentage" ? `${c.discount_value}% ছাড়` : `৳${c.discount_value} ছাড়`),
          code: c.code,
          color: COLORS[i % COLORS.length],
        }));
        dbSegments.push({ label: "পরে চেষ্টা করুন", code: "", color: "hsl(var(--muted))" });
        setSegments(dbSegments);
      }
      setLoading(false);
    };
    fetchCoupons();
  }, [showWheel]);

  const spin = () => {
    if (spinning || hasSpun) return;
    setSpinning(true);

    const winIndex = Math.random() < 0.15
      ? segments.length - 1 // "try again" is last
      : Math.floor(Math.random() * (segments.length - 1));
    const segmentAngle = 360 / segments.length;
    const targetAngle = 360 * 5 + (360 - winIndex * segmentAngle - segmentAngle / 2);

    setRotation(targetAngle);

    setTimeout(() => {
      setResult(segments[winIndex]);
      setSpinning(false);
      setHasSpun(true);
      localStorage.setItem("spinUsed", "true");
    }, 4000);
  };

  const copyCode = () => {
    if (result?.code) {
      navigator.clipboard.writeText(result.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (hasSpun && !showWheel) return null;

  return (
    <>
      {!hasSpun && !showWheel && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 10, type: "spring" }}
          onClick={() => setShowWheel(true)}
          className="fixed right-4 bottom-24 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-110 transition-transform sm:bottom-40"
        >
          <Gift className="w-6 h-6" />
        </motion.button>
      )}

      <AnimatePresence>
        {showWheel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
            onClick={() => !spinning && setShowWheel(false)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full text-center relative"
            >
              <button
                onClick={() => setShowWheel(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                disabled={spinning}
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="font-display text-xl font-bold text-foreground mb-2">{sectionData?.title || "🎰 ভাগ্য ঘোরান!"}</h2>
              <p className="text-sm text-muted-foreground mb-4">{sectionData?.subtitle || "চাকা ঘুরিয়ে লাইভ কুপন জিতুন!"}</p>
              {sectionData?.content && (
                <p className="text-xs text-muted-foreground mb-4">{sectionData.content}</p>
              )}

              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <div className="relative w-64 h-64 mx-auto mb-6">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary" />

                    <motion.div
                      animate={{ rotate: rotation }}
                      transition={{ duration: 4, ease: [0.17, 0.67, 0.12, 0.99] }}
                      className="w-full h-full rounded-full border-4 border-primary overflow-hidden relative"
                      style={{
                        background: `conic-gradient(${segments.map((s, i) =>
                          `${s.color} ${(i / segments.length) * 100}% ${((i + 1) / segments.length) * 100}%`
                        ).join(", ")})`
                      }}
                    >
                      {segments.map((seg, i) => {
                        const angle = (i * 360) / segments.length + 360 / segments.length / 2;
                        return (
                          <div
                            key={i}
                            className="absolute top-1/2 left-1/2 origin-center text-[10px] font-bold text-white whitespace-nowrap"
                            style={{
                              transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-70px)`,
                            }}
                          >
                            {seg.label}
                          </div>
                        );
                      })}
                    </motion.div>
                  </div>

                  {result ? (
                    <div className="space-y-3">
                      {result.code ? (
                        <>
                          <p className="text-lg font-semibold text-foreground">🎉 অভিনন্দন! আপনি পেয়েছেন:</p>
                          <p className="text-2xl font-bold text-gradient-gold">{result.label}</p>
                          <div className="flex items-center justify-center gap-2 bg-muted rounded-lg py-3 px-4">
                            <span className="font-mono text-lg font-bold">{result.code}</span>
                            <button onClick={copyCode} className="p-1 hover:text-primary">
                              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </>
                      ) : (
                        <p className="text-lg text-muted-foreground">😅 এবার হয়নি! পরবর্তীতে আবার চেষ্টা করুন।</p>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={spin}
                      disabled={spinning}
                      className="btn-gold w-full !py-3"
                    >
                      {spinning ? "ঘুরছে..." : "চাকা ঘোরান! 🎯"}
                    </button>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});
SpinToWinWheel.displayName = "SpinToWinWheel";

export default SpinToWinWheel;
