import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Flame, Zap } from "lucide-react";
import { Link } from "react-router-dom";

interface FlashSaleTimerProps {
  variant?: "banner" | "card";
  endTime?: Date;
}

const FlashSaleTimer = ({ variant = "banner", endTime }: FlashSaleTimerProps) => {
  const defaultEnd = new Date();
  defaultEnd.setHours(defaultEnd.getHours() + 6);
  const saleEnd = endTime || defaultEnd;

  const [timeLeft, setTimeLeft] = useState(getTimeLeft(saleEnd));

  function getTimeLeft(end: Date) {
    const diff = Math.max(0, end.getTime() - Date.now());
    return {
      hours: Math.floor(diff / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    };
  }

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(getTimeLeft(saleEnd)), 1000);
    return () => clearInterval(timer);
  }, []);

  const isExpired = timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;
  if (isExpired) return null;

  if (variant === "card") {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <Zap className="w-3 h-3 text-secondary fill-secondary" />
        <span className="text-secondary font-semibold">
          {String(timeLeft.hours).padStart(2, "0")}:{String(timeLeft.minutes).padStart(2, "0")}:{String(timeLeft.seconds).padStart(2, "0")}
        </span>
      </div>
    );
  }

  return (
    <section className="py-8 bg-gradient-to-r from-secondary/20 via-primary/10 to-secondary/20 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Ccircle%20cx%3D%221%22%20cy%3D%221%22%20r%3D%221%22%20fill%3D%22rgba(200%2C150%2C50%2C0.1)%22%2F%3E%3C%2Fsvg%3E')] opacity-50" />
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row items-center justify-center gap-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
              <Flame className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <h3 className="font-display text-2xl font-bold text-foreground">⚡ Flash Sale!</h3>
              <p className="text-muted-foreground text-sm">Up to 30% off for a limited time!</p>
            </div>
          </div>

          <div className="flex gap-3">
            {[
              { label: "Hours", value: timeLeft.hours },
              { label: "Minutes", value: timeLeft.minutes },
              { label: "Seconds", value: timeLeft.seconds },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <motion.div
                  key={item.value}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="w-16 h-16 rounded-xl bg-card border border-border flex items-center justify-center shadow-lg"
                >
                  <span className="font-display text-2xl font-bold text-gradient-gold">
                    {String(item.value).padStart(2, "0")}
                  </span>
                </motion.div>
                <span className="text-xs text-muted-foreground mt-1 block">{item.label}</span>
              </div>
            ))}
          </div>

          <Link to="/shop?sale=true" className="btn-gold !py-3 !px-8 animate-pulse">
            Shop Now →
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default FlashSaleTimer;
