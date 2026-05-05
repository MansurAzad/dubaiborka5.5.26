import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "Email service not configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { productId } = await req.json();

    if (!productId) {
      throw new Error("Missing productId");
    }

    // Get product info
    const { data: product } = await supabase
      .from("products")
      .select("name, price, sale_price, slug, id")
      .eq("id", productId)
      .single();

    if (!product) {
      throw new Error("Product not found");
    }

    // Get un-notified alerts for this product
    const { data: alerts } = await supabase
      .from("back_in_stock_alerts")
      .select("id, email")
      .eq("product_id", productId)
      .eq("notified", false);

    if (!alerts || alerts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const price = product.sale_price || product.price;
    const productUrl = `https://dubaiborkahousebd.lovable.app/product/${product.slug || product.id}`;
    let sentCount = 0;

    for (const alert of alerts) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Dubai Borka House <orders@dubaiborkehouse.com>",
            to: [alert.email],
            subject: `🔔 ${product.name} এখন স্টকে ফিরে এসেছে!`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #b8860b;">সুসংবাদ! 🎉</h2>
                <p>আপনি যে পণ্যটির জন্য অপেক্ষা করছিলেন, সেটি এখন স্টকে ফিরে এসেছে!</p>
                <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 15px 0;">
                  <h3 style="margin: 0 0 5px;">${product.name}</h3>
                  <p style="margin: 0; font-size: 18px; color: #b8860b; font-weight: bold;">৳${Number(price).toLocaleString()}</p>
                </div>
                <a href="${productUrl}" style="display: inline-block; background: #b8860b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  এখনই কিনুন →
                </a>
                <p style="margin-top: 20px; font-size: 12px; color: #999;">
                  দ্রুত অর্ডার করুন — স্টক সীমিত!
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 11px; color: #aaa;">Dubai Borka House — Premium Islamic Fashion</p>
              </div>
            `,
          }),
        });

        if (res.ok) {
          sentCount++;
          // Mark as notified
          await supabase
            .from("back_in_stock_alerts")
            .update({ notified: true })
            .eq("id", alert.id);
        }
      } catch (emailErr) {
        console.error(`Failed to send to ${alert.email}:`, emailErr);
      }
    }

    console.log(`Back-in-stock: sent ${sentCount}/${alerts.length} emails for product ${product.name}`);

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, total: alerts.length }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-back-in-stock:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
