import { useState, useEffect, useCallback } from "react";
import { X, Gift, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ExitIntentPopupProps {
  sectionData?: {
    title: string | null;
    subtitle: string | null;
    content: string | null;
    image_url: string | null;
  };
}

interface PopupCoupon {
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  current_uses: number;
  max_uses: number | null;
  valid_from: string | null;
  valid_until: string | null;
}

const ExitIntentPopup = ({ sectionData }: ExitIntentPopupProps) => {
  const [show, setShow] = useState(false);
  const [activeCoupon, setActiveCoupon] = useState<PopupCoupon | null>(null);

  useEffect(() => {
    const fetchActiveCoupon = async () => {
      const { data } = await supabase
        .from("coupons")
        .select("code, description, discount_type, discount_value, current_uses, max_uses, valid_from, valid_until")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(10);

      const now = new Date();
      const validCoupon = (data || []).find((coupon) => {
        const startsOk = !coupon.valid_from || new Date(coupon.valid_from) <= now;
        const endsOk = !coupon.valid_until || new Date(coupon.valid_until) >= now;
        const usesOk = !coupon.max_uses || coupon.current_uses < coupon.max_uses;
        return startsOk && endsOk && usesOk;
      });

      setActiveCoupon(validCoupon || null);
    };

    void fetchActiveCoupon();
  }, []);

  const couponLabel = activeCoupon
    ? activeCoupon.description || (activeCoupon.discount_type === "percentage"
      ? `${activeCoupon.discount_value}% ছাড়`
      : `৳${activeCoupon.discount_value} ছাড়`)
    : null;
  const popupTitle = sectionData?.title || "🎁 যাচ্ছেন? একটু দাঁড়ান!";
  const popupSubtitle = sectionData?.subtitle || couponLabel || "আজকের স্পেশাল অফারটি দেখুন";
  const popupContent = sectionData?.content || (activeCoupon ? "এই কোডটি চেকআউটে ব্যবহার করুন" : "এখনই শপিং করলে বিশেষ অফার পাবেন");

  const handleMouseLeave = useCallback((e: MouseEvent) => {
    if (e.clientY <= 0 && !sessionStorage.getItem("exitPopupShown")) {
      setShow(true);
      sessionStorage.setItem("exitPopupShown", "true");
    }
  }, []);

  useEffect(() => {
    // Only show on desktop
    if (window.innerWidth < 768) return;
    
    const timer = setTimeout(() => {
      document.addEventListener("mouseleave", handleMouseLeave);
    }, 5000); // Wait 5s before enabling

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [handleMouseLeave]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          onClick={() => setShow(false)}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-2xl p-8 max-w-md w-full shadow-elegant text-center relative"
          >
            <button
              onClick={() => setShow(false)}
              className="absolute top-4 right-4 p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            {sectionData?.image_url && (
              <img
                src={sectionData.image_url}
                alt={popupTitle}
                className="w-full h-40 object-cover rounded-xl mb-6"
                loading="lazy"
              />
            )}

            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Gift className="w-10 h-10 text-primary" />
            </div>

            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              {popupTitle}
            </h2>
            <p className="text-muted-foreground mb-6">
              <strong className="text-primary">{popupSubtitle}</strong>
              <span className="block mt-2">{popupContent}</span>
            </p>

            <div className="bg-muted rounded-xl py-4 px-6 mb-6">
              {activeCoupon ? (
                <>
                  {couponLabel && <p className="text-sm text-muted-foreground mb-2">{couponLabel}</p>}
                  <span className="font-display text-2xl font-bold text-gradient-gold tracking-widest">
                    {activeCoupon.code}
                  </span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">বর্তমানে যে কুপনটি অ্যাক্টিভ আছে সেটিই এখানে দেখানো হবে</span>
              )}
            </div>

            <Link
              to="/shop"
              onClick={() => setShow(false)}
              className="btn-gold w-full flex items-center justify-center gap-2"
            >
              এখনই শপিং করুন
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={() => setShow(false)}
              className="text-sm text-muted-foreground mt-4 hover:text-foreground transition-colors"
            >
              না, ধন্যবাদ
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ExitIntentPopup;
