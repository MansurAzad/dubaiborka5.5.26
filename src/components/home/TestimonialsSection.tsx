 import { motion } from "framer-motion";
 import { Star, Quote } from "lucide-react";
 
 const testimonials = [
   {
     id: 1,
     name: "Fatima Rahman",
     location: "Dhaka",
     rating: 5,
     text: "The quality of their abayas is exceptional. I've been a loyal customer for 3 years and the craftsmanship never disappoints. Truly authentic Dubai imports!",
     image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
   },
   {
     id: 2,
     name: "Ayesha Khan",
     location: "Chittagong",
     rating: 5,
     text: "Fast delivery and beautiful packaging. The golden kaftan I ordered exceeded my expectations. Perfect for my sister's wedding!",
     image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
   },
   {
     id: 3,
     name: "Nadia Islam",
     location: "Sylhet",
     rating: 5,
     text: "Their fabric collection is unmatched in Bangladesh. The silk quality is premium and the customer service is outstanding.",
     image: "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=100&h=100&fit=crop",
   },
 ];
 
 const TestimonialsSection = () => {
   return (
     <section className="py-20 bg-card relative overflow-hidden">
       {/* Decorative Elements */}
       <div className="absolute top-20 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
       <div className="absolute bottom-20 right-10 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
       
       <div className="container mx-auto px-4 relative z-10">
         {/* Section Header */}
         <motion.div
           initial={{ opacity: 0, y: 30 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           transition={{ duration: 0.6 }}
           className="text-center mb-16"
         >
           <span className="text-primary text-sm uppercase tracking-widest font-medium">
             Customer Love
           </span>
           <h2 className="font-display text-4xl md:text-5xl font-bold mt-4 mb-6">
             <span className="text-foreground">What Our </span>
             <span className="text-gradient-gold">Customers Say</span>
           </h2>
           <div className="section-divider" />
         </motion.div>
 
         {/* Testimonials Grid */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {testimonials.map((testimonial, index) => (
             <motion.div
               key={testimonial.id}
               initial={{ opacity: 0, y: 30 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ duration: 0.6, delay: index * 0.1 }}
               className="card-luxury relative"
             >
               <Quote className="absolute top-6 right-6 w-10 h-10 text-primary/20" />
               
               {/* Rating */}
               <div className="flex gap-1 mb-4">
                 {[...Array(testimonial.rating)].map((_, i) => (
                   <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                 ))}
               </div>
               
               {/* Text */}
               <p className="text-muted-foreground leading-relaxed mb-6">
                 "{testimonial.text}"
               </p>
               
               {/* Author */}
               <div className="flex items-center gap-4">
                 <img
                   src={testimonial.image}
                   alt={testimonial.name}
                   className="w-12 h-12 rounded-full object-cover border-2 border-primary"
                 />
                 <div>
                   <div className="font-semibold text-foreground">
                     {testimonial.name}
                   </div>
                   <div className="text-sm text-muted-foreground">
                     {testimonial.location}
                   </div>
                 </div>
               </div>
             </motion.div>
           ))}
         </div>
       </div>
     </section>
   );
 };
 
 export default TestimonialsSection;