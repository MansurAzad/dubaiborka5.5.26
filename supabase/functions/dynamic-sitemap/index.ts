import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://dubaiborkahouse.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all products and published blog posts
    const [productsRes, blogsRes] = await Promise.all([
      supabase.from("products").select("slug, id, updated_at, category").order("created_at", { ascending: false }),
      supabase.from("blog_posts").select("slug, updated_at").eq("is_published", true).order("published_at", { ascending: false }),
    ]);

    const products = productsRes.data || [];
    const blogs = blogsRes.data || [];

    // Extract unique categories
    const categories = [...new Set(products.map((p) => p.category))];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${BASE_URL}/shop</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${BASE_URL}/categories</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${BASE_URL}/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${BASE_URL}/contact</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${BASE_URL}/blog</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${BASE_URL}/faq</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;

    // Category pages
    for (const cat of categories) {
      xml += `
  <url>
    <loc>${BASE_URL}/shop?category=${encodeURIComponent(cat)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }

    // Product pages
    for (const product of products) {
      const slug = product.slug || product.id;
      const lastmod = product.updated_at ? new Date(product.updated_at).toISOString().split("T")[0] : "";
      xml += `
  <url>
    <loc>${BASE_URL}/product/${slug}</loc>${lastmod ? `
    <lastmod>${lastmod}</lastmod>` : ""}
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }

    // Blog pages
    for (const blog of blogs) {
      const lastmod = blog.updated_at ? new Date(blog.updated_at).toISOString().split("T")[0] : "";
      xml += `
  <url>
    <loc>${BASE_URL}/blog/${blog.slug}</loc>${lastmod ? `
    <lastmod>${lastmod}</lastmod>` : ""}
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
    }

    xml += `
</urlset>`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Sitemap generation error:", error);
    return new Response("Error generating sitemap", { status: 500, headers: corsHeaders });
  }
});
