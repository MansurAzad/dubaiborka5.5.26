 import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "./AuthContext";
 import { useToast } from "@/hooks/use-toast";
 
 interface WishlistItem {
   id: string;
   product_id: string;
   product: {
     id: string;
     name: string;
     price: number;
     sale_price: number | null;
     image_url: string | null;
     category: string;
   };
 }
 
 interface WishlistContextType {
   items: WishlistItem[];
   loading: boolean;
   itemCount: number;
   isInWishlist: (productId: string) => boolean;
   addToWishlist: (productId: string) => Promise<void>;
   removeFromWishlist: (productId: string) => Promise<void>;
   toggleWishlist: (productId: string) => Promise<void>;
 }
 
 const WishlistContext = createContext<WishlistContextType | undefined>(undefined);
 
 export const WishlistProvider = ({ children }: { children: ReactNode }) => {
   const [items, setItems] = useState<WishlistItem[]>([]);
   const [loading, setLoading] = useState(true);
   const { user } = useAuth();
   const { toast } = useToast();
 
   const fetchWishlist = async () => {
     if (!user) {
       setItems([]);
       setLoading(false);
       return;
     }
 
     try {
       const { data, error } = await supabase
         .from("wishlist")
         .select(`
           id,
           product_id,
           product:products (
             id,
             name,
             price,
             sale_price,
             image_url,
             category
           )
         `)
         .eq("user_id", user.id);
 
       if (error) throw error;
       setItems((data as unknown as WishlistItem[]) || []);
     } catch (error) {
       console.error("Error fetching wishlist:", error);
     } finally {
       setLoading(false);
     }
   };
 
   useEffect(() => {
     fetchWishlist();
   }, [user]);
 
  const isInWishlist = useCallback((productId: string) => {
    return items.some(item => item.product_id === productId);
  }, [items]);

  const addToWishlist = useCallback(async (productId: string) => {
     if (!user) {
       toast({
         title: "Please sign in",
         description: "You need to be logged in to add items to your wishlist",
         variant: "destructive"
       });
       return;
     }
 
     try {
       const { error } = await supabase.from("wishlist").insert({
         user_id: user.id,
         product_id: productId
       });
 
       if (error) throw error;
       await fetchWishlist();
 
       toast({
         title: "Added to wishlist",
         description: "Product saved to your wishlist"
       });
     } catch (error) {
       console.error("Error adding to wishlist:", error);
       toast({
         title: "Error",
         description: "Failed to add to wishlist",
         variant: "destructive"
       });
    }
  }, [user, toast]);

  const removeFromWishlist = useCallback(async (productId: string) => {
     if (!user) return;
 
     try {
       const { error } = await supabase
         .from("wishlist")
         .delete()
         .eq("user_id", user.id)
         .eq("product_id", productId);
 
       if (error) throw error;
       await fetchWishlist();
 
       toast({
         title: "Removed from wishlist",
         description: "Product removed from your wishlist"
       });
     } catch (error) {
       console.error("Error removing from wishlist:", error);
       toast({
         title: "Error",
         description: "Failed to remove from wishlist",
         variant: "destructive"
       });
    }
  }, [user, toast]);

  const toggleWishlist = useCallback(async (productId: string) => {
     if (isInWishlist(productId)) {
       await removeFromWishlist(productId);
     } else {
       await addToWishlist(productId);
     }
  }, [isInWishlist, removeFromWishlist, addToWishlist]);

  const value = useMemo(() => ({
    items,
    loading,
    itemCount: items.length,
    isInWishlist,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist
  }), [items, loading, isInWishlist, addToWishlist, removeFromWishlist, toggleWishlist]);

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
 };
 
 export const useWishlist = () => {
   const context = useContext(WishlistContext);
   if (context === undefined) {
     throw new Error("useWishlist must be used within a WishlistProvider");
   }
   return context;
 };