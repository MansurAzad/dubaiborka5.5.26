import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@3.24.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OrderItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().positive(),
  size: z.string().trim().max(100).nullable().optional(),
  color: z.string().trim().max(100).nullable().optional(),
});

const BodySchema = z.object({
  items: z.array(OrderItemSchema).min(1),
  shippingInfo: z.object({
    fullName: z.string().trim().min(1).max(255),
    phone: z.string().trim().min(6).max(30),
    email: z.union([z.string().trim().email(), z.literal(""), z.null()]).optional(),
    address: z.string().trim().min(1).max(500),
    city: z.union([z.string().trim().max(255), z.literal(""), z.null()]).optional(),
    district: z.union([z.string().trim().max(255), z.literal(""), z.null()]).optional(),
  }),
  selectedZoneId: z.string().uuid().nullable().optional(),
  deliveryNotes: z.union([z.string().trim().max(1000), z.literal(""), z.null()]).optional(),
  selectedPayment: z.enum(["bkash", "nagad", "advance_cod", "cod"]),
  transactionId: z.union([z.string().trim().max(255), z.literal(""), z.null()]).optional(),
  paymentPhone: z.union([z.string().trim().max(30), z.literal(""), z.null()]).optional(),
  advancePaymentMethod: z.enum(["bkash", "nagad"]).optional(),
  advanceAmount: z.number().nonnegative().nullable().optional(),
  appliedCoupon: z.object({
    id: z.string().uuid(),
    code: z.string().trim().min(1).max(100),
  }).nullable().optional(),
});

type ProductRow = {
  id: string;
  name: string;
  price: number;
  sale_price: number | null;
  stock: number | null;
};

type ProductVariantRow = {
  id: string;
  product_id: string;
  size: string | null;
  color: string | null;
  stock: number;
  price_adjustment: number | null;
};

type CouponRow = {
  id: string;
  code: string;
  current_uses: number;
  discount_type: string;
  discount_value: number;
  max_uses: number | null;
  minimum_order_amount: number | null;
  valid_from: string | null;
  valid_until: string | null;
};

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const normalizeValue = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toLowerCase() : null;
};

const isSameVariant = (itemValue?: string | null, rowValue?: string | null) => {
  return normalizeValue(itemValue) === normalizeValue(rowValue);
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse(500, { error: "Order service configuration is incomplete." });
  }

  let parsedBody: z.infer<typeof BodySchema>;
  try {
    const requestBody = await req.json();
    const result = BodySchema.safeParse(requestBody);

    if (!result.success) {
      return jsonResponse(400, {
        error: "অর্ডারের তথ্য সঠিক নয়। অনুগ্রহ করে ফর্মটি আবার যাচাই করুন।",
        fields: result.error.flatten().fieldErrors,
      });
    }

    parsedBody = result.data;
  } catch {
    return jsonResponse(400, { error: "অর্ডারের তথ্য পড়া যায়নি। আবার চেষ্টা করুন।" });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

  const authHeader = req.headers.get("Authorization");
  let authUser: { id: string; email?: string | null } | null = null;

  if (authHeader) {
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const { data: userData } = await userClient.auth.getUser();
    // If getUser fails (e.g. anon key / expired token), treat as guest — don't reject
    if (userData?.user) {
      authUser = {
        id: userData.user.id,
        email: userData.user.email,
      };
    }
  }

  const {
    items,
    shippingInfo,
    selectedZoneId,
    deliveryNotes,
    selectedPayment,
    transactionId,
    paymentPhone,
    advancePaymentMethod,
    advanceAmount,
    appliedCoupon,
  } = parsedBody;

  const trimmedTransactionId = transactionId?.trim() || null;
  const trimmedPaymentPhone = paymentPhone?.trim() || null;
  const trimmedCustomerEmail = authUser?.email?.trim() || shippingInfo.email?.trim() || null;

  if ((selectedPayment === "bkash" || selectedPayment === "nagad") && (!trimmedTransactionId || !trimmedPaymentPhone)) {
    return jsonResponse(400, { error: "মোবাইল পেমেন্টের জন্য Transaction ID এবং পেমেন্ট নম্বর দিতে হবে।" });
  }

  if (selectedPayment === "advance_cod") {
    if (!advancePaymentMethod || !trimmedTransactionId || !trimmedPaymentPhone || !advanceAmount || advanceAmount <= 0) {
      return jsonResponse(400, { error: "Advance + COD এর জন্য অগ্রিম পরিমাণ, Transaction ID এবং পেমেন্ট নম্বর দিতে হবে।" });
    }
  }

  const normalizedPhone = shippingInfo.phone.trim();
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: recentOrders, error: recentOrdersError } = await supabaseAdmin
    .from("orders")
    .select("id")
    .eq("shipping_phone", normalizedPhone)
    .gt("created_at", tenMinutesAgo)
    .limit(1);

  if (recentOrdersError) {
    console.error("Rate limit lookup failed:", recentOrdersError);
    return jsonResponse(500, { error: "অর্ডার যাচাই করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।" });
  }

  if ((recentOrders || []).length > 0) {
    return jsonResponse(400, { error: "আপনি ১০ মিনিটের মধ্যে আবার অর্ডার দিতে পারবেন না। অনুগ্রহ করে কিছুক্ষণ পর চেষ্টা করুন।" });
  }

  const { count: ordersLastDay, error: dailyOrdersError } = await supabaseAdmin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("shipping_phone", normalizedPhone)
    .gt("created_at", twentyFourHoursAgo);

  if (dailyOrdersError) {
    console.error("Daily rate limit lookup failed:", dailyOrdersError);
    return jsonResponse(500, { error: "অর্ডার যাচাই করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।" });
  }

  if ((ordersLastDay || 0) >= 3) {
    return jsonResponse(400, { error: "২৪ ঘণ্টায় সর্বোচ্চ ৩টি অর্ডার দেওয়া যায়। অনুগ্রহ করে পরে চেষ্টা করুন।" });
  }

  let selectedZone: { id: string; city: string; shipping_charge: number } | null = null;
  if (selectedZoneId) {
    const { data: zoneData, error: zoneError } = await supabaseAdmin
      .from("delivery_zones")
      .select("id, city, shipping_charge")
      .eq("id", selectedZoneId)
      .eq("is_active", true)
      .maybeSingle();

    if (zoneError || !zoneData) {
      return jsonResponse(400, { error: "নির্বাচিত ডেলিভারি জোনটি আর সক্রিয় নেই। অনুগ্রহ করে আবার নির্বাচন করুন।" });
    }

    selectedZone = zoneData;
  }

  const productIds = [...new Set(items.map((item) => item.product_id))];
  const { data: products, error: productsError } = await supabaseAdmin
    .from("products")
    .select("id, name, price, sale_price, stock")
    .in("id", productIds);

  if (productsError || !products) {
    console.error("Product lookup failed:", productsError);
    return jsonResponse(500, { error: "পণ্যের তথ্য যাচাই করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।" });
  }

  const { data: variants, error: variantsError } = await supabaseAdmin
    .from("product_variants")
    .select("id, product_id, size, color, stock, price_adjustment")
    .in("product_id", productIds);

  if (variantsError) {
    console.error("Variant lookup failed:", variantsError);
    return jsonResponse(500, { error: "পণ্যের ভ্যারিয়েন্ট যাচাই করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।" });
  }

  const productMap = new Map<string, ProductRow>((products as ProductRow[]).map((product) => [product.id, product]));
  const variantsByProductId = new Map<string, ProductVariantRow[]>();

  for (const variant of (variants || []) as ProductVariantRow[]) {
    const existing = variantsByProductId.get(variant.product_id) || [];
    existing.push(variant);
    variantsByProductId.set(variant.product_id, existing);
  }

  const computedItems = [] as Array<{
    order_id: string;
    product_id: string;
    product_name: string;
    quantity: number;
    price: number;
    size: string | null;
    color: string | null;
    matchedVariant: ProductVariantRow | null;
    productStock: number | null;
  }>;

  for (const item of items) {
    const product = productMap.get(item.product_id);
    if (!product) {
      return jsonResponse(400, { error: "কার্টের একটি পণ্য আর পাওয়া যাচ্ছে না। অনুগ্রহ করে কার্ট আপডেট করুন।" });
    }

    const matchedVariant = (variantsByProductId.get(item.product_id) || []).find(
      (variant) => isSameVariant(item.size, variant.size) && isSameVariant(item.color, variant.color),
    ) || null;

    if (matchedVariant && matchedVariant.stock < item.quantity) {
      return jsonResponse(400, {
        error: `"${product.name}" এর স্টকে মাত্র ${matchedVariant.stock}টি আছে।`,
      });
    }

    if (!matchedVariant && product.stock !== null && product.stock < item.quantity) {
      return jsonResponse(400, {
        error: `"${product.name}" এর স্টকে মাত্র ${product.stock}টি আছে।`,
      });
    }

    const basePrice = Number(product.sale_price ?? product.price);
    const unitPrice = basePrice + Number(matchedVariant?.price_adjustment ?? 0);

    computedItems.push({
      order_id: "",
      product_id: item.product_id,
      product_name: product.name,
      quantity: item.quantity,
      price: unitPrice,
      size: item.size ?? null,
      color: item.color ?? null,
      matchedVariant,
      productStock: product.stock,
    });
  }

  const subtotal = computedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let couponId: string | null = null;
  let discountAmount = 0;
  let couponUsageCount: number | null = null;

  if (appliedCoupon?.id) {
    const { data: couponData, error: couponError } = await supabaseAdmin
      .from("coupons")
      .select("id, code, current_uses, discount_type, discount_value, max_uses, minimum_order_amount, valid_from, valid_until")
      .eq("id", appliedCoupon.id)
      .eq("is_active", true)
      .limit(1);

    if (couponError) {
      console.error("Coupon lookup failed:", couponError);
      return jsonResponse(500, { error: "কুপনের তথ্য যাচাই করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।" });
    }

    const coupon = (couponData?.[0] ?? null) as CouponRow | null;
    if (!coupon) {
      return jsonResponse(400, { error: "নির্বাচিত কুপনটি আর ব্যবহারযোগ্য নয়।" });
    }

    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return jsonResponse(400, { error: "এই কুপনটি এখনো সক্রিয় হয়নি।" });
    }

    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return jsonResponse(400, { error: "এই কুপনের মেয়াদ শেষ হয়ে গেছে।" });
    }

    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      return jsonResponse(400, { error: "এই কুপনের ব্যবহার সীমা শেষ হয়ে গেছে।" });
    }

    if (coupon.minimum_order_amount && subtotal < Number(coupon.minimum_order_amount)) {
      return jsonResponse(400, {
        error: `এই কুপন ব্যবহার করতে ন্যূনতম ৳${Number(coupon.minimum_order_amount).toLocaleString()} অর্ডার করতে হবে।`,
      });
    }

    couponId = coupon.id;
    couponUsageCount = coupon.current_uses;
    discountAmount = coupon.discount_type === "percentage"
      ? Math.round((subtotal * Number(coupon.discount_value)) / 100)
      : Number(coupon.discount_value);
  }

  const shippingCost = selectedZone ? Number(selectedZone.shipping_charge) : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount + shippingCost);

  if (selectedPayment === "advance_cod" && advanceAmount && advanceAmount >= finalTotal) {
    return jsonResponse(400, { error: "Advance + COD এর অগ্রিম পরিমাণ মোট টাকার চেয়ে কম হতে হবে।" });
  }

  const generatedOrderId = crypto.randomUUID();
  const paymentMethod = selectedPayment === "advance_cod"
    ? `advance_${advancePaymentMethod || "bkash"}`
    : selectedPayment;
  const advancePaid = selectedPayment === "advance_cod" ? Number(advanceAmount || 0) : 0;
  const dueAmount = selectedPayment === "advance_cod"
    ? Math.max(finalTotal - advancePaid, 0)
    : (selectedPayment === "cod" ? finalTotal : 0);

  const shippingAddress = [shippingInfo.address.trim(), shippingInfo.district?.trim()].filter(Boolean).join(", ");
  const shippingCity = selectedZone?.city || shippingInfo.city?.trim() || "N/A";

  const { error: orderError } = await supabaseAdmin.from("orders").insert({
    id: generatedOrderId,
    user_id: authUser?.id || null,
    guest_name: authUser ? null : shippingInfo.fullName.trim(),
    guest_email: authUser ? null : trimmedCustomerEmail,
    is_guest: !authUser,
    total: finalTotal,
    shipping_address: shippingAddress,
    shipping_city: shippingCity,
    shipping_phone: normalizedPhone,
    notes: deliveryNotes?.trim() || null,
    status: "pending",
    coupon_id: couponId,
    discount_amount: discountAmount,
    payment_method: paymentMethod,
    payment_status: selectedPayment === "bkash" || selectedPayment === "nagad"
      ? "pending_verification"
      : (selectedPayment === "advance_cod" ? "partially_paid" : "unpaid"),
    transaction_id: trimmedTransactionId,
    payment_phone: trimmedPaymentPhone,
    advance_amount: advancePaid,
    due_amount: dueAmount,
  });

  if (orderError) {
    console.error("Order insert failed:", orderError);
    return jsonResponse(400, { error: orderError.message || "অর্ডার তৈরি করা যায়নি। আবার চেষ্টা করুন।" });
  }

  const orderItemsPayload = computedItems.map(({ matchedVariant: _matchedVariant, productStock: _productStock, ...item }) => ({
    ...item,
    order_id: generatedOrderId,
  }));

  const { error: orderItemsError } = await supabaseAdmin.from("order_items").insert(orderItemsPayload);

  if (orderItemsError) {
    console.error("Order item insert failed:", orderItemsError);
    await supabaseAdmin.from("orders").delete().eq("id", generatedOrderId);
    return jsonResponse(400, { error: orderItemsError.message || "অর্ডারের পণ্য সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।" });
  }

  for (const item of computedItems) {
    if (item.productStock !== null) {
      const { error: productStockError } = await supabaseAdmin
        .from("products")
        .update({ stock: Math.max(item.productStock - item.quantity, 0) })
        .eq("id", item.product_id);

      if (productStockError) {
        console.error("Product stock sync failed:", productStockError);
      }
    }

    if (item.matchedVariant) {
      const { error: variantStockError } = await supabaseAdmin
        .from("product_variants")
        .update({ stock: Math.max(item.matchedVariant.stock - item.quantity, 0) })
        .eq("id", item.matchedVariant.id);

      if (variantStockError) {
        console.error("Variant stock sync failed:", variantStockError);
      }
    }
  }

  if (authUser) {
    const { error: profileUpdateError } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: shippingInfo.fullName.trim(),
        phone: normalizedPhone,
        address: shippingInfo.address.trim(),
        city: shippingCity,
      })
      .eq("user_id", authUser.id);

    if (profileUpdateError) {
      console.error("Profile update failed:", profileUpdateError);
    }
  }

  if (couponId && couponUsageCount !== null) {
    const { error: couponUpdateError } = await supabaseAdmin
      .from("coupons")
      .update({ current_uses: couponUsageCount + 1 })
      .eq("id", couponId);

    if (couponUpdateError) {
      console.error("Coupon usage update failed:", couponUpdateError);
    }
  }

  return jsonResponse(200, {
    success: true,
    orderId: generatedOrderId,
    finalTotal,
    notification: trimmedCustomerEmail
      ? {
          email: trimmedCustomerEmail,
          orderId: generatedOrderId,
          customerName: shippingInfo.fullName.trim(),
          status: "pending",
          total: finalTotal,
          items: computedItems.map((item) => ({
            name: item.product_name,
            quantity: item.quantity,
            price: item.price * item.quantity,
            size: item.size || undefined,
            color: item.color || undefined,
          })),
          shippingAddress: shippingAddress,
          shippingCity,
          shippingPhone: normalizedPhone,
        }
      : null,
  });
});
