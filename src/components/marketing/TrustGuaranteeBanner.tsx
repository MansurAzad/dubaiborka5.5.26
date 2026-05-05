import { motion } from "framer-motion";
import { ShieldCheck, Package, Banknote, Truck } from "lucide-react";

const guarantees = [
  {
    icon: Banknote,
    title: "১ টাকাও অগ্রিম নয়",
    desc: "পণ্য হাতে পেয়ে মূল্য দিন",
    emoji: "💰",
  },
  {
    icon: Package,
    title: "যা দেখবেন তাই পাবেন",
    desc: "ইনশাআল্লাহ হুবহু একই পণ্য",
    emoji: "📦",
  },
  {
    icon: ShieldCheck,
    title: "১০০% অরিজিনাল",
    desc: "দুবাই থেকে সরাসরি আমদানি",
    emoji: "✅",
  },
  {
    icon: Truck,
    title: "দ্রুত ডেলিভারি",
    desc: "সারাদেশে হোম ডেলিভারি",
    emoji: "🚚",
  },
];

const TrustGuaranteeBanner = () => {
  return (
    <section className="relative py-10 md:py-14 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full blur-[100px]" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8 md:mb-10"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary font-medium mb-3">
            <ShieldCheck className="w-4 h-4" />
            আমাদের প্রতিশ্রুতি
          </span>
          <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
            নিশ্চিন্তে অর্ডার করুন, <span className="text-gradient-gold">ঝুঁকি শূন্য!</span>
          </h2>
        </motion.div>

        {/* Cards grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
          {guarantees.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, type: "spring", stiffness: 200, damping: 20 }}
              whileHover={{ y: -5, scale: 1.03 }}
              className="group relative bg-card border border-border rounded-2xl p-4 md:p-6 text-center hover:border-primary/40 transition-colors hover:shadow-[0_15px_40px_hsl(var(--primary)/0.15)]"
            >
              {/* Glow on hover */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="relative z-10">
                <motion.div
                  whileHover={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.5 }}
                  className="w-12 h-12 md:w-14 md:h-14 mx-auto rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center mb-3"
                >
                  <item.icon className="w-6 h-6 md:w-7 md:h-7 text-primary" />
                </motion.div>

                <h3 className="font-display text-sm md:text-base font-bold text-foreground mb-1">
                  {item.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom highlight bar */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          whileInView={{ opacity: 1, scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-8 md:mt-10 mx-auto max-w-2xl"
        >
          <div className="flex items-center justify-center gap-3 py-3 px-5 rounded-xl bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20">
            <span className="text-xl">🎉</span>
            <p className="text-sm md:text-base text-foreground font-medium text-center">
              আজই অর্ডার করুন — <span className="text-primary font-bold">কোনো অগ্রিম ছাড়াই!</span>
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TrustGuaranteeBanner;
