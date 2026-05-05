import { useState, useMemo, useCallback } from "react";
import { Search, Eye, ChevronDown, Truck, Printer, CheckSquare, Download, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

interface Order {
  id: string;
  user_id: string | null;
  total: number;
  status: string;
  shipping_address: string;
  shipping_city: string;
  shipping_phone: string;
  notes: string | null;
  created_at: string;
  guest_email: string | null;
  guest_name: string | null;
  is_guest: boolean;
  payment_method: string;
  payment_status: string;
  transaction_id: string | null;
  advance_amount: number;
  due_amount: number;
  payment_phone: string | null;
  payment_verified: boolean;
  payment_verified_at: string | null;
  cod_collected: boolean;
  cod_collected_at: string | null;
  tracking_number: string | null;
  courier_name: string | null;
  estimated_delivery: string | null;
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
  size: string | null;
  color: string | null;
}

const statusOptions = ["pending", "processing", "shipped", "delivered", "cancelled"];

const TrackingForm = ({ order, onUpdate }: { order: Order; onUpdate: () => void }) => {
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number || "");
  const [courierName, setCourierName] = useState(order.courier_name || "");
  const [estimatedDelivery, setEstimatedDelivery] = useState(order.estimated_delivery?.slice(0, 10) || "");
  const { toast } = useToast();

  const handleSave = async () => {
    const { error } = await supabase
      .from("orders")
      .update({
        tracking_number: trackingNumber || null,
        courier_name: courierName || null,
        estimated_delivery: estimatedDelivery || null,
      })
      .eq("id", order.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ ট্র্যাকিং আপডেট হয়েছে" });
      onUpdate();
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-xs text-muted-foreground">কুরিয়ার নাম</label>
        <Input value={courierName} onChange={e => setCourierName(e.target.value)} placeholder="Pathao, Steadfast..." className="mt-1" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">ট্র্যাকিং নম্বর</label>
        <Input value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} placeholder="TRK-XXXXX" className="mt-1" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">আনুমানিক ডেলিভারি</label>
        <Input type="date" value={estimatedDelivery} onChange={e => setEstimatedDelivery(e.target.value)} className="mt-1" />
      </div>
      <div className="flex items-end">
        <Button size="sm" onClick={handleSave} className="w-full">
          <Truck className="w-4 h-4 mr-2" /> সেভ করুন
        </Button>
      </div>
    </div>
  );
};

