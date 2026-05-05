import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Package, MapPin, LogOut, ChevronRight, Clock, CheckCircle, Truck, XCircle, FileText, Loader2, Gift, Heart, ShoppingBag, BarChart3, LayoutDashboard, ShieldCheck, Shield } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RewardsReferral from "@/components/profile/RewardsReferral";
import AddressBook from "@/components/profile/AddressBook";
import { useWishlist } from "@/contexts/WishlistContext";
import { useCart } from "@/contexts/CartContext";
import SEOHead from "@/components/seo/SEOHead";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { ALL_PERMISSIONS, PERMISSION_ACCESS_MAP, type PermissionKey } from "@/lib/permissions";

interface Profile { id: string; full_name: string | null; phone: string | null; address: string | null; city: string | null; }
interface Order { id: string; status: string; total: number; created_at: string; shipping_address: string; shipping_city: string; }

const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  pending: { icon: <Clock className="w-4 h-4" />, color: "text-yellow-500", label: "Pending" },
  processing: { icon: <Package className="w-4 h-4" />, color: "text-blue-500", label: "Processing" },
  shipped: { icon: <Truck className="w-4 h-4" />, color: "text-purple-500", label: "Shipped" },
  delivered: { icon: <CheckCircle className="w-4 h-4" />, color: "text-green-500", label: "Delivered" },
  cancelled: { icon: <XCircle className="w-4 h-4" />, color: "text-red-500", label: "Cancelled" },
};

