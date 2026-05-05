import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const tools = [
  {
    type: "function",
    function: {
      name: "get_dashboard_summary",
      description: "Get overall dashboard summary: total products, orders, revenue, pending orders, low stock count, recent orders, today's stats.",
      parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "search_products",
      description: "Search products by name, category, or filters. Returns product list with stock info.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search keyword" },
          category: { type: "string", description: "Category filter" },
          low_stock_only: { type: "boolean", description: "Only show products with stock <= 1" },
          out_of_stock_only: { type: "boolean", description: "Only show out of stock products" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_product_stock",
      description: "Update stock quantity for a product. Can set absolute value or add/subtract.",
      parameters: {
        type: "object",
        properties: {
          product_id: { type: "string", description: "Product UUID" },
          product_name: { type: "string", description: "Product name to find" },
          stock: { type: "number", description: "New stock value (absolute)" },
          adjust: { type: "number", description: "Adjust stock by this amount (+/-)" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_product_price",
      description: "Update price or sale_price for a product.",
      parameters: {
        type: "object",
        properties: {
          product_id: { type: "string", description: "Product UUID" },
          product_name: { type: "string", description: "Product name to find" },
          price: { type: "number", description: "New regular price" },
          sale_price: { type: "number", description: "New sale price (null to remove)" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "toggle_product_featured",
      description: "Toggle a product's featured status.",
      parameters: {
        type: "object",
        properties: {
          product_id: { type: "string", description: "Product UUID" },
          product_name: { type: "string", description: "Product name to find" },
          featured: { type: "boolean", description: "Set featured status" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_orders",
      description: "Get orders with optional filters: status, date range, phone number, limit.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by status: pending, processing, shipped, delivered, cancelled" },
          phone: { type: "string", description: "Filter by customer phone" },
          limit: { type: "number", description: "Max results (default 20)" },
          recent_days: { type: "number", description: "Orders from last N days" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_order_details",
      description: "Get full details of a specific order including items, payment info, tracking, and customer details.",
      parameters: {
        type: "object",
        properties: {
          order_id: { type: "string", description: "Order UUID or short ID (first 8 chars)" },
        },
        required: ["order_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_order_status",
      description: "Update an order's status. Can also set tracking number, courier name, and payment info.",
      parameters: {
        type: "object",
        properties: {
          order_id: { type: "string", description: "Order UUID or short ID" },
          status: { type: "string", description: "New status: pending, processing, shipped, delivered, cancelled" },
          tracking_number: { type: "string", description: "Tracking number" },
          courier_name: { type: "string", description: "Courier name" },
          payment_verified: { type: "boolean", description: "Mark payment as verified" },
          notes: { type: "string", description: "Admin notes for the order" },
        },
        required: ["order_id", "status"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_customers",
      description: "Get customer list with optional search by name or phone.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Search by name or phone" },
          limit: { type: "number", description: "Max results (default 20)" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_revenue_report",
      description: "Get revenue analytics: total revenue, daily/weekly breakdown, top products, category breakdown, city breakdown.",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "Report for last N days (default 30)" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "manage_coupon",
      description: "Create, update, toggle, delete, or list coupons.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["list", "create", "toggle", "delete"], description: "Action to perform" },
          code: { type: "string", description: "Coupon code" },
          discount_type: { type: "string", enum: ["percentage", "fixed"], description: "Discount type" },
          discount_value: { type: "number", description: "Discount value" },
          minimum_order_amount: { type: "number", description: "Min order amount" },
          max_uses: { type: "number", description: "Maximum uses allowed" },
          is_active: { type: "boolean", description: "Active status (for toggle)" },
          description: { type: "string", description: "Coupon description" },
        },
        required: ["action"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_low_stock_alerts",
      description: "Get all products with low stock (<=1) or out of stock, sorted by urgency.",
      parameters: {
        type: "object",
        properties: { threshold: { type: "number", description: "Stock threshold (default 1)" } },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bulk_update_stock",
      description: "Update stock for multiple products at once.",
      parameters: {
        type: "object",
        properties: {
          updates: {
            type: "array",
            items: {
              type: "object",
              properties: { product_id: { type: "string" }, stock: { type: "number" } },
              required: ["product_id", "stock"],
              additionalProperties: false,
            },
          },
        },
        required: ["updates"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_product",
      description: "Create a new product with optional variants. Required: name, category, price. Optional: description, stock, sale_price, sizes, colors, material, featured, image_url, video_url, variants (array of size/color/stock/image_url combos).",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" }, category: { type: "string" }, price: { type: "number" },
          sale_price: { type: "number" }, description: { type: "string" }, stock: { type: "number" },
          sizes: { type: "array", items: { type: "string" } }, colors: { type: "array", items: { type: "string" } },
          material: { type: "string" }, featured: { type: "boolean" }, image_url: { type: "string" }, video_url: { type: "string" },
          gallery_images: {
            type: "array",
            description: "Additional gallery image URLs for product_images table. Each can have image_url and alt_text.",
            items: {
              type: "object",
              properties: { image_url: { type: "string", description: "Gallery image URL" }, alt_text: { type: "string", description: "Alt text for the image" } },
              required: ["image_url"],
              additionalProperties: false,
            },
          },
          variants: {
            type: "array",
            description: "Optional variants with individual stock and image_url for each variant",
            items: {
              type: "object",
              properties: { size: { type: "string" }, color: { type: "string" }, stock: { type: "number" }, sku: { type: "string" }, price_adjustment: { type: "number" }, image_url: { type: "string", description: "Image URL for this variant" } },
              required: [],
              additionalProperties: false,
            },
          },
        },
        required: ["name", "category", "price"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_product",
      description: "Update any product fields.",
      parameters: {
        type: "object",
        properties: {
          product_id: { type: "string" }, product_name: { type: "string" },
          name: { type: "string" }, category: { type: "string" }, price: { type: "number" },
          sale_price: { type: "number" }, description: { type: "string" }, stock: { type: "number" },
          sizes: { type: "array", items: { type: "string" } }, colors: { type: "array", items: { type: "string" } },
          material: { type: "string" }, featured: { type: "boolean" }, image_url: { type: "string" }, video_url: { type: "string" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_product",
      description: "Delete a product by ID or name. Also deletes related variants and images.",
      parameters: {
        type: "object",
        properties: {
          product_id: { type: "string" }, product_name: { type: "string" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
   {
    type: "function",
    function: {
      name: "add_bulk_products",
      description: "Add up to 200 products at once (processed in batches of 50). Each product needs name, category, price. Optional: description, stock, sale_price, sizes, colors, material, featured, image_url. Each product can also have variants with image_url.",
      parameters: {
        type: "object",
        properties: {
          products: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" }, category: { type: "string" }, price: { type: "number" },
                sale_price: { type: "number" }, description: { type: "string" }, stock: { type: "number" },
                sizes: { type: "array", items: { type: "string" } }, colors: { type: "array", items: { type: "string" } },
                material: { type: "string" }, featured: { type: "boolean" }, image_url: { type: "string" }, video_url: { type: "string", description: "Product video URL (direct MP4/WebM or YouTube/Vimeo link)" },
                gallery_images: {
                  type: "array",
                  description: "Additional gallery image URLs for product_images table",
                  items: {
                    type: "object",
                    properties: { image_url: { type: "string" }, alt_text: { type: "string" } },
                    required: ["image_url"],
                    additionalProperties: false,
                  },
                },
                variants: {
                  type: "array",
                  description: "Optional variants (size/color combos) with individual stock and image_url for each variant",
                  items: {
                    type: "object",
                    properties: { size: { type: "string" }, color: { type: "string" }, stock: { type: "number" }, sku: { type: "string" }, price_adjustment: { type: "number" }, image_url: { type: "string", description: "Image URL for this variant color" } },
                    required: [],
                    additionalProperties: false,
                  },
                },
              },
              required: ["name", "category", "price"],
              additionalProperties: false,
            },
          },
        },
        required: ["products"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "manage_variants",
      description: "Manage product variants (size/color combinations with individual stock). Actions: list, add, update, delete, bulk_add.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["list", "add", "bulk_add", "update", "delete"] },
          product_id: { type: "string" }, product_name: { type: "string" },
          variant_id: { type: "string" }, size: { type: "string" }, color: { type: "string" },
          stock: { type: "number" }, sku: { type: "string" }, price_adjustment: { type: "number" },
          image_url: { type: "string", description: "Image URL for the variant color" },
          variants: {
            type: "array",
            items: {
              type: "object",
              properties: { size: { type: "string" }, color: { type: "string" }, stock: { type: "number" }, sku: { type: "string" }, price_adjustment: { type: "number" }, image_url: { type: "string" } },
              required: [],
              additionalProperties: false,
            },
          },
        },
        required: ["action"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_reviews_summary",
      description: "Get review statistics and recent reviews.",
      parameters: {
        type: "object",
        properties: { product_id: { type: "string" } },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "manage_delivery_zones",
      description: "List, create, update, or toggle delivery zones with shipping charges.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["list", "create", "update", "toggle"], description: "Action" },
          zone_id: { type: "string" },
          zone_name: { type: "string" },
          city: { type: "string" },
          areas: { type: "array", items: { type: "string" } },
          shipping_charge: { type: "number" },
          estimated_days: { type: "number" },
          is_active: { type: "boolean" },
        },
        required: ["action"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "manage_blog_posts",
      description: "List, create, update, publish/unpublish, or delete blog posts.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["list", "create", "update", "toggle_publish", "delete"] },
          post_id: { type: "string" },
          title: { type: "string" },
          slug: { type: "string" },
          content: { type: "string" },
          excerpt: { type: "string" },
          category: { type: "string" },
          image_url: { type: "string" },
          is_published: { type: "boolean" },
        },
        required: ["action"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_newsletter_subscribers",
      description: "Get newsletter subscribers count and list.",
      parameters: {
        type: "object",
        properties: { limit: { type: "number" } },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "manage_returns",
      description: "List returns or update return status/refund.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["list", "update"] },
          return_id: { type: "string" },
          status: { type: "string", enum: ["pending", "approved", "rejected", "refunded"] },
          refund_amount: { type: "number" },
          admin_notes: { type: "string" },
        },
        required: ["action"],
        additionalProperties: false,
      },
    },
  },
];

const SYSTEM_PROMPT = `আপনি **দুবাই বোরকা হাউজ** এর অ্যাডমিন AI এজেন্ট। আপনি অ্যাডমিনদের সম্পূর্ণ স্টোর ম্যানেজমেন্টে সাহায্য করেন।

## আপনার ক্ষমতা:
📊 **ড্যাশবোর্ড:** সামগ্রিক পরিসংখ্যান, রেভিনিউ রিপোর্ট
📦 **ইনভেন্টরি:** স্টক চেক, আপডেট, লো স্টক অ্যালার্ট, বাল্ক আপডেট
🛒 **অর্ডার:** অর্ডার তালিকা, বিস্তারিত দেখা, স্ট্যাটাস আপডেট, ট্র্যাকিং, পেমেন্ট ভেরিফাই
💰 **প্রাইসিং:** মূল্য আপডেট, সেল প্রাইস সেট
🎟️ **কুপন:** কুপন তৈরি, তালিকা, টগল, ডিলিট
👥 **কাস্টমার:** কাস্টমার তালিকা ও সার্চ
⭐ **রিভিউ:** রিভিউ সামারি ও তালিকা
📈 **রিপোর্ট:** রেভিনিউ, ট্রেন্ড, টপ প্রোডাক্ট, শহর ভিত্তিক
➕ **প্রোডাক্ট CRUD:** প্রোডাক্ট তৈরি, আপডেট, ডিলিট, মাল্টি প্রোডাক্ট যুক্ত
🔀 **ভেরিয়েশন:** সাইজ/কালার ভেরিয়েন্ট ম্যানেজ, বাল্ক ভেরিয়েন্ট যুক্ত
🚚 **ডেলিভারি জোন:** ডেলিভারি এলাকা ও শিপিং চার্জ ম্যানেজ
📝 **ব্লগ:** ব্লগ পোস্ট তৈরি, আপডেট, পাবলিশ/আনপাবলিশ, ডিলিট
📧 **নিউজলেটার:** সাবস্ক্রাইবার তালিকা
🔄 **রিটার্ন:** রিটার্ন রিকোয়েস্ট ম্যানেজমেন্ট

## নিয়ম:
- সবসময় বাংলায় উত্তর দিন
- টুল কল করার সময় কোনো টেক্সট লিখবেন না
- ডেটা সুন্দর মার্কডাউন ফরম্যাটে দেখান (টেবিল, বুলেট, ইমোজি ব্যবহার করুন)
- দাম ৳ চিহ্ন দিয়ে দেখান
- সংক্ষিপ্ত কিন্তু তথ্যবহুল উত্তর দিন
- অ্যাডমিনকে প্রোঅ্যাক্টিভ সাজেশন দিন
- প্রোডাক্ট ডিলিট করার আগে নিশ্চিত করুন (ইউজারকে জিজ্ঞেস করুন)
- মাল্টি প্রোডাক্ট যুক্ত করার সময় প্রতিটির জন্য সঠিক ক্যাটেগরি ব্যবহার করুন
- **মাল্টি-টাস্ক:** একটি মেসেজে একাধিক কাজ থাকলে সব কাজ ক্রমানুসারে সম্পন্ন করুন। একাধিক টুল কল করতে পারেন।
- **বাল্ক প্রোডাক্ট:** একসাথে সর্বোচ্চ ২০০টি পর্যন্ত প্রোডাক্ট ভেরিয়েন্টসহ add_bulk_products টুল দিয়ে যুক্ত করা যায় (ব্যাচে প্রসেস হয়)
- **ভেরিয়েন্ট সহ বাল্ক:** add_bulk_products এ প্রতিটি প্রোডাক্টে variants অ্যারে দিলে স্বয়ংক্রিয়ভাবে ভেরিয়েন্ট তৈরি হবে। প্রতিটি ভেরিয়েন্টে image_url দেওয়া যায়
- **Cloudinary অটো-আপলোড:** প্রোডাক্ট বা ভেরিয়েন্টে কোনো ইমেজ URL দিলে সেটি স্বয়ংক্রিয়ভাবে Cloudinary তে আপলোড হয়ে অপ্টিমাইজড URL সেভ হবে। ইতিমধ্যে Cloudinary URL হলে স্কিপ করবে
- **ভিডিও অটো-আপলোড:** video_url দিলে ডাইরেক্ট ভিডিও ফাইল (MP4/WebM) স্বয়ংক্রিয়ভাবে Cloudinary তে আপলোড হবে। YouTube/Vimeo/Facebook লিঙ্ক হলে সরাসরি সেভ হবে (আপলোড ছাড়া)
- **গ্যালারি ইমেজ:** create_product বা add_bulk_products এ gallery_images অ্যারে দিলে product_images টেবিলে মাল্টিপল ইমেজ যুক্ত হবে। প্রতিটিতে image_url ও alt_text দেওয়া যায়

## ক্যাটেগরি তালিকা:
Borkas, Abayas, Hijabs, Kaftans, Scarves, Fabrics

## উদাহরণ কমান্ড:
- "ড্যাশবোর্ড দেখাও" → get_dashboard_summary
- "লো স্টক দেখাও" → get_low_stock_alerts
- "আজকের অর্ডার" → get_orders({ recent_days: 1 })
- "পেন্ডিং অর্ডার" → get_orders({ status: "pending" })
- "অর্ডার #xyz এর বিস্তারিত" → get_order_details
- "অর্ডার #xyz শিপড করো" → update_order_status
- "নতুন প্রোডাক্ট যুক্ত করো" → create_product
- "৫টি/৫০টি/১০০টি বোরকা একসাথে যুক্ত করো" → add_bulk_products (ব্যাচে প্রসেস, সর্বোচ্চ ২০০টি)
- "[প্রোডাক্ট] আপডেট করো" → update_product
- "[প্রোডাক্ট] ডিলিট করো" → delete_product
- "[প্রোডাক্ট] এর ভেরিয়েন্ট দেখাও" → manage_variants({ action: "list" })
- "[প্রোডাক্ট] এ S, M, L সাইজে ভেরিয়েন্ট যুক্ত করো" → manage_variants({ action: "bulk_add" })
- "রেভিনিউ রিপোর্ট" → get_revenue_report
- "নতুন কুপন বানাও" → manage_coupon({ action: "create", ... })
- "ডেলিভারি জোন দেখাও" → manage_delivery_zones({ action: "list" })
- "নতুন ডেলিভারি জোন যুক্ত করো" → manage_delivery_zones({ action: "create" })
- "ব্লগ পোস্ট লিস্ট দেখাও" → manage_blog_posts({ action: "list" })
- "নতুন ব্লগ পোস্ট লিখো" → manage_blog_posts({ action: "create" })
- "রিটার্ন রিকোয়েস্ট দেখাও" → manage_returns({ action: "list" })
- "সাবস্ক্রাইবার দেখাও" → get_newsletter_subscribers

## মাল্টি-প্রোডাক্ট যুক্ত করার নিয়ম:
- অ্যাডমিন যখন একাধিক প্রোডাক্টের তথ্য দেয়, সেগুলো add_bulk_products টুল দিয়ে একসাথে যুক্ত করুন
- প্রতিটির জন্য stock ডিফল্ট 0
- যুক্ত হওয়ার পর সারাংশ দেখান
`;

// Auto-upload file URL to Cloudinary (image or video)
async function uploadToCloudinary(fileUrl: string, folder: string = "products", resourceType: string = "image"): Promise<string> {
  const CLOUD_NAME = Deno.env.get("CLOUDINARY_CLOUD_NAME");
  const API_KEY = Deno.env.get("CLOUDINARY_API_KEY");
  const API_SECRET = Deno.env.get("CLOUDINARY_API_SECRET");

  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    console.warn("Cloudinary credentials not configured, using original URL");
    return fileUrl;
  }

  // Skip if already a Cloudinary URL
  if (fileUrl.includes("cloudinary.com") || fileUrl.includes("res.cloudinary")) {
    return fileUrl;
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const paramsToSign = `folder=${folder}&overwrite=false&resource_type=${resourceType}&timestamp=${timestamp}&unique_filename=true${API_SECRET}`;
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-1", encoder.encode(paramsToSign));
    const signature = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

    const formData = new FormData();
    formData.append("file", fileUrl);
    formData.append("folder", folder);
    formData.append("timestamp", timestamp);
    formData.append("api_key", API_KEY);
    formData.append("signature", signature);
    formData.append("overwrite", "false");
    formData.append("unique_filename", "true");
    formData.append("resource_type", resourceType);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    if (response.ok && result.secure_url) {
      console.log(`Cloudinary ${resourceType} upload success: ${result.secure_url}`);
      return result.secure_url;
    }
    console.warn("Cloudinary upload failed:", result.error?.message);
    return fileUrl;
  } catch (err) {
    console.warn("Cloudinary upload error:", err);
    return fileUrl;
  }
}

// Auto-upload image if URL provided (non-Cloudinary)
async function autoUploadImage(url: string | null | undefined, folder: string = "products"): Promise<string | null> {
  if (!url || url.trim() === "") return null;
  return await uploadToCloudinary(url, folder, "image");
}

// Auto-upload video if URL provided (non-Cloudinary)
async function autoUploadVideo(url: string | null | undefined, folder: string = "videos"): Promise<string | null> {
  if (!url || url.trim() === "") return null;
  // Skip embed URLs (YouTube, Vimeo, Facebook) - only upload direct video files
  if (/youtube\.com|youtu\.be|vimeo\.com|facebook\.com|fb\.watch/i.test(url)) {
    return url;
  }
  return await uploadToCloudinary(url, folder, "video");
}

async function resolveProductId(supabaseAdmin: any, args: any) {
  if (args.product_id) return args.product_id;
  if (args.product_name) {
    const { data } = await supabaseAdmin.from("products").select("id, name").ilike("name", `%${args.product_name}%`).limit(1);
    if (data?.length) return data[0].id;
  }
  return null;
}

async function resolveOrderId(supabaseAdmin: any, orderId: string) {
  if (orderId.length >= 36) return orderId;
  const { data } = await supabaseAdmin.from("orders").select("id").ilike("id", `${orderId.toLowerCase()}%`).limit(1);
  return data?.[0]?.id || null;
}

async function handleToolCall(name: string, args: any, supabaseAdmin: any) {
  switch (name) {
    case "get_dashboard_summary": {
      const [
        { count: productsCount },
        { data: orders },
        { data: lowStock },
        { data: reviews },
      ] = await Promise.all([
        supabaseAdmin.from("products").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("orders").select("id, total, status, created_at").order("created_at", { ascending: false }).limit(200),
        supabaseAdmin.from("products").select("id, name, stock").lte("stock", 10).order("stock", { ascending: true }).limit(20),
        supabaseAdmin.from("product_reviews").select("rating"),
      ]);
      const allOrders = orders || [];
      const totalRevenue = allOrders.reduce((s: number, o: any) => s + Number(o.total), 0);
      const pending = allOrders.filter((o: any) => o.status === "pending").length;
      const today = new Date().toISOString().split("T")[0];
      const todayOrders = allOrders.filter((o: any) => o.created_at.startsWith(today));
      const todayRevenue = todayOrders.reduce((s: number, o: any) => s + Number(o.total), 0);
      const avgRating = (reviews || []).length ? ((reviews || []).reduce((s: number, r: any) => s + r.rating, 0) / (reviews || []).length).toFixed(1) : "N/A";

      return {
        total_products: productsCount || 0,
        total_orders: allOrders.length,
        total_revenue: totalRevenue,
        pending_orders: pending,
        today_orders: todayOrders.length,
        today_revenue: todayRevenue,
        low_stock_count: (lowStock || []).length,
        out_of_stock: (lowStock || []).filter((p: any) => (p.stock || 0) === 0).length,
        average_rating: avgRating,
        recent_orders: allOrders.slice(0, 5).map((o: any) => ({
          id: o.id.slice(0, 8).toUpperCase(),
          total: o.total,
          status: o.status,
          date: new Date(o.created_at).toLocaleDateString("bn-BD"),
        })),
      };
    }

    case "search_products": {
      let query = supabaseAdmin.from("products").select("id, name, category, price, sale_price, stock, featured, image_url");
      if (args.query) query = query.or(`name.ilike.%${args.query}%,description.ilike.%${args.query}%`);
      if (args.category) query = query.ilike("category", `%${args.category}%`);
      if (args.low_stock_only) query = query.lte("stock", 1).gt("stock", 0);
      if (args.out_of_stock_only) query = query.eq("stock", 0);
      const { data } = await query.order("created_at", { ascending: false }).limit(30);
      return { products: data || [], count: (data || []).length };
    }

    case "update_product_stock": {
      const productId = await resolveProductId(supabaseAdmin, args);
      if (!productId) return { error: "প্রোডাক্ট পাওয়া যায়নি। product_id বা product_name দিন" };

      let newStock = args.stock;
      if (args.adjust !== undefined) {
        const { data: current } = await supabaseAdmin.from("products").select("stock").eq("id", productId).single();
        newStock = Math.max(0, (current?.stock || 0) + args.adjust);
      }
      if (newStock === undefined) return { error: "stock বা adjust দিন" };

      const { data, error } = await supabaseAdmin.from("products").update({ stock: newStock }).eq("id", productId).select("id, name, stock").single();
      if (error) return { error: error.message };
      return { success: true, product: data };
    }

    case "update_product_price": {
      const productId = await resolveProductId(supabaseAdmin, args);
      if (!productId) return { error: "প্রোডাক্ট পাওয়া যায়নি" };
      const update: any = {};
      if (args.price !== undefined) update.price = args.price;
      if (args.sale_price !== undefined) update.sale_price = args.sale_price;
      const { data, error } = await supabaseAdmin.from("products").update(update).eq("id", productId).select("id, name, price, sale_price").single();
      if (error) return { error: error.message };
      return { success: true, product: data };
    }

    case "toggle_product_featured": {
      const productId = await resolveProductId(supabaseAdmin, args);
      if (!productId) return { error: "প্রোডাক্ট পাওয়া যায়নি" };
      const { data, error } = await supabaseAdmin.from("products").update({ featured: args.featured ?? true }).eq("id", productId).select("id, name, featured").single();
      if (error) return { error: error.message };
      return { success: true, product: data };
    }

    case "get_orders": {
      let query = supabaseAdmin.from("orders").select("id, total, status, shipping_phone, shipping_city, guest_name, payment_method, payment_status, tracking_number, courier_name, created_at, notes");
      if (args.status) query = query.eq("status", args.status);
      if (args.phone) {
        const phone = args.phone.replace(/[^0-9]/g, "");
        query = query.or(`shipping_phone.ilike.%${phone}%`);
      }
      if (args.recent_days) {
        const since = new Date(Date.now() - args.recent_days * 86400000).toISOString();
        query = query.gte("created_at", since);
      }
      const { data } = await query.order("created_at", { ascending: false }).limit(args.limit || 20);
      return {
        orders: (data || []).map((o: any) => ({
          id: o.id, short_id: o.id.slice(0, 8).toUpperCase(),
          total: o.total, status: o.status, phone: o.shipping_phone,
          city: o.shipping_city, customer: o.guest_name,
          payment: o.payment_method, payment_status: o.payment_status,
          tracking: o.tracking_number, courier: o.courier_name,
          date: new Date(o.created_at).toLocaleDateString("bn-BD"), notes: o.notes,
        })),
        count: (data || []).length,
      };
    }

    case "get_order_details": {
      const orderId = await resolveOrderId(supabaseAdmin, args.order_id);
      if (!orderId) return { error: "অর্ডার পাওয়া যায়নি" };

      const [{ data: order }, { data: items }] = await Promise.all([
        supabaseAdmin.from("orders").select("*").eq("id", orderId).single(),
        supabaseAdmin.from("order_items").select("*").eq("order_id", orderId),
      ]);
      if (!order) return { error: "অর্ডার পাওয়া যায়নি" };

      return {
        order: {
          id: order.id, short_id: order.id.slice(0, 8).toUpperCase(),
          status: order.status, total: order.total,
          customer: order.guest_name || "Registered User",
          phone: order.shipping_phone, city: order.shipping_city,
          address: order.shipping_address, email: order.guest_email,
          payment_method: order.payment_method, payment_status: order.payment_status,
          payment_verified: order.payment_verified, transaction_id: order.transaction_id,
          advance_amount: order.advance_amount, due_amount: order.due_amount,
          tracking_number: order.tracking_number, courier_name: order.courier_name,
          estimated_delivery: order.estimated_delivery,
          notes: order.notes, discount_amount: order.discount_amount,
          date: new Date(order.created_at).toLocaleDateString("bn-BD"),
        },
        items: (items || []).map((i: any) => ({
          product: i.product_name, quantity: i.quantity, price: i.price,
          size: i.size, color: i.color, subtotal: i.price * i.quantity,
        })),
      };
    }

    case "update_order_status": {
      const orderId = await resolveOrderId(supabaseAdmin, args.order_id);
      if (!orderId) return { error: "অর্ডার পাওয়া যায়নি" };

      const update: any = { status: args.status };
      if (args.tracking_number) update.tracking_number = args.tracking_number;
      if (args.courier_name) update.courier_name = args.courier_name;
      if (args.payment_verified !== undefined) {
        update.payment_verified = args.payment_verified;
        if (args.payment_verified) update.payment_verified_at = new Date().toISOString();
      }
      if (args.notes) update.notes = args.notes;

      const { data, error } = await supabaseAdmin.from("orders").update(update).eq("id", orderId).select("id, status, tracking_number, courier_name, payment_verified").single();
      if (error) return { error: error.message };
      return { success: true, order: { ...data, short_id: data.id.slice(0, 8).toUpperCase() } };
    }

    case "get_customers": {
      let query = supabaseAdmin.from("profiles").select("id, user_id, full_name, phone, city, created_at");
      if (args.search) query = query.or(`full_name.ilike.%${args.search}%,phone.ilike.%${args.search}%`);
      const { data } = await query.order("created_at", { ascending: false }).limit(args.limit || 20);
      return { customers: data || [], count: (data || []).length };
    }

    case "get_revenue_report": {
      const days = args.days || 30;
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const { data: orders } = await supabaseAdmin.from("orders").select("id, total, status, created_at, shipping_city, payment_method").gte("created_at", since).neq("status", "cancelled");

      const allOrders = orders || [];
      const totalRevenue = allOrders.reduce((s: number, o: any) => s + Number(o.total), 0);
      const avgOrderValue = allOrders.length ? Math.round(totalRevenue / allOrders.length) : 0;

      const daily: Record<string, number> = {};
      allOrders.forEach((o: any) => { const d = o.created_at.split("T")[0]; daily[d] = (daily[d] || 0) + Number(o.total); });

      const cities: Record<string, number> = {};
      allOrders.forEach((o: any) => { const c = o.shipping_city || "Unknown"; cities[c] = (cities[c] || 0) + Number(o.total); });

      const payments: Record<string, number> = {};
      allOrders.forEach((o: any) => { const p = o.payment_method || "cod"; payments[p] = (payments[p] || 0) + 1; });

      return {
        period_days: days, total_revenue: totalRevenue, total_orders: allOrders.length, avg_order_value: avgOrderValue,
        daily_revenue: Object.entries(daily).sort().slice(-7).map(([date, amount]) => ({ date, amount })),
        top_cities: Object.entries(cities).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([city, revenue]) => ({ city, revenue })),
        payment_methods: Object.entries(payments).map(([method, count]) => ({ method, count })),
      };
    }

    case "manage_coupon": {
      if (args.action === "list") {
        const { data } = await supabaseAdmin.from("coupons").select("*").order("created_at", { ascending: false });
        return { coupons: data || [] };
      }
      if (args.action === "create") {
        if (!args.code || args.discount_value === undefined) return { error: "code ও discount_value আবশ্যক" };
        const { data, error } = await supabaseAdmin.from("coupons").insert({
          code: args.code.toUpperCase(), discount_type: args.discount_type || "percentage",
          discount_value: args.discount_value, minimum_order_amount: args.minimum_order_amount || 0,
          max_uses: args.max_uses || null, description: args.description || null, is_active: true,
        }).select().single();
        if (error) return { error: error.message };
        return { success: true, coupon: data };
      }
      if (args.action === "toggle") {
        const { data, error } = await supabaseAdmin.from("coupons").update({ is_active: args.is_active ?? false }).eq("code", args.code?.toUpperCase()).select().single();
        if (error) return { error: error.message };
        return { success: true, coupon: data };
      }
      if (args.action === "delete") {
        const { error } = await supabaseAdmin.from("coupons").delete().eq("code", args.code?.toUpperCase());
        if (error) return { error: error.message };
        return { success: true, deleted: args.code };
      }
      return { error: "Invalid action" };
    }

    case "get_low_stock_alerts": {
      const threshold = args.threshold || 1;
      const { data } = await supabaseAdmin.from("products").select("id, name, category, stock, price").lte("stock", threshold).order("stock", { ascending: true }).limit(50);
      const products = data || [];
      return { total: products.length, out_of_stock: products.filter((p: any) => (p.stock || 0) === 0), low_stock: products.filter((p: any) => (p.stock || 0) > 0) };
    }

    case "bulk_update_stock": {
      const results: any[] = [];
      for (const u of (args.updates || [])) {
        const { data, error } = await supabaseAdmin.from("products").update({ stock: u.stock }).eq("id", u.product_id).select("id, name, stock").single();
        results.push(error ? { product_id: u.product_id, error: error.message } : { ...data, success: true });
      }
      return { results, updated: results.filter((r: any) => r.success).length };
    }

    case "get_reviews_summary": {
      let query = supabaseAdmin.from("product_reviews").select("id, rating, comment, title, created_at, product_id, verified_purchase");
      if (args.product_id) query = query.eq("product_id", args.product_id);
      const { data } = await query.order("created_at", { ascending: false }).limit(20);
      const reviews = data || [];
      const avgRating = reviews.length ? (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length).toFixed(1) : "N/A";
      const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      reviews.forEach((r: any) => distribution[r.rating]++);
      return { total: reviews.length, average_rating: avgRating, distribution, recent: reviews.slice(0, 5) };
    }

    case "create_product": {
      const product: any = { name: args.name, category: args.category, price: args.price };
      const optFields = ["sale_price", "description", "stock", "sizes", "colors", "material", "featured"];
      for (const f of optFields) { if (args[f] !== undefined) product[f] = args[f]; }
      
      // Auto-upload image and video to Cloudinary
      product.image_url = await autoUploadImage(args.image_url);
      product.video_url = await autoUploadVideo(args.video_url);
      
      const { data, error } = await supabaseAdmin.from("products").insert(product).select("id, name, category, price, sale_price, stock, sizes, colors, material, featured, slug, image_url").single();
      if (error) return { error: error.message };

      // Add variants if provided
      let variantsAdded = 0;
      if (args.variants && Array.isArray(args.variants) && args.variants.length > 0) {
        const variantsToInsert = await Promise.all(args.variants.map(async (v: any) => ({
          product_id: data.id,
          size: v.size || null,
          color: v.color || null,
          stock: v.stock ?? 0,
          sku: v.sku || null,
          price_adjustment: v.price_adjustment ?? 0,
          image_url: await autoUploadImage(v.image_url),
        })));
        const { data: vData, error: vError } = await supabaseAdmin.from("product_variants").insert(variantsToInsert).select();
        if (!vError) variantsAdded = (vData || []).length;
      }

      // Add gallery images to product_images table
      let galleryAdded = 0;
      if (args.gallery_images && Array.isArray(args.gallery_images) && args.gallery_images.length > 0) {
        const galleryToInsert = await Promise.all(args.gallery_images.map(async (img: any, idx: number) => ({
          product_id: data.id,
          image_url: await uploadToCloudinary(img.image_url, `products/${data.id}`),
          alt_text: img.alt_text || `${args.name} - ${idx + 1}`,
          display_order: idx,
        })));
        const { data: gData, error: gError } = await supabaseAdmin.from("product_images").insert(galleryToInsert).select();
        if (!gError) galleryAdded = (gData || []).length;
      }

      return { success: true, product: data, variants_added: variantsAdded, gallery_images_added: galleryAdded, cloudinary_auto_upload: true };
    }

    case "update_product": {
      const productId = await resolveProductId(supabaseAdmin, args);
      if (!productId) return { error: "প্রোডাক্ট পাওয়া যায়নি" };
      const update: any = {};
      const fields = ["name", "category", "price", "sale_price", "description", "stock", "sizes", "colors", "material", "featured", "image_url", "video_url"];
      for (const f of fields) { if (args[f] !== undefined) update[f] = args[f]; }
      if (Object.keys(update).length === 0) return { error: "আপডেট করার কিছু দিন" };
      const { data, error } = await supabaseAdmin.from("products").update(update).eq("id", productId).select("id, name, category, price, sale_price, stock, sizes, colors, material, featured").single();
      if (error) return { error: error.message };
      return { success: true, product: data };
    }

    case "delete_product": {
      const productId = await resolveProductId(supabaseAdmin, args);
      if (!productId) return { error: "প্রোডাক্ট পাওয়া যায়নি" };
      await Promise.all([
        supabaseAdmin.from("product_variants").delete().eq("product_id", productId),
        supabaseAdmin.from("product_images").delete().eq("product_id", productId),
        supabaseAdmin.from("back_in_stock_alerts").delete().eq("product_id", productId),
      ]);
      const { error } = await supabaseAdmin.from("products").delete().eq("id", productId);
      if (error) return { error: error.message };
      return { success: true, deleted_product: productId };
    }

    case "add_bulk_products": {
      const products = args.products || [];
      if (!products.length) return { error: "কোনো প্রোডাক্ট দেওয়া হয়নি" };
      if (products.length > 200) return { error: "একসাথে সর্বোচ্চ ২০০টি প্রোডাক্ট যুক্ত করা যায়" };

      const BATCH_SIZE = 50;
      const allInserted: any[] = [];
      const errors: string[] = [];

      // Process products in batches of 50
      for (let i = 0; i < products.length; i += BATCH_SIZE) {
        const batch = products.slice(i, i + BATCH_SIZE);
        // Auto-upload all images to Cloudinary
        const toInsert = await Promise.all(batch.map(async (p: any) => ({
          name: p.name, category: p.category, price: p.price,
          sale_price: p.sale_price || null, description: p.description || null,
          stock: p.stock ?? 0, sizes: p.sizes || [], colors: p.colors || [],
          material: p.material || null, featured: p.featured || false,
          image_url: await autoUploadImage(p.image_url),
          video_url: await autoUploadVideo(p.video_url),
        })));
        const { data, error } = await supabaseAdmin.from("products").insert(toInsert).select("id, name, category, price, stock, slug");
        if (error) {
          errors.push(`ব্যাচ ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
        } else {
          allInserted.push(...(data || []));
        }
      }

      // Now process variants for all products that have them
      const variantsToInsert: any[] = [];
      for (const product of products) {
        if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
          const matchedProduct = allInserted.find((d: any) => d.name === product.name);
          if (matchedProduct) {
            for (const v of product.variants) {
              variantsToInsert.push({
                product_id: matchedProduct.id,
                size: v.size || null,
                color: v.color || null,
                stock: v.stock ?? 0,
                sku: v.sku || null,
                price_adjustment: v.price_adjustment ?? 0,
                image_url: await autoUploadImage(v.image_url),
              });
            }
          }
        }
      }

      let variantsAdded = 0;
      if (variantsToInsert.length > 0) {
        for (let i = 0; i < variantsToInsert.length; i += 100) {
          const vBatch = variantsToInsert.slice(i, i + 100);
          const { data: vData, error: vError } = await supabaseAdmin.from("product_variants").insert(vBatch).select();
          if (!vError) variantsAdded += (vData || []).length;
          else errors.push(`ভেরিয়েন্ট ব্যাচ: ${vError.message}`);
        }
      }

      // Process gallery images for all products
      let galleryAdded = 0;
      const galleryToInsert: any[] = [];
      for (const product of products) {
        if (product.gallery_images && Array.isArray(product.gallery_images) && product.gallery_images.length > 0) {
          const matchedProduct = allInserted.find((d: any) => d.name === product.name);
          if (matchedProduct) {
            for (let idx = 0; idx < product.gallery_images.length; idx++) {
              const img = product.gallery_images[idx];
              galleryToInsert.push({
                product_id: matchedProduct.id,
                image_url: await uploadToCloudinary(img.image_url, `products/${matchedProduct.id}`),
                alt_text: img.alt_text || `${product.name} - ${idx + 1}`,
                display_order: idx,
              });
            }
          }
        }
      }
      if (galleryToInsert.length > 0) {
        for (let i = 0; i < galleryToInsert.length; i += 100) {
          const gBatch = galleryToInsert.slice(i, i + 100);
          const { data: gData, error: gError } = await supabaseAdmin.from("product_images").insert(gBatch).select();
          if (!gError) galleryAdded += (gData || []).length;
          else errors.push(`গ্যালারি ব্যাচ: ${gError.message}`);
        }
      }

      return {
        success: errors.length === 0,
        added: allInserted.length,
        total_requested: products.length,
        variants_added: variantsAdded,
        gallery_images_added: galleryAdded,
        cloudinary_auto_upload: true,
        errors: errors.length > 0 ? errors : undefined,
        products: allInserted.length <= 20 ? allInserted : allInserted.slice(0, 10).concat([{ note: `...এবং আরো ${allInserted.length - 10}টি` }]),
      };
    }

    case "manage_variants": {
      const productId = await resolveProductId(supabaseAdmin, args);
      switch (args.action) {
        case "list": {
          if (!productId) return { error: "product_id বা product_name দিন" };
          const { data } = await supabaseAdmin.from("product_variants").select("id, size, color, stock, sku, price_adjustment, image_url").eq("product_id", productId).order("size");
          return { variants: data || [], count: (data || []).length };
        }
        case "add": {
          if (!productId) return { error: "product_id বা product_name দিন" };
          const variant: any = { product_id: productId, stock: args.stock ?? 0 };
          if (args.size) variant.size = args.size;
          if (args.color) variant.color = args.color;
          if (args.sku) variant.sku = args.sku;
          if (args.price_adjustment !== undefined) variant.price_adjustment = args.price_adjustment;
          if (args.image_url) variant.image_url = args.image_url;
          const { data, error } = await supabaseAdmin.from("product_variants").insert(variant).select().single();
          if (error) return { error: error.message };
          return { success: true, variant: data };
        }
        case "bulk_add": {
          if (!productId) return { error: "product_id বা product_name দিন" };
          const variants = (args.variants || []).map((v: any) => ({
            product_id: productId, size: v.size || null, color: v.color || null,
            stock: v.stock ?? 0, sku: v.sku || null, price_adjustment: v.price_adjustment ?? 0,
            ...(v.image_url ? { image_url: v.image_url } : {}),
          }));
          if (!variants.length) return { error: "ভেরিয়েন্ট দেওয়া হয়নি" };
          const { data, error } = await supabaseAdmin.from("product_variants").insert(variants).select();
          if (error) return { error: error.message };
          return { success: true, added: (data || []).length, variants: data };
        }
        case "update": {
          if (!args.variant_id) return { error: "variant_id দিন" };
          const update: any = {};
          for (const f of ["size", "color", "stock", "sku", "price_adjustment", "image_url"]) { if (args[f] !== undefined) update[f] = args[f]; }
          const { data, error } = await supabaseAdmin.from("product_variants").update(update).eq("id", args.variant_id).select().single();
          if (error) return { error: error.message };
          return { success: true, variant: data };
        }
        case "delete": {
          if (!args.variant_id) return { error: "variant_id দিন" };
          const { error } = await supabaseAdmin.from("product_variants").delete().eq("id", args.variant_id);
          if (error) return { error: error.message };
          return { success: true, deleted: args.variant_id };
        }
        default: return { error: "Invalid action" };
      }
    }

    case "manage_delivery_zones": {
      if (args.action === "list") {
        const { data } = await supabaseAdmin.from("delivery_zones").select("*").order("zone_name");
        return { zones: data || [], count: (data || []).length };
      }
      if (args.action === "create") {
        if (!args.zone_name || !args.city) return { error: "zone_name ও city আবশ্যক" };
        const { data, error } = await supabaseAdmin.from("delivery_zones").insert({
          zone_name: args.zone_name, city: args.city,
          areas: args.areas || [], shipping_charge: args.shipping_charge ?? 0,
          estimated_days: args.estimated_days ?? 3, is_active: true,
        }).select().single();
        if (error) return { error: error.message };
        return { success: true, zone: data };
      }
      if (args.action === "update") {
        if (!args.zone_id) return { error: "zone_id দিন" };
        const update: any = {};
        for (const f of ["zone_name", "city", "areas", "shipping_charge", "estimated_days", "is_active"]) {
          if (args[f] !== undefined) update[f] = args[f];
        }
        const { data, error } = await supabaseAdmin.from("delivery_zones").update(update).eq("id", args.zone_id).select().single();
        if (error) return { error: error.message };
        return { success: true, zone: data };
      }
      if (args.action === "toggle") {
        if (!args.zone_id) return { error: "zone_id দিন" };
        const { data: current } = await supabaseAdmin.from("delivery_zones").select("is_active").eq("id", args.zone_id).single();
        const { data, error } = await supabaseAdmin.from("delivery_zones").update({ is_active: !(current?.is_active) }).eq("id", args.zone_id).select().single();
        if (error) return { error: error.message };
        return { success: true, zone: data };
      }
      return { error: "Invalid action" };
    }

    case "manage_blog_posts": {
      if (args.action === "list") {
        const { data } = await supabaseAdmin.from("blog_posts").select("id, title, slug, category, is_published, created_at, published_at").order("created_at", { ascending: false }).limit(20);
        return { posts: data || [], count: (data || []).length };
      }
      if (args.action === "create") {
        if (!args.title) return { error: "title আবশ্যক" };
        const slug = args.slug || args.title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");
        const { data, error } = await supabaseAdmin.from("blog_posts").insert({
          title: args.title, slug, content: args.content || "",
          excerpt: args.excerpt || "", category: args.category || "general",
          image_url: args.image_url || null, is_published: args.is_published ?? false,
          published_at: args.is_published ? new Date().toISOString() : null,
        }).select().single();
        if (error) return { error: error.message };
        return { success: true, post: data };
      }
      if (args.action === "update") {
        if (!args.post_id) return { error: "post_id দিন" };
        const update: any = {};
        for (const f of ["title", "slug", "content", "excerpt", "category", "image_url", "is_published"]) {
          if (args[f] !== undefined) update[f] = args[f];
        }
        if (args.is_published) update.published_at = new Date().toISOString();
        const { data, error } = await supabaseAdmin.from("blog_posts").update(update).eq("id", args.post_id).select().single();
        if (error) return { error: error.message };
        return { success: true, post: data };
      }
      if (args.action === "toggle_publish") {
        if (!args.post_id) return { error: "post_id দিন" };
        const { data: current } = await supabaseAdmin.from("blog_posts").select("is_published").eq("id", args.post_id).single();
        const newState = !(current?.is_published);
        const { data, error } = await supabaseAdmin.from("blog_posts").update({
          is_published: newState, published_at: newState ? new Date().toISOString() : null,
        }).eq("id", args.post_id).select().single();
        if (error) return { error: error.message };
        return { success: true, post: data };
      }
      if (args.action === "delete") {
        if (!args.post_id) return { error: "post_id দিন" };
        const { error } = await supabaseAdmin.from("blog_posts").delete().eq("id", args.post_id);
        if (error) return { error: error.message };
        return { success: true, deleted: args.post_id };
      }
      return { error: "Invalid action" };
    }

    case "get_newsletter_subscribers": {
      const { data, count } = await supabaseAdmin.from("newsletter_subscribers").select("*", { count: "exact" }).eq("subscribed", true).order("created_at", { ascending: false }).limit(args.limit || 20);
      return { subscribers: data || [], total: count || 0 };
    }

    case "manage_returns": {
      if (args.action === "list") {
        const { data } = await supabaseAdmin.from("returns").select("id, order_id, reason, status, refund_amount, admin_notes, created_at").order("created_at", { ascending: false }).limit(20);
        return { returns: data || [], count: (data || []).length };
      }
      if (args.action === "update") {
        if (!args.return_id) return { error: "return_id দিন" };
        const update: any = {};
        if (args.status) update.status = args.status;
        if (args.refund_amount !== undefined) update.refund_amount = args.refund_amount;
        if (args.admin_notes) update.admin_notes = args.admin_notes;
        const { data, error } = await supabaseAdmin.from("returns").update(update).eq("id", args.return_id).select().single();
        if (error) return { error: error.message };
        return { success: true, return_request: data };
      }
      return { error: "Invalid action" };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Missing config" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const allMessages = [{ role: "system", content: SYSTEM_PROMPT }, ...(messages || [])];

    let currentMessages = allMessages;
    let maxIterations = 10;

  while (maxIterations-- > 0) {
      // Log iteration for debugging multi-task operations
      console.log(`AI iteration ${6 - maxIterations}, remaining: ${maxIterations}`);
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: currentMessages, tools, stream: false }),
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("AI error:", response.status, t);
        return new Response(JSON.stringify({ error: "AI gateway error", message: "দুঃখিত, সমস্যা হয়েছে।" }), {
          status: response.status === 429 ? 429 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const choice = data.choices?.[0];

      if (!choice) {
        return new Response(JSON.stringify({ message: "কোনো উত্তর পাওয়া যায়নি।" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (!choice.message?.tool_calls?.length) {
        return new Response(JSON.stringify({ message: choice.message?.content || "" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      currentMessages = [...currentMessages, choice.message];

      for (const tc of choice.message.tool_calls) {
        const args = typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments;
        const result = await handleToolCall(tc.function.name, args, supabaseAdmin);
        currentMessages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
      }
    }

    return new Response(JSON.stringify({ message: "সমস্যা: অনেকগুলো ধাপ চলে গেছে।" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
