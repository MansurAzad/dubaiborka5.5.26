// Steadfast Courier integration edge function.
// Actions: get_balance, approve, submit_order, sync_status, bulk_sync, auto_submit_pending
// Improvements: status mapping table, retry-with-backoff + light rate limiting,
// idempotent notifications, courier_audit_logs entries.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const STEADFAST_BASE = "https://portal.packzy.com/api/v1";

// ──────────────────────────────────────────────────────────────────────────
// Status mapping
// Maps every Steadfast delivery_status (and several legacy aliases) to:
//   - normalized shipment delivery_status
//   - corresponding internal order status
//   - whether it is a "terminal" state (no more sync needed)
// ──────────────────────────────────────────────────────────────────────────
type StatusMeta = {
  normalized: string;
  orderStatus: string | null;
  terminal: boolean;
  isFailure?: boolean;
  codStatus?: "paid" | "unpaid" | "partial" | "pending";
};

const STATUS_MAP: Record<string, StatusMeta> = {
  // Pre-pickup
  pending: { normalized: "pending", orderStatus: null, terminal: false },
  in_review: { normalized: "in_review", orderStatus: "courier_confirmed", terminal: false },
  in_review_pending: { normalized: "in_review", orderStatus: "courier_confirmed", terminal: false },
  // Picked up / on the way
  hold: { normalized: "hold", orderStatus: "courier_confirmed", terminal: false },
  unknown: { normalized: "unknown", orderStatus: null, terminal: false },
  unknown_approval: { normalized: "in_review", orderStatus: "courier_confirmed", terminal: false },
  delivery_in_transit: { normalized: "in_transit", orderStatus: "shipped", terminal: false },
  in_transit: { normalized: "in_transit", orderStatus: "shipped", terminal: false },
  // Final – success
  delivered: { normalized: "delivered", orderStatus: "delivered", terminal: true, codStatus: "paid" },
  delivered_approval_pending: { normalized: "delivered", orderStatus: "delivered", terminal: false, codStatus: "paid" },
  partial_delivered: { normalized: "partial_delivered", orderStatus: "delivered", terminal: true, codStatus: "partial" },
  partial_delivered_approval_pending: { normalized: "partial_delivered", orderStatus: "delivered", terminal: false, codStatus: "partial" },
  // Final – failure
  cancelled: { normalized: "cancelled", orderStatus: "cancelled", terminal: true, isFailure: true },
  cancelled_approval_pending: { normalized: "cancelled", orderStatus: "cancelled", terminal: false, isFailure: true },
  delivery_failed: { normalized: "delivery_failed", orderStatus: "delivery_failed", terminal: true, isFailure: true },
  delivery_failed_approval_pending: { normalized: "delivery_failed", orderStatus: "delivery_failed", terminal: false, isFailure: true },
  lost: { normalized: "lost", orderStatus: "cancelled", terminal: true, isFailure: true },
  return: { normalized: "returned", orderStatus: "returned", terminal: true, isFailure: true },
  returned: { normalized: "returned", orderStatus: "returned", terminal: true, isFailure: true },
};

const mapStatus = (raw: string | null | undefined): StatusMeta => {
  const key = (raw || "").toString().trim().toLowerCase();
  return (
    STATUS_MAP[key] || {
      normalized: key || "unknown",
      orderStatus: null,
      terminal: false,
    }
  );
};

// ──────────────────────────────────────────────────────────────────────────
// Rate limiting / retry-with-backoff for Steadfast API
// ──────────────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let lastApiCallTs = 0;
const MIN_INTERVAL_MS = 350; // ~3 req/sec, well within Steadfast limits

