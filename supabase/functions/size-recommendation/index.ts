import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { height, weight, category } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a size recommendation expert for Islamic women's clothing (abayas, borkas, hijabs, kaftans). 
Available sizes: 50", 52", 54", 56", 58", 60" (these are garment lengths in inches).
Size chart:
- 50": Chest 32-34", Waist 24-26", Hip 34-36" (for height ~4'10"-5'0", weight 40-50kg)
- 52": Chest 34-36", Waist 26-28", Hip 36-38" (for height ~5'0"-5'2", weight 45-55kg)
- 54": Chest 38-40", Waist 30-32", Hip 40-42" (for height ~5'2"-5'4", weight 55-65kg)  
- 56": Chest 42-44", Waist 34-36", Hip 44-46" (for height ~5'4"-5'6", weight 65-75kg)
- 58": Chest 46-48", Waist 38-40", Hip 48-50" (for height ~5'6"-5'8", weight 75-85kg)
- 60": Chest 50-52", Waist 42-44", Hip 52-54" (for height ~5'8"+, weight 85kg+)

Reply in Bengali. Be concise (3-4 lines max). Recommend ONE primary size and mention if they're between sizes.`,
          },
          {
            role: "user",
            content: `আমার উচ্চতা ${height} ফুট এবং ওজন ${weight} কেজি। ${category} এর জন্য কোন সাইজ ভালো হবে?`,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ recommendation: "অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const recommendation = data.choices?.[0]?.message?.content || "সাইজ সাজেশন পাওয়া যায়নি।";

    return new Response(JSON.stringify({ recommendation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("size-recommendation error:", e);
    return new Response(JSON.stringify({ recommendation: "দুঃখিত, সাইজ সাজেশন দিতে সমস্যা হয়েছে।" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
