import { Shield, Truck, RotateCcw, Headphones, CreditCard, Award } from "lucide-react";

const badges = [
  { icon: Shield, title: "100% Authentic", desc: "Every product is imported directly from Dubai" },
  { icon: Truck, title: "Nationwide Delivery", desc: "Fast delivery inside and outside Dhaka" },
  { icon: RotateCcw, title: "Easy Returns", desc: "Hassle-free 7-day return policy" },
  { icon: Headphones, title: "24/7 Support", desc: "Always available via phone & WhatsApp" },
  { icon: CreditCard, title: "Secure Payment", desc: "bKash, Nagad & Cash on Delivery" },
  { icon: Award, title: "Premium Quality", desc: "Finest fabrics & elegant designs" },
];

const TrustBadges = () => {
  return (
    <section className="py-12 md:py-16 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">Our Promise</h2>
          <p className="text-muted-foreground mt-2">Your trust is our greatest achievement</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {badges.map((badge) => (
            <div
              key={badge.title}
              className="flex flex-col items-center text-center p-4 rounded-xl bg-card border border-border hover:shadow-md hover:border-primary/30 transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <badge.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">{badge.title}</h3>
              <p className="text-xs text-muted-foreground leading-tight">{badge.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustBadges;
