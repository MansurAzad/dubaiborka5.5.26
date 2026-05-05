import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Package, AlertTriangle, ShoppingCart, Clock } from "lucide-react";
import { Link } from "react-router-dom";

interface Notification {
  id: string;
  type: "new_order" | "low_stock" | "cancelled";
  title: string;
  description: string;
  time: string;
  link?: string;
}

const AdminNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const { data: recentOrders = [] } = useQuery({
    queryKey: ["admin-recent-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, status, total, shipping_city, created_at, guest_name")
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const { data: lowStockProducts = [] } = useQuery({
    queryKey: ["admin-low-stock"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, stock")
        .lt("stock", 5)
        .order("stock", { ascending: true });
      return data || [];
    },
    refetchInterval: 60000,
  });

  useEffect(() => {
    const notifs: Notification[] = [];

    recentOrders.forEach((order: any) => {
      const minutesAgo = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
      if (minutesAgo < 1440) {
        if (order.status === "pending") {
          notifs.push({
            id: `order-${order.id}`,
            type: "new_order",
            title: `New Order #${order.id.slice(0, 8).toUpperCase()}`,
            description: `৳${Number(order.total).toLocaleString()} from ${order.shipping_city} - ${order.guest_name || "Customer"}`,
            time: minutesAgo < 60 ? `${minutesAgo}m ago` : `${Math.floor(minutesAgo / 60)}h ago`,
            link: "/admin/orders",
          });
        }
        if (order.status === "cancelled") {
          notifs.push({
            id: `cancel-${order.id}`,
            type: "cancelled",
            title: `Order Cancelled #${order.id.slice(0, 8).toUpperCase()}`,
            description: `৳${Number(order.total).toLocaleString()} order was cancelled`,
            time: minutesAgo < 60 ? `${minutesAgo}m ago` : `${Math.floor(minutesAgo / 60)}h ago`,
            link: "/admin/orders",
          });
        }
      }
    });

    lowStockProducts.forEach((p: any) => {
      notifs.push({
        id: `stock-${p.id}`,
        type: "low_stock",
        title: `Low Stock: ${p.name}`,
        description: `Only ${p.stock ?? 0} items remaining`,
        time: "Now",
        link: "/admin/products",
      });
    });

    setNotifications(notifs);
  }, [recentOrders, lowStockProducts]);

  // Real-time subscription for new orders
  useEffect(() => {
    const channel = supabase
      .channel("admin-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        const order = payload.new as any;
        setNotifications(prev => [{
          id: `order-${order.id}`,
          type: "new_order",
          title: `🆕 New Order #${order.id.slice(0, 8).toUpperCase()}`,
          description: `৳${Number(order.total).toLocaleString()} from ${order.shipping_city}`,
          time: "Just now",
          link: "/admin/orders",
        }, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case "new_order": return <ShoppingCart className="w-5 h-5 text-primary" />;
      case "low_stock": return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "cancelled": return <Package className="w-5 h-5 text-destructive" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case "new_order": return "default" as const;
      case "low_stock": return "secondary" as const;
      case "cancelled": return "destructive" as const;
      default: return "outline" as const;
    }
  };

  const newOrders = notifications.filter(n => n.type === "new_order").length;
  const lowStock = notifications.filter(n => n.type === "low_stock").length;
  const cancelled = notifications.filter(n => n.type === "cancelled").length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Notifications</h1>
          <p className="text-muted-foreground">Real-time alerts for your store</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{newOrders}</p>
                <p className="text-sm text-muted-foreground">New Orders (24h)</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{lowStock}</p>
                <p className="text-sm text-muted-foreground">Low Stock Items</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{cancelled}</p>
                <p className="text-sm text-muted-foreground">Cancelled (24h)</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              All Notifications ({notifications.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No notifications right now</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map(n => (
                  <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    {getIcon(n.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm">{n.title}</p>
                        <Badge variant={getBadgeVariant(n.type)} className="text-xs">
                          {n.type === "new_order" ? "Order" : n.type === "low_stock" ? "Stock" : "Cancel"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{n.description}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />{n.time}
                      </span>
                      {n.link && (
                        <Link to={n.link}>
                          <Button variant="ghost" size="sm">View</Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminNotifications;