const callSteadfast = async (
  path: string,
  method: "GET" | "POST",
  body?: unknown,
  maxRetries = 4,
) => {
  const apiKey = Deno.env.get("STEADFAST_API_KEY");
  const secretKey = Deno.env.get("STEADFAST_SECRET_KEY");
  if (!apiKey || !secretKey) {
    throw new Error("Steadfast API credentials missing");
  }

  let attempt = 0;
  let lastErr: Error | null = null;

  while (attempt <= maxRetries) {
    // simple rate limiter
    const wait = MIN_INTERVAL_MS - (Date.now() - lastApiCallTs);
    if (wait > 0) await sleep(wait);
    lastApiCallTs = Date.now();

    try {
      const res = await fetch(`${STEADFAST_BASE}${path}`, {
        method,
        headers: {
          "Api-Key": apiKey,
          "Secret-Key": secretKey,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = { raw: text };
      }

      // Retry on rate-limit / transient server errors
      if (res.status === 429 || res.status >= 500) {
        const backoff = Math.min(8000, 500 * 2 ** attempt) +
          Math.floor(Math.random() * 250);
        console.warn(
          `Steadfast ${path} ${res.status} → retry ${attempt + 1}/${maxRetries} in ${backoff}ms`,
        );
        await sleep(backoff);
        attempt++;
        lastErr = new Error(
          `Steadfast ${path} [${res.status}]: ${JSON.stringify(json)}`,
        );
        continue;
      }

      if (!res.ok) {
        throw new Error(
          `Steadfast ${path} failed [${res.status}]: ${JSON.stringify(json)}`,
        );
      }
      return json;
    } catch (e) {
      // Network errors – retry with backoff
      lastErr = e as Error;
      const msg = lastErr.message || "";
      if (
        attempt < maxRetries &&
        /network|fetch|timeout|ECONNRESET|EAI_AGAIN/i.test(msg)
      ) {
        const backoff = Math.min(8000, 500 * 2 ** attempt) +
          Math.floor(Math.random() * 250);
        console.warn(`Steadfast ${path} network err → retry in ${backoff}ms`);
        await sleep(backoff);
        attempt++;
        continue;
      }
      throw lastErr;
    }
  }
  throw lastErr || new Error("Steadfast call failed after retries");
};

// ──────────────────────────────────────────────────────────────────────────
// Audit log
// ──────────────────────────────────────────────────────────────────────────
const audit = async (
  admin: any,
  params: {
    shipment_id?: string | null;
    order_id?: string | null;
    action: string;
    actor_user_id?: string | null;
    actor_role?: string | null;
    success: boolean;
    error_message?: string | null;
    details?: Record<string, unknown>;
  },
) => {
  try {
    await admin.from("courier_audit_logs").insert({
      shipment_id: params.shipment_id || null,
      order_id: params.order_id || null,
      action: params.action,
      actor_user_id: params.actor_user_id || null,
      actor_role: params.actor_role || null,
      success: params.success,
      error_message: params.error_message || null,
      details: params.details || {},
    });
  } catch (e) {
    console.error("audit insert failed", e);
  }
};

// ──────────────────────────────────────────────────────────────────────────
// Idempotent customer notifications
// We compute an idempotency key per (event, consignment_id|shipment_id) and
// store it inside notifications_sent so the same email is never sent twice.
// ──────────────────────────────────────────────────────────────────────────
const notify = async (
  admin: any,
  shipment: any,
  event: "approved" | "submitted" | "delivered",
) => {
  try {
    const sent = (shipment.notifications_sent || {}) as Record<string, any>;
    const idemKey = `${event}:${shipment.consignment_id || shipment.id}`;
    if (sent[event] || sent[`__keys`]?.[idemKey]) return;

    const { data: order } = await admin
      .from("orders")
      .select("id, guest_name, guest_email, shipping_phone, user_id, total")
      .eq("id", shipment.order_id)
      .single();
    if (!order) return;

    let email = order.guest_email as string | null;
    let name = (order.guest_name as string | null) || shipment.recipient_name;
    if (!email && order.user_id) {
      const { data: prof } = await admin
        .from("profiles")
        .select("full_name")
        .eq("user_id", order.user_id)
        .single();
      name = prof?.full_name || name;
      try {
        const { data: u } = await admin.auth.admin.getUserById(order.user_id);
        email = u?.user?.email || null;
      } catch (_) { /* ignore */ }
    }

    await admin.functions.invoke("send-shipping-notification", {
      body: {
        event,
        idempotency_key: idemKey,
        order_id: order.id,
        shipment_id: shipment.id,
        recipient_email: email,
        recipient_name: name,
        recipient_phone: shipment.recipient_phone,
        tracking_code: shipment.tracking_code,
        consignment_id: shipment.consignment_id,
        total: order.total,
      },
    });

    const keys = (sent.__keys || {}) as Record<string, string>;
    keys[idemKey] = new Date().toISOString();
    sent[event] = new Date().toISOString();
    sent.__keys = keys;

    await admin
      .from("courier_shipments")
      .update({ notifications_sent: sent })
      .eq("id", shipment.id);
  } catch (e) {
    console.error("notify error", e);
  }
};

// ──────────────────────────────────────────────────────────────────────────
// Submit / Sync helpers
// ──────────────────────────────────────────────────────────────────────────
const submitShipment = async (
  admin: any,
  shipmentId: string,
  actor?: { user_id?: string; role?: string },
) => {
  const { data: ship, error: shipErr } = await admin
    .from("courier_shipments")
    .select("*")
    .eq("id", shipmentId)
    .single();
  if (shipErr || !ship) throw new Error("Shipment not found");
  if (!ship.admin_approved) throw new Error("Admin approval required");
  if (ship.consignment_id) throw new Error("Already submitted");

  const payload = {
    invoice: ship.invoice || `INV-${ship.id.slice(0, 8)}`,
    recipient_name: ship.recipient_name,
    recipient_phone: ship.recipient_phone,
    recipient_address: ship.recipient_address,
    cod_amount: Number(ship.cod_amount) || 0,
    note: ship.note || undefined,
  };

  try {
    const result = await callSteadfast("/create_order", "POST", payload);
    const consignment = result?.consignment || {};
    const meta = mapStatus(consignment.status);

    await admin
      .from("courier_shipments")
      .update({
        consignment_id: consignment.consignment_id?.toString() || null,
        tracking_code: consignment.tracking_code || null,
        delivery_status: meta.normalized,
        status: "submitted",
        submitted_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
        raw_response: result,
        error_message: null,
      })
      .eq("id", shipmentId);

    if (consignment.tracking_code) {
      await admin
        .from("orders")
        .update({
          tracking_number: consignment.tracking_code,
          courier_name: "Steadfast",
          status: meta.orderStatus || "courier_confirmed",
        })
        .eq("id", ship.order_id);
    }

    const { data: refreshed } = await admin
      .from("courier_shipments")
      .select("*")
      .eq("id", shipmentId)
      .single();
    if (refreshed) await notify(admin, refreshed, "submitted");

    await audit(admin, {
      shipment_id: shipmentId,
      order_id: ship.order_id,
      action: "submit",
      actor_user_id: actor?.user_id,
      actor_role: actor?.role,
      success: true,
      details: {
        consignment_id: consignment.consignment_id,
        tracking_code: consignment.tracking_code,
      },
    });

    return result;
  } catch (e) {
    const msg = (e as Error).message;
    await admin
      .from("courier_shipments")
      .update({ error_message: msg })
      .eq("id", shipmentId);
    await audit(admin, {
      shipment_id: shipmentId,
      order_id: ship.order_id,
      action: "submit",
      actor_user_id: actor?.user_id,
      actor_role: actor?.role,
      success: false,
      error_message: msg,
    });
    throw e;
  }
};

const syncShipment = async (
  admin: any,
  shipmentId: string,
  actor?: { user_id?: string; role?: string },
) => {
  const { data: ship } = await admin
    .from("courier_shipments")
    .select("*")
    .eq("id", shipmentId)
    .single();
  if (!ship?.consignment_id) throw new Error("No consignment to sync");

  try {
    const data = await callSteadfast(
      `/status_by_cid/${ship.consignment_id}`,
      "GET",
    );
    const rawStatus = data?.delivery_status || data?.status || null;
    const meta = mapStatus(rawStatus);

    const updates: Record<string, unknown> = {
      delivery_status: meta.normalized,
      last_synced_at: new Date().toISOString(),
      raw_response: data,
      error_message: null,
    };

    // COD handling – Steadfast returns it on delivered consignments
    const codAmt = Number(data?.cod_amount || 0);
    if (meta.codStatus === "paid" || meta.normalized === "delivered") {
      updates.cod_payment_status = "paid";
      updates.cod_paid_amount = codAmt > 0 ? codAmt : Number(ship.cod_amount);
      updates.cod_settled_at = new Date().toISOString();
    } else if (meta.codStatus === "partial") {
      updates.cod_payment_status = "partial";
      if (codAmt > 0) updates.cod_paid_amount = codAmt;
    } else if (data?.cod_status && data.cod_status !== ship.cod_payment_status) {
      updates.cod_payment_status = data.cod_status;
    }

    await admin.from("courier_shipments").update(updates).eq("id", shipmentId);

    if (meta.orderStatus) {
      const orderUpdates: Record<string, unknown> = { status: meta.orderStatus };
      if (meta.normalized === "delivered") {
        orderUpdates.cod_collected = true;
        orderUpdates.cod_collected_at = new Date().toISOString();
        orderUpdates.payment_status = "paid";
      }
      await admin.from("orders").update(orderUpdates).eq("id", ship.order_id);
    }

    if (meta.normalized === "delivered") {
      const { data: refreshed } = await admin
        .from("courier_shipments")
        .select("*")
        .eq("id", shipmentId)
        .single();
      if (refreshed) await notify(admin, refreshed, "delivered");
    }

    await audit(admin, {
      shipment_id: shipmentId,
      order_id: ship.order_id,
      action: "sync",
      actor_user_id: actor?.user_id,
      actor_role: actor?.role,
      success: true,
      details: {
        raw_status: rawStatus,
        normalized: meta.normalized,
        terminal: meta.terminal,
      },
    });

    return {
      status: meta.normalized,
      raw_status: rawStatus,
      cod_status: updates.cod_payment_status || ship.cod_payment_status,
      terminal: meta.terminal,
    };
  } catch (e) {
    const msg = (e as Error).message;
    await admin
      .from("courier_shipments")
      .update({ error_message: msg, last_synced_at: new Date().toISOString() })
      .eq("id", shipmentId);
    await audit(admin, {
      shipment_id: shipmentId,
      order_id: ship.order_id,
      action: "sync",
      actor_user_id: actor?.user_id,
      actor_role: actor?.role,
      success: false,
      error_message: msg,
    });
    throw e;
  }
};

// ──────────────────────────────────────────────────────────────────────────
// Server
// ──────────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { action, shipment_id, scheduled_secret } = body;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const isScheduled = scheduled_secret &&
      scheduled_secret === Deno.env.get("STEADFAST_API_KEY");

    let actor: { user_id?: string; role?: string } = { role: "system" };

    if (!isScheduled) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user?.id) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userId = userData.user.id;
      const { data: hasPerm } = await supabase.rpc("has_permission", {
        _user_id: userId,
        _permission: "shipping.manage",
      });
      if (!hasPerm) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      actor = { user_id: userId, role: isAdmin ? "admin" : "moderator" };
    }

    if (action === "get_balance") {
      const data = await callSteadfast("/get_balance", "GET");
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "approve") {
      const { data: setting } = await admin
        .from("system_settings")
        .select("value")
        .eq("key", "courier_auto_submit")
        .single();
      const autoSubmit = !!setting?.value?.enabled;

      await admin
        .from("courier_shipments")
        .update({
          admin_approved: true,
          approved_by: actor.user_id || null,
          approved_at: new Date().toISOString(),
        })
        .eq("id", shipment_id);

      const { data: ship } = await admin
        .from("courier_shipments")
        .select("*")
        .eq("id", shipment_id)
        .single();
      if (ship) await notify(admin, ship, "approved");

      await audit(admin, {
        shipment_id,
        order_id: ship?.order_id,
        action: "approve",
        actor_user_id: actor.user_id,
        actor_role: actor.role,
        success: true,
        details: { auto_submit: autoSubmit },
      });

      let submitResult: any = null;
      let submitError: string | null = null;
      if (autoSubmit && ship && !ship.consignment_id) {
        try {
          submitResult = await submitShipment(admin, shipment_id, actor);
        } catch (e) {
          submitError = (e as Error).message;
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          auto_submitted: !!submitResult,
          submit_error: submitError,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "submit_order") {
      const result = await submitShipment(admin, shipment_id, actor);
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "sync_status") {
      const r = await syncShipment(admin, shipment_id, actor);
      return new Response(JSON.stringify({ success: true, ...r }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "bulk_sync" || action === "scheduled_sync") {
      const { data: rows } = await admin
        .from("courier_shipments")
        .select("id, consignment_id, delivery_status")
        .not("consignment_id", "is", null)
        .not(
          "delivery_status",
          "in",
          "(delivered,cancelled,lost,delivery_failed,returned,partial_delivered)",
        )
        .limit(50);
      const results: any[] = [];
      let okCount = 0;
      let failCount = 0;
      for (const r of rows || []) {
        try {
          const out = await syncShipment(admin, r.id, actor);
          results.push({ id: r.id, ok: true, ...out });
          okCount++;
        } catch (e) {
          results.push({ id: r.id, ok: false, error: (e as Error).message });
          failCount++;
        }
      }
      await audit(admin, {
        action: "bulk_sync",
        actor_user_id: actor.user_id,
        actor_role: actor.role,
        success: failCount === 0,
        details: { total: results.length, ok: okCount, failed: failCount },
      });
      return new Response(
        JSON.stringify({
          success: true,
          synced: okCount,
          failed: failCount,
          results,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "auto_submit_pending") {
      const { data: rows } = await admin
        .from("courier_shipments")
        .select("id")
        .eq("admin_approved", true)
        .is("consignment_id", null)
        .eq("status", "pending")
        .limit(50);
      const results: any[] = [];
      for (const r of rows || []) {
        try {
          await submitShipment(admin, r.id, actor);
          results.push({ id: r.id, ok: true });
        } catch (e) {
          results.push({ id: r.id, ok: false, error: (e as Error).message });
        }
      }
      return new Response(
        JSON.stringify({ success: true, submitted: results.length, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("steadfast-courier error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
