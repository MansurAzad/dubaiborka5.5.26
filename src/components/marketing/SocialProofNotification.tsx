import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, MapPin } from "lucide-react";
import { useSocialProofMessages, type SocialProofItem } from "@/hooks/useCachedData";

type NotificationData = SocialProofItem;

const SocialProofNotification = () => {
  const [visible, setVisible] = useState(false);
  const [notification, setNotification] = useState<NotificationData | null>(null);
  const { data: items = [] } = useSocialProofMessages();

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
