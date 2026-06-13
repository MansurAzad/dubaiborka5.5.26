import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shared long-cached data hooks. Each hook uses a single global queryKey so
 * multiple components requesting the same data share ONE network request
 * across the whole app. Caches are aggressive — these tables rarely change.
 *
 * At scale this turns N visitors × M components × K refetches into roughly
 * 1 request per visitor per cache window.
 */

const ONE_MIN = 60 * 1000;

/* -------------------------- Active categories --------------------------- */
export const CATEGORIES_KEY = ["active-categories"] as const;

export const useActiveCategories = () =>
  useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
    staleTime: 30 * ONE_MIN,
    gcTime: 60 * ONE_MIN,
  });

/* --------------------------- Active coupons ----------------------------- */
export const COUPONS_KEY = ["active-coupons-public"] as const;

export interface PublicCoupon {
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  current_uses: number;
  max_uses: number | null;
  valid_from: string | null;
  valid_until: string | null;
}

export const useActiveCoupons = () =>
  useQuery({
    queryKey: COUPONS_KEY,
    queryFn: async () => {
      const { data } = await supabase
        .from("coupons")
        .select("code, description, discount_type, discount_value, current_uses, max_uses, valid_from, valid_until")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(10);
      return (data || []) as PublicCoupon[];
    },
    staleTime: 10 * ONE_MIN,
    gcTime: 30 * ONE_MIN,
  });

/* ------------------------ Social-proof messages ------------------------- */
export const SOCIAL_PROOF_KEY = ["social-proof-messages"] as const;

export interface SocialProofItem {
  product_name: string;
  city: string;
  time_ago: string;
  message: string;
}

export const useSocialProofMessages = () =>
  useQuery<SocialProofItem[]>({
    queryKey: SOCIAL_PROOF_KEY,
    queryFn: async () => {
      const { data: custom } = await supabase
        .from("social_proof_messages")
        .select("product_name, city, time_ago, message")
        .eq("is_active", true)
        .order("display_order");
      if (custom && custom.length > 0) return custom as SocialProofItem[];

      const { data } = await supabase
        .from("orders")
        .select("shipping_city, created_at, order_items(product_name)")
        .order("created_at", { ascending: false })
        .limit(20);

      return (data || [])
        .filter((o: any) => o.order_items?.length > 0)
        .map((o: any) => {
          const mins = Math.floor((Date.now() - new Date(o.created_at).getTime()) / 60000);
          const time_ago =
            mins < 60 ? `${mins} মিনিট আগে` : mins < 1440 ? `${Math.floor(mins / 60)} ঘণ্টা আগে` : `${Math.floor(mins / 1440)} দিন আগে`;
          return {
            product_name: o.order_items[0].product_name,
            city: o.shipping_city,
            time_ago,
            message: "কেউ একজন {product} কিনেছেন!",
          };
        });
    },
    staleTime: 30 * ONE_MIN,
    gcTime: 60 * ONE_MIN,
  });
