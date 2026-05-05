import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Global tracking helpers
export const trackAddToCart = (product: { id: string; name: string; price: number; category: string }, quantity: number) => {
  const w = window as any;
  if (w.gtag) {
    w.gtag("event", "add_to_cart", {
      currency: "BDT",
      value: product.price * quantity,
      items: [{ item_id: product.id, item_name: product.name, item_category: product.category, price: product.price, quantity }],
    });
  }
  if (w.fbq) {
    w.fbq("track", "AddToCart", {
      content_ids: [product.id],
      content_name: product.name,
      content_type: "product",
      value: product.price * quantity,
      currency: "BDT",
    });
  }
};

export const trackPurchase = (orderId: string, total: number, items: { id: string; name: string; price: number; quantity: number }[]) => {
  const w = window as any;
  if (w.gtag) {
    w.gtag("event", "purchase", {
      transaction_id: orderId,
      currency: "BDT",
      value: total,
      items: items.map(i => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.quantity })),
    });
  }
  if (w.fbq) {
    w.fbq("track", "Purchase", {
      content_ids: items.map(i => i.id),
      content_type: "product",
      value: total,
      currency: "BDT",
      num_items: items.length,
    });
  }
};

export const trackViewContent = (product: { id: string; name: string; price: number; category: string }) => {
  const w = window as any;
  if (w.gtag) {
    w.gtag("event", "view_item", {
      currency: "BDT",
      value: product.price,
      items: [{ item_id: product.id, item_name: product.name, item_category: product.category, price: product.price }],
    });
  }
  if (w.fbq) {
    w.fbq("track", "ViewContent", {
      content_ids: [product.id],
      content_name: product.name,
      content_type: "product",
      value: product.price,
      currency: "BDT",
    });
  }
};

const AnalyticsTracker = () => {
  const location = useLocation();
  const [gaId, setGaId] = useState<string | null>(null);
  const [fbPixelId, setFbPixelId] = useState<string | null>(null);

  useEffect(() => {
    const fetchIds = async () => {
      const { data } = await supabase
        .from("site_content")
        .select("section_key, content")
        .in("section_key", ["google_analytics_id", "facebook_pixel_id"])
        .eq("is_active", true);
      if (data) {
        data.forEach((row) => {
          if (row.section_key === "google_analytics_id" && row.content) setGaId(row.content.trim());
          if (row.section_key === "facebook_pixel_id" && row.content) setFbPixelId(row.content.trim());
        });
      }
    };
    fetchIds();
  }, []);

  useEffect(() => {
    if (!gaId) return;
    if (document.getElementById("ga-script")) return;
    const script = document.createElement("script");
    script.id = "ga-script";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(script);
    const inlineScript = document.createElement("script");
    inlineScript.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`;
    document.head.appendChild(inlineScript);
  }, [gaId]);

  useEffect(() => {
    if (!fbPixelId) return;
    if (document.getElementById("fb-pixel-script")) return;
    const script = document.createElement("script");
    script.id = "fb-pixel-script";
    script.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${fbPixelId}');fbq('track','PageView');`;
    document.head.appendChild(script);
  }, [fbPixelId]);

  useEffect(() => {
    if (gaId && (window as any).gtag) {
      (window as any).gtag("config", gaId, { page_path: location.pathname });
    }
    if (fbPixelId && (window as any).fbq) {
      (window as any).fbq("track", "PageView");
    }
  }, [location.pathname, gaId, fbPixelId]);

  return null;
};

export default AnalyticsTracker;