const Profile = () => {
  const [activeTab, setActiveTab] = useState<"dashboard" | "profile" | "orders" | "rewards" | "addresses">("dashboard");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);
  const [formData, setFormData] = useState({ full_name: "", phone: "", address: "", city: "" });
  const [, setTick] = useState(0);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { items: wishlistItems, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { isStaff, isAdmin, isModerator, permissions, loading: staffLoading } = useAdminAuth();

  // Auto-refresh timer for cancel countdown
  useEffect(() => {
    const hasPendingRecent = orders.some(o => {
      if (o.status !== "pending") return false;
      return (Date.now() - new Date(o.created_at).getTime()) <= 15 * 60 * 1000;
    });
    if (!hasPendingRecent) return;
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [orders]);

  const handleDownloadInvoice = async (orderId: string) => {
    setDownloadingInvoice(orderId);
    try {
      const { data, error } = await supabase.functions.invoke('generate-invoice', {
        body: { orderId },
        headers: { Accept: 'application/pdf' },
      });
      if (error) throw error;
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
      toast({ title: "Error", description: "Failed to generate invoice", variant: "destructive" });
    } finally {
      setDownloadingInvoice(null);
    }
  };

  const canCancelOrder = (order: Order) => {
    if (order.status !== "pending") return false;
    const createdAt = new Date(order.created_at).getTime();
    const now = Date.now();
    const fifteenMin = 15 * 60 * 1000;
    return (now - createdAt) <= fifteenMin;
  };

  const getRemainingCancelTime = (order: Order) => {
    const createdAt = new Date(order.created_at).getTime();
    const deadline = createdAt + 15 * 60 * 1000;
    const remaining = deadline - Date.now();
    if (remaining <= 0) return null;
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCancelOrder = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order || !canCancelOrder(order)) {
      toast({ title: "সময় শেষ", description: "অর্ডারের ১৫ মিনিট পার হয়ে গেছে, এখন ক্যান্সেল করা যাবে না।", variant: "destructive" });
      return;
    }
    if (!confirm("আপনি কি নিশ্চিত এই অর্ডারটি ক্যান্সেল করতে চান?")) return;
    const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", orderId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "অর্ডার ক্যান্সেল হয়েছে", description: "আপনার অর্ডারটি সফলভাবে ক্যান্সেল করা হয়েছে।" });
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: "cancelled" } : o));
    }
  };

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    const fetchData = async () => {
      try {
        const { data: profileData } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
        if (profileData) {
          setProfile(profileData);
          setFormData({ full_name: profileData.full_name || "", phone: profileData.phone || "", address: profileData.address || "", city: profileData.city || "" });
        }
        const { data: ordersData } = await supabase.from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
        setOrders(ordersData || []);
      } catch (error) { console.error("Error fetching data:", error); } finally { setLoading(false); }
    };
    fetchData();
  }, [user, navigate]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({ full_name: formData.full_name || null, phone: formData.phone || null, address: formData.address || null, city: formData.city || null }).eq("user_id", user.id);
      if (error) throw error;
      toast({ title: "Profile Updated", description: "Your information has been saved successfully" });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="আমার অ্যাকাউন্ট" noIndex />
      <Header />
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="font-display text-4xl font-bold">
              <span className="text-foreground">My </span>
              <span className="text-gradient-gold">Account</span>
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-muted-foreground">{user.email}</p>
               {!staffLoading && isStaff && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {isModerator && !isAdmin ? "Moderator" : "Admin"}
                </span>
              )}
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
              <div className="card-luxury p-4 space-y-2">
                {!staffLoading && isStaff && (
                  <Link to="/admin" className="w-full flex items-center justify-between p-3 rounded-lg transition-colors bg-primary/10 text-primary hover:bg-primary/15">
                    <span className="flex items-center gap-3"><LayoutDashboard className="w-5 h-5" />{isModerator && !isAdmin ? "Moderator Panel" : "Admin Panel"}</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
                <button onClick={() => setActiveTab("dashboard")} className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${activeTab === "dashboard" ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"}`}>
                  <span className="flex items-center gap-3"><BarChart3 className="w-5 h-5" />Dashboard</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button onClick={() => setActiveTab("profile")} className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${activeTab === "profile" ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"}`}>
                  <span className="flex items-center gap-3"><User className="w-5 h-5" />Profile</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button onClick={() => setActiveTab("orders")} className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${activeTab === "orders" ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"}`}>
                  <span className="flex items-center gap-3"><Package className="w-5 h-5" />Orders{orders.length > 0 && <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">{orders.length}</span>}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button onClick={() => setActiveTab("rewards")} className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${activeTab === "rewards" ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"}`}>
                  <span className="flex items-center gap-3"><Gift className="w-5 h-5" />Rewards & Referral</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button onClick={() => setActiveTab("addresses")} className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${activeTab === "addresses" ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"}`}>
                  <span className="flex items-center gap-3"><MapPin className="w-5 h-5" />Address Book</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button onClick={async () => { await signOut(); navigate("/"); }} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
                  <LogOut className="w-5 h-5" />Sign Out
                </button>
              </div>
            </div>

            <div className="lg:col-span-3">
              {activeTab === "dashboard" && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <h2 className="font-display text-xl font-semibold flex items-center gap-3"><BarChart3 className="w-6 h-6 text-primary" />Dashboard</h2>
                  {!staffLoading && isStaff && (
                    <div className="card-luxury space-y-4">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h3 className="font-display text-lg font-semibold text-foreground">{isModerator && !isAdmin ? "Moderator Access" : "Admin Access"}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {isAdmin ? "আপনার সব admin page ও feature access আছে।" : `${permissions.length}টি moderator permission active আছে।`}
                          </p>
                        </div>
                        <Link to="/admin">
                          <Button className="btn-gold"><LayoutDashboard className="w-4 h-4 mr-2" />Open Panel</Button>
                        </Link>
                      </div>
                      {isModerator && !isAdmin && permissions.length > 0 && (
                        <div className="w-full border-t border-border pt-4 space-y-2">
                          <p className="text-sm font-medium text-foreground flex items-center gap-2">
                            <Shield className="w-4 h-4 text-primary" /> Assigned page/action access
                          </p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {ALL_PERMISSIONS.filter((p) => permissions.includes(p.key)).map((p) => {
                              const access = PERMISSION_ACCESS_MAP[p.key as PermissionKey];
                              return (
                                <div key={p.key} className="rounded-lg border border-border p-3 bg-background/50">
                                  <p className="text-sm font-semibold text-foreground">{p.label}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">Pages: {access.pages.join(", ")}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">Actions: {access.actions.join(" • ")}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="card-luxury text-center">
                      <Package className="w-8 h-8 mx-auto text-primary mb-2" />
                      <div className="font-display text-2xl font-bold text-foreground">{orders.length}</div>
                      <div className="text-xs text-muted-foreground">Total Orders</div>
                    </div>
                    <div className="card-luxury text-center">
                      <Heart className="w-8 h-8 mx-auto text-primary mb-2" />
                      <div className="font-display text-2xl font-bold text-foreground">{wishlistItems.length}</div>
                      <div className="text-xs text-muted-foreground">Wishlist</div>
                    </div>
                    <div className="card-luxury text-center">
                      <Truck className="w-8 h-8 mx-auto text-primary mb-2" />
                      <div className="font-display text-2xl font-bold text-foreground">{orders.filter(o => o.status === "shipped").length}</div>
                      <div className="text-xs text-muted-foreground">In Transit</div>
                    </div>
                    <div className="card-luxury text-center">
                      <CheckCircle className="w-8 h-8 mx-auto text-primary mb-2" />
                      <div className="font-display text-2xl font-bold text-foreground">{orders.filter(o => o.status === "delivered").length}</div>
                      <div className="text-xs text-muted-foreground">Delivered</div>
                    </div>
                  </div>

                  {/* Recent Orders */}
                  {orders.length > 0 && (
                    <div>
                      <h3 className="font-display text-lg font-semibold text-foreground mb-3">Recent Orders</h3>
                      <div className="space-y-3">
                        {orders.slice(0, 3).map((order) => {
                          const status = statusConfig[order.status] || statusConfig.pending;
                          return (
                            <div key={order.id} className="card-luxury flex items-center justify-between">
                              <div>
                                <span className="font-mono text-primary text-sm">#{order.id.slice(0, 8).toUpperCase()}</span>
                                <p className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleDateString("en-US")}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`flex items-center gap-1 text-sm ${status.color}`}>{status.icon}{status.label}</span>
                                <span className="font-display font-bold text-gradient-gold">৳{order.total.toLocaleString()}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {orders.length > 3 && (
                        <button onClick={() => setActiveTab("orders")} className="text-primary text-sm mt-3 hover:underline">View all orders →</button>
                      )}
                    </div>
                  )}

                  {/* Wishlist Preview */}
                  {wishlistItems.length > 0 && (
                    <div>
                      <h3 className="font-display text-lg font-semibold text-foreground mb-3">Wishlist</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {wishlistItems.slice(0, 3).map((item) => (
                          <div key={item.id} className="card-luxury flex items-center gap-3">
                            <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                              {item.product.image_url && <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{item.product.name}</p>
                              <p className="text-xs text-gradient-gold font-bold">৳{(item.product.sale_price || item.product.price).toLocaleString()}</p>
                              <button onClick={async () => { await addToCart(item.product_id, 1); await removeFromWishlist(item.product_id); }} className="text-xs text-primary hover:underline mt-1 flex items-center gap-1">
                                <ShoppingBag className="w-3 h-3" />Add to Cart
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {wishlistItems.length > 3 && (
                        <Link to="/wishlist" className="text-primary text-sm mt-3 hover:underline inline-block">View full wishlist →</Link>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "profile" && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card-luxury">
                  <div className="flex items-center gap-3 mb-6">
                    <User className="w-6 h-6 text-primary" />
                    <h2 className="font-display text-xl font-semibold">Profile Information</h2>
                  </div>
                  {loading ? (
                    <div className="space-y-4 animate-pulse">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-muted rounded" />)}</div>
                  ) : (
                    <form onSubmit={handleSaveProfile} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div><Label htmlFor="full_name">Full Name</Label><Input id="full_name" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} className="mt-2" placeholder="Your name" /></div>
                        <div><Label htmlFor="phone">Phone Number</Label><Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="mt-2" placeholder="+880 1XXX-XXXXXX" /></div>
                      </div>
                      <div><Label htmlFor="address">Address</Label><Input id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="mt-2" placeholder="House/Road/Area" /></div>
                      <div><Label htmlFor="city">City</Label><Input id="city" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="mt-2" placeholder="Dhaka" /></div>
                      <Button type="submit" className="btn-gold" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
                    </form>
                  )}
                </motion.div>
              )}

              {activeTab === "orders" && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                  <div className="flex items-center gap-3 mb-2"><Package className="w-6 h-6 text-primary" /><h2 className="font-display text-xl font-semibold">Order History</h2></div>
                  {loading ? (
                    <div className="space-y-4 animate-pulse">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}</div>
                  ) : orders.length === 0 ? (
                    <div className="card-luxury text-center py-12">
                      <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-display text-lg font-semibold text-foreground mb-2">No orders yet</h3>
                      <p className="text-muted-foreground mb-6">You haven't placed any orders. Start shopping!</p>
                      <Link to="/shop" className="btn-gold inline-block">Start Shopping</Link>
                    </div>
                  ) : (
                    orders.map((order) => {
                      const status = statusConfig[order.status] || statusConfig.pending;
                      return (
                        <div key={order.id} className="card-luxury">
                          <div className="flex flex-col gap-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm text-muted-foreground">Order ID:</span>
                                  <span className="font-mono text-primary text-sm">#{order.id.slice(0, 8).toUpperCase()}</span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{order.shipping_city}</span>
                                  <span>{new Date(order.created_at).toLocaleDateString("en-US")}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 flex-wrap">
                                <div className={`flex items-center gap-2 ${status.color}`}>{status.icon}<span className="font-medium">{status.label}</span></div>
                                <span className="font-display text-lg font-bold text-gradient-gold">৳{order.total.toLocaleString()}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link to={`/track/${order.id}`}><Button variant="outline" size="sm"><Truck className="w-4 h-4 mr-1" />Track</Button></Link>
                              <Button variant="outline" size="sm" onClick={() => handleDownloadInvoice(order.id)} disabled={downloadingInvoice === order.id}>
                                {downloadingInvoice === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><FileText className="w-4 h-4 mr-1" />Invoice</>}
                              </Button>
                              {canCancelOrder(order) && (
                                <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleCancelOrder(order.id)}>
                                  <XCircle className="w-4 h-4 mr-1" />ক্যান্সেল ({getRemainingCancelTime(order) || "0:00"})
                                </Button>
                              )}
                              {order.status === "pending" && !canCancelOrder(order) && (
                                <span className="text-xs text-muted-foreground">ক্যান্সেলের সময় শেষ</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </motion.div>
              )}

              {activeTab === "rewards" && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                  <RewardsReferral />
                </motion.div>
              )}

              {activeTab === "addresses" && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                  <AddressBook />
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
