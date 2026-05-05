import { supabase } from "@/integrations/supabase/client";

type PaymentMethod = "bkash" | "nagad" | "advance_cod" | "cod";
type AdvancePaymentMethod = "bkash" | "nagad";

interface CheckoutItemInput {
  product_id: string;
  quantity: number;
  size: string | null;
  color: string | null;
}

interface CheckoutShippingInfoInput {
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  city?: string;
  district?: string;
}

interface AppliedCouponInput {
  id: string;
  code: string;
}

interface NotificationPayload {
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

interface CreateOrderResponse {
  success: boolean;
  orderId: string;
  finalTotal: number;
  notification?: NotificationPayload;
}

interface PlaceOrderParams {
  items: CheckoutItemInput[];
  shippingInfo: CheckoutShippingInfoInput;
  selectedZoneId: string | null;
  deliveryNotes?: string;
  selectedPayment: PaymentMethod;
  transactionId?: string;
  paymentPhone?: string;
  advancePaymentMethod?: AdvancePaymentMethod;
  advanceAmount?: number | null;
  appliedCoupon?: AppliedCouponInput | null;
}

const DEFAULT_ORDER_ERROR = "অর্ডার দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।";

const getFunctionErrorMessage = async (error: unknown): Promise<string> => {
  if (error && typeof error === "object") {
    const maybeError = error as {
      context?: unknown;
      details?: unknown;
      message?: unknown;
    };

    if (maybeError.context instanceof Response) {
      try {
        const payload = await maybeError.context.clone().json();
        if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
          return payload.error;
        }
      } catch {
        // Ignore parse failures and fall back to other shapes.
      }
    }

    if (typeof maybeError.message === "string" && maybeError.message.trim()) {
      return maybeError.message;
    }

    if (typeof maybeError.details === "string" && maybeError.details.trim()) {
      return maybeError.details;
    }
  }

  return DEFAULT_ORDER_ERROR;
};

export const placeOrder = async ({
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
}: PlaceOrderParams): Promise<CreateOrderResponse> => {
  const { data, error } = await supabase.functions.invoke<CreateOrderResponse>("create-order", {
    body: {
      items: items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
      })),
      shippingInfo,
      selectedZoneId,
      deliveryNotes: deliveryNotes || "",
      selectedPayment,
      transactionId: transactionId || "",
      paymentPhone: paymentPhone || "",
      advancePaymentMethod,
      advanceAmount: advanceAmount ?? null,
      appliedCoupon: appliedCoupon ? { id: appliedCoupon.id, code: appliedCoupon.code } : null,
    },
  });

  if (error) {
    throw new Error(await getFunctionErrorMessage(error));
  }

  if (!data?.orderId) {
    throw new Error(DEFAULT_ORDER_ERROR);
  }

  if (data.notification?.email) {
    try {
      await supabase.functions.invoke("send-order-notification", {
        body: data.notification,
      });
    } catch (notificationError) {
      console.error("Order notification error:", notificationError);
    }
  }

  return data;
};
