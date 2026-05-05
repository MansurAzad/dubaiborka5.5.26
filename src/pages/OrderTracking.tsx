import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Package, Truck, CheckCircle, Clock, MapPin, ArrowLeft, Search, XCircle, Hash } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/seo/SEOHead";

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
  size: string | null;
  color: string | null;
  product_id: string | null;
}

interface OrderWithItems {
  id: string;
  status: string;
  total: number;
  created_at: string;
  updated_at: string;
  shipping_address: string;
  shipping_city: string;
  shipping_phone: string;
  tracking_number: string | null;
  courier_name: string | null;
  estimated_delivery: string | null;
  payment_method: string;
  payment_status: string;
  discount_amount: number | null;
  order_items?: OrderItem[];
}

const statusSteps = [
  { key: "pending", label: "Order Received", icon: Clock, description: "Your order has been confirmed" },
  { key: "processing", label: "Processing", icon: Package, description: "Your product is being packed" },
  { key: "shipped", label: "Shipped", icon: Truck, description: "Handed over to courier" },
  { key: "delivered", label: "Delivered", icon: CheckCircle, description: "Successfully delivered" },
];

const OrderTracking = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(id || "");
  const [error, setError] = useState("");
  const [orders, setOrders] = useState<OrderWithItems[]>([]);

  const fetchOrderItems = async (orderId: string) => {
    const { data } = await supabase.rpc("track_order_items", { p_order_id: orderId });
    setOrderItems((data as OrderItem[]) || []);
  };

  const fetchOrder = async (query: string) => {
    setLoading(true);
    setError("");
    setOrders([]);
    setOrderItems([]);
    try {
      const isUUID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(query);
      const isPhone = /^0[0-9]{10}$/.test(query.replace(/[\s-]/g, ""));

      let data: any[] | null = null;
      let err: any = null;

      if (isUUID) {
        const res = await supabase.rpc("track_order_by_id", { order_id: query });
        err = res.error;
        data = res.data;
      } else if (isPhone) {
        const cleanPhone = query.replace(/[\s-]/g, "");
        const res = await supabase.rpc("track_order_by_phone", { phone_number: cleanPhone });
        err = res.error;
        data = res.data;
      } else {
        const res = await supabase.rpc("track_order_by_phone", { phone_number: query });
        err = res.error;
        data = res.data;
      }

      if (err) throw err;
      if (!data || data.length === 0) {
        setError("অর্ডার পাওয়া যায়নি। সঠিক অর্ডার আইডি অথবা মোবাইল নম্বর দিন।");
        setOrder(null);
      } else if (data.length === 1) {
        const foundOrder = data[0] as OrderWithItems;
        setOrder(foundOrder);
        fetchOrderItems(foundOrder.id);
      } else {
        setOrders(data as OrderWithItems[]);
        setOrder(null);
      }
    } catch {
      setError("অর্ডার খুঁজে পেতে সমস্যা হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchOrder(id);
  }, [id]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) fetchOrder(searchQuery.trim());
  };

  const getStepIndex = (status: string) => {
    if (status === "cancelled") return -1;
    return statusSteps.findIndex(s => s.key === status);
  };

  const currentStep = order ? getStepIndex(order.status) : -1;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="অর্ডার ট্র্যাকিং" description="আপনার অর্ডারের বর্তমান অবস্থা ট্র্যাক করুন — দুবাই বোরকা হাউস।" canonical="/track" />
      <Header />
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <Link to={user ? "/profile" : "/"} className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8">
            <ArrowLeft className="w-4 h-4" />
            {user ? "My Account" : "Home"}
          </Link>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-display text-3xl font-bold mb-2">
              <span className="text-foreground">Order </span>
              <span className="text-gradient-gold">Tracking</span>
            </h1>
            <p className="text-muted-foreground mb-8">View the current status of your order</p>

            <form onSubmit={handleSearch} className="flex gap-3 mb-8">
              <div className="relative flex-1">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="অর্ডার আইডি অথবা মোবাইল নম্বর দিন..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <Button type="submit" disabled={loading}>
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </form>

            {error && (
              <div className="card-luxury text-center py-8">
                <XCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
                <p className="text-muted-foreground">{error}</p>
              </div>
            )}

            {loading && (
              <div className="card-luxury text-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Searching...</p>
              </div>
            )}

            {orders.length > 1 && !loading && (
              <div className="space-y-3 mb-6">
                <h3 className="font-display text-lg font-semibold">আপনার অর্ডারসমূহ ({orders.length}টি)</h3>
                {orders.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => { setOrder(o); setOrders([]); fetchOrderItems(o.id); }}
                    className="card-luxury w-full text-left hover:border-primary transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-mono text-primary font-medium">#{o.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-sm text-muted-foreground">{new Date(o.created_at).toLocaleDateString("bn-BD")}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-display font-bold text-gradient-gold">৳{Number(o.total).toLocaleString()}</p>
                        <p className="text-sm capitalize">{o.status}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {order && !loading && (
              <div className="space-y-6">
                <div className="card-luxury">
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Order ID</p>
                      <p className="font-mono text-primary font-medium">#{order.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p>{new Date(order.created_at).toLocaleDateString("en-US")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="font-display text-xl font-bold text-gradient-gold">৳{Number(order.total).toLocaleString()}</p>
                    </div>
                  </div>

                  {order.tracking_number && (
                    <div className="mt-4 p-3 bg-muted rounded-lg flex items-center gap-3">
                      <Truck className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Tracking Number ({order.courier_name || "Courier"})</p>
                        <p className="font-mono font-medium">{order.tracking_number}</p>
                      </div>
                    </div>
                  )}

                  {order.estimated_delivery && (
                    <p className="text-sm text-muted-foreground mt-3">
                      Estimated Delivery: <span className="text-foreground font-medium">{new Date(order.estimated_delivery).toLocaleDateString("en-US")}</span>
                    </p>
                  )}
                </div>

                {order.status === "cancelled" ? (
                  <div className="card-luxury text-center py-8">
                    <XCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
                    <h3 className="font-display text-lg font-semibold text-destructive">Order Cancelled</h3>
                  </div>
                ) : (
                  <div className="card-luxury">
                    <h3 className="font-display text-lg font-semibold mb-6">Order Status</h3>
                    <div className="space-y-0">
                      {statusSteps.map((step, index) => {
                        const isCompleted = index <= currentStep;
                        const isCurrent = index === currentStep;
                        const Icon = step.icon;
                        return (
                          <div key={step.key} className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${isCompleted ? "bg-primary border-primary text-primary-foreground" : "border-border text-muted-foreground"} ${isCurrent ? "ring-4 ring-primary/20" : ""}`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              {index < statusSteps.length - 1 && (
                                <div className={`w-0.5 h-12 ${isCompleted ? "bg-primary" : "bg-border"}`} />
                              )}
                            </div>
                            <div className="pb-12">
                              <p className={`font-medium ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
                              <p className="text-sm text-muted-foreground">{step.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Order Items */}
                {orderItems.length > 0 && (
                  <div className="card-luxury">
                    <div className="flex items-center gap-2 mb-4">
                      <Package className="w-5 h-5 text-primary" />
                      <h3 className="font-display text-lg font-semibold">অর্ডারকৃত পণ্য</h3>
                    </div>
                    <div className="divide-y divide-border">
                      {orderItems.map((item) => (
                        <div key={item.id} className="py-3 flex justify-between items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{item.product_name}</p>
                            <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
                              {item.size && <span>সাইজ: {item.size}</span>}
                              {item.color && <span>কালার: {item.color}</span>}
                              <span>পরিমাণ: {item.quantity}</span>
                            </div>
                          </div>
                          <p className="font-display font-bold text-gradient-gold whitespace-nowrap">
                            ৳{(Number(item.price) * item.quantity).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                    {order.discount_amount && Number(order.discount_amount) > 0 && (
                      <div className="pt-3 border-t border-border flex justify-between text-sm">
                        <span className="text-muted-foreground">ডিসকাউন্ট</span>
                        <span className="text-destructive">-৳{Number(order.discount_amount).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="pt-3 border-t border-border flex justify-between font-semibold">
                      <span>মোট</span>
                      <span className="text-gradient-gold">৳{Number(order.total).toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <div className="card-luxury">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-5 h-5 text-primary" />
                    <h3 className="font-display text-lg font-semibold">ডেলিভারি ঠিকানা</h3>
                  </div>
                  <p>{order.shipping_address}</p>
                  <p>{order.shipping_city}</p>
                  <p className="text-muted-foreground">{order.shipping_phone}</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default OrderTracking;
