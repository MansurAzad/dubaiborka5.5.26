import { useState, forwardRef } from "react";
import { motion } from "framer-motion";
import { Send, Gift, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const NewsletterSection = forwardRef<HTMLElement>((_, ref) => {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      // Save to newsletter_subscribers table
      await supabase.from("newsletter_subscribers").upsert(
        { email, source: "website" },
        { onConflict: "email" }
      );
      setIsSubmitted(true);
      setEmail("");
      setTimeout(() => setIsSubmitted(false), 3000);
    }
  };
 
   return (
     <section className="py-20 bg-background relative overflow-hidden">
       {/* Background Pattern */}
       <div className="absolute inset-0 opacity-5">
         <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary rounded-full blur-3xl" />
         <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent rounded-full blur-3xl" />
       </div>
       
       <div className="container mx-auto px-4 relative z-10">
         <motion.div
           initial={{ opacity: 0, y: 30 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           transition={{ duration: 0.6 }}
           className="max-w-3xl mx-auto text-center"
         >
           {/* Icon */}
           <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
             <Gift className="w-10 h-10 text-primary-foreground" />
           </div>
           
           <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
             <span className="text-foreground">Get </span>
             <span className="text-gradient-gold">15% Off</span>
             <span className="text-foreground"> Your First Order</span>
           </h2>
           
           <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
             Subscribe to our newsletter and be the first to know about new collections, exclusive offers, and styling tips.
           </p>
           
           {/* Form */}
           <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
             <div className="flex-1 relative">
               <input
                 type="email"
                 placeholder="Enter your email address"
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 className="input-luxury w-full pr-12"
                 required
               />
               <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
             </div>
             <motion.button
               whileHover={{ scale: 1.02 }}
               whileTap={{ scale: 0.98 }}
               type="submit"
               className="btn-gold flex items-center justify-center gap-2"
             >
               {isSubmitted ? (
                 <>
                   <span>Subscribed!</span>
                   <span className="text-lg">✓</span>
                 </>
               ) : (
                 <>
                   <span>Subscribe</span>
                   <Send className="w-4 h-4" />
                 </>
               )}
             </motion.button>
           </form>
           
           <p className="text-sm text-muted-foreground mt-4">
             By subscribing, you agree to our Privacy Policy. Unsubscribe anytime.
           </p>
         </motion.div>
       </div>
     </section>
   );
});
NewsletterSection.displayName = "NewsletterSection";

export default NewsletterSection;