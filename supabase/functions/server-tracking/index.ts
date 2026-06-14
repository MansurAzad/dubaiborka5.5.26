// Server-Side Tracking: forwards events to GA4 Measurement Protocol & Meta Conversions API
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GA4_MEASUREMENT_ID = Deno.env.get("GA4_MEASUREMENT_ID");
const GA4_API_SECRET = Deno.env.get("GA4_API_SECRET");
const META_PIXEL_ID = Deno.env.get("META_PIXEL_ID");
const META_ACCESS_TOKEN = Deno.env.get("META_ACCESS_TOKEN");

// SHA-256 hash for PII (required by Meta CAPI)
async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value.trim().toLowerCase());
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface TrackEventBody {
  event_name: string;            // GA4-style name (e.g. purchase, add_to_cart, view_item, begin_checkout, search, generate_lead)
  client_id?: string;            // GA4 client_id (cid cookie / uuid)
  event_id?: string;             // dedup id (shared with browser pixel)
  event_source_url?: string;
  user_agent?: string;
  user_data?: {
    email?: string;
    phone?: string;
    first_name?: string;
    last_name?: string;
    city?: string;
    country?: string;
    external_id?: string;
    fbp?: string;                // _fbp cookie
    fbc?: string;                // _fbc cookie
  };
  // GA4 params + Meta custom_data (currency, value, items, etc.)
  params?: Record<string, unknown>;
}

const META_EVENT_MAP: Record<string, string> = {
  purchase: "Purchase",
  add_to_cart: "AddToCart",
  view_item: "ViewContent",
  begin_checkout: "InitiateCheckout",
  search: "Search",
  generate_lead: "Lead",
  add_to_wishlist: "AddToWishlist",
  page_view: "PageView",
  sign_up: "CompleteRegistration",
};

async function sendGA4(body: TrackEventBody, clientIp: string) {
  if (!GA4_MEASUREMENT_ID || !GA4_API_SECRET) return { skipped: "ga4_not_configured" };
  const payload = {
    client_id: body.client_id || crypto.randomUUID(),
    events: [
      {
        name: body.event_name,
        params: {
          ...body.params,
          engagement_time_msec: 1,
        },
      },
    ],
  };
  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_API_SECRET}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": body.user_agent || "" },
    body: JSON.stringify(payload),
  });
  return { status: res.status, ok: res.ok };
}

async function sendMeta(body: TrackEventBody, clientIp: string) {
  if (!META_PIXEL_ID || !META_ACCESS_TOKEN) return { skipped: "meta_not_configured" };
  const metaName = META_EVENT_MAP[body.event_name] || body.event_name;
  const ud = body.user_data || {};
  const user_data: Record<string, unknown> = {
    client_ip_address: clientIp,
    client_user_agent: body.user_agent || "",
  };
  if (ud.email) user_data.em = [await sha256(ud.email)];
  if (ud.phone) user_data.ph = [await sha256(ud.phone.replace(/\D/g, ""))];
  if (ud.first_name) user_data.fn = [await sha256(ud.first_name)];
  if (ud.last_name) user_data.ln = [await sha256(ud.last_name)];
  if (ud.city) user_data.ct = [await sha256(ud.city)];
  if (ud.country) user_data.country = [await sha256(ud.country)];
  if (ud.external_id) user_data.external_id = [await sha256(ud.external_id)];
  if (ud.fbp) user_data.fbp = ud.fbp;
  if (ud.fbc) user_data.fbc = ud.fbc;

  const event = {
    event_name: metaName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: body.event_id,
    event_source_url: body.event_source_url,
    action_source: "website",
    user_data,
    custom_data: body.params || {},
  };

  const url = `https://graph.facebook.com/v18.0/${META_PIXEL_ID}/events?access_token=${META_ACCESS_TOKEN}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: [event] }),
  });
  const text = await res.text();
  return { status: res.status, ok: res.ok, response: text.slice(0, 500) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as TrackEventBody;
    if (!body?.event_name) {
      return new Response(JSON.stringify({ error: "event_name required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("cf-connecting-ip") ||
      "";
    body.user_agent = body.user_agent || req.headers.get("user-agent") || "";

    const [ga, meta] = await Promise.all([sendGA4(body, clientIp), sendMeta(body, clientIp)]);

    return new Response(JSON.stringify({ ok: true, ga, meta }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("server-tracking error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
