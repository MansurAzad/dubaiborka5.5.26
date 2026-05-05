// Public webhook endpoint for Steadfast delivery status updates.
// Steadfast posts JSON like:
//   { consignment_id, tracking_code, invoice, status, cod_status, cod_amount, ... }
// Authenticated via shared secret stored in system_settings.courier_webhook_secret
// passed as ?secret=... query param OR X-Webhook-Secret header.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-webhook-secret",
};

const STATUS_MAP: Record<string, { normalized: string; orderStatus: string | null; codPaid?: boolean }> = {
  pending: { normalized: "pending", orderStatus: null },
  in_review: { normalized: "in_review", orderStatus: "courier_confirmed" },
  hold: { normalized: "hold", orderStatus: "courier_confirmed" },
  in_transit: { normalized: "in_transit", orderStatus: "shipped" },
  delivery_in_transit: { normalized: "in_transit", orderStatus: "shipped" },
  delivered: { normalized: "delivered", orderStatus: "delivered", codPaid: true },
  partial_delivered: { normalized: "partial_delivered", orderStatus: "delivered" },
  cancelled: { normalized: "cancelled", orderStatus: "cancelled" },
  delivery_failed: { normalized: "delivery_failed", orderStatus: "delivery_failed" },
  lost: { normalized: "lost", orderStatus: "cancelled" },
  return: { normalized: "returned", orderStatus: "returned" },
  returned: { normalized: "returned", orderStatus: "returned" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const url = new URL(req.url);
    const provided = req.headers.get("x-webhook-secret") || url.searchParams.get("secret") || "";
    const { data: setting } = await admin
      .from("system_settings").select("value").eq("key", "courier_webhook_secret").single();
    const expected = setting?.value?.secret;
    if (!expected || provided !== expected) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const consignment_id = (body.consignment_id ?? body.consignmentId ?? "")?.toString();
    const invoice = body.invoice ?? body.invoice_id ?? null;
    const tracking_code = body.tracking_code ?? null;
    const rawStatus = (body.status ?? body.delivery_status ?? "").toString().toLowerCase();
    const cod_amount = Number(body.cod_amount ?? 0);
    const cod_status = (body.cod_status ?? "").toString().toLowerCase();

    if (!consignment_id && !invoice && !tracking_code) {
      return new Response(JSON.stringify({ error: "Missing identifier" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let q = admin.from("courier_shipments").select("*").limit(1);
    if (consignment_id) q = q.eq("consignment_id", consignment_id);
    else if (tracking_code) q = q.eq("tracking_code", tracking_code);
    else q = q.eq("invoice", invoice);
    const { data: ships } = await q;
    const ship = ships?.[0];
    if (!ship) {
      return new Response(JSON.stringify({ error: "Shipment not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const meta = STATUS_MAP[rawStatus] || { normalized: rawStatus || "unknown", orderStatus: null };
    const updates: Record<string, unknown> = {
      delivery_status: meta.normalized,
      last_synced_at: new Date().toISOString(),
      raw_response: body,
    };
    if (meta.codPaid || cod_status === "paid") {
      updates.cod_payment_status = "paid";
      updates.cod_paid_amount = cod_amount > 0 ? cod_amount : Number(ship.cod_amount);
      updates.cod_settled_at = new Date().toISOString();
    } else if (cod_status === "partial") {
      updates.cod_payment_status = "partial";
      if (cod_amount > 0) updates.cod_paid_amount = cod_amount;
    }
    await admin.from("courier_shipments").update(updates).eq("id", ship.id);

    if (meta.orderStatus) {
      const ou: Record<string, unknown> = { status: meta.orderStatus };
      if (meta.normalized === "delivered") {
        ou.cod_collected = true;
        ou.cod_collected_at = new Date().toISOString();
        ou.payment_status = "paid";
      }
      await admin.from("orders").update(ou).eq("id", ship.order_id);
    }

    await admin.from("courier_audit_logs").insert({
      shipment_id: ship.id,
      order_id: ship.order_id,
      action: "webhook",
      actor_role: "steadfast",
      success: true,
      details: { raw_status: rawStatus, normalized: meta.normalized },
    });

    return new Response(JSON.stringify({ success: true, status: meta.normalized }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
