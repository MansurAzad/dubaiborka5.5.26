import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type Product } from "@/types/product";
import { queryClient } from "@/lib/query-client";

export const FEATURED_PRODUCTS_KEY = ["featured-products-home"] as const;

// Slim column set — enough to render product cards. Avoids pulling description / video_url
// which can be large and aren't shown on cards.
const SELECT = "id, name, price, sale_price, image_url, category, sizes, colors, slug, stock";

export const fetchFeaturedProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from("products")
    .select(SELECT)
    .eq("featured", true)
    .limit(12);
  if (error) throw error;
  return (data || []) as Product[];
};

export const useFeaturedProducts = () =>
  useQuery({
    queryKey: FEATURED_PRODUCTS_KEY,
    queryFn: fetchFeaturedProducts,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

/**
 * Fire the featured-products fetch as early as possible — at module-eval time,
 * BEFORE React mounts. By the time the section renders, data is usually ready.
 */
export const prefetchFeaturedProducts = () => {
  queryClient.prefetchQuery({
    queryKey: FEATURED_PRODUCTS_KEY,
    queryFn: fetchFeaturedProducts,
    staleTime: 5 * 60 * 1000,
  });
};
