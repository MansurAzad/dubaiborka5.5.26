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

    // Fetch all products with images
    const { data: products, error } = await supabase
      .from("products")
      .select("id, name, description, price, sale_price, image_url, category, stock, slug, material, sizes, colors")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const categoryMapping: Record<string, string> = {
      Abayas: "Apparel & Accessories > Clothing > Dresses > Abayas",
      Borkas: "Apparel & Accessories > Clothing > Dresses > Abayas",
      Hijabs: "Apparel & Accessories > Clothing Accessories > Scarves & Shawls",
      Kaftans: "Apparel & Accessories > Clothing > Dresses > Kaftans",
      Scarves: "Apparel & Accessories > Clothing Accessories > Scarves & Shawls",
      Fabrics: "Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts > Crafting Fabrics",
    };

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>Dubai Borka House</title>
<link>${BASE_URL}</link>
<description>দুবাই বোরকা হাউস — বাংলাদেশের সেরা প্রিমিয়াম বোরকা, আবায়া ও ইসলামিক ফ্যাশন শপ।</description>`;

    for (const product of (products || [])) {
      const slug = product.slug || product.id;
      const currentPrice = product.sale_price || product.price;
      const availability = (product.stock && product.stock > 0) ? "in_stock" : "out_of_stock";
      const googleCategory = categoryMapping[product.category] || "Apparel & Accessories > Clothing";
      const imageUrl = product.image_url && product.image_url !== "/placeholder.svg" 
        ? product.image_url 
        : `${BASE_URL}/favicon.jpg`;

      xml += `
<item>
  <g:id>${product.id}</g:id>
  <g:title><![CDATA[${product.name}]]></g:title>
  <g:description><![CDATA[${product.description || `প্রিমিয়াম ${product.category} — দুবাই বোরকা হাউস`}]]></g:description>
  <g:link>${BASE_URL}/product/${slug}</g:link>
  <g:image_link>${imageUrl}</g:image_link>
  <g:availability>${availability}</g:availability>
  <g:price>${currentPrice} BDT</g:price>${product.sale_price ? `
  <g:sale_price>${product.sale_price} BDT</g:sale_price>` : ""}
  <g:brand>Dubai Borka House</g:brand>
  <g:condition>new</g:condition>
  <g:google_product_category>${googleCategory}</g:google_product_category>
  <g:product_type>${product.category}</g:product_type>${product.material ? `
  <g:material>${product.material}</g:material>` : ""}${product.colors && product.colors.length > 0 ? `
  <g:color>${product.colors[0]}</g:color>` : ""}${product.sizes && product.sizes.length > 0 ? `
  <g:size>${product.sizes.join("/")}</g:size>` : ""}
  <g:shipping>
    <g:country>BD</g:country>
    <g:price>60 BDT</g:price>
  </g:shipping>
</item>`;
    }

    xml += `
</channel>
</rss>`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Product feed generation error:", error);
    return new Response("Error generating product feed", { status: 500, headers: corsHeaders });
  }
});
