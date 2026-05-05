import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { trackPurchase } from "@/components/seo/AnalyticsTracker";
import { motion } from "framer-motion";
import { CreditCard, Truck, Shield, CheckCircle, ArrowLeft, User, FileText, Download, Smartphone, Banknote, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import CouponInput from "@/components/checkout/CouponInput";
import SEOHead from "@/components/seo/SEOHead";
import { placeOrder } from "@/lib/order-placement";


interface AppliedCoupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  minimum_order_amount: number | null;
  current_uses?: number;
}

const paymentMethods = [
  { id: "bkash", name: "bKash", icon: "📱", description: "Pay via bKash", hasManual: true, number: "01845853634" },
  { id: "nagad", name: "Nagad", icon: "💳", description: "Pay via Nagad", hasManual: true, number: "01845853634" },
  { id: "advance_cod", name: "Advance + COD", icon: "💰", description: "Partial advance payment, rest on delivery", hasManual: false },
  { id: "cod", name: "Cash on Delivery", icon: "💵", description: "Full payment on delivery", hasManual: false },
];

interface DeliveryZone {
  id: string;
  zone_name: string;
  city: string;
  shipping_charge: number;
  estimated_days: number | null;
  areas: string[] | null;
}

const Checkout = () => {
  const [step, setStep] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState("cod");
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
  const [zoneManuallySelected, setZoneManuallySelected] = useState(false);

  const [transactionId, setTransactionId] = useState("");
  const [paymentPhone, setPaymentPhone] = useState("");
  const [advancePaymentMethod, setAdvancePaymentMethod] = useState<"bkash" | "nagad">("bkash");
  const [advanceAmount, setAdvanceAmount] = useState("");

  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [shippingInfo, setShippingInfo] = useState({
    fullName: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    district: "",
    postalCode: "",
  });

  const { user, loading: authLoading } = useAuth();
  const { items, total, clearCart } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();

  const shippingCost = selectedZone?.shipping_charge ?? 0;
  const finalTotal = total - discountAmount + (total > 0 ? shippingCost : 0);

  const findMatchingZone = useCallback((cityValue: string) => {
    if (!cityValue.trim()) return null;

    const cityLower = cityValue.toLowerCase().trim();
    return deliveryZones.find((zone) =>
      zone.city.toLowerCase() === cityLower ||
      zone.zone_name.toLowerCase().includes(cityLower) ||
      zone.areas?.some((area) => area.toLowerCase().includes(cityLower))
    ) || deliveryZones.find((zone) => zone.zone_name.toLowerCase().includes("outside")) || deliveryZones[0] || null;
  }, [deliveryZones]);

  // Fetch delivery zones
  useEffect(() => {
    const fetchZones = async () => {
      const { data } = await supabase
        .from("delivery_zones")
        .select("*")
        .eq("is_active", true)
        .order("shipping_charge");
      if (data) setDeliveryZones(data);
    };
    fetchZones();
  }, []);

  useEffect(() => {
    if (zoneManuallySelected || !shippingInfo.city || deliveryZones.length === 0) return;
    setSelectedZone(findMatchingZone(shippingInfo.city));
  }, [shippingInfo.city, deliveryZones, zoneManuallySelected, findMatchingZone]);

  const validateShippingInfo = () => {
    if (!shippingInfo.fullName || !shippingInfo.phone || !shippingInfo.address) {
      toast({
        title: "তথ্য অসম্পূর্ণ",
        description: "নাম, মোবাইল নম্বর এবং ঠিকানা অবশ্যই পূরণ করুন",
        variant: "destructive"
      });
      return false;
    }

    if (deliveryZones.length > 0 && !selectedZone) {
      toast({
        title: "ডেলিভারি জোন নির্বাচন করুন",
        description: "অর্ডার সম্পন্ন করার আগে একটি ডেলিভারি জোন নির্বাচন করুন",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleDownloadInvoice = async () => {
    if (!orderId) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-invoice', {
        body: { orderId },
        headers: { Accept: 'application/pdf' },
      });

      if (error) throw error;

      // Download PDF
      const blob = data instanceof Blob ? data : new Blob([data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `INV-${orderId.slice(0, 8).toUpperCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast({
        title: "Error",
        description: "Failed to generate invoice",
        variant: "destructive"
      });
    }
  };

  const handlePlaceOrder = async () => {
    if (!validateShippingInfo()) return;

    if (authLoading) {
      toast({
        title: "একটু অপেক্ষা করুন",
        description: "সেশন যাচাই হচ্ছে, আবার চেষ্টা করুন",
        variant: "destructive"
      });
      return;
    }


    // Guest checkout: need items in localStorage since cart context requires auth
    if (!user && !isGuest) {
      toast({
        title: "Please sign in or continue as guest",
        description: "Choose an option to proceed",
        variant: "destructive"
      });
      setProcessing(false);
      return;
    }

    if (items.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Add items to your cart before checkout",
        variant: "destructive"
      });
      navigate("/shop");
      return;
    }

    setProcessing(true);

    try {
      const { orderId: generatedOrderId, finalTotal: confirmedTotal } = await placeOrder({
        items,
        shippingInfo,
        selectedZoneId: selectedZone?.id || null,
        deliveryNotes,
        selectedPayment: selectedPayment as "bkash" | "nagad" | "advance_cod" | "cod",
        transactionId,
        paymentPhone,
        advancePaymentMethod,
        advanceAmount: selectedPayment === "advance_cod" ? Number(advanceAmount) || 0 : null,
        appliedCoupon: appliedCoupon ? { id: appliedCoupon.id, code: appliedCoupon.code } : null,
      });

      await clearCart();

      setOrderId(generatedOrderId);
      setOrderPlaced(true);

      // Fire purchase tracking events
      trackPurchase(
        generatedOrderId,
        confirmedTotal,
        items.map(item => ({
          id: item.product_id,
          name: item.product.name,
          price: item.product.sale_price || item.product.price,
          quantity: item.quantity,
        }))
      );

      toast({
        title: "Order placed!",
        description: "Thank you for your order. Check your email for confirmation."
      });
    } catch (error: any) {
      console.error("Error placing order:", error);
      const msg = error?.message || error?.details || "";
      const isRateLimit = msg.includes("১০ মিনিট") || msg.includes("২৪ ঘণ্টা") || msg.includes("সর্বোচ্চ");
      toast({
        title: isRateLimit ? "অপেক্ষা করুন" : "Error",
        description: isRateLimit ? msg : "অর্ডার দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  // Order Success Screen
  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-20">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md mx-auto text-center"
            >
              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-primary" />
              </div>
              <h1 className="font-display text-3xl font-bold text-foreground mb-4">Order Placed!</h1>
              <p className="text-muted-foreground mb-6">
                Thank you for your order. We'll send you a confirmation email with order details and tracking information.
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Order ID: <span className="text-primary font-medium font-mono">#{orderId?.slice(0, 8).toUpperCase()}</span>
              </p>
              
              {/* Download Invoice Button */}
              <Button
                onClick={handleDownloadInvoice}
                variant="outline"
                className="mb-6 gap-2"
              >
                <FileText className="w-4 h-4" />
                Download Invoice
              </Button>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {user && (
                  <Link to="/profile" className="btn-outline-gold">
                    View Order History
                  </Link>
                )}
                <Link to="/shop" className="btn-gold">
                  Continue Shopping
                </Link>
              </div>
            </motion.div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Guest/Login Choice Screen
  if (!user && step === 1 && !isGuest) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-20">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-lg mx-auto"
            >
              <h1 className="font-display text-3xl font-bold text-center mb-8">
                <span className="text-foreground">Checkout </span>
                <span className="text-gradient-gold">Options</span>
              </h1>

              <div className="space-y-4">
                {/* Sign In Option */}
                <Link
                  to="/auth?redirect=/checkout"
                  className="block card-luxury hover:border-primary transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display text-lg font-semibold text-foreground">Sign In</h3>
                      <p className="text-sm text-muted-foreground">
                        Track orders & save your details
                      </p>
                    </div>
                    <ArrowLeft className="w-5 h-5 text-muted-foreground rotate-180" />
                  </div>
                </Link>

                {/* Guest Checkout Option */}
                <button
                  onClick={() => setIsGuest(true)}
                  className="w-full card-luxury hover:border-primary transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <Truck className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display text-lg font-semibold text-foreground">Guest Checkout</h3>
                      <p className="text-sm text-muted-foreground">
                        No account needed - quick & easy
                      </p>
                    </div>
                    <ArrowLeft className="w-5 h-5 text-muted-foreground rotate-180" />
                  </div>
                </button>
              </div>

              <p className="text-center text-sm text-muted-foreground mt-8">
                You can create an account later to track your orders
              </p>
            </motion.div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="চেকআউট" noIndex />
      <Header />
      
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          <Link to="/cart" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Cart
          </Link>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-4xl font-bold mb-2"
          >
            <span className="text-foreground">Secure </span>
            <span className="text-gradient-gold">Checkout</span>
          </motion.h1>

          {isGuest && !user && (
            <p className="text-muted-foreground mb-8">
              Checking out as guest • <Link to="/auth?redirect=/checkout" className="text-primary hover:underline">Sign in instead</Link>
            </p>
          )}

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4 mb-12">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s}
                </div>
                <span className={`hidden sm:block ${step >= s ? "text-foreground" : "text-muted-foreground"}`}>
                  {s === 1 ? "Shipping" : s === 2 ? "Payment" : "Review"}
                </span>
                {s < 3 && <div className="w-12 h-0.5 bg-border" />}
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Form Section */}
            <div className="lg:col-span-2">
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="card-luxury"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <Truck className="w-6 h-6 text-primary" />
                    <h2 className="font-display text-xl font-semibold">Shipping Information</h2>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Full Name *</label>
                      <input
                        type="text"
                        className="input-luxury"
                        placeholder="Your full name"
                        value={shippingInfo.fullName}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, fullName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Phone Number *</label>
                      <input
                        type="tel"
                        className="input-luxury"
                        placeholder="+880 1XXX-XXXXXX"
                        value={shippingInfo.phone}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Email Address (ঐচ্ছিক)
                      </label>
                      <input
                        type="email"
                        className="input-luxury"
                        placeholder="your@email.com"
                        value={shippingInfo.email}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, email: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-foreground mb-2">Address *</label>
                      <input
                        type="text"
                        className="input-luxury"
                        placeholder="House/Road/Area"
                        value={shippingInfo.address}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Delivery Zone *</label>
                      <select
                        className="input-luxury w-full"
                        value={selectedZone?.id || ""}
                        onChange={(e) => {
                          const zone = deliveryZones.find((item) => item.id === e.target.value) || null;
                          setZoneManuallySelected(true);
                          setSelectedZone(zone);
                          setShippingInfo({ ...shippingInfo, city: zone?.city || "" });
                        }}
                      >
                        <option value="">Select delivery zone</option>
                        {deliveryZones.map(zone => (
                          <option key={zone.id} value={zone.id}>
                            {zone.zone_name} — ৳{zone.shipping_charge} ({zone.estimated_days || 3} days)
                          </option>
                        ))}
                      </select>
                      {selectedZone && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {selectedZone.city}{selectedZone.areas?.length ? ` • ${selectedZone.areas.join(", ")}` : ""}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">District (ঐচ্ছিক)</label>
                      <input
                        type="text"
                        className="input-luxury"
                        placeholder="Dhaka"
                        value={shippingInfo.district}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, district: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        ডেলিভারি নোট / স্পেশাল ইনস্ট্রাকশন (ঐচ্ছিক)
                      </label>
                      <textarea
                        className="input-luxury w-full min-h-[80px]"
                        placeholder="যেমন: বিল্ডিং এর গেটে দিবেন, ফ্লোর ৩, বেল বাজাবেন..."
                        value={deliveryNotes}
                        onChange={(e) => setDeliveryNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => validateShippingInfo() && setStep(2)} 
                    className="btn-gold w-full mt-6"
                  >
                    Continue to Payment
                  </button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="card-luxury"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <CreditCard className="w-6 h-6 text-primary" />
                    <h2 className="font-display text-xl font-semibold">Payment Method</h2>
                  </div>
                  <div className="space-y-3">
                    {paymentMethods.map((method) => (
                      <button
                        key={method.id}
                        onClick={() => {
                          setSelectedPayment(method.id);
                          setTransactionId("");
                          setPaymentPhone("");
                        }}
                        className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all text-left ${
                          selectedPayment === method.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <span className="text-2xl">{method.icon}</span>
                        <div className="flex-1">
                          <span className="font-medium text-foreground block">{method.name}</span>
                          <span className="text-xs text-muted-foreground">{method.description}</span>
                        </div>
                        {selectedPayment === method.id && (
                          <CheckCircle className="w-5 h-5 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* bKash/Nagad Manual Payment Details */}
                  {(selectedPayment === "bkash" || selectedPayment === "nagad") && (
                    <div className="mt-6 p-4 bg-muted rounded-xl space-y-4">
                      <div className="p-3 bg-primary/10 rounded-lg text-sm">
                        <p className="font-semibold text-foreground mb-1">
                          📲 {selectedPayment === "bkash" ? "bKash" : "Nagad"} Payment Instructions:
                        </p>
                        <ol className="list-decimal list-inside text-muted-foreground space-y-1">
                          <li>Open the {selectedPayment === "bkash" ? "bKash" : "Nagad"} app</li>
                          <li>Select "Send Money"</li>
                          <li>Number: <span className="font-mono font-bold text-foreground">{paymentMethods.find(m => m.id === selectedPayment)?.number}</span></li>
                          <li>Send total ৳{finalTotal.toLocaleString()}</li>
                          <li>Enter the Transaction ID below</li>
                        </ol>
                      </div>
                      <div>
                        <Label className="text-sm mb-1 block">Your {selectedPayment === "bkash" ? "bKash" : "Nagad"} Number *</Label>
                        <Input
                          placeholder="01XXXXXXXXX"
                          value={paymentPhone}
                          onChange={(e) => setPaymentPhone(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-sm mb-1 block">Transaction ID *</Label>
                        <Input
                          placeholder="e.g. TXN8A4K2M9"
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Advance + COD Details */}
                  {selectedPayment === "advance_cod" && (
                    <div className="mt-6 p-4 bg-muted rounded-xl space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Send a partial advance payment; pay the rest on delivery.
                      </p>
                      <div>
                        <Label className="text-sm mb-1 block">Advance Payment Method</Label>
                        <RadioGroup value={advancePaymentMethod} onValueChange={(v) => setAdvancePaymentMethod(v as "bkash" | "nagad")} className="flex gap-4 mt-1">
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="bkash" id="adv-bkash" />
                            <Label htmlFor="adv-bkash">bKash</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="nagad" id="adv-nagad" />
                            <Label htmlFor="adv-nagad">Nagad</Label>
                          </div>
                        </RadioGroup>
                      </div>
                      <div className="p-3 bg-primary/10 rounded-lg text-sm">
                        <p className="text-muted-foreground">
                          নম্বর: <span className="font-mono font-bold text-foreground">{paymentMethods.find(m => m.id === advancePaymentMethod)?.number || "01XXXXXXXXX"}</span>
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm mb-1 block">Advance Amount (৳) *</Label>
                        <Input
                          type="number"
                          placeholder={`Minimum ৳${Math.ceil(finalTotal * 0.2)}`}
                          value={advanceAmount}
                          onChange={(e) => setAdvanceAmount(e.target.value)}
                        />
                        {advanceAmount && Number(advanceAmount) > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Due on delivery: ৳{(finalTotal - Number(advanceAmount)).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm mb-1 block">Your Phone Number *</Label>
                        <Input
                          placeholder="01XXXXXXXXX"
                          value={paymentPhone}
                          onChange={(e) => setPaymentPhone(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-sm mb-1 block">Transaction ID *</Label>
                        <Input
                          placeholder="e.g. TXN8A4K2M9"
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* COD Info */}
                  {selectedPayment === "cod" && (
                    <div className="mt-6 p-4 bg-muted rounded-xl">
                      <p className="text-sm text-muted-foreground">
                        💵 Pay the full amount of ৳{finalTotal.toLocaleString()} on delivery. Please keep cash ready.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-4 mt-6">
                    <button onClick={() => setStep(1)} className="btn-outline-gold flex-1">
                      Back
                    </button>
                    <button
                      onClick={() => {
                        const isMobile = selectedPayment === "bkash" || selectedPayment === "nagad";
                        const isAdvCod = selectedPayment === "advance_cod";
                        if (isMobile && (!transactionId || !paymentPhone)) {
                          toast({ title: "Missing info", description: "Please enter Transaction ID and phone number", variant: "destructive" });
                          return;
                        }
                        if (isAdvCod && (!transactionId || !paymentPhone || !advanceAmount || Number(advanceAmount) <= 0)) {
                          toast({ title: "Missing info", description: "Please enter advance amount, Transaction ID, and phone number", variant: "destructive" });
                          return;
                        }
                        setStep(3);
                      }}
                      disabled={!selectedPayment}
                      className="btn-gold flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Review Order
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="card-luxury"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <Shield className="w-6 h-6 text-primary" />
                    <h2 className="font-display text-xl font-semibold">Review & Confirm</h2>
                  </div>
                  
                  <div className="space-y-4 mb-6">
                    <div className="p-4 bg-muted rounded-xl">
                      <h4 className="font-medium text-foreground mb-2">Shipping Address</h4>
                      <p className="text-muted-foreground text-sm">
                        {shippingInfo.fullName}<br />
                        {shippingInfo.address}<br />
                        {shippingInfo.city}, {shippingInfo.district}<br />
                        📞 {shippingInfo.phone}
                        {shippingInfo.email && <><br />📧 {shippingInfo.email}</>}
                        {deliveryNotes && <><br /><br />📝 <strong>ডেলিভারি নোট:</strong> {deliveryNotes}</>}
                      </p>
                    </div>
                    <div className="p-4 bg-muted rounded-xl">
                      <h4 className="font-medium text-foreground mb-2">Payment</h4>
                      <p className="text-muted-foreground text-sm">
                        {paymentMethods.find(m => m.id === selectedPayment)?.name}
                        {transactionId && <><br />TxID: <span className="font-mono">{transactionId}</span></>}
                        {paymentPhone && <><br />Phone: {paymentPhone}</>}
                        {selectedPayment === "advance_cod" && advanceAmount && (
                          <>
                            <br />Advance: ৳{Number(advanceAmount).toLocaleString()}
                            <br />Due on delivery: ৳{(finalTotal - Number(advanceAmount)).toLocaleString()}
                          </>
                        )}
                        {selectedPayment === "cod" && <><br />💵 Full Cash on Delivery</>}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button onClick={() => setStep(2)} className="btn-outline-gold flex-1">
                      Back
                    </button>
                    <button 
                      onClick={handlePlaceOrder} 
                      className="btn-gold flex-1 disabled:opacity-50"
                      disabled={processing}
                    >
                      {processing ? "Processing..." : "Place Order"}
                    </button>
                  </div>
                  
                </motion.div>
              )}
            </div>

            {/* Order Summary */}
            <div>
              <div className="card-luxury sticky top-24">
                <h3 className="font-display text-xl font-semibold text-foreground mb-6">Order Summary</h3>
                {items.length === 0 ? (
                  <p className="text-muted-foreground text-sm mb-4">Your cart is empty</p>
                ) : (
                  <div className="space-y-4 border-b border-border pb-4 mb-4 max-h-60 overflow-y-auto">
                    {items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {item.product.name} x {item.quantity}
                          {item.size && ` (${item.size})`}
                          {item.color && ` - ${item.color}`}
                        </span>
                        <span className="text-foreground">
                          ৳{((item.product.sale_price || item.product.price) * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>৳{total.toLocaleString()}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({appliedCoupon?.code})</span>
                      <span>-৳{discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-muted-foreground">
                    <span>Shipping {selectedZone ? `(${selectedZone.zone_name})` : ""}</span>
                    <span>{total > 0 ? (selectedZone ? `৳${shippingCost}` : "Select city") : "—"}</span>
                  </div>
                  {selectedZone?.estimated_days && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Estimated Delivery</span>
                      <span>{selectedZone.estimated_days} days</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-semibold text-foreground pt-2 border-t border-border">
                    <span>Total</span>
                    <span className="text-gradient-gold">৳{finalTotal.toLocaleString()}</span>
                  </div>
                </div>

                {/* Coupon Input */}
                <div className="mt-4 pt-4 border-t border-border">
                  <CouponInput
                    subtotal={total}
                    appliedCoupon={appliedCoupon}
                    onApplyCoupon={(coupon, discount) => {
                      setAppliedCoupon(coupon);
                      setDiscountAmount(discount);
                    }}
                    onRemoveCoupon={() => {
                      setAppliedCoupon(null);
                      setDiscountAmount(0);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Checkout;
