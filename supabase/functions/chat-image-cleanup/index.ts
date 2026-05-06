import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Find expired, not-yet-deleted uploads
    const { data: expired, error: selErr } = await admin
      .from("chat_uploads")
      .select("id, storage_path")
      .lt("expires_at", new Date().toISOString())
      .eq("deleted", false)
      .limit(500);

    if (selErr) throw selErr;

    if (!expired || expired.length === 0) {
      return new Response(JSON.stringify({ deleted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paths = expired.map((r) => r.storage_path);
    const ids = expired.map((r) => r.id);

    // Delete from storage (batch)
    const { error: delErr } = await admin.storage.from("chat-uploads").remove(paths);
    if (delErr) {
      console.error("Storage delete error:", delErr);
      // Continue and still mark deleted to avoid infinite retry on already-missing files
    }

    // Mark rows deleted
    const { error: updErr } = await admin
      .from("chat_uploads")
      .update({ deleted: true, deleted_at: new Date().toISOString() })
      .in("id", ids);

    if (updErr) console.error("DB update error:", updErr);

    console.log(`chat-image-cleanup: removed ${expired.length} files`);

    return new Response(
      JSON.stringify({ deleted: expired.length, paths }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("cleanup error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
