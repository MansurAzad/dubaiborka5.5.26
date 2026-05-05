import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type Product, getProductImage } from "@/types/product";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

/**
 * Returns the current 2-hour bucket index.
 * Changes every 2 hours, deterministic across users at the same time.
 */
export const useImageRotationTick = () => {
  const [tick, setTick] = useState(() => Math.floor(Date.now() / TWO_HOURS_MS));
  useEffect(() => {
    const ms = TWO_HOURS_MS - (Date.now() % TWO_HOURS_MS);
    const t = setTimeout(() => setTick(Math.floor(Date.now() / TWO_HOURS_MS)), ms + 100);
    return () => clearTimeout(t);
  }, [tick]);
  return tick;
};

/**
 * Returns the current 6-hour shuffle bucket index.
 */
export const useShuffleSeed = () => {
  return Math.floor(Date.now() / SIX_HOURS_MS);
};

/**
 * Fetch all alternate images (variant + gallery) for given product IDs.
 * Returns a map: productId -> string[] of image URLs.
 */
export const useProductAlternateImages = (productIds: string[]) => {
  return useQuery({
    queryKey: ["product-alternate-images", [...productIds].sort().join(",")],
    enabled: productIds.length > 0,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    queryFn: async () => {
      if (productIds.length === 0) return {} as Record<string, string[]>;
      const [variantsRes, galleryRes] = await Promise.all([
        supabase.from("product_variants").select("product_id, image_url").in("product_id", productIds),
        supabase.from("product_images").select("product_id, image_url, display_order").in("product_id", productIds).order("display_order"),
      ]);
      const map: Record<string, string[]> = {};
      for (const id of productIds) map[id] = [];
      (galleryRes.data || []).forEach((g) => {
        if (g.image_url && map[g.product_id] && !map[g.product_id].includes(g.image_url)) {
          map[g.product_id].push(g.image_url);
        }
      });
      (variantsRes.data || []).forEach((v) => {
        if (v.image_url && map[v.product_id] && !map[v.product_id].includes(v.image_url)) {
          map[v.product_id].push(v.image_url);
        }
      });
      return map;
    },
  });
};

/**
 * Pick the rotated image for a product based on tick.
 * Combines main image + variant images + gallery images, then picks one based on tick.
 */
export const useRotatedImage = (
  product: Product,
  alternateImages: Record<string, string[]> | undefined,
  tick: number
): string => {
  const mainImage = getProductImage(product);
  const alts = alternateImages?.[product.id] || [];
  const allImages = [mainImage, ...alts.filter((u) => u && u !== mainImage)];
  if (allImages.length <= 1) return mainImage;
  // Stable per product: use product id hash + tick
  let hash = 0;
  for (let i = 0; i < product.id.length; i++) hash = (hash * 31 + product.id.charCodeAt(i)) | 0;
  const idx = Math.abs(hash + tick) % allImages.length;
  return allImages[idx];
};

/**
 * Deterministic Fisher-Yates shuffle using seed.
 */
export const seededShuffle = <T>(arr: T[], seed: number): T[] => {
  const result = [...arr];
  let s = seed || 1;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
