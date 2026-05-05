import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, MapPin, Phone, User, FileText, CreditCard, Banknote } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import CouponInput from "@/components/checkout/CouponInput";
import { trackPurchase } from "@/components/seo/AnalyticsTracker";
import { placeOrder } from "@/lib/order-placement";

interface DeliveryZone {
  id: string;
  zone_name: string;
  city: string;
  shipping_charge: number;
  estimated_days: number | null;
  areas: string[] | null;
}

const paymentMethods = [
  { id: "bkash", name: "bKash", icon: "📱", number: "01845853634" },
  { id: "nagad", name: "Nagad", icon: "💳", number: "01845853634" },
  { id: "advance_cod", name: "Advance + COD", icon: "💰" },
  { id: "cod", name: "Cash on Delivery", icon: "💵" },
];

interface FloatingCartSidebarProps {
  open: boolean;
  onClose: () => void;
}

const FloatingCartSidebar = ({ open, onClose }: FloatingCartSidebarProps) => {
  const { items, total, itemCount, updateQuantity, removeItem, clearCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"cart" | "checkout">("cart");
  const [processing, setProcessing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  // Checkout fields
  const [shippingInfo, setShippingInfo] = useState({ fullName: "", phone: "", email: "", address: "", city: "", district: "" });
  const [selectedPayment, setSelectedPayment] = useState("cod");
  const [transactionId, setTransactionId] = useState("");
  const [paymentPhone, setPaymentPhone] = useState("");
  const [advancePaymentMethod, setAdvancePaymentMethod] = useState<"bkash" | "nagad">("bkash");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
  const [zoneManuallySelected, setZoneManuallySelected] = useState(false);

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

  useEffect(() => {
    const fetchZones = async () => {
      const { data } = await supabase.from("delivery_zones").select("*").eq("is_active", true).order("shipping_charge");
      if (data) setDeliveryZones(data);
    };
    if (open && mode === "checkout") fetchZones();
  }, [open, mode]);

  useEffect(() => {
    if (zoneManuallySelected || !shippingInfo.city || deliveryZones.length === 0) return;
    setSelectedZone(findMatchingZone(shippingInfo.city));
  }, [shippingInfo.city, deliveryZones, zoneManuallySelected, findMatchingZone]);

  // Load profile data
  useEffect(() => {
    if (!user || mode !== "checkout") return;
    const loadProfile = async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        setShippingInfo(prev => ({
          ...prev,
          fullName: data.full_name || prev.fullName,
          phone: data.phone || prev.phone,
          address: data.address || prev.address,
          city: data.city || prev.city,
        }));
      }
    };
    loadProfile();
  }, [user, mode]);

  const handlePlaceOrder = async () => {
    if (authLoading) {
      toast({ title: "একটু অপেক্ষা করুন", description: "সেশন যাচাই হচ্ছে, আবার চেষ্টা করুন", variant: "destructive" });
      return;
    }

    if (!shippingInfo.fullName || !shippingInfo.phone || !shippingInfo.address) {
      toast({ title: "তথ্য অসম্পূর্ণ", description: "নাম, মোবাইল নম্বর এবং ঠিকানা অবশ্যই পূরণ করুন", variant: "destructive" });
      return;
    }
    if (items.length === 0) {
      toast({ title: "কার্ট খালি", description: "কার্টে পণ্য যোগ করুন", variant: "destructive" });
      return;
    }

    if (deliveryZones.length > 0 && !selectedZone) {
      toast({ title: "ডেলিভারি জোন নির্বাচন করুন", description: "ড্রপডাউন থেকে একটি ডেলিভারি জোন নির্বাচন করুন", variant: "destructive" });
      return;
    }

    if ((selectedPayment === "bkash" || selectedPayment === "nagad") && (!transactionId.trim() || !paymentPhone.trim())) {
      toast({ title: "পেমেন্ট তথ্য দিন", description: "Transaction ID এবং পেমেন্ট নম্বর দিন", variant: "destructive" });
      return;
    }

    if (selectedPayment === "advance_cod" && (!advanceAmount || Number(advanceAmount) <= 0 || !transactionId.trim() || !paymentPhone.trim())) {
      toast({ title: "পেমেন্ট তথ্য দিন", description: "অগ্রিম পরিমাণ, Transaction ID এবং পেমেন্ট নম্বর দিন", variant: "destructive" });
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

      trackPurchase(generatedOrderId, confirmedTotal, items.map(item => ({
        id: item.product_id,
        name: item.product.name,
        price: item.product.sale_price || item.product.price,
        quantity: item.quantity,
      })));

      toast({ title: "অর্ডার সফল! ✅", description: "আপনার অর্ডারটি সফলভাবে সম্পন্ন হয়েছে।" });
    } catch (error: any) {
      console.error("Order error:", error);
      const msg = error?.message || error?.details || "";
      const isRateLimit = msg.includes("১০ মিনিট") || msg.includes("২৪ ঘণ্টা") || msg.includes("সর্বোচ্চ");
      toast({ title: isRateLimit ? "অপেক্ষা করুন" : "Error", description: isRateLimit ? msg : "অর্ডার দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const resetCheckout = () => {
    setMode("cart");
    setOrderPlaced(false);
    setOrderId(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />
          {/* Sidebar */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-background border-l border-border z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                <h2 className="font-display text-lg font-semibold">
                  {orderPlaced ? "অর্ডার সম্পন্ন ✅" : mode === "checkout" ? "চেকআউট" : `কার্ট (${itemCount})`}
                </h2>
              </div>
              <button onClick={orderPlaced ? resetCheckout : onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {orderPlaced ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShoppingBag className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="font-display text-xl font-bold mb-2">ধন্যবাদ! 🎉</h3>
                  <p className="text-muted-foreground text-sm mb-1">আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে।</p>
                  {orderId && <p className="text-xs text-muted-foreground font-mono mb-4">Order ID: {orderId.slice(0, 8).toUpperCase()}</p>}
                  <div className="space-y-2">
                    <Button onClick={() => { resetCheckout(); navigate("/order-tracking"); }} className="w-full">অর্ডার ট্র্যাক করুন</Button>
                    <Button variant="outline" onClick={() => { resetCheckout(); navigate("/shop"); }} className="w-full">আরো শপিং করুন</Button>
                  </div>
                </div>
              ) : mode === "cart" ? (
                /* Cart Items */
                items.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">আপনার কার্ট খালি</p>
                    <Button variant="outline" onClick={onClose} className="mt-4">শপিং করুন</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.id} className="flex gap-3 p-3 rounded-xl bg-muted/50 border border-border">
                        <img
                          src={item.product.image_url || "/placeholder.svg"}
                          alt={item.product.name}
                          className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-foreground truncate">{item.product.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {item.size && `Size: ${item.size}`}
                            {item.size && item.color && " | "}
                            {item.color && `Color: ${item.color}`}
                          </p>
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center gap-1">
                              <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <span className="text-sm font-bold text-primary">৳{((item.product.sale_price || item.product.price) * item.quantity).toLocaleString()}</span>
                          </div>
                        </div>
                        <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive transition-colors self-start">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                /* Checkout Form */
                <div className="space-y-4">
                  {/* Shipping */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-foreground flex items-center gap-2"><MapPin className="w-4 h-4" /> ডেলিভারি তথ্য</h3>
                    <div>
                      <Label className="text-xs">নাম *</Label>
                      <Input value={shippingInfo.fullName} onChange={e => setShippingInfo(p => ({ ...p, fullName: e.target.value }))} placeholder="আপনার নাম" className="h-9 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">মোবাইল নম্বর *</Label>
                      <Input value={shippingInfo.phone} onChange={e => setShippingInfo(p => ({ ...p, phone: e.target.value }))} placeholder="01XXXXXXXXX" className="h-9 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">ঠিকানা *</Label>
                      <Input value={shippingInfo.address} onChange={e => setShippingInfo(p => ({ ...p, address: e.target.value }))} placeholder="সম্পূর্ণ ঠিকানা" className="h-9 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">শহর</Label>
                        <Input value={shippingInfo.city} onChange={e => { setZoneManuallySelected(false); setShippingInfo(p => ({ ...p, city: e.target.value })); }} placeholder="শহর" className="h-9 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">জেলা</Label>
                        <Input value={shippingInfo.district} onChange={e => setShippingInfo(p => ({ ...p, district: e.target.value }))} placeholder="জেলা" className="h-9 text-sm" />
                      </div>
                    </div>
                    {deliveryZones.length > 0 && (
                      <div>
                        <Label className="text-xs">ডেলিভারি জোন *</Label>
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={selectedZone?.id || ""}
                          onChange={(e) => {
                            const zone = deliveryZones.find((item) => item.id === e.target.value) || null;
                            setZoneManuallySelected(true);
                            setSelectedZone(zone);
                            if (zone) {
                              setShippingInfo((prev) => ({ ...prev, city: zone.city }));
                            }
                          }}
                        >
                          <option value="">ডেলিভারি জোন নির্বাচন করুন</option>
                          {deliveryZones.map((zone) => (
                            <option key={zone.id} value={zone.id}>
                              {zone.zone_name} — ৳{Number(zone.shipping_charge).toLocaleString()}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {!user && (
                      <div>
                        <Label className="text-xs">ইমেইল (ঐচ্ছিক)</Label>
                        <Input value={shippingInfo.email} onChange={e => setShippingInfo(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" className="h-9 text-sm" />
                      </div>
                    )}
                    <div>
                      <Label className="text-xs">ডেলিভারি নোট</Label>
                      <Input value={deliveryNotes} onChange={e => setDeliveryNotes(e.target.value)} placeholder="বিশেষ নির্দেশনা..." className="h-9 text-sm" />
                    </div>
                  </div>

                  {/* Delivery Zone Info */}
                  {selectedZone && (
                    <div className="p-2 rounded-lg bg-muted text-xs text-muted-foreground">
                      📦 {selectedZone.zone_name} • {selectedZone.city} • ৳{selectedZone.shipping_charge}
                      {selectedZone.estimated_days && ` (${selectedZone.estimated_days} দিন)`}
                    </div>
                  )}

                  {/* Payment */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-foreground flex items-center gap-2"><CreditCard className="w-4 h-4" /> পেমেন্ট</h3>
                    <RadioGroup value={selectedPayment} onValueChange={setSelectedPayment} className="space-y-2">
                      {paymentMethods.map(m => (
                        <div key={m.id} className="flex items-center space-x-2 p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                          <RadioGroupItem value={m.id} id={`pay-${m.id}`} />
                          <Label htmlFor={`pay-${m.id}`} className="text-sm cursor-pointer flex-1">{m.icon} {m.name}</Label>
                        </div>
                      ))}
                    </RadioGroup>

                    {(selectedPayment === "bkash" || selectedPayment === "nagad") && (
                      <div className="p-3 bg-muted rounded-lg space-y-2">
                        <p className="text-xs text-muted-foreground">
                          {paymentMethods.find(m => m.id === selectedPayment)?.name} নম্বর: <strong>{paymentMethods.find(m => m.id === selectedPayment)?.number}</strong>
                        </p>
                        <Input value={transactionId} onChange={e => setTransactionId(e.target.value)} placeholder="Transaction ID" className="h-8 text-xs" />
                        <Input value={paymentPhone} onChange={e => setPaymentPhone(e.target.value)} placeholder="পেমেন্ট করা নম্বর" className="h-8 text-xs" />
                      </div>
                    )}

                    {selectedPayment === "advance_cod" && (
                      <div className="p-3 bg-muted rounded-lg space-y-2">
                        <RadioGroup value={advancePaymentMethod} onValueChange={(v) => setAdvancePaymentMethod(v as "bkash" | "nagad")} className="flex gap-3">
                          <div className="flex items-center gap-1"><RadioGroupItem value="bkash" id="adv-bkash" /><Label htmlFor="adv-bkash" className="text-xs">bKash</Label></div>
                          <div className="flex items-center gap-1"><RadioGroupItem value="nagad" id="adv-nagad" /><Label htmlFor="adv-nagad" className="text-xs">Nagad</Label></div>
                        </RadioGroup>
                        <Input value={advanceAmount} onChange={e => setAdvanceAmount(e.target.value)} placeholder="অগ্রিম পরিমাণ ৳" className="h-8 text-xs" type="number" />
                        <Input value={transactionId} onChange={e => setTransactionId(e.target.value)} placeholder="Transaction ID" className="h-8 text-xs" />
                        <Input value={paymentPhone} onChange={e => setPaymentPhone(e.target.value)} placeholder="পেমেন্ট করা নম্বর" className="h-8 text-xs" />
                      </div>
                    )}
                  </div>

                  {/* Coupon */}
                  <CouponInput
                    subtotal={total}
                    appliedCoupon={appliedCoupon}
                    onApplyCoupon={(coupon, discount) => { setAppliedCoupon(coupon); setDiscountAmount(discount); }}
                    onRemoveCoupon={() => { setAppliedCoupon(null); setDiscountAmount(0); }}
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            {!orderPlaced && items.length > 0 && (
              <div className="border-t border-border p-4 space-y-3">
                {/* Summary */}
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>সাবটোটাল</span>
                    <span>৳{total.toLocaleString()}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>ডিসকাউন্ট</span>
                      <span>-৳{discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  {mode === "checkout" && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>শিপিং</span>
                      <span>{selectedZone ? `৳${shippingCost}` : "শহর দিন"}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-foreground pt-1 border-t border-border">
                    <span>মোট</span>
                    <span className="text-primary">৳{(mode === "checkout" ? finalTotal : total - discountAmount).toLocaleString()}</span>
                  </div>
                </div>

                {mode === "cart" ? (
                  <Button onClick={() => setMode("checkout")} className="w-full btn-gold">
                    চেকআউট করুন <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Button onClick={handlePlaceOrder} disabled={processing} className="w-full btn-gold">
                      {processing ? "প্রসেসিং..." : "অর্ডার কনফার্ম করুন"}
                    </Button>
                    <Button variant="outline" onClick={() => setMode("cart")} className="w-full text-sm">
                      ← কার্টে ফিরে যান
                    </Button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default FloatingCartSidebar;
