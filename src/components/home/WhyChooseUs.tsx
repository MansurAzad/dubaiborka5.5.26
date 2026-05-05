 import { motion } from "framer-motion";
 import { Truck, Shield, RefreshCw, Headphones, Award, CreditCard } from "lucide-react";
 
 const features = [
   {
     icon: Truck,
     title: "Fast Delivery",
     description: "Nationwide delivery within 3-5 business days. Express shipping available.",
   },
   {
     icon: Shield,
     title: "100% Authentic",
     description: "Guaranteed authentic Dubai imports with quality certification.",
   },
   {
     icon: RefreshCw,
     title: "Easy Returns",
     description: "7-day hassle-free returns and exchanges on all products.",
   },
   {
     icon: Headphones,
     title: "24/7 Support",
     description: "Our customer service team is always ready to help you.",
   },
   {
     icon: Award,
     title: "Premium Quality",
     description: "Only the finest fabrics and craftsmanship in every piece.",
   },
   {
     icon: CreditCard,
     title: "Secure Payment",
     description: "Multiple secure payment options including bKash, Nagad & more.",
   },
 ];
 
 const WhyChooseUs = () => {
   return (
     <section className="py-20 bg-card">
       <div className="container mx-auto px-4">
         {/* Section Header */}
         <motion.div
           initial={{ opacity: 0, y: 30 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           transition={{ duration: 0.6 }}
           className="text-center mb-16"
         >
           <span className="text-primary text-sm uppercase tracking-widest font-medium">
             Why Choose Us
           </span>
           <h2 className="font-display text-4xl md:text-5xl font-bold mt-4 mb-6">
             <span className="text-foreground">The </span>
             <span className="text-gradient-gold">Dubai Borka House</span>
             <span className="text-foreground"> Difference</span>
           </h2>
           <div className="section-divider" />
         </motion.div>
 
         {/* Features Grid */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {features.map((feature, index) => (
             <motion.div
               key={feature.title}
               initial={{ opacity: 0, y: 30 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ duration: 0.6, delay: index * 0.1 }}
               className="card-luxury text-center group"
             >
               <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center group-hover:from-primary group-hover:to-accent transition-all duration-500">
                 <feature.icon className="w-8 h-8 text-primary group-hover:text-primary-foreground transition-colors duration-500" />
               </div>
               <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                 {feature.title}
               </h3>
               <p className="text-muted-foreground leading-relaxed">
                 {feature.description}
               </p>
             </motion.div>
           ))}
         </div>
       </div>
     </section>
   );
 };
 
 export default WhyChooseUs;