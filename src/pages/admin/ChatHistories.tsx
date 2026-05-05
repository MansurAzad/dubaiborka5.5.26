import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageCircle, Search, User, Phone, Package, Calendar, Clock, ShoppingBag,
  ChevronLeft, ChevronRight, XCircle, CheckCircle, Truck, AlertTriangle,
  ChevronDown, ChevronUp, Eye, Trash2, RefreshCw, CalendarDays, Download,
  Send, UserCog, Plus, ShoppingCart, MapPin, CreditCard, Hash, Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { toast } from "@/hooks/use-toast";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

interface ChatHistory {
  id: string;
  order_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  messages: ChatMessage[];
  products_discussed: any[];
  order_total: number | null;
  order_status: string | null;
  created_at: string;
}

const PAGE_SIZE = 20;

const getStatusColor = (status: string | null) => {
  switch (status) {
    case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "confirmed": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "processing": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "shipped": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
    case "delivered": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "cancelled": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    default: return "bg-muted text-muted-foreground";
  }
};

const getStatusIcon = (status: string | null) => {
  switch (status) {
    case "pending": return <Clock className="w-3.5 h-3.5" />;
    case "confirmed":
    case "processing": return <Package className="w-3.5 h-3.5" />;
    case "shipped": return <Truck className="w-3.5 h-3.5" />;
    case "delivered": return <CheckCircle className="w-3.5 h-3.5" />;
    case "cancelled": return <XCircle className="w-3.5 h-3.5" />;
    default: return <AlertTriangle className="w-3.5 h-3.5" />;
  }
};

const getStatusBengali = (status: string | null) => {
  switch (status) {
    case "pending": return "পেন্ডিং";
    case "confirmed": return "কনফার্মড";
    case "processing": return "প্রসেসিং";
    case "shipped": return "শিপড";
    case "delivered": return "ডেলিভারড";
    case "cancelled": return "ক্যান্সেলড";
    default: return status || "—";
  }
};

