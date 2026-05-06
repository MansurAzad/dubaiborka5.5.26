import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const TTL_MINUTES = 5;

// In-memory rate limiter (per IP)
const rateMap = new Map<string, { count: number; resetAt: number }>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const e = rateMap.get(ip);
  if (!e || now > e.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 }); // 1 hr window
    return false;
  }
  e.count++;
  return e.count > 15; // max 15 uploads/hr/IP
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    if (rateLimited(ip)) {
      return new Response(JSON.stringify({ error: "Too many uploads. Try again in an hour." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!ALLOWED_MIME.has(file.type)) {
      return new Response(JSON.stringify({ error: `Unsupported type: ${file.type}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (file.size > MAX_BYTES) {
      return new Response(JSON.stringify({ error: "File too large (max 5MB)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const ext = file.type.split("/")[1] || "jpg";
    const id = crypto.randomUUID();
    const path = `${id}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: upErr } = await admin.storage
      .from("chat-uploads")
      .upload(path, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (upErr) {
      console.error("Storage upload failed:", upErr);
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: pub } = admin.storage.from("chat-uploads").getPublicUrl(path);
    const publicUrl = pub.publicUrl;
    const expiresAt = new Date(Date.now() + TTL_MINUTES * 60 * 1000).toISOString();

    const { data: row, error: insErr } = await admin
      .from("chat_uploads")
      .insert({
        storage_path: path,
        public_url: publicUrl,
        ip_address: ip,
        mime_type: file.type,
        size_bytes: file.size,
        expires_at: expiresAt,
      })
      .select("id, expires_at")
      .single();

    if (insErr) {
      console.error("DB insert failed:", insErr);
      // Best effort: still return URL so user can use it; cleanup may miss
    }

    return new Response(
      JSON.stringify({
        success: true,
        url: publicUrl,
        id: row?.id,
        expires_at: expiresAt,
        ttl_minutes: TTL_MINUTES,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("chat-image-upload error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
