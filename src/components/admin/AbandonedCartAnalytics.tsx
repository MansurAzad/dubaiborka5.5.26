import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, AlertTriangle, TrendingDown, DollarSign } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#10b981", "#ef4444"];

const AbandonedCartAnalytics = () => {
  // Users with cart items but no recent completed order
  const { data: cartData = [] } = useQuery({
    queryKey: ["admin-abandoned-carts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cart_items")
        .select("user_id, quantity, product_id, created_at, updated_at, products(name, price, sale_price)")
        .order("updated_at", { ascending: false });
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: recentOrders = [] } = useQuery({
    queryKey: ["admin-recent-order-users"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("user_id")
        .not("user_id", "is", null)
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-cart-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name, phone");
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const analytics = useMemo(() => {
    const recentBuyers = new Set(recentOrders.map(o => o.user_id));

    // Group cart items by user
    const byUser: Record<string, { items: number; value: number; lastUpdate: string }> = {};
    cartData.forEach(item => {
      if (!item.user_id) return;
      const product = item.products as any;
      const price = product?.sale_price || product?.price || 0;
      if (!byUser[item.user_id]) byUser[item.user_id] = { items: 0, value: 0, lastUpdate: item.updated_at };
      byUser[item.user_id].items += item.quantity;
      byUser[item.user_id].value += price * item.quantity;
      if (item.updated_at > byUser[item.user_id].lastUpdate) byUser[item.user_id].lastUpdate = item.updated_at;
    });

    const abandoned = Object.entries(byUser)
      .filter(([userId]) => !recentBuyers.has(userId))
      .map(([userId, data]) => ({
        userId,
        name: profiles.find(p => p.user_id === userId)?.full_name || "Unknown",
        phone: profiles.find(p => p.user_id === userId)?.phone || "—",
        ...data,
      }))
      .sort((a, b) => b.value - a.value);

    const totalAbandoned = abandoned.length;
    const totalUsersWithCart = Object.keys(byUser).length;
    const abandonedValue = abandoned.reduce((s, a) => s + a.value, 0);
    const abandonmentRate = totalUsersWithCart > 0 ? (totalAbandoned / totalUsersWithCart) * 100 : 0;

    return { abandoned, totalAbandoned, totalUsersWithCart, abandonedValue, abandonmentRate };
  }, [cartData, recentOrders, profiles]);

  const pieData = [
    { name: "Completed", value: analytics.totalUsersWithCart - analytics.totalAbandoned },
    { name: "Abandoned", value: analytics.totalAbandoned },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-6 flex items-center gap-4"><ShoppingCart className="w-8 h-8 text-primary" /><div><p className="text-sm text-muted-foreground">Active Carts</p><p className="text-2xl font-bold">{analytics.totalUsersWithCart}</p></div></CardContent></Card>
        <Card><CardContent className="p-6 flex items-center gap-4"><AlertTriangle className="w-8 h-8 text-orange-500" /><div><p className="text-sm text-muted-foreground">Abandoned Carts</p><p className="text-2xl font-bold">{analytics.totalAbandoned}</p></div></CardContent></Card>
        <Card><CardContent className="p-6 flex items-center gap-4"><TrendingDown className="w-8 h-8 text-red-500" /><div><p className="text-sm text-muted-foreground">Abandonment Rate</p><p className="text-2xl font-bold">{analytics.abandonmentRate.toFixed(1)}%</p></div></CardContent></Card>
        <Card><CardContent className="p-6 flex items-center gap-4"><DollarSign className="w-8 h-8 text-green-500" /><div><p className="text-sm text-muted-foreground">Lost Revenue</p><p className="text-2xl font-bold">৳{analytics.abandonedValue.toLocaleString()}</p></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle>Cart Status</CardTitle></CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Abandoned Cart Details</CardTitle></CardHeader>
          <CardContent>
            {analytics.abandoned.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">কোনো অ্যাবান্ডন্ড কার্ট নেই 🎉</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.abandoned.slice(0, 15).map(a => (
                    <TableRow key={a.userId}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell>{a.phone}</TableCell>
                      <TableCell>{a.items}</TableCell>
                      <TableCell className="font-semibold">৳{a.value.toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(a.lastUpdate).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AbandonedCartAnalytics;
