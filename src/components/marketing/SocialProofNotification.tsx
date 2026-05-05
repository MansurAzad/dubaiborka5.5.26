import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface NotificationData {
  product_name: string;
  city: string;
  time_ago: string;
  message: string;
}

const SocialProofNotification = () => {
  const [visible, setVisible] = useState(false);
  const [notification, setNotification] = useState<NotificationData | null>(null);
  const [items, setItems] = useState<NotificationData[]>([]);

  useEffect(() => {
    const fetchMessages = async () => {
      // First try custom messages from admin
      const { data: custom } = await supabase
        .from("social_proof_messages")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (custom && custom.length > 0) {
        setItems(custom.map((m: any) => ({
          product_name: m.product_name,
          city: m.city,
          time_ago: m.time_ago,
          message: m.message,
        })));
        return;
      }

      // Fallback to real orders
      const { data } = await supabase
        .from("orders")
        .select("shipping_city, created_at, order_items(product_name)")
        .order("created_at", { ascending: false })
        .limit(20);

      if (data && data.length > 0) {
        const mapped = data
          .filter((o: any) => o.order_items?.length > 0)
          .map((o: any) => {
            const mins = Math.floor((Date.now() - new Date(o.created_at).getTime()) / 60000);
            const time_ago = mins < 60 ? `${mins} মিনিট আগে` : mins < 1440 ? `${Math.floor(mins / 60)} ঘণ্টা আগে` : `${Math.floor(mins / 1440)} দিন আগে`;
            return {
              product_name: o.order_items[0].product_name,
              city: o.shipping_city,
              time_ago,
              message: "কেউ একজন {product} কিনেছেন!",
            };
          });
        setItems(mapped);
      }
    };
    fetchMessages();
  }, []);

  useEffect(() => {
    if (items.length === 0) return;

    let hideTimer: ReturnType<typeof setTimeout>;
    const indexRef = { current: 0 };

    const show = () => {
      setNotification(items[indexRef.current % items.length]);
      indexRef.current += 1;
      setVisible(true);
      hideTimer = setTimeout(() => setVisible(false), 5000);
    };

    const firstTimer = setTimeout(show, 15000);
    const interval = setInterval(show, 45000);

    return () => {
      clearTimeout(firstTimer);
      clearTimeout(hideTimer);
      clearInterval(interval);
    };
  }, [items]);

  const renderMessage = (msg: string, productName: string) => {
    const parts = msg.split("{product}");
    if (parts.length === 1) return <>{msg}</>;
    return (
      <>
        {parts[0]}<strong className="text-primary">{productName}</strong>{parts[1]}
      </>
    );
  };

  return (
    <AnimatePresence>
      {visible && notification && (
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -100, opacity: 0 }}
          className="fixed bottom-24 left-4 z-50 bg-card border border-border rounded-xl p-4 shadow-elegant max-w-xs"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-foreground">
                {renderMessage(notification.message, notification.product_name)}
              </p>
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>{notification.city}</span>
                <span>• {notification.time_ago}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SocialProofNotification;
