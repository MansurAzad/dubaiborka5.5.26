import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const { subject, content, subscribers } = await req.json();

    if (!subject || !content || !Array.isArray(subscribers) || subscribers.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sentCount = 0;
    const errors: string[] = [];

    // Send in batches of 10
    for (let i = 0; i < subscribers.length; i += 10) {
      const batch = subscribers.slice(i, i + 10);
      
      await Promise.all(batch.map(async (sub: { email: string; name: string | null }) => {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "Dubai Borka House <orders@dubaiborkehouse.com>",
              to: [sub.email],
              subject: subject,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #1a1a2e, #16213e); border-radius: 12px; margin-bottom: 20px;">
                    <h1 style="color: #d4af37; margin: 0;">Dubai Borka House</h1>
                    <p style="color: #ccc; margin-top: 5px;">Premium Fashion</p>
                  </div>
                  ${sub.name ? `<p>প্রিয় ${sub.name},</p>` : ""}
                  ${content}
                  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                  <p style="color: #999; font-size: 12px; text-align: center;">
                    Dubai Borka House - Premium Fashion<br>
                    আনসাবস্ক্রাইব করতে এই ইমেইলে রিপ্লাই করুন।
                  </p>
                </div>
              `,
            }),
          });

          if (res.ok) sentCount++;
          else errors.push(sub.email);
        } catch {
          errors.push(sub.email);
        }
      }));
    }

    return new Response(
      JSON.stringify({ sent: sentCount, failed: errors.length, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Campaign error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send campaign" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
