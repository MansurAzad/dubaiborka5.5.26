import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OrderNotificationRequest {
  email: string;
  orderId: string;
  customerName: string;
  status: string;
  total: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    size?: string;
    color?: string;
  }>;
  shippingAddress: string;
  shippingCity: string;
  shippingPhone: string;
}

const getStatusBangla = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: "অপেক্ষমাণ",
    confirmed: "নিশ্চিত করা হয়েছে",
    processing: "প্রসেসিং চলছে",
    shipped: "শিপ করা হয়েছে",
    delivered: "ডেলিভারি সম্পন্ন",
    cancelled: "বাতিল করা হয়েছে",
  };
  return statusMap[status] || status;
};

const getStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    pending: "#FFA500",
    confirmed: "#3B82F6",
    processing: "#8B5CF6",
    shipped: "#10B981",
    delivered: "#22C55E",
    cancelled: "#EF4444",
  };
  return colorMap[status] || "#6B7280";
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      email,
      orderId,
      customerName,
      status,
      total,
      items,
      shippingAddress,
      shippingCity,
      shippingPhone,
    }: OrderNotificationRequest = await req.json();

    if (!email || !orderId) {
      throw new Error("Missing required fields: email and orderId");
    }

    const statusBangla = getStatusBangla(status);
    const statusColor = getStatusColor(status);

    const itemsHtml = items
      .map(
        (item) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e5e5;">
            ${item.name}
            ${item.size ? `<br><small style="color: #666;">Size: ${item.size}</small>` : ""}
            ${item.color ? `<small style="color: #666;"> | Color: ${item.color}</small>` : ""}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: right;">৳${item.price.toLocaleString()}</td>
        </tr>
      `
      )
      .join("");

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #D4AF37 0%, #B8860B 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Dubai Borka House</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">Premium Fashion</p>
          </div>
          
          <!-- Status Banner -->
          <div style="background-color: ${statusColor}; padding: 20px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0; font-size: 20px;">
              অর্ডার স্ট্যাটাস: ${statusBangla}
            </h2>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px;">
            <p style="font-size: 16px; color: #333;">প্রিয় ${customerName},</p>
            
            <p style="font-size: 14px; color: #666; line-height: 1.6;">
              আপনার অর্ডার #${orderId.slice(0, 8).toUpperCase()} এর স্ট্যাটাস আপডেট হয়েছে।
            </p>
            
            <!-- Order Details -->
            <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #333; font-size: 16px;">অর্ডার বিবরণ</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #e5e5e5;">
                    <th style="padding: 12px; text-align: left; font-size: 14px;">পণ্য</th>
                    <th style="padding: 12px; text-align: center; font-size: 14px;">পরিমাণ</th>
                    <th style="padding: 12px; text-align: right; font-size: 14px;">মূল্য</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="2" style="padding: 12px; text-align: right; font-weight: bold;">মোট:</td>
                    <td style="padding: 12px; text-align: right; font-weight: bold; color: #D4AF37;">৳${total.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            <!-- Shipping Info -->
            <div style="background-color: #fff8e1; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">ডেলিভারি ঠিকানা</h3>
              <p style="margin: 5px 0; color: #666; font-size: 14px;">${shippingAddress}</p>
              <p style="margin: 5px 0; color: #666; font-size: 14px;">${shippingCity}</p>
              <p style="margin: 5px 0; color: #666; font-size: 14px;">📞 ${shippingPhone}</p>
            </div>
            
            <p style="font-size: 14px; color: #666; line-height: 1.6;">
              কোনো প্রশ্ন থাকলে আমাদের সাথে যোগাযোগ করুন।
            </p>
            
            <p style="font-size: 14px; color: #333; margin-top: 30px;">
              ধন্যবাদ,<br>
              <strong>Dubai Borka House Team</strong>
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #333; padding: 20px; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              © 2024 Dubai Borka House. All rights reserved.
            </p>
            <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">
              123 Fashion Street, Gulshan, Dhaka, Bangladesh
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Dubai Borka House <noreply@dubaiborkehouse.com>",
      to: [email],
      subject: `অর্ডার আপডেট: ${statusBangla} - #${orderId.slice(0, 8).toUpperCase()}`,
      html: emailHtml,
    });

    console.log("Order notification email sent:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending order notification:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
