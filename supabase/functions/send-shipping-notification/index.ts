// Sends customer-facing shipping notifications (email + WhatsApp)
// Triggered when a shipment is approved, submitted to Steadfast, or delivered.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  event: "approved" | "submitted" | "delivered";
  order_id: string;
  shipment_id: string;
  idempotency_key?: string;
  recipient_email?: string | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  tracking_code?: string | null;
  consignment_id?: string | null;
  total?: number;
}

const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");

const subjects = {
  approved: "✓ আপনার অর্ডার শিপিংয়ের জন্য অনুমোদিত",
  submitted: "🚚 আপনার অর্ডার কুরিয়ারে হস্তান্তর হয়েছে",
  delivered: "🎉 আপনার অর্ডার সফলভাবে ডেলিভারি হয়েছে",
};

const bodyHtml = (p: Payload) => {
  const name = p.recipient_name || "প্রিয় গ্রাহক";
  const orderShort = p.order_id.slice(0, 8);
  if (p.event === "approved") {
    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff">
        <h2 style="color:#1a8a3a">আসসালামু আলাইকুম, ${name}!</h2>
        <p>আপনার অর্ডার <b>#${orderShort}</b> শিপিংয়ের জন্য অনুমোদিত হয়েছে।</p>
        <p>খুব শীঘ্রই আমরা পার্সেলটি কুরিয়ারে হস্তান্তর করব এবং আপনাকে ট্র্যাকিং নাম্বার পাঠানো হবে।</p>
        <p style="color:#666;font-size:13px">— Dubai Borka House</p>
      </div>`;
  }
  if (p.event === "submitted") {
    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff">
        <h2 style="color:#1664c0">আপনার পার্সেল রওনা দিয়েছে! 🚚</h2>
        <p>প্রিয় ${name}, আপনার অর্ডার <b>#${orderShort}</b> Steadfast Courier-এ হস্তান্তর হয়েছে।</p>
        ${p.tracking_code ? `
          <div style="background:#f0f7ff;padding:16px;border-radius:8px;margin:16px 0">
            <div style="font-size:13px;color:#555">ট্র্যাকিং কোড</div>
            <div style="font-size:20px;font-weight:bold;font-family:monospace">${p.tracking_code}</div>
            <a href="https://steadfast.com.bd/t/${p.tracking_code}" style="color:#1664c0">লাইভ ট্র্যাক করুন →</a>
          </div>` : ""}
        <p>সাধারণত ১-৩ কর্মদিবসে ডেলিভারি হয়। ক্যাশ অন ডেলিভারিতে পেমেন্ট প্রস্তুত রাখুন।</p>
        <p style="color:#666;font-size:13px">— Dubai Borka House</p>
      </div>`;
  }
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff">
      <h2 style="color:#1a8a3a">ধন্যবাদ, ${name}! 🎉</h2>
      <p>আপনার অর্ডার <b>#${orderShort}</b> সফলভাবে ডেলিভারি সম্পন্ন হয়েছে।</p>
      <p>আমাদের সাথে কেনাকাটা করার জন্য ধন্যবাদ। প্রোডাক্টের রিভিউ দিতে ভুলবেন না!</p>
      <p style="color:#666;font-size:13px">— Dubai Borka House</p>
    </div>`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const p = (await req.json()) as Payload;

    // Idempotency: check if a notification with this key has already been sent
    if (p.idempotency_key) {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: ship } = await admin
        .from("courier_shipments")
        .select("notifications_sent")
        .eq("id", p.shipment_id)
        .maybeSingle();
      const keys = (ship?.notifications_sent as any)?.__keys || {};
      if (keys[p.idempotency_key]) {
        return new Response(
          JSON.stringify({ ok: true, skipped: "duplicate" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    if (p.recipient_email && RESEND_KEY && LOVABLE_KEY) {
      const r = await fetch(
        "https://connector-gateway.lovable.dev/resend/emails",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${LOVABLE_KEY}`,
            "X-Connection-Api-Key": RESEND_KEY,
          },
          body: JSON.stringify({
            from: "Dubai Borka House <onboarding@resend.dev>",
            to: [p.recipient_email],
            subject: subjects[p.event],
            html: bodyHtml(p),
          }),
        },
      );
      if (!r.ok) console.error("email send failed", await r.text());
    }

    // Best-effort WhatsApp notification via existing function
    if (p.recipient_phone) {
      try {
        const admin = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        await admin.functions.invoke("send-whatsapp-notification", {
          body: {
            phone: p.recipient_phone,
            message:
              p.event === "submitted" && p.tracking_code
                ? `📦 অর্ডার #${p.order_id.slice(0, 8)} কুরিয়ারে দেওয়া হয়েছে। Steadfast ট্র্যাকিং: ${p.tracking_code}`
                : p.event === "delivered"
                  ? `🎉 অর্ডার #${p.order_id.slice(0, 8)} ডেলিভারি সম্পন্ন। ধন্যবাদ!`
                  : `✓ অর্ডার #${p.order_id.slice(0, 8)} শিপিংয়ের জন্য অনুমোদিত হয়েছে।`,
          },
        });
      } catch (_) { /* optional */ }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
