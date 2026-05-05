import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Truck, Package, MapPin, Search, Calendar } from "lucide-react";

const couriers = ["Pathao Courier", "Steadfast", "RedX", "Sundarban Courier", "SA Paribahan", "Janani Express", "Paper Fly"];

const Shipping = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editOrder, setEditOrder] = useState<any>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [courierName, setCourierName] = useState("");
  const [estimatedDelivery, setEstimatedDelivery] = useState("");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-shipping-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const updateShipping = useMutation({
    mutationFn: async ({ id, tracking_number, courier_name, estimated_delivery, status }: any) => {
      const updates: any = { tracking_number, courier_name };
      if (estimated_delivery) updates.estimated_delivery = estimated_delivery;
      if (status) updates.status = status;
      const { error } = await supabase.from("orders").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shipping-orders"] });
      toast.success("Shipping info updated");
      setEditOrder(null);
    },
    onError: () => toast.error("Failed to update"),
  });

  const filtered = orders.filter(o => {
    const matchSearch = !search || o.id.includes(search) || o.shipping_phone?.includes(search) || o.tracking_number?.includes(search) || o.shipping_city?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: orders.length,
    processing: orders.filter(o => o.status === "processing").length,
    shipped: orders.filter(o => o.status === "shipped").length,
    delivered: orders.filter(o => o.status === "delivered").length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Shipping Management</h1>
          <p className="text-muted-foreground">শিপিং ও কুরিয়ার ট্র্যাকিং</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <Package className="w-8 h-8 text-primary" />
              <div><p className="text-sm text-muted-foreground">Total Orders</p><p className="text-2xl font-bold">{stats.total}</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <Truck className="w-8 h-8 text-yellow-500" />
              <div><p className="text-sm text-muted-foreground">Processing</p><p className="text-2xl font-bold">{stats.processing}</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <Truck className="w-8 h-8 text-blue-500" />
              <div><p className="text-sm text-muted-foreground">Shipped</p><p className="text-2xl font-bold">{stats.shipped}</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <MapPin className="w-8 h-8 text-green-500" />
              <div><p className="text-sm text-muted-foreground">Delivered</p><p className="text-2xl font-bold">{stats.delivered}</p></div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <CardTitle>Shipments</CardTitle>
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search orders..." className="pl-9 w-64" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Courier</TableHead>
                    <TableHead>Tracking</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>{format(new Date(order.created_at), "dd MMM")}</TableCell>
                      <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}...</TableCell>
                      <TableCell>{order.shipping_city}</TableCell>
                      <TableCell>{order.shipping_phone}</TableCell>
                      <TableCell>{order.courier_name || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{order.tracking_number || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={order.status === "delivered" ? "default" : order.status === "shipped" ? "secondary" : "outline"}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditOrder(order);
                                setTrackingNumber(order.tracking_number || "");
                                setCourierName(order.courier_name || "");
                                setEstimatedDelivery(order.estimated_delivery ? format(new Date(order.estimated_delivery), "yyyy-MM-dd") : "");
                              }}
                            >
                              <Truck className="w-4 h-4 mr-1" /> Update
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Update Shipping</DialogTitle></DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm text-muted-foreground">Courier</label>
                                <Select value={courierName} onValueChange={setCourierName}>
                                  <SelectTrigger><SelectValue placeholder="Select courier" /></SelectTrigger>
                                  <SelectContent>
                                    {couriers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="text-sm text-muted-foreground">Tracking Number</label>
                                <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
                              </div>
                              <div>
                                <label className="text-sm text-muted-foreground">Estimated Delivery</label>
                                <Input type="date" value={estimatedDelivery} onChange={(e) => setEstimatedDelivery(e.target.value)} />
                              </div>
                              <div>
                                <label className="text-sm text-muted-foreground">Update Status</label>
                                <Select defaultValue={editOrder?.status}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="processing">Processing</SelectItem>
                                    <SelectItem value="shipped">Shipped</SelectItem>
                                    <SelectItem value="delivered">Delivered</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button
                                className="w-full"
                                onClick={() => {
                                  if (!editOrder) return;
                                  updateShipping.mutate({
                                    id: editOrder.id,
                                    tracking_number: trackingNumber,
                                    courier_name: courierName,
                                    estimated_delivery: estimatedDelivery || null,
                                    status: editOrder.status,
                                  });
                                }}
                                disabled={updateShipping.isPending}
                              >
                                Save Shipping Info
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Shipping;