// ============ ADMIN TOOLS PANEL ============
const AdminToolsPanel = ({ chat, onUpdate }: { chat: ChatHistory; onUpdate: () => void }) => {
  const [activeTab, setActiveTab] = useState("products");
  const [productSearch, setProductSearch] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [courierName, setCourierName] = useState("");
  const [orderForm, setOrderForm] = useState({
    shipping_address: "", shipping_city: "", shipping_phone: chat.customer_phone || "",
    payment_method: "cod", notes: "",
  });
  const [saving, setSaving] = useState(false);

  // Product search
  const { data: searchResults = [] } = useQuery({
    queryKey: ["admin-chat-product-search", productSearch],
    queryFn: async () => {
      if (!productSearch.trim()) return [];
      const { data } = await supabase
        .from("products")
        .select("id, name, price, sale_price, stock, image_url, category, sizes, colors")
        .or(`name.ilike.%${productSearch}%,category.ilike.%${productSearch}%`)
        .limit(10);
      return data || [];
    },
    enabled: productSearch.trim().length >= 2,
    staleTime: 30_000,
  });

  // Fetch order details if order exists
  const { data: orderDetails } = useQuery({
    queryKey: ["admin-chat-order", chat.order_id],
    queryFn: async () => {
      if (!chat.order_id) return null;
      const { data: order } = await supabase
        .from("orders")
        .select("*")
        .eq("id", chat.order_id)
        .single();
      if (!order) return null;
      const { data: items } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", chat.order_id);
      return { ...order, items: items || [] };
    },
    enabled: !!chat.order_id,
  });

  const addSelectedProduct = (product: any) => {
    const exists = selectedProducts.find(p => p.id === product.id);
    if (exists) return;
    setSelectedProducts(prev => [...prev, { ...product, quantity: 1, selectedSize: "", selectedColor: "" }]);
  };

  const updateSelectedProduct = (id: string, field: string, value: any) => {
    setSelectedProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const removeSelectedProduct = (id: string) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== id));
  };

  const totalAmount = selectedProducts.reduce((sum, p) => sum + ((p.sale_price || p.price) * (p.quantity || 1)), 0);

  // Send product info as admin reply
  const sendProductsToChat = async () => {
    if (selectedProducts.length === 0) return;
    setSaving(true);
    try {
      let content = "🛡️ **অ্যাডমিন রিপ্লাই:**\n\n📦 **আপনার জন্য প্রোডাক্ট সিলেকশন:**\n\n";
      selectedProducts.forEach((p, i) => {
        const price = p.sale_price || p.price;
        content += `**${i + 1}. ${p.name}**\n`;
        content += `   💰 মূল্য: ৳${price.toLocaleString()}`;
        if (p.sale_price && p.sale_price < p.price) content += ` ~~৳${p.price.toLocaleString()}~~`;
        content += `\n`;
        if (p.selectedSize) content += `   📏 সাইজ: ${p.selectedSize}\n`;
        if (p.selectedColor) content += `   🎨 কালার: ${p.selectedColor}\n`;
        content += `   📊 স্টক: ${p.stock > 0 ? `${p.stock}টি আছে ✅` : "স্টক আউট ❌"}\n\n`;
      });
      if (selectedProducts.length > 1) {
        content += `💵 **সর্বমোট: ৳${totalAmount.toLocaleString()}**\n`;
      }
      content += `\nঅর্ডার করতে চাইলে জানান! 🛒`;

      const newMessage: ChatMessage = { role: "assistant", content, timestamp: new Date().toISOString() };
      const updatedMessages = [...(chat.messages as ChatMessage[]), newMessage];
      const productsDiscussed = selectedProducts.map(p => ({
        name: p.name, price: p.price, sale_price: p.sale_price,
        quantity: p.quantity, size: p.selectedSize, color: p.selectedColor,
      }));

      await supabase.from("chat_histories").update({
        messages: updatedMessages as any,
        products_discussed: [...(chat.products_discussed || []), ...productsDiscussed] as any,
        updated_at: new Date().toISOString(),
      }).eq("id", chat.id);

      toast({ title: `${selectedProducts.length}টি প্রোডাক্ট পাঠানো হয়েছে ✅` });
      setSelectedProducts([]);
      onUpdate();
    } catch {
      toast({ title: "সমস্যা হয়েছে", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Create order from selected products
  const createOrder = async () => {
    if (selectedProducts.length === 0 || !orderForm.shipping_phone || !orderForm.shipping_address) return;
    setSaving(true);
    try {
      const { data: order, error: orderError } = await supabase.from("orders").insert({
        user_id: null, is_guest: true,
        guest_name: chat.customer_name || "চ্যাট কাস্টমার",
        guest_email: null,
        shipping_address: orderForm.shipping_address,
        shipping_city: orderForm.shipping_city || "ঢাকা",
        shipping_phone: orderForm.shipping_phone,
        payment_method: orderForm.payment_method,
        total: totalAmount,
        notes: orderForm.notes || `চ্যাট থেকে অর্ডার (Chat ID: ${chat.id.slice(0, 8)})`,
        status: "pending",
      } as any).select("id").single();

      if (orderError) throw orderError;

      const orderItems = selectedProducts.map(p => ({
        order_id: order.id,
        product_id: p.id,
        product_name: p.name,
        quantity: p.quantity || 1,
        price: p.sale_price || p.price,
        size: p.selectedSize || null,
        color: p.selectedColor || null,
      }));

      await supabase.from("order_items").insert(orderItems);

      // Update chat with order info
      const confirmMsg: ChatMessage = {
        role: "assistant",
        content: `🛡️ **অ্যাডমিন রিপ্লাই:**\n\n✅ **অর্ডার কনফার্ম হয়েছে!**\n\n🆔 অর্ডার নং: **#${order.id.slice(0, 8).toUpperCase()}**\n💰 মোট: **৳${totalAmount.toLocaleString()}**\n📍 ঠিকানা: ${orderForm.shipping_address}, ${orderForm.shipping_city}\n📞 ফোন: ${orderForm.shipping_phone}\n💳 পেমেন্ট: ${orderForm.payment_method === "cod" ? "ক্যাশ অন ডেলিভারি" : orderForm.payment_method}\n\n📦 **প্রোডাক্ট:**\n${selectedProducts.map((p, i) => `${i + 1}. ${p.name} x${p.quantity || 1} — ৳${((p.sale_price || p.price) * (p.quantity || 1)).toLocaleString()}`).join("\n")}\n\nধন্যবাদ! আপনার অর্ডার শীঘ্রই প্রসেস করা হবে। 🎉`,
        timestamp: new Date().toISOString(),
      };

      await supabase.from("chat_histories").update({
        messages: [...(chat.messages as ChatMessage[]), confirmMsg] as any,
        order_id: order.id,
        order_status: "pending",
        order_total: totalAmount,
        updated_at: new Date().toISOString(),
      }).eq("id", chat.id);

      toast({ title: "অর্ডার তৈরি ও কনফার্ম হয়েছে! ✅" });
      setSelectedProducts([]);
      setOrderDialogOpen(false);
      onUpdate();
    } catch (err: any) {
      toast({ title: `অর্ডার তৈরিতে সমস্যা: ${err.message}`, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Update order status
  const updateOrderStatus = async () => {
    if (!chat.order_id || !newStatus) return;
    setSaving(true);
    try {
      await supabase.from("orders").update({ status: newStatus }).eq("id", chat.order_id);

      const statusMsg: ChatMessage = {
        role: "assistant",
        content: `🛡️ **অ্যাডমিন রিপ্লাই:**\n\n📋 **অর্ডার স্ট্যাটাস আপডেট:**\n\n🆔 #${chat.order_id.slice(0, 8).toUpperCase()}\n🔄 নতুন স্ট্যাটাস: **${getStatusBengali(newStatus)}**\n\n${newStatus === "shipped" ? "🚚 আপনার অর্ডার শিপ করা হয়েছে!" : newStatus === "delivered" ? "✅ আপনার অর্ডার ডেলিভারি সম্পন্ন!" : newStatus === "cancelled" ? "❌ অর্ডার বাতিল করা হয়েছে।" : "আপনার অর্ডার প্রসেস হচ্ছে।"}`,
        timestamp: new Date().toISOString(),
      };

      await supabase.from("chat_histories").update({
        messages: [...(chat.messages as ChatMessage[]), statusMsg] as any,
        order_status: newStatus,
        updated_at: new Date().toISOString(),
      }).eq("id", chat.id);

      toast({ title: `স্ট্যাটাস আপডেট: ${getStatusBengali(newStatus)}` });
      setStatusDialogOpen(false);
      onUpdate();
    } catch {
      toast({ title: "আপডেটে সমস্যা", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Update tracking
  const updateTracking = async () => {
    if (!chat.order_id || !trackingNumber) return;
    setSaving(true);
    try {
      await supabase.from("orders").update({
        tracking_number: trackingNumber,
        courier_name: courierName || null,
        status: "shipped",
      }).eq("id", chat.order_id);

      const trackMsg: ChatMessage = {
        role: "assistant",
        content: `🛡️ **অ্যাডমিন রিপ্লাই:**\n\n🚚 **ট্র্যাকিং তথ্য:**\n\n🆔 অর্ডার: #${chat.order_id.slice(0, 8).toUpperCase()}\n📦 ট্র্যাকিং নং: **${trackingNumber}**${courierName ? `\n🏢 কুরিয়ার: **${courierName}**` : ""}\n\nআপনার অর্ডার শিপ করা হয়েছে! ডেলিভারি শীঘ্রই পৌঁছে যাবে। 📬`,
        timestamp: new Date().toISOString(),
      };

      await supabase.from("chat_histories").update({
        messages: [...(chat.messages as ChatMessage[]), trackMsg] as any,
        order_status: "shipped",
        updated_at: new Date().toISOString(),
      }).eq("id", chat.id);

      toast({ title: "ট্র্যাকিং তথ্য আপডেট হয়েছে 🚚" });
      setTrackingDialogOpen(false);
      onUpdate();
    } catch {
      toast({ title: "আপডেটে সমস্যা", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 border rounded-lg bg-muted/30 p-3">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-3 h-8">
          <TabsTrigger value="products" className="text-xs gap-1"><ShoppingCart className="w-3 h-3" />প্রোডাক্ট</TabsTrigger>
          <TabsTrigger value="order" className="text-xs gap-1"><Package className="w-3 h-3" />অর্ডার</TabsTrigger>
          <TabsTrigger value="tracking" className="text-xs gap-1"><Truck className="w-3 h-3" />ট্র্যাকিং</TabsTrigger>
        </TabsList>

        {/* PRODUCTS TAB */}
        <TabsContent value="products" className="mt-2 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="প্রোডাক্ট খুঁজুন..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="max-h-[200px] overflow-y-auto space-y-1 border rounded-md p-1.5 bg-background">
              {searchResults.map((p: any) => (
                <div key={p.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer text-xs" onClick={() => addSelectedProduct(p)}>
                  {p.image_url ? (
                    <img src={p.image_url} alt="" className="w-8 h-8 rounded object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center"><ImageIcon className="w-3 h-3" /></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-muted-foreground">{p.category} • স্টক: {p.stock}</p>
                  </div>
                  <span className="font-bold text-primary shrink-0">৳{(p.sale_price || p.price).toLocaleString()}</span>
                  <Plus className="w-3.5 h-3.5 text-primary shrink-0" />
                </div>
              ))}
            </div>
          )}

          {/* Selected Products */}
          {selectedProducts.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground">নির্বাচিত ({selectedProducts.length}):</p>
              {selectedProducts.map((p) => (
                <div key={p.id} className="border rounded-md p-2 bg-background text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate flex-1">{p.name}</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeSelectedProduct(p.id)}>
                      <XCircle className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                  <div className="flex gap-2 flex-wrap items-center">
                    <div className="flex items-center gap-1">
                      <Label className="text-[10px]">পরিমাণ:</Label>
                      <Input type="number" min={1} value={p.quantity} onChange={(e) => updateSelectedProduct(p.id, "quantity", parseInt(e.target.value) || 1)} className="w-14 h-6 text-xs" />
                    </div>
                    {p.sizes && p.sizes.length > 0 && (
                      <Select value={p.selectedSize} onValueChange={(v) => updateSelectedProduct(p.id, "selectedSize", v)}>
                        <SelectTrigger className="h-6 w-20 text-xs"><SelectValue placeholder="সাইজ" /></SelectTrigger>
                        <SelectContent>{p.sizes.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                    {p.colors && p.colors.length > 0 && (
                      <Select value={p.selectedColor} onValueChange={(v) => updateSelectedProduct(p.id, "selectedColor", v)}>
                        <SelectTrigger className="h-6 w-20 text-xs"><SelectValue placeholder="কালার" /></SelectTrigger>
                        <SelectContent>{p.colors.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                    <span className="font-bold ml-auto">৳{((p.sale_price || p.price) * (p.quantity || 1)).toLocaleString()}</span>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-1 border-t">
                <span className="text-xs font-bold">মোট: ৳{totalAmount.toLocaleString()}</span>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={sendProductsToChat} disabled={saving}>
                    <Send className="w-3 h-3" />প্রোডাক্ট পাঠান
                  </Button>
                  <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setOrderDialogOpen(true)} disabled={saving}>
                    <ShoppingCart className="w-3 h-3" />অর্ডার নিন
                  </Button>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ORDER TAB */}
        <TabsContent value="order" className="mt-2 space-y-2">
          {orderDetails ? (
            <div className="text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">অর্ডার #{orderDetails.id.slice(0, 8).toUpperCase()}</span>
                <span className={cn("px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1", getStatusColor(orderDetails.status))}>
                  {getStatusIcon(orderDetails.status)} {getStatusBengali(orderDetails.status)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-muted-foreground">
                <span>💰 মোট: <strong className="text-foreground">৳{orderDetails.total?.toLocaleString()}</strong></span>
                <span>💳 {orderDetails.payment_method}</span>
                <span>📍 {orderDetails.shipping_city}</span>
                <span>📞 {orderDetails.shipping_phone}</span>
              </div>
              {orderDetails.items?.length > 0 && (
                <div className="border rounded p-1.5 space-y-1">
                  {orderDetails.items.map((item: any) => (
                    <div key={item.id} className="flex justify-between">
                      <span>{item.product_name} x{item.quantity}{item.size ? ` (${item.size})` : ""}</span>
                      <span className="font-medium">৳{(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
              {orderDetails.tracking_number && (
                <p>🚚 ট্র্যাকিং: <strong>{orderDetails.tracking_number}</strong> {orderDetails.courier_name && `(${orderDetails.courier_name})`}</p>
              )}
              <div className="flex gap-1.5 pt-1">
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setNewStatus(orderDetails.status); setStatusDialogOpen(true); }}>
                  <RefreshCw className="w-3 h-3" />স্ট্যাটাস
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setTrackingNumber(orderDetails.tracking_number || ""); setCourierName(orderDetails.courier_name || ""); setTrackingDialogOpen(true); }}>
                  <Truck className="w-3 h-3" />ট্র্যাকিং
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-xs text-muted-foreground">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>কোনো অর্ডার নেই</p>
              <p className="mt-1">প্রোডাক্ট ট্যাব থেকে প্রোডাক্ট সিলেক্ট করে অর্ডার নিন</p>
            </div>
          )}
        </TabsContent>

        {/* TRACKING TAB */}
        <TabsContent value="tracking" className="mt-2 space-y-2">
          {chat.order_id ? (
            <div className="space-y-2 text-xs">
              <p className="font-semibold">অর্ডার #{chat.order_id.slice(0, 8).toUpperCase()}</p>
              <div className="space-y-1.5">
                <div>
                  <Label className="text-[10px]">ট্র্যাকিং নম্বর</Label>
                  <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} className="h-7 text-xs" placeholder="ট্র্যাকিং নম্বর দিন" />
                </div>
                <div>
                  <Label className="text-[10px]">কুরিয়ার</Label>
                  <Select value={courierName} onValueChange={setCourierName}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="কুরিয়ার সিলেক্ট" /></SelectTrigger>
                    <SelectContent>
                      {["Pathao", "Steadfast", "RedX", "Paperfly", "eCourier", "Sundarban Courier", "SA Paribahan"].map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" className="w-full h-7 text-xs gap-1" onClick={updateTracking} disabled={saving || !trackingNumber}>
                  <Truck className="w-3 h-3" />ট্র্যাকিং আপডেট ও কাস্টমারকে জানান
                </Button>
              </div>
              <div className="border-t pt-2">
                <Label className="text-[10px]">স্ট্যাটাস পরিবর্তন</Label>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  {["confirmed", "processing", "shipped", "delivered", "cancelled"].map(s => (
                    <Button key={s} size="sm" variant={chat.order_status === s ? "default" : "outline"}
                      className="h-6 text-[10px] gap-1" disabled={saving}
                      onClick={() => { setNewStatus(s); setStatusDialogOpen(true); }}
                    >
                      {getStatusIcon(s)} {getStatusBengali(s)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-xs text-muted-foreground">
              <Truck className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>প্রথমে অর্ডার তৈরি করুন</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ORDER CREATION DIALOG */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-base">📦 অর্ডার তৈরি করুন</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="border rounded-md p-2 bg-muted/30 space-y-1 text-xs">
              {selectedProducts.map((p, i) => (
                <div key={p.id} className="flex justify-between">
                  <span>{i + 1}. {p.name} x{p.quantity}{p.selectedSize ? ` (${p.selectedSize})` : ""}</span>
                  <span>৳{((p.sale_price || p.price) * (p.quantity || 1)).toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t pt-1 font-bold flex justify-between">
                <span>মোট</span><span>৳{totalAmount.toLocaleString()}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <Label className="text-xs">📞 ফোন নম্বর *</Label>
                <Input value={orderForm.shipping_phone} onChange={(e) => setOrderForm(f => ({ ...f, shipping_phone: e.target.value }))} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">📍 ঠিকানা *</Label>
                <Textarea value={orderForm.shipping_address} onChange={(e) => setOrderForm(f => ({ ...f, shipping_address: e.target.value }))} rows={2} className="text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">🏙️ শহর</Label>
                  <Input value={orderForm.shipping_city} onChange={(e) => setOrderForm(f => ({ ...f, shipping_city: e.target.value }))} placeholder="ঢাকা" className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">💳 পেমেন্ট</Label>
                  <Select value={orderForm.payment_method} onValueChange={(v) => setOrderForm(f => ({ ...f, payment_method: v }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cod">ক্যাশ অন ডেলিভারি</SelectItem>
                      <SelectItem value="bkash">বিকাশ</SelectItem>
                      <SelectItem value="nagad">নগদ</SelectItem>
                      <SelectItem value="rocket">রকেট</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">📝 নোটস</Label>
                <Input value={orderForm.notes} onChange={(e) => setOrderForm(f => ({ ...f, notes: e.target.value }))} className="h-8 text-sm" placeholder="ঐচ্ছিক" />
              </div>
            </div>
            <Button className="w-full gap-2" onClick={createOrder} disabled={saving || !orderForm.shipping_phone || !orderForm.shipping_address}>
              <CheckCircle className="w-4 h-4" />
              {saving ? "তৈরি হচ্ছে..." : "অর্ডার কনফার্ম করুন"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* STATUS UPDATE DIALOG */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-base">🔄 স্ট্যাটাস আপডেট</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger><SelectValue placeholder="স্ট্যাটাস সিলেক্ট" /></SelectTrigger>
              <SelectContent>
                {["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"].map(s => (
                  <SelectItem key={s} value={s}>{getStatusBengali(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="w-full" onClick={updateOrderStatus} disabled={saving || !newStatus}>
              {saving ? "আপডেট হচ্ছে..." : "আপডেট ও কাস্টমারকে জানান"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* TRACKING DIALOG */}
      <Dialog open={trackingDialogOpen} onOpenChange={setTrackingDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-base">🚚 ট্র্যাকিং আপডেট</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>ট্র্যাকিং নম্বর</Label>
              <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="ট্র্যাকিং নম্বর" />
            </div>
            <div>
              <Label>কুরিয়ার</Label>
              <Input value={courierName} onChange={(e) => setCourierName(e.target.value)} placeholder="কুরিয়ার নাম" />
            </div>
            <Button className="w-full" onClick={updateTracking} disabled={saving || !trackingNumber}>
              {saving ? "আপডেট হচ্ছে..." : "ট্র্যাকিং আপডেট ও জানান"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============ CHAT DETAIL COMPONENT ============
const ChatDetail = ({ chat, onMessageSent }: { chat: ChatHistory; onMessageSent?: () => void }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const messages = chat.messages as ChatMessage[];

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  const handleAdminReply = async () => {
    if (!replyText.trim() || sending) return;
    setSending(true);
    try {
      const newMessage: ChatMessage = {
        role: "assistant",
        content: `🛡️ **অ্যাডমিন রিপ্লাই:**\n\n${replyText.trim()}`,
        timestamp: new Date().toISOString(),
      };
      const updatedMessages = [...messages, newMessage];
      const { error } = await supabase
        .from("chat_histories")
        .update({ messages: updatedMessages as any, updated_at: new Date().toISOString() })
        .eq("id", chat.id);
      if (error) throw error;
      setReplyText("");
      toast({ title: "রিপ্লাই পাঠানো হয়েছে ✅" });
      onMessageSent?.();
    } catch (err) {
      toast({ title: "রিপ্লাই পাঠাতে সমস্যা হয়েছে", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-3 border-t pt-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
      {/* Customer Info Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm bg-muted/50 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="font-medium truncate">{chat.customer_name || "N/A"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="truncate">{chat.customer_phone || "N/A"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-xs sm:text-sm">{new Date(chat.created_at).toLocaleString("bn-BD")}</span>
        </div>
        {chat.order_id && (
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-muted-foreground shrink-0" />
            <span>#{chat.order_id.slice(0, 8).toUpperCase()}</span>
            {chat.order_total != null && (
              <span className={cn("font-bold ml-1", chat.order_status === "cancelled" ? "text-destructive line-through" : "text-primary")}>
                ৳{chat.order_total.toLocaleString()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Status + Products Row */}
      <div className="flex flex-wrap gap-2 items-center">
        {chat.order_status && (
          <span className={cn("text-xs px-2 py-1 rounded-full flex items-center gap-1", getStatusColor(chat.order_status))}>
            {getStatusIcon(chat.order_status)}
            অর্ডার: {getStatusBengali(chat.order_status)}
          </span>
        )}
        {chat.products_discussed && (chat.products_discussed as any[]).length > 0 && (
          (chat.products_discussed as any[]).map((p: any, i: number) => (
            <Badge key={i} variant="secondary" className="text-[10px] sm:text-xs">
              {p.name}{p.quantity ? ` x${p.quantity}` : ""}{p.size ? ` (${p.size})` : ""} — ৳{(p.sale_price || p.price)?.toLocaleString()}
            </Badge>
          ))
        )}
      </div>

      {/* Messages - Scrollable */}
      <div
        ref={scrollRef}
        className="border rounded-lg p-3 bg-muted/20 max-h-[400px] overflow-y-auto space-y-2.5 scroll-smooth"
      >
        {messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-4">কোনো মেসেজ নেই</p>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] sm:max-w-[75%] rounded-2xl px-3 py-2 text-xs sm:text-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : msg.content.includes("🛡️ **অ্যাডমিন রিপ্লাই")
                      ? "bg-accent/20 border border-accent/30 rounded-bl-md"
                      : "bg-background border rounded-bl-md"
                )}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
                {msg.timestamp && (
                  <p className="text-[10px] opacity-50 mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Admin Reply Input */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Textarea
            placeholder="অ্যাডমিন রিপ্লাই লিখুন... (AI ক্রেডিট ছাড়াই সরাসরি রিপ্লাই)"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={2}
            className="resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAdminReply();
              }
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Button
            size="sm"
            onClick={handleAdminReply}
            disabled={!replyText.trim() || sending}
            className="h-8 gap-1.5"
          >
            <Send className="w-4 h-4" />
            {sending ? "..." : "পাঠান"}
          </Button>
          <Button
            size="sm"
            variant={showTools ? "default" : "outline"}
            onClick={() => setShowTools(!showTools)}
            className="h-8 gap-1.5 text-xs"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            টুলস
          </Button>
        </div>
      </div>

      {/* Admin Tools Panel */}
      {showTools && <AdminToolsPanel chat={chat} onUpdate={() => onMessageSent?.()} />}

      <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
        <UserCog className="w-3 h-3" />
        মোট {messages.length}টি মেসেজ • ৩৬০° অ্যাডমিন টুলস সক্রিয়
      </p>
    </div>
  );
};

const ChatHistories = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const queryClient = useQueryClient();

  const { data: histories = [], isLoading } = useQuery({
    queryKey: ["admin-chat-histories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_histories")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as ChatHistory[];
    },
    staleTime: 30 * 1000,
  });

  // Delete chat mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chat_histories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-chat-histories"] });
      toast({ title: "চ্যাট ডিলিট হয়েছে" });
    },
    onError: () => {
      toast({ title: "ডিলিট করতে সমস্যা হয়েছে", variant: "destructive" });
    },
  });

  // Sync order statuses from orders table
  const syncMutation = useMutation({
    mutationFn: async () => {
      // Get all chat histories with order_ids
      const { data: chats } = await supabase
        .from("chat_histories")
        .select("id, order_id, order_status")
        .not("order_id", "is", null);
      if (!chats || chats.length === 0) return 0;

      const orderIds = chats.map(c => c.order_id!).filter(Boolean);
      const { data: orders } = await supabase
        .from("orders")
        .select("id, status, total")
        .in("id", orderIds);
      if (!orders) return 0;

      const orderMap = new Map(orders.map(o => [o.id, o]));
      let updated = 0;
      for (const chat of chats) {
        const order = orderMap.get(chat.order_id!);
        if (order && order.status !== chat.order_status) {
          await supabase.from("chat_histories").update({
            order_status: order.status,
            order_total: order.total,
          }).eq("id", chat.id);
          updated++;
        }
      }
      return updated;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["admin-chat-histories"] });
      toast({ title: `${count}টি চ্যাটের স্ট্যাটাস আপডেট হয়েছে` });
    },
    onError: () => {
      toast({ title: "সিঙ্ক করতে সমস্যা হয়েছে", variant: "destructive" });
    },
  });

  const filtered = useMemo(() => {
    let result = histories;
    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      let cutoff: Date;
      if (dateFilter === "today") {
        cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (dateFilter === "7days") {
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else {
        cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      result = result.filter((h) => new Date(h.created_at) >= cutoff);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (h) =>
          h.customer_name?.toLowerCase().includes(q) ||
          h.customer_phone?.includes(q) ||
          h.order_id?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((h) => h.order_status === statusFilter);
    }
    return result;
  }, [histories, searchQuery, statusFilter, dateFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const totalOrders = histories.filter((h) => h.order_id).length;
  const totalSales = histories.filter(h => h.order_status !== "cancelled").reduce((s, h) => s + (h.order_total || 0), 0);
  const cancelledCount = histories.filter(h => h.order_status === "cancelled").length;

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const exportCSV = () => {
    if (filtered.length === 0) {
      toast({ title: "এক্সপোর্ট করার মতো ডেটা নেই", variant: "destructive" });
      return;
    }
    const headers = ["তারিখ", "কাস্টমার নাম", "ফোন", "অর্ডার ID", "অর্ডার স্ট্যাটাস", "অর্ডার টোটাল", "মেসেজ সংখ্যা", "প্রোডাক্ট"];
    const rows = filtered.map((h) => [
      new Date(h.created_at).toLocaleString("bn-BD"),
      h.customer_name || "",
      h.customer_phone || "",
      h.order_id ? h.order_id.slice(0, 8).toUpperCase() : "",
      h.order_status || "",
      h.order_total != null ? h.order_total.toString() : "",
      (h.messages as ChatMessage[]).length.toString(),
      h.products_discussed ? (h.products_discussed as any[]).map((p: any) => p.name).join(", ") : "",
    ]);
    const csvContent = "\uFEFF" + [headers, ...rows].map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-histories-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `${filtered.length}টি রেকর্ড এক্সপোর্ট হয়েছে` });
  };

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold flex items-center gap-2 sm:gap-3">
            <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            চ্যাট হিস্টোরি
          </h1>
          <p className="text-sm text-muted-foreground mt-1">কাস্টমারদের চ্যাটবট কথোপকথন ও অর্ডার বিবরণ</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs sm:text-sm text-muted-foreground">মোট চ্যাট</span>
                <MessageCircle className="w-4 h-4 text-primary" />
              </div>
              <div className="text-xl sm:text-2xl font-bold">{histories.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs sm:text-sm text-muted-foreground">সফল অর্ডার</span>
                <CheckCircle className="w-4 h-4 text-green-500" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-green-600">{totalOrders - cancelledCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs sm:text-sm text-muted-foreground">ক্যান্সেলড</span>
                <XCircle className="w-4 h-4 text-destructive" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-destructive">{cancelledCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs sm:text-sm text-muted-foreground">মোট বিক্রি</span>
                <ShoppingBag className="w-4 h-4 text-primary" />
              </div>
              <div className="text-xl sm:text-2xl font-bold">৳{totalSales.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="নাম, ফোন বা অর্ডার ID..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="স্ট্যাটাস" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব স্ট্যাটাস</SelectItem>
              <SelectItem value="pending">পেন্ডিং</SelectItem>
              <SelectItem value="processing">প্রসেসিং</SelectItem>
              <SelectItem value="shipped">শিপড</SelectItem>
              <SelectItem value="delivered">ডেলিভারড</SelectItem>
              <SelectItem value="cancelled">ক্যান্সেলড</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={(v) => { setDateFilter(v); setPage(0); }}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <CalendarDays className="w-4 h-4 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="তারিখ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব তারিখ</SelectItem>
              <SelectItem value="today">আজ</SelectItem>
              <SelectItem value="7days">গত ৭ দিন</SelectItem>
              <SelectItem value="30days">গত ৩০ দিন</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="gap-1.5"
          >
            <RefreshCw className={cn("w-4 h-4", syncMutation.isPending && "animate-spin")} />
            সিঙ্ক
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            className="gap-1.5"
          >
            <Download className="w-4 h-4" />
            CSV
          </Button>
        </div>

        {/* Chat List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">কোনো চ্যাট হিস্টোরি পাওয়া যায়নি</p>
          </div>
        ) : (
          <>
            <p className="text-xs sm:text-sm text-muted-foreground">মোট {filtered.length}টি রেজাল্ট</p>
            <div className="space-y-2 sm:space-y-3">
              {paginated.map((chat) => (
                <Card
                  key={chat.id}
                  className={cn(
                    "transition-colors",
                    chat.order_status === "cancelled" && "border-destructive/20 bg-destructive/5",
                    expandedId === chat.id && "border-primary/40 shadow-md"
                  )}
                >
                  <CardContent className="p-3 sm:p-4">
                    {/* Header Row - clickable */}
                    <div
                      className="flex items-start justify-between gap-2 sm:gap-4 cursor-pointer"
                      onClick={() => toggleExpand(chat.id)}
                    >
                      <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                        <div className={cn(
                          "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0",
                          chat.order_status === "cancelled" ? "bg-destructive/10" : "bg-primary/10"
                        )}>
                          {chat.order_status === "cancelled"
                            ? <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
                            : <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                          }
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm sm:text-base truncate">{chat.customer_name || "অজানা কাস্টমার"}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-xs sm:text-sm text-muted-foreground">
                            {chat.customer_phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {chat.customer_phone}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(chat.created_at).toLocaleDateString("bn-BD")}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="w-3 h-3" />
                              {(chat.messages as ChatMessage[]).length} মেসেজ
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {chat.order_id && (
                          <Badge variant="outline" className="text-[10px] sm:text-xs">
                            #{chat.order_id.slice(0, 8).toUpperCase()}
                          </Badge>
                        )}
                        {chat.order_total != null && (
                          <span className={cn(
                            "text-xs sm:text-sm font-bold",
                            chat.order_status === "cancelled" ? "text-destructive line-through" : "text-primary"
                          )}>
                            ৳{chat.order_total.toLocaleString()}
                          </span>
                        )}
                        <div className="flex items-center gap-1.5">
                          {chat.order_status && (
                            <span className={cn("text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full flex items-center gap-1", getStatusColor(chat.order_status))}>
                              {getStatusIcon(chat.order_status)}
                              {getStatusBengali(chat.order_status)}
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("এই চ্যাট ডিলিট করতে চান?")) {
                                deleteMutation.mutate(chat.id);
                              }
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                          {expandedId === chat.id
                            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          }
                        </div>
                      </div>
                    </div>

                    {/* Expanded Detail - inline */}
                    {expandedId === chat.id && <ChatDetail chat={chat} onMessageSent={() => queryClient.invalidateQueries({ queryKey: ["admin-chat-histories"] })} />}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {page + 1} / {totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default ChatHistories;
