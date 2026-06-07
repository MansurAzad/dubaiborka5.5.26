import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const mask = (v: string | undefined) => {
  if (!v) return "";
  if (v.length <= 4) return "••••";
  return "••••" + v.slice(-4);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const CLOUD_NAME = Deno.env.get("CLOUDINARY_CLOUD_NAME") || "";
  const API_KEY = Deno.env.get("CLOUDINARY_API_KEY") || "";
  const API_SECRET = Deno.env.get("CLOUDINARY_API_SECRET") || "";

  const configured = Boolean(CLOUD_NAME && API_KEY && API_SECRET);

  const baseStatus = {
    configured,
    cloud_name: CLOUD_NAME || null,
    api_key_masked: mask(API_KEY),
    api_secret_present: Boolean(API_SECRET),
    checked_at: new Date().toISOString(),
  };

  if (!configured) {
    return json({
      success: false,
      reachable: false,
      reason: "missing_credentials",
      message:
        "Cloudinary credentials অসম্পূর্ণ। CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY এবং CLOUDINARY_API_SECRET — তিনটিই Backend → Secrets-এ সেট করুন।",
      ...baseStatus,
    });
  }

  // Lightweight reachability test: call /resources/image with admin auth (HEAD-ish).
  // This verifies cloud_name + key + secret without uploading anything.
  try {
    const auth = btoa(`${API_KEY}:${API_SECRET}`);
    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/image?max_results=1`;
    const started = Date.now();
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Basic ${auth}` },
    });
    const latency_ms = Date.now() - started;
    const text = await res.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      /* keep text */
    }

    if (!res.ok) {
      const message =
        parsed?.error?.message || `Cloudinary API responded ${res.status}`;
      console.error("[cloudinary-status] failed", {
        status: res.status,
        message,
        cloud_name: CLOUD_NAME,
      });
      return json({
        success: false,
        reachable: true,
        reason:
          res.status === 401
            ? "invalid_credentials"
            : res.status === 404
            ? "invalid_cloud_name"
            : "api_error",
        http_status: res.status,
        message,
        latency_ms,
        ...baseStatus,
      });
    }

    return json({
      success: true,
      reachable: true,
      latency_ms,
      message: "Cloudinary connection ✓",
      resources_sample_count: Array.isArray(parsed?.resources)
        ? parsed.resources.length
        : 0,
      ...baseStatus,
    });
  } catch (err: any) {
    console.error("[cloudinary-status] network error", err);
    return json({
      success: false,
      reachable: false,
      reason: "network_error",
      message: err?.message || String(err),
      ...baseStatus,
    });
  }
});