const Orders = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [newOrder, setNewOrder] = useState({
    guest_name: "", shipping_phone: "", shipping_address: "", shipping_city: "",
    total: "", payment_method: "cod", notes: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading: loading } = useQuery({
    queryKey: ["admin-orders-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Order[];
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const invalidateOrders = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-orders-list"] });
    queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
  }, [queryClient]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const filteredOrders = useMemo(() => orders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.shipping_phone.includes(searchQuery) ||
      order.shipping_city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.guest_name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [orders, searchQuery, statusFilter]);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrders.map(o => o.id)));
    }
  }, [selectedIds.size, filteredOrders]);

  const bulkUpdateStatus = async (newStatus: string) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const { error } = await supabase.from("orders").update({ status: newStatus }).in("id", ids);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: `${ids.length} orders updated to ${newStatus}` });
      setSelectedIds(new Set());
      invalidateOrders();
    }
  };

  const handleAddOrder = async () => {
    if (!newOrder.guest_name || !newOrder.shipping_phone || !newOrder.shipping_address || !newOrder.total) {
      toast({ title: "ত্রুটি", description: "নাম, ফোন, ঠিকানা ও মোট টাকা আবশ্যক", variant: "destructive" });
      return;
    }
    const total = parseFloat(newOrder.total);
    if (isNaN(total) || total <= 0) {
      toast({ title: "ত্রুটি", description: "সঠিক মোট টাকা দিন", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("orders").insert({
      guest_name: newOrder.guest_name,
      shipping_phone: newOrder.shipping_phone,
      shipping_address: newOrder.shipping_address,
      shipping_city: newOrder.shipping_city || "N/A",
      total,
      payment_method: newOrder.payment_method,
      notes: newOrder.notes || null,
      is_guest: true,
      status: "pending",
      payment_status: "unpaid",
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ অর্ডার তৈরি হয়েছে" });
      setShowAddDialog(false);
      setNewOrder({ guest_name: "", shipping_phone: "", shipping_address: "", shipping_city: "", total: "", payment_method: "cod", notes: "" });
      invalidateOrders();
    }
  };

  const handleDeleteOrder = async () => {
    if (!deleteOrderId) return;
    // Delete order items first, then the order
    await supabase.from("order_items").delete().eq("order_id", deleteOrderId);
    const { error } = await supabase.from("orders").delete().eq("id", deleteOrderId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "🗑️ অর্ডার ডিলিট হয়েছে" });
      invalidateOrders();
    }
    setDeleteOrderId(null);
  };

  const exportCSV = () => {
    if (filteredOrders.length === 0) {
      toast({ title: "কোনো অর্ডার নেই", variant: "destructive" });
      return;
    }
    const headers = ["Order ID", "Date", "Customer", "Phone", "City", "Address", "Total", "Status", "Payment Method", "Payment Status", "Tracking", "Courier", "Notes"];
    const rows = filteredOrders.map(o => [
      o.id.slice(0, 8),
      new Date(o.created_at).toLocaleDateString(),
      o.guest_name || "",
      o.shipping_phone,
      o.shipping_city,
      `"${(o.shipping_address || "").replace(/"/g, '""')}"`,
      o.total,
      o.status,
      o.payment_method,
      o.payment_status,
      o.tracking_number || "",
      o.courier_name || "",
      `"${(o.notes || "").replace(/"/g, '""')}"`,
    ]);
    const csv = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `✅ ${filteredOrders.length}টি অর্ডার এক্সপোর্ট হয়েছে` });
  };

  const printLabel = useCallback((order: Order) => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Shipping Label - #${order.id.slice(0, 8)}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .label { border: 2px solid #000; padding: 20px; max-width: 400px; margin: auto; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
        .field { margin: 8px 0; }
        .field strong { display: inline-block; width: 80px; }
        .barcode { text-align: center; font-family: monospace; font-size: 24px; letter-spacing: 4px; margin-top: 15px; border-top: 2px solid #000; padding-top: 10px; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <div class="label">
        <div class="header">
          <h2 style="margin:0">Dubai Borka House</h2>
          <p style="margin:4px 0;font-size:12px">Premium Fashion</p>
        </div>
        <div class="field"><strong>To:</strong> ${order.guest_name || "Customer"}</div>
        <div class="field"><strong>Address:</strong> ${order.shipping_address}</div>
        <div class="field"><strong>City:</strong> ${order.shipping_city}</div>
        <div class="field"><strong>Phone:</strong> ${order.shipping_phone}</div>
        <div class="field"><strong>Order:</strong> #${order.id.slice(0, 8).toUpperCase()}</div>
        <div class="field"><strong>COD:</strong> ৳${Number(order.total).toLocaleString()}</div>
        ${order.courier_name ? `<div class="field"><strong>Courier:</strong> ${order.courier_name}</div>` : ""}
        ${order.tracking_number ? `<div class="field"><strong>Tracking:</strong> ${order.tracking_number}</div>` : ""}
        <div class="barcode">#${order.id.slice(0, 8).toUpperCase()}</div>
      </div>
      <script>window.print();</script>
      </body></html>
    `);
    win.document.close();
  }, []);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: `Order status updated to ${newStatus}` });
    invalidateOrders();

    try {
      const { data: items } = await supabase
        .from("order_items")
        .select("product_name, quantity, price, size, color")
        .eq("order_id", orderId);

      let customerEmail = order.guest_email;
      let customerName = order.guest_name || "Customer";

      if (order.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", order.user_id)
          .single();
        customerName = profile?.full_name || customerName;
      }

      if (customerEmail) {
        await supabase.functions.invoke('send-order-notification', {
          body: {
            email: customerEmail,
            orderId: order.id,
            customerName,
            status: newStatus,
            total: order.total,
            items: (items || []).map(item => ({
              name: item.product_name,
              quantity: item.quantity,
              price: Number(item.price) * item.quantity,
              size: item.size,
              color: item.color
            })),
            shippingAddress: order.shipping_address,
            shippingCity: order.shipping_city,
            shippingPhone: order.shipping_phone
          }
        });
        toast({ title: "📧", description: "Status update email sent to customer" });
      }

      if (order.shipping_phone) {
        const waResult = await supabase.functions.invoke('send-whatsapp-notification', {
          body: {
            phone: order.shipping_phone,
            customerName,
            orderId: order.id,
            status: newStatus,
            total: order.total,
            trackingNumber: order.tracking_number,
            courierName: order.courier_name
          }
        });
        if (waResult.data?.success) {
          toast({ title: "📱", description: "WhatsApp notification sent" });
        }
      }
    } catch (notifError) {
      console.error("Failed to send notifications:", notifError);
    }
  };

  const verifyPayment = async (orderId: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ 
        payment_verified: true, 
        payment_verified_at: new Date().toISOString(),
        payment_status: "verified"
      })
      .eq("id", orderId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ পেমেন্ট ভেরিফাইড", description: "পেমেন্ট সফলভাবে যাচাই হয়েছে" });
      invalidateOrders();
    }
  };

  const collectCOD = async (orderId: string) => {
    const { error } = await supabase
      .from("orders")
      .update({
        cod_collected: true,
        cod_collected_at: new Date().toISOString(),
        payment_status: "paid",
        due_amount: 0
      })
      .eq("id", orderId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "💰 COD কালেক্টেড", description: "ক্যাশ অন ডেলিভারি সংগৃহীত" });
      invalidateOrders();
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid": case "verified": return "bg-green-100 text-green-800";
      case "partially_paid": return "bg-blue-100 text-blue-800";
      case "pending_verification": return "bg-yellow-100 text-yellow-800";
      case "unpaid": return "bg-red-100 text-red-800";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const viewOrderDetails = async (order: Order) => {
    setSelectedOrder(order);
    const { data, error } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", order.id);
    if (!error && data) {
      setOrderItems(data as any);
    } else if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "processing": return "bg-blue-100 text-blue-800";
      case "shipped": return "bg-purple-100 text-purple-800";
      case "delivered": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Orders</h1>
            <p className="text-muted-foreground">Manage and track customer orders ({filteredOrders.length})</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-2" /> CSV এক্সপোর্ট
            </Button>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" /> নতুন অর্ডার
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID, phone, city, name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <CheckSquare className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">{selectedIds.size} orders selected</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">Bulk Update Status <ChevronDown className="w-3 h-3 ml-1" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {statusOptions.map(s => (
                  <DropdownMenuItem key={s} onClick={() => bulkUpdateStatus(s)}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button>
          </div>
        )}

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={selectedIds.size === filteredOrders.length && filteredOrders.length > 0} onCheckedChange={toggleSelectAll} />
                </TableHead>
                <TableHead>Order ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No orders found</TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id} className={selectedIds.has(order.id) ? "bg-muted/50" : ""}>
                    <TableCell><Checkbox checked={selectedIds.has(order.id)} onCheckedChange={() => toggleSelect(order.id)} /></TableCell>
                    <TableCell className="font-mono text-sm">#{order.id.slice(0, 8)}</TableCell>
                    <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.guest_name || order.shipping_city}</p>
                        <p className="text-sm text-muted-foreground">{order.shipping_phone}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">৳{Number(order.total).toLocaleString()}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className={`text-xs px-3 py-1 rounded-full flex items-center gap-1 ${getStatusColor(order.status)}`}>
                            {order.status}
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {statusOptions.map((status) => (
                            <DropdownMenuItem key={status} onClick={() => updateOrderStatus(order.id, status)} disabled={order.status === status}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => viewOrderDetails(order)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => printLabel(order)} title="Print Label">
                        <Printer className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteOrderId(order.id)} title="Delete">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details #{selectedOrder?.id.slice(0, 8)}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Shipping Address</h4>
                  <p>{selectedOrder.guest_name}</p>
                  <p>{selectedOrder.shipping_address}</p>
                  <p>{selectedOrder.shipping_city}</p>
                  <p>{selectedOrder.shipping_phone}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Order Info</h4>
                  <p>Date: {new Date(selectedOrder.created_at).toLocaleString()}</p>
                  <p>Status: <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(selectedOrder.status)}`}>{selectedOrder.status}</span></p>
                  <p className="font-semibold mt-2">Total: ৳{Number(selectedOrder.total).toLocaleString()}</p>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-muted/50">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">💳 পেমেন্ট তথ্য</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p>মেথড: <span className="font-medium">{selectedOrder.payment_method}</span></p>
                  <p>স্ট্যাটাস: <span className={`text-xs px-2 py-0.5 rounded-full ${getPaymentStatusColor(selectedOrder.payment_status)}`}>{selectedOrder.payment_status}</span></p>
                  {selectedOrder.transaction_id && <p>TxID: <span className="font-mono font-medium">{selectedOrder.transaction_id}</span></p>}
                  {selectedOrder.payment_phone && <p>পেমেন্ট ফোন: {selectedOrder.payment_phone}</p>}
                  {Number(selectedOrder.advance_amount) > 0 && <p>অ্যাডভান্স: <span className="font-semibold text-green-700">৳{Number(selectedOrder.advance_amount).toLocaleString()}</span></p>}
                  {Number(selectedOrder.due_amount) > 0 && <p>বাকি: <span className="font-semibold text-red-700">৳{Number(selectedOrder.due_amount).toLocaleString()}</span></p>}
                </div>
                <div className="flex gap-2 mt-4">
                  {!selectedOrder.payment_verified && selectedOrder.transaction_id && (
                    <Button size="sm" onClick={() => verifyPayment(selectedOrder.id)} className="bg-green-600 hover:bg-green-700 text-white">
                      ✅ পেমেন্ট ভেরিফাই
                    </Button>
                  )}
                  {selectedOrder.payment_verified && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      ✅ ভেরিফাইড {selectedOrder.payment_verified_at && `(${new Date(selectedOrder.payment_verified_at).toLocaleDateString()})`}
                    </span>
                  )}
                  {Number(selectedOrder.due_amount) > 0 && !selectedOrder.cod_collected && (
                    <Button size="sm" variant="outline" onClick={() => collectCOD(selectedOrder.id)}>
                      💰 COD কালেক্ট করুন (৳{Number(selectedOrder.due_amount).toLocaleString()})
                    </Button>
                  )}
                  {selectedOrder.cod_collected && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      💰 COD কালেক্টেড {selectedOrder.cod_collected_at && `(${new Date(selectedOrder.cod_collected_at).toLocaleDateString()})`}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-muted/50">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">🚚 ট্র্যাকিং তথ্য</h4>
                <TrackingForm order={selectedOrder} onUpdate={() => { invalidateOrders(); setSelectedOrder(null); }} />
              </div>

              {selectedOrder.notes && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Notes</h4>
                  <p>{selectedOrder.notes}</p>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">📦 আইটেম তালিকা ({orderItems.length})</h4>
                <div className="border rounded-lg divide-y">
                  {orderItems.map((item) => (
                    <div key={item.id} className="p-3 flex items-center gap-3">
                      <div className="w-14 h-14 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                        <img
                          src="/placeholder.svg"
                          alt={item.product_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.product_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.size && <span className="text-xs px-1.5 py-0.5 bg-muted rounded">{item.size}</span>}
                          {item.color && (
                            <span className="text-xs px-1.5 py-0.5 bg-muted rounded flex items-center gap-1">
                              <span className="w-2.5 h-2.5 rounded-full border" style={{ backgroundColor: item.color.toLowerCase() }} />
                              {item.color}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">×{item.quantity}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-muted-foreground">৳{Number(item.price).toLocaleString()} each</p>
                        <p className="font-semibold text-sm">৳{(Number(item.price) * item.quantity).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t">
                  <span className="text-sm font-medium text-muted-foreground">সর্বমোট</span>
                  <span className="text-lg font-bold text-primary">৳{Number(selectedOrder?.total || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Order Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>নতুন অর্ডার তৈরি করুন</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">কাস্টমার নাম *</label>
              <Input value={newOrder.guest_name} onChange={e => setNewOrder(p => ({ ...p, guest_name: e.target.value }))} placeholder="নাম লিখুন" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">মোবাইল নম্বর *</label>
              <Input value={newOrder.shipping_phone} onChange={e => setNewOrder(p => ({ ...p, shipping_phone: e.target.value }))} placeholder="01XXXXXXXXX" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">ঠিকানা *</label>
              <Input value={newOrder.shipping_address} onChange={e => setNewOrder(p => ({ ...p, shipping_address: e.target.value }))} placeholder="পূর্ণ ঠিকানা" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">শহর (ঐচ্ছিক)</label>
              <Input value={newOrder.shipping_city} onChange={e => setNewOrder(p => ({ ...p, shipping_city: e.target.value }))} placeholder="শহর" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">মোট টাকা (৳) *</label>
              <Input type="number" value={newOrder.total} onChange={e => setNewOrder(p => ({ ...p, total: e.target.value }))} placeholder="0" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">পেমেন্ট মেথড</label>
              <Select value={newOrder.payment_method} onValueChange={v => setNewOrder(p => ({ ...p, payment_method: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cod">Cash on Delivery</SelectItem>
                  <SelectItem value="bkash">bKash</SelectItem>
                  <SelectItem value="nagad">Nagad</SelectItem>
                  <SelectItem value="rocket">Rocket</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">নোট (ঐচ্ছিক)</label>
              <Textarea value={newOrder.notes} onChange={e => setNewOrder(p => ({ ...p, notes: e.target.value }))} placeholder="অতিরিক্ত নোট..." className="mt-1" rows={2} />
            </div>
            <Button onClick={handleAddOrder} className="w-full">
              <Plus className="w-4 h-4 mr-2" /> অর্ডার তৈরি করুন
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteOrderId} onOpenChange={() => setDeleteOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>অর্ডার ডিলিট করবেন?</AlertDialogTitle>
            <AlertDialogDescription>
              এই অর্ডার এবং এর সকল আইটেম স্থায়ীভাবে মুছে যাবে। এটি আর ফেরত আনা যাবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOrder} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              ডিলিট করুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default Orders;
