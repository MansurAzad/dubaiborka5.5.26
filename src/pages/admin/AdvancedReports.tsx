import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Package, Users, ShoppingCart, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import CLVAnalytics from "@/components/admin/CLVAnalytics";
import AbandonedCartAnalytics from "@/components/admin/AbandonedCartAnalytics";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const AdvancedReports = () => {
  const [period, setPeriod] = useState("30");

  const { data: orders = [] } = useQuery({
    queryKey: ["admin-report-orders", period],
    queryFn: async () => {
      const fromDate = subDays(new Date(), parseInt(period)).toISOString();
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .gte("created_at", fromDate)
        .order("created_at", { ascending: true });
      return data || [];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["admin-report-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*");
      return data || [];
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["admin-report-customers"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*");
      return data || [];
    },
  });

  // Revenue metrics
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
  const completedOrders = orders.filter(o => o.status === "delivered").length;
  const pendingOrders = orders.filter(o => o.status === "pending").length;

  // Daily revenue chart
  const dailyRevenue = orders.reduce((acc: Record<string, number>, order) => {
    const day = format(new Date(order.created_at), "MMM dd");
    acc[day] = (acc[day] || 0) + Number(order.total || 0);
    return acc;
  }, {});
  const revenueChartData = Object.entries(dailyRevenue).map(([date, revenue]) => ({ date, revenue }));

  // Category breakdown
  const categoryData = orders.reduce((acc: Record<string, number>, order) => {
    const items = (order as any).order_items || [];
    items.forEach((item: any) => {
      const product = products.find(p => p.id === item.product_id);
      const cat = product?.category || "Other";
      acc[cat] = (acc[cat] || 0) + Number(item.price * item.quantity);
    });
    return acc;
  }, {});
  const categoryChartData = Object.entries(categoryData).map(([name, value]) => ({ name, value }));

  // Order status breakdown
  const statusData = orders.reduce((acc: Record<string, number>, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});
  const statusChartData = Object.entries(statusData).map(([name, value]) => ({ name, value }));

  // Payment method breakdown
  const paymentData = orders.reduce((acc: Record<string, number>, order) => {
    acc[order.payment_method] = (acc[order.payment_method] || 0) + 1;
    return acc;
  }, {});
  const paymentChartData = Object.entries(paymentData).map(([name, value]) => ({ name, value }));

  // Top selling products
  const productSales = orders.reduce((acc: Record<string, { name: string; qty: number; revenue: number }>, order) => {
    const items = (order as any).order_items || [];
    items.forEach((item: any) => {
      if (!acc[item.product_name]) acc[item.product_name] = { name: item.product_name, qty: 0, revenue: 0 };
      acc[item.product_name].qty += item.quantity;
      acc[item.product_name].revenue += Number(item.price * item.quantity);
    });
    return acc;
  }, {});
  const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  // City-wise orders
  const cityData = orders.reduce((acc: Record<string, number>, order) => {
    acc[order.shipping_city] = (acc[order.shipping_city] || 0) + 1;
    return acc;
  }, {});
  const cityChartData = Object.entries(cityData).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);

  const exportCSV = () => {
    const rows = orders.map(o => `${o.id};${o.created_at};${o.total};${o.status};${o.payment_method};${o.shipping_city}`);
    const csv = "ID;Date;Total;Status;Payment;City\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Advanced Reports</h1>
            <p className="text-muted-foreground">বিস্তারিত বিশ্লেষণ ও রিপোর্ট</p>
          </div>
          <div className="flex gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
                <SelectItem value="365">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">৳{totalRevenue.toLocaleString()}</p>
                </div>
                <DollarSign className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">{orders.length}</p>
                </div>
                <ShoppingCart className="w-8 h-8 text-secondary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Order Value</p>
                  <p className="text-2xl font-bold">৳{avgOrderValue.toFixed(0)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Customers</p>
                  <p className="text-2xl font-bold">{customers.length}</p>
                </div>
                <Users className="w-8 h-8 text-accent" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="revenue">
          <TabsList>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="products">Top Products</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="clv">CLV</TabsTrigger>
            <TabsTrigger value="abandoned">Abandoned Carts</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Revenue Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(v: number) => `৳${v.toLocaleString()}`} />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Top Selling Products</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={topProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: number) => `৳${v.toLocaleString()}`} />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Sales by Category</CardTitle></CardHeader>
              <CardContent className="flex justify-center">
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie data={categoryChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={150} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                      {categoryChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `৳${v.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="locations" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Orders by City</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={cityChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} name="Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle>Payment Methods</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={paymentChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                        {paymentChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Order Status</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                        {statusChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="clv" className="mt-4">
            <CLVAnalytics />
          </TabsContent>

          <TabsContent value="abandoned" className="mt-4">
            <AbandonedCartAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdvancedReports;
