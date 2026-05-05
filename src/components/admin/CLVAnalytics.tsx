import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Users, TrendingUp, ShoppingCart } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

const CLVAnalytics = () => {
  const { data: orders = [] } = useQuery({
    queryKey: ["admin-clv-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("user_id, total, status, created_at").not("user_id", "is", null);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-clv-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name, phone, city");
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const clvData = useMemo(() => {
    const byUser: Record<string, { total: number; orders: number; firstOrder: string; lastOrder: string }> = {};
    orders.forEach(o => {
      if (!o.user_id) return;
      if (!byUser[o.user_id]) byUser[o.user_id] = { total: 0, orders: 0, firstOrder: o.created_at, lastOrder: o.created_at };
      byUser[o.user_id].total += Number(o.total || 0);
      byUser[o.user_id].orders += 1;
      if (o.created_at < byUser[o.user_id].firstOrder) byUser[o.user_id].firstOrder = o.created_at;
      if (o.created_at > byUser[o.user_id].lastOrder) byUser[o.user_id].lastOrder = o.created_at;
    });

    return Object.entries(byUser).map(([userId, data]) => {
      const profile = profiles.find(p => p.user_id === userId);
      return {
        userId,
        name: profile?.full_name || "Unknown",
        city: profile?.city || "—",
        totalSpent: data.total,
        orderCount: data.orders,
        avgOrder: data.total / data.orders,
        firstOrder: data.firstOrder,
        lastOrder: data.lastOrder,
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders, profiles]);

  const totalCLV = clvData.reduce((s, c) => s + c.totalSpent, 0);
  const avgCLV = clvData.length > 0 ? totalCLV / clvData.length : 0;
  const repeatCustomers = clvData.filter(c => c.orderCount > 1).length;

  // CLV tiers
  const tiers = useMemo(() => {
    const t = [
      { name: "VIP (৳10k+)", count: 0 },
      { name: "Regular (৳5k-10k)", count: 0 },
      { name: "New (৳1k-5k)", count: 0 },
      { name: "Low (<৳1k)", count: 0 },
    ];
    clvData.forEach(c => {
      if (c.totalSpent >= 10000) t[0].count++;
      else if (c.totalSpent >= 5000) t[1].count++;
      else if (c.totalSpent >= 1000) t[2].count++;
      else t[3].count++;
    });
    return t;
  }, [clvData]);

  // Top 10 for bar chart
  const top10 = clvData.slice(0, 10).map(c => ({ name: c.name.split(" ")[0] || "?", value: c.totalSpent }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-6 flex items-center gap-4"><DollarSign className="w-8 h-8 text-primary" /><div><p className="text-sm text-muted-foreground">Total CLV</p><p className="text-2xl font-bold">৳{totalCLV.toLocaleString()}</p></div></CardContent></Card>
        <Card><CardContent className="p-6 flex items-center gap-4"><TrendingUp className="w-8 h-8 text-green-500" /><div><p className="text-sm text-muted-foreground">Avg CLV</p><p className="text-2xl font-bold">৳{avgCLV.toFixed(0)}</p></div></CardContent></Card>
        <Card><CardContent className="p-6 flex items-center gap-4"><Users className="w-8 h-8 text-blue-500" /><div><p className="text-sm text-muted-foreground">Total Customers</p><p className="text-2xl font-bold">{clvData.length}</p></div></CardContent></Card>
        <Card><CardContent className="p-6 flex items-center gap-4"><ShoppingCart className="w-8 h-8 text-yellow-500" /><div><p className="text-sm text-muted-foreground">Repeat Customers</p><p className="text-2xl font-bold">{repeatCustomers}</p></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Top 10 Customers by CLV</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={top10} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => `৳${v.toLocaleString()}`} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Customer Tiers</CardTitle></CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={tiers} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                  {tiers.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Customer Lifetime Value Details</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead>Avg Order</TableHead>
                <TableHead>Tier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clvData.slice(0, 20).map(c => (
                <TableRow key={c.userId}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.city}</TableCell>
                  <TableCell>{c.orderCount}</TableCell>
                  <TableCell className="font-semibold">৳{c.totalSpent.toLocaleString()}</TableCell>
                  <TableCell>৳{c.avgOrder.toFixed(0)}</TableCell>
                  <TableCell>
                    <Badge variant={c.totalSpent >= 10000 ? "default" : c.totalSpent >= 5000 ? "secondary" : "outline"}>
                      {c.totalSpent >= 10000 ? "VIP" : c.totalSpent >= 5000 ? "Regular" : c.totalSpent >= 1000 ? "New" : "Low"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CLVAnalytics;
