import { useState } from "react";
import { motion } from "framer-motion";
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import { useCart } from "@/contexts/CartContext";

import FreeShippingProgress from "@/components/marketing/FreeShippingProgress";
import CouponInput from "@/components/checkout/CouponInput";
import SEOHead from "@/components/seo/SEOHead";

const Cart = () => {
  const { items, loading, itemCount, total, updateQuantity, removeItem } = useCart();
  
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string; code: string; description: string | null;
    discount_type: string; discount_value: number; minimum_order_amount: number;
  } | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const shipping = total > 5000 ? 0 : 150;
  const grandTotal = total - discountAmount + shipping;

  // Removed auth gate - guest users can now use cart via localStorage

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-20">
          <div className="container mx-auto px-4">
            <div className="text-center py-20">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading your cart...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="শপিং কার্ট" noIndex />
      <Header />
      <Breadcrumbs />
      <main className="pt-4 pb-20">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="font-display text-4xl font-bold mb-2">
              <span className="text-foreground">Shopping </span>
              <span className="text-gradient-gold">Cart</span>
            </h1>
            <p className="text-muted-foreground">{itemCount} items in your cart</p>
          </motion.div>

          {items.length > 0 && (
            <div className="mb-6">
              <FreeShippingProgress currentTotal={total} />
            </div>
          )}

          {items.length === 0 ? (
            <div className="text-center py-20">
              <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="font-display text-2xl font-semibold text-foreground mb-2">Your cart is empty</h2>
              <p className="text-muted-foreground mb-6">You haven't added anything yet.</p>
              <Link to="/shop" className="btn-gold inline-flex items-center gap-2">Continue Shopping<ArrowRight className="w-4 h-4" /></Link>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                {items.map((item, index) => (
                  <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="card-luxury flex gap-4">
                    <img src={item.product.image_url || "/placeholder.svg"} alt={item.product.name} className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-xl" />
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <div>
                          <h3 className="font-display text-lg font-semibold text-foreground">{item.product.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {item.size && `Size: ${item.size}`}
                            {item.size && item.color && " | "}
                            {item.color && `Color: ${item.color}`}
                          </p>
                        </div>
                        <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="font-display text-lg font-bold text-gradient-gold">
                          ৳{((item.product.sale_price || item.product.price) * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div>
                <div className="card-luxury sticky top-24">
                  <h3 className="font-display text-xl font-semibold text-foreground mb-6">Order Summary</h3>
                  <div className="mb-6">
                    <CouponInput
                      subtotal={total}
                      appliedCoupon={appliedCoupon}
                      onApplyCoupon={(coupon, discount) => { setAppliedCoupon(coupon); setDiscountAmount(discount); }}
                      onRemoveCoupon={() => { setAppliedCoupon(null); setDiscountAmount(0); }}
                    />
                  </div>
                  <div className="space-y-3 border-t border-border pt-4">
                    <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>৳{total.toLocaleString()}</span></div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-green-600"><span>Discount ({appliedCoupon?.code})</span><span>-৳{discountAmount.toLocaleString()}</span></div>
                    )}
                    <div className="flex justify-between text-muted-foreground"><span>Shipping</span><span>{shipping === 0 ? "Free" : `৳${shipping}`}</span></div>
                    {shipping === 0 && <p className="text-sm text-primary">🎉 You qualify for free shipping!</p>}
                    <div className="flex justify-between text-lg font-semibold text-foreground pt-3 border-t border-border"><span>Total</span><span className="text-gradient-gold">৳{grandTotal.toLocaleString()}</span></div>
                  </div>
                  <Link to="/checkout" className="btn-gold w-full flex items-center justify-center gap-2 mt-6">Checkout<ArrowRight className="w-4 h-4" /></Link>
                  <Link to="/shop" className="block text-center text-primary mt-4 text-sm gold-underline">Continue Shopping</Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Cart;
