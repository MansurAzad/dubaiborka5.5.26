 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

interface ResendEmailResponse {
  id: string;
}
 
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 interface OrderConfirmationRequest {
   orderId: string;
   customerEmail: string;
   customerName: string;
   orderTotal: number;
   shippingAddress: string;
   shippingCity: string;
   items: Array<{
     name: string;
     quantity: number;
     price: number;
     size?: string;
     color?: string;
   }>;
 }
 
async function sendEmail(to: string, subject: string, html: string): Promise<ResendEmailResponse> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Dubai Borka House <orders@dubaiborkehouse.com>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return response.json();
}

 const handler = async (req: Request): Promise<Response> => {
   // Handle CORS preflight requests
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

     const { 
       orderId, 
       customerEmail, 
       customerName, 
       orderTotal, 
       shippingAddress, 
       shippingCity,
       items 
     }: OrderConfirmationRequest = await req.json();
 
     // Validate required fields
     if (!orderId || !customerEmail) {
       throw new Error("Missing required fields: orderId and customerEmail are required");
     }
 
     // Format order items for email
     const itemsHtml = items.map(item => `
       <tr>
         <td style="padding: 12px; border-bottom: 1px solid #eee;">
           ${item.name}
           ${item.size ? `<br><small style="color: #666;">Size: ${item.size}</small>` : ''}
           ${item.color ? `<br><small style="color: #666;">Color: ${item.color}</small>` : ''}
         </td>
         <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
         <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">৳${item.price.toLocaleString()}</td>
       </tr>
     `).join('');
 
     const emailHtml = `
       <!DOCTYPE html>
       <html>
       <head>
         <meta charset="utf-8">
         <title>Order Confirmation</title>
       </head>
       <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
         <div style="background-color: #1a1a1a; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
           <h1 style="color: #D4AF37; margin: 0; font-size: 28px;">Dubai Borka House</h1>
           <p style="color: #888; margin: 10px 0 0;">Premium Fashion</p>
         </div>
         
         <div style="background-color: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
           <h2 style="color: #1a1a1a; margin-top: 0;">Thank You for Your Order!</h2>
           
           <p style="color: #444;">Dear ${customerName || 'Valued Customer'},</p>
           
           <p style="color: #444;">We're excited to confirm that we've received your order. Here are the details:</p>
           
           <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
             <p style="margin: 0; color: #666;">
               <strong>Order ID:</strong> 
               <span style="color: #D4AF37; font-family: monospace;">#${orderId.slice(0, 8).toUpperCase()}</span>
             </p>
           </div>
           
           <h3 style="color: #1a1a1a; border-bottom: 2px solid #D4AF37; padding-bottom: 10px;">Order Items</h3>
           
           <table style="width: 100%; border-collapse: collapse;">
             <thead>
               <tr style="background-color: #f5f5f5;">
                 <th style="padding: 12px; text-align: left; color: #666;">Item</th>
                 <th style="padding: 12px; text-align: center; color: #666;">Qty</th>
                 <th style="padding: 12px; text-align: right; color: #666;">Price</th>
               </tr>
             </thead>
             <tbody>
               ${itemsHtml}
             </tbody>
             <tfoot>
               <tr>
                 <td colspan="2" style="padding: 15px 12px; text-align: right; font-weight: bold; color: #1a1a1a;">Total:</td>
                 <td style="padding: 15px 12px; text-align: right; font-weight: bold; color: #D4AF37; font-size: 18px;">৳${orderTotal.toLocaleString()}</td>
               </tr>
             </tfoot>
           </table>
           
           <h3 style="color: #1a1a1a; border-bottom: 2px solid #D4AF37; padding-bottom: 10px; margin-top: 30px;">Shipping Address</h3>
           <p style="color: #444; background-color: #f9f9f9; padding: 15px; border-radius: 8px;">
             ${shippingAddress}<br>
             ${shippingCity}
           </p>
           
           <div style="margin-top: 30px; padding: 20px; background-color: #1a1a1a; border-radius: 8px; text-align: center;">
             <p style="color: #fff; margin: 0;">We'll notify you when your order is shipped.</p>
             <p style="color: #D4AF37; margin: 10px 0 0;">Thank you for shopping with us!</p>
           </div>
           
           <p style="color: #888; font-size: 12px; margin-top: 30px; text-align: center;">
             If you have any questions, please contact us at support@dubaiborkahouse.com
           </p>
         </div>
       </body>
       </html>
     `;
 
    const emailResponse = await sendEmail(
      customerEmail,
      `Order Confirmation - #${orderId.slice(0, 8).toUpperCase()}`,
      emailHtml
    );
 
     console.log("Order confirmation email sent successfully:", emailResponse);
 
     return new Response(JSON.stringify({ success: true, data: emailResponse }), {
       status: 200,
       headers: {
         "Content-Type": "application/json",
         ...corsHeaders,
       },
     });
   } catch (error: any) {
     console.error("Error in send-order-confirmation function:", error);
     return new Response(
       JSON.stringify({ success: false, error: error.message }),
       {
         status: 500,
         headers: { "Content-Type": "application/json", ...corsHeaders },
       }
     );
   }
 };
 
 serve(handler);