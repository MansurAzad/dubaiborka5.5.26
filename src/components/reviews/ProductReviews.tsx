 import { useEffect, useState } from "react";
 import { Star, ThumbsUp } from "lucide-react";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 import { Button } from "@/components/ui/button";
 import { Textarea } from "@/components/ui/textarea";
 import { Input } from "@/components/ui/input";
 import { useToast } from "@/hooks/use-toast";
 
 interface Review {
   id: string;
   rating: number;
   title: string | null;
   comment: string | null;
   verified_purchase: boolean;
   created_at: string;
 }
 
 interface ProductReviewsProps {
   productId: string;
 }
 
 const ProductReviews = ({ productId }: ProductReviewsProps) => {
   const { user } = useAuth();
   const { toast } = useToast();
   const [reviews, setReviews] = useState<Review[]>([]);
   const [loading, setLoading] = useState(true);
   const [showForm, setShowForm] = useState(false);
   const [submitting, setSubmitting] = useState(false);
   const [userHasReviewed, setUserHasReviewed] = useState(false);
   const [hasPurchased, setHasPurchased] = useState(false);
 
   const [formData, setFormData] = useState({
     rating: 5,
     title: "",
     comment: "",
   });
 
   const fetchReviews = async () => {
     const { data, error } = await supabase
       .from("product_reviews")
       .select("*")
       .eq("product_id", productId)
       .order("created_at", { ascending: false });
 
     if (!error) {
       setReviews(data || []);
       if (user) {
         setUserHasReviewed(data?.some((r) => r.user_id === user.id) || false);
       }
     }
     setLoading(false);
   };
 
   const checkPurchase = async () => {
     if (!user) return;
 
     const { data } = await supabase
       .from("order_items")
       .select("id, orders!inner(user_id)")
       .eq("product_id", productId)
       .eq("orders.user_id", user.id)
       .limit(1);
 
     setHasPurchased((data?.length || 0) > 0);
   };
 
   useEffect(() => {
     fetchReviews();
     checkPurchase();
   }, [productId, user]);
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!user) {
       toast({ title: "Please sign in", description: "You need to be logged in to leave a review", variant: "destructive" });
       return;
     }
 
     setSubmitting(true);
 
     const { error } = await supabase.from("product_reviews").insert({
       product_id: productId,
       user_id: user.id,
       rating: formData.rating,
       title: formData.title || null,
       comment: formData.comment || null,
       verified_purchase: hasPurchased,
     });
 
     if (error) {
       if (error.code === "23505") {
         toast({ title: "Already reviewed", description: "You have already reviewed this product", variant: "destructive" });
       } else {
         toast({ title: "Error", description: error.message, variant: "destructive" });
       }
     } else {
       toast({ title: "Thank you!", description: "Your review has been submitted" });
       setFormData({ rating: 5, title: "", comment: "" });
       setShowForm(false);
       fetchReviews();
     }
     setSubmitting(false);
   };
 
   const renderStars = (rating: number, interactive = false, onChange?: (r: number) => void) => (
     <div className="flex gap-1">
       {[1, 2, 3, 4, 5].map((star) => (
         <button
           key={star}
           type="button"
           disabled={!interactive}
           onClick={() => onChange?.(star)}
           className={interactive ? "cursor-pointer" : "cursor-default"}
         >
           <Star
             className={`w-5 h-5 ${
               star <= rating ? "fill-primary text-primary" : "text-muted-foreground"
             }`}
           />
         </button>
       ))}
     </div>
   );
 
   const averageRating = reviews.length > 0
     ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
     : 0;
 
   return (
     <div className="space-y-6">
       <div className="flex items-center justify-between">
         <div>
           <h3 className="text-xl font-display font-semibold">Customer Reviews</h3>
           {reviews.length > 0 && (
             <div className="flex items-center gap-2 mt-1">
               {renderStars(Math.round(averageRating))}
               <span className="text-sm text-muted-foreground">
                 {averageRating.toFixed(1)} out of 5 ({reviews.length} review{reviews.length !== 1 ? "s" : ""})
               </span>
             </div>
           )}
         </div>
         {user && !userHasReviewed && !showForm && (
           <Button onClick={() => setShowForm(true)}>Write a Review</Button>
         )}
       </div>
 
       {/* Review Form */}
       {showForm && (
         <form onSubmit={handleSubmit} className="border rounded-lg p-6 space-y-4 bg-muted/50">
           <h4 className="font-medium">Write Your Review</h4>
           
           <div className="space-y-2">
             <label className="text-sm font-medium">Your Rating</label>
             {renderStars(formData.rating, true, (r) => setFormData({ ...formData, rating: r }))}
           </div>
 
           <div className="space-y-2">
             <label className="text-sm font-medium">Review Title (optional)</label>
             <Input
               value={formData.title}
               onChange={(e) => setFormData({ ...formData, title: e.target.value })}
               placeholder="Summarize your experience"
             />
           </div>
 
           <div className="space-y-2">
             <label className="text-sm font-medium">Your Review</label>
             <Textarea
               value={formData.comment}
               onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
               placeholder="What did you like or dislike about this product?"
               rows={4}
             />
           </div>
 
           <div className="flex gap-2">
             <Button type="submit" disabled={submitting}>
               {submitting ? "Submitting..." : "Submit Review"}
             </Button>
             <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
               Cancel
             </Button>
           </div>
         </form>
       )}
 
       {/* Reviews List */}
       {loading ? (
         <p className="text-muted-foreground">Loading reviews...</p>
       ) : reviews.length === 0 ? (
         <div className="text-center py-8 border rounded-lg">
           <p className="text-muted-foreground">No reviews yet. Be the first to review this product!</p>
         </div>
       ) : (
         <div className="space-y-4">
           {reviews.map((review) => (
             <div key={review.id} className="border rounded-lg p-4 space-y-2">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   {renderStars(review.rating)}
                   {review.verified_purchase && (
                     <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded flex items-center gap-1">
                       <ThumbsUp className="w-3 h-3" />
                       Verified Purchase
                     </span>
                   )}
                 </div>
                 <span className="text-sm text-muted-foreground">
                   {new Date(review.created_at).toLocaleDateString()}
                 </span>
               </div>
               {review.title && <h4 className="font-medium">{review.title}</h4>}
               {review.comment && <p className="text-muted-foreground">{review.comment}</p>}
             </div>
           ))}
         </div>
       )}
     </div>
   );
 };
 
 export default ProductReviews;