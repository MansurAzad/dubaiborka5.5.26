import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WhatsAppRequest {
  phone: string;
  customerName: string;
  orderId: string;
  status: string;
  total: number;
  trackingNumber?: string;
  courierName?: string;
}

const getStatusMessage = (status: string): string => {
  const map: Record<string, string> = {
    pending: "received and is being reviewed",
    confirmed: "confirmed! We're preparing it now",
    processing: "being processed and will ship soon",
    shipped: "shipped! It's on its way to you",
    delivered: "delivered! We hope you love it",
    cancelled: "cancelled as requested",
  };
  return map[status] || `updated to: ${status}`;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      console.warn("WhatsApp credentials not configured, skipping notification");
      return new Response(
        JSON.stringify({ success: false, error: "WhatsApp not configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { phone, customerName, orderId, status, total, trackingNumber, courierName }: WhatsAppRequest = await req.json();

    if (!phone || !orderId) {
      throw new Error("Missing required fields: phone and orderId");
    }

    // Format phone for WhatsApp (ensure country code, default Bangladesh +880)
    let formattedPhone = phone.replace(/[\s\-\(\)]/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "880" + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith("+") && !formattedPhone.startsWith("880")) {
      formattedPhone = "880" + formattedPhone;
    }
    formattedPhone = formattedPhone.replace(/^\+/, "");

    const shortOrderId = orderId.slice(0, 8).toUpperCase();
    const statusMsg = getStatusMessage(status);

    let messageBody = `Hello ${customerName || "Customer"}! 👋\n\n` +
      `Your order *#${shortOrderId}* has been ${statusMsg}.\n\n` +
      `💰 Total: ৳${total.toLocaleString()}\n`;

    if (trackingNumber) {
      messageBody += `📦 Tracking: ${trackingNumber}\n`;
    }
    if (courierName) {
      messageBody += `🚚 Courier: ${courierName}\n`;
    }

    messageBody += `\nThank you for shopping with *Dubai Borka House*! 🛍️`;

    const waResponse = await fetch(
      `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: formattedPhone,
          type: "text",
          text: { body: messageBody },
        }),
      }
    );

    const waData = await waResponse.json();

    if (!waResponse.ok) {
      console.error("WhatsApp API error:", JSON.stringify(waData));
      throw new Error(`WhatsApp API error [${waResponse.status}]: ${JSON.stringify(waData)}`);
    }

    console.log("WhatsApp notification sent:", JSON.stringify(waData));

    return new Response(JSON.stringify({ success: true, data: waData }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending WhatsApp notification:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
