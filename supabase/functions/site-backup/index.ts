import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALL_TABLES = [
  "products",
  "product_variants",
  "product_images",
  "product_reviews",
  "categories",
  "orders",
  "order_items",
  "profiles",
  "site_content",
  "coupons",
  "delivery_zones",
  "blog_posts",
  "bundle_deals",
  "newsletter_subscribers",
  "social_proof_messages",
  "referrals",
  "reward_points",
  "saved_addresses",
  "wishlist",
  "cart_items",
  "chat_histories",
  "email_campaigns",
  "customer_segments",
  "customer_segment_members",
  "staff_permissions",
  "user_roles",
  "blocked_users",
  "back_in_stock_alerts",
  "price_drop_alerts",
  "returns",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user is admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: roleCheck } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, tables, backup_id } = body;

    if (action === "backup") {
      const targetTables = tables && tables.length > 0 ? tables : ALL_TABLES;
      const backupData: Record<string, any[]> = {};
      const errors: string[] = [];

      for (const table of targetTables) {
        if (!ALL_TABLES.includes(table)) continue;
        let allRows: any[] = [];
        let from = 0;
        const pageSize = 1000;
        
        while (true) {
          const { data, error } = await adminClient
            .from(table)
            .select("*")
            .range(from, from + pageSize - 1);
          
          if (error) {
            errors.push(`${table}: ${error.message}`);
            break;
          }
          if (!data || data.length === 0) break;
          allRows = allRows.concat(data);
          if (data.length < pageSize) break;
          from += pageSize;
        }
        backupData[table] = allRows;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupType = targetTables.length === ALL_TABLES.length ? "full" : "selective";
      const fileName = `backup-${backupType}-${timestamp}.json`;
      const jsonStr = JSON.stringify(backupData, null, 2);
      const fileSizeBytes = new TextEncoder().encode(jsonStr).length;

      // Upload to storage
      const { error: uploadErr } = await adminClient.storage
        .from("site-backups")
        .upload(fileName, jsonStr, {
          contentType: "application/json",
          upsert: false,
        });

      if (uploadErr) {
        return new Response(JSON.stringify({ error: uploadErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Record in history
      await adminClient.from("backup_history").insert({
        backup_name: fileName,
        backup_type: backupType,
        tables_included: targetTables,
        file_path: fileName,
        file_size_bytes: fileSizeBytes,
        status: "completed",
        created_by: user.id,
        notes: errors.length > 0 ? `Errors: ${errors.join("; ")}` : null,
      });

      return new Response(
        JSON.stringify({
          success: true,
          fileName,
          tables: targetTables.length,
          totalRows: Object.values(backupData).reduce((s, a) => s + a.length, 0),
          fileSizeBytes,
          errors,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "restore") {
      if (!backup_id) {
        return new Response(JSON.stringify({ error: "backup_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get backup record
      const { data: backupRecord } = await adminClient
        .from("backup_history")
        .select("*")
        .eq("id", backup_id)
        .single();

      if (!backupRecord) {
        return new Response(JSON.stringify({ error: "Backup not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Download backup file
      const { data: fileData, error: dlErr } = await adminClient.storage
        .from("site-backups")
        .download(backupRecord.file_path);

      if (dlErr || !fileData) {
        return new Response(JSON.stringify({ error: "Failed to download backup" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const backupJson = JSON.parse(await fileData.text());
      const targetTables = tables && tables.length > 0
        ? tables.filter((t: string) => backupJson[t])
        : Object.keys(backupJson);

      const results: Record<string, { deleted: number; restored: number; error?: string }> = {};

      // Restore order matters - delete in reverse dependency order
      const deleteOrder = [
        "order_items", "cart_items", "wishlist", "product_reviews",
        "product_images", "product_variants", "price_drop_alerts",
        "back_in_stock_alerts", "reward_points", "returns",
        "customer_segment_members", "referrals", "saved_addresses",
        "chat_histories", "orders", "products", "categories",
        "profiles", "site_content", "coupons", "delivery_zones",
        "blog_posts", "bundle_deals", "newsletter_subscribers",
        "social_proof_messages", "email_campaigns", "customer_segments",
        "staff_permissions", "user_roles", "blocked_users",
      ];

      // Insert order (parents first)
      const insertOrder = [
        "categories", "products", "product_variants", "product_images",
        "profiles", "user_roles", "staff_permissions", "blocked_users",
        "site_content", "coupons", "delivery_zones", "blog_posts",
        "bundle_deals", "newsletter_subscribers", "social_proof_messages",
        "email_campaigns", "customer_segments", "customer_segment_members",
        "orders", "order_items", "cart_items", "wishlist",
        "product_reviews", "price_drop_alerts", "back_in_stock_alerts",
        "reward_points", "returns", "referrals", "saved_addresses",
        "chat_histories",
      ];

      // Delete target tables
      for (const table of deleteOrder) {
        if (!targetTables.includes(table)) continue;
        const { error } = await adminClient.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
        if (error) {
          results[table] = { deleted: 0, restored: 0, error: `delete: ${error.message}` };
        }
      }

      // Insert data
      for (const table of insertOrder) {
        if (!targetTables.includes(table) || !backupJson[table]) continue;
        const rows = backupJson[table];
        if (rows.length === 0) {
          results[table] = { deleted: 0, restored: 0 };
          continue;
        }

        let restored = 0;
        const batchSize = 500;
        let insertError = "";

        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          const { error } = await adminClient.from(table).insert(batch);
          if (error) {
            insertError = error.message;
          } else {
            restored += batch.length;
          }
        }

        results[table] = {
          deleted: rows.length,
          restored,
          ...(insertError ? { error: insertError } : {}),
        };
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "reset") {
      const targetTables = tables && tables.length > 0 ? tables : ALL_TABLES;

      const deleteOrder = [
        "order_items", "cart_items", "wishlist", "product_reviews",
        "product_images", "product_variants", "price_drop_alerts",
        "back_in_stock_alerts", "reward_points", "returns",
        "customer_segment_members", "referrals", "saved_addresses",
        "chat_histories", "orders", "products", "categories",
        "profiles", "site_content", "coupons", "delivery_zones",
        "blog_posts", "bundle_deals", "newsletter_subscribers",
        "social_proof_messages", "email_campaigns", "customer_segments",
        "staff_permissions", "blocked_users",
      ];

      const results: Record<string, { success: boolean; error?: string }> = {};

      for (const table of deleteOrder) {
        if (!targetTables.includes(table)) continue;
        // Never delete user_roles to preserve admin access
        if (table === "user_roles") {
          results[table] = { success: true, error: "Skipped to preserve admin access" };
          continue;
        }
        const { error } = await adminClient.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
        results[table] = error
          ? { success: false, error: error.message }
          : { success: true };
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "download") {
      if (!backup_id) {
        return new Response(JSON.stringify({ error: "backup_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: backupRecord } = await adminClient
        .from("backup_history")
        .select("*")
        .eq("id", backup_id)
        .single();

      if (!backupRecord) {
        return new Response(JSON.stringify({ error: "Backup not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: fileData, error: dlErr } = await adminClient.storage
        .from("site-backups")
        .download(backupRecord.file_path);

      if (dlErr || !fileData) {
        return new Response(JSON.stringify({ error: "Download failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const text = await fileData.text();
      return new Response(text, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${backupRecord.backup_name}"`,
        },
      });
    }

    if (action === "delete_backup") {
      if (!backup_id) {
        return new Response(JSON.stringify({ error: "backup_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: backupRecord } = await adminClient
        .from("backup_history")
        .select("*")
        .eq("id", backup_id)
        .single();

      if (backupRecord) {
        await adminClient.storage.from("site-backups").remove([backupRecord.file_path]);
        await adminClient.from("backup_history").delete().eq("id", backup_id);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
