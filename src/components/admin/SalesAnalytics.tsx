import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import { format, subDays, startOfDay, eachDayOfInterval, subMonths, startOfMonth, eachMonthOfInterval } from "date-fns";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const chartConfig = {
  revenue: { label: "Revenue", color: "hsl(var(--primary))" },
  orders: { label: "Orders", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

const COLORS = [
  "hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))",
];

const SalesAnalytics = () => {
  const thirtyDaysAgo = useMemo(() => subDays(new Date(), 30), []);
  const twelveMonthsAgo = useMemo(() => subMonths(new Date(), 12), []);

  const { data: orders30d = [] } = useQuery({
    queryKey: ["admin-analytics-30d"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("created_at, total, status")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: true });
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: orders12m = [] } = useQuery({
    queryKey: ["admin-analytics-12m"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("created_at, total, status")
        .gte("created_at", twelveMonthsAgo.toISOString());
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: orderItems = [] } = useQuery({
    queryKey: ["admin-analytics-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("order_items")
        .select("price, quantity, product_id, products(category)");
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const dailyData = useMemo(() => {
    const days = eachDayOfInterval({ start: thirtyDaysAgo, end: new Date() });
    return days.map((day) => {
      const dayOrders = orders30d.filter((order) => {
        const orderDate = startOfDay(new Date(order.created_at));
        return orderDate.getTime() === startOfDay(day).getTime();
      });
      return {
        date: format(day, "MMM dd"),
        revenue: dayOrders.reduce((sum, o) => sum + Number(o.total), 0),
        orders: dayOrders.length,
      };
    });
  }, [orders30d, thirtyDaysAgo]);

  const monthlyData = useMemo(() => {
    const months = eachMonthOfInterval({ start: twelveMonthsAgo, end: new Date() });
    return months.map((month) => {
      const monthOrders = orders12m.filter((order) => {
        const orderDate = startOfMonth(new Date(order.created_at));
        return orderDate.getTime() === startOfMonth(month).getTime();
      });
      return {
        month: format(month, "MMM yyyy"),
        revenue: monthOrders.reduce((sum, o) => sum + Number(o.total), 0),
        orders: monthOrders.length,
      };
    });
  }, [orders12m, twelveMonthsAgo]);

  const categoryData = useMemo(() => {
    const categoryMap = new Map<string, number>();
    orderItems.forEach((item: any) => {
      const category = item.products?.category || "Unknown";
      const total = Number(item.price) * item.quantity;
      categoryMap.set(category, (categoryMap.get(category) || 0) + total);
    });
    return Array.from(categoryMap.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }, [orderItems]);

  const revenueChange = useMemo(() => {
    const last7 = dailyData.slice(-7);
    const prev7 = dailyData.slice(-14, -7);
    const last7Rev = last7.reduce((sum, d) => sum + d.revenue, 0);
    const prev7Rev = prev7.reduce((sum, d) => sum + d.revenue, 0);
    return prev7Rev > 0 ? Math.round(((last7Rev - prev7Rev) / prev7Rev) * 1000) / 10 : 0;
  }, [dailyData]);

  const totalRevenue = useMemo(() => dailyData.reduce((sum, d) => sum + d.revenue, 0), [dailyData]);
  const totalOrders = useMemo(() => dailyData.reduce((sum, d) => sum + d.orders, 0), [dailyData]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Last 30 Days Revenue</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">৳{totalRevenue.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-sm mt-1">
              {revenueChange >= 0 ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
              <span className={revenueChange >= 0 ? "text-green-500" : "text-red-500"}>{revenueChange >= 0 ? "+" : ""}{revenueChange}%</span>
              <span className="text-muted-foreground">vs last week</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Orders (30 days)</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <div className="text-sm text-muted-foreground mt-1">Avg: ৳{totalOrders > 0 ? Math.round(totalRevenue / totalOrders).toLocaleString() : 0} per order</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Top Category</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{categoryData[0]?.category || "N/A"}</div>
            <div className="text-sm text-muted-foreground mt-1">৳{categoryData[0]?.total.toLocaleString() || 0} in sales</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Revenue Trends</CardTitle></CardHeader>
        <CardContent>
          <Tabs defaultValue="daily" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="daily">Daily (30 days)</TabsTrigger>
              <TabsTrigger value="monthly">Monthly (12 months)</TabsTrigger>
            </TabsList>
            <TabsContent value="daily">
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} interval="preserveStartEnd" />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} tickFormatter={(value) => `৳${value >= 1000 ? `${value / 1000}k` : value}`} />
                  <ChartTooltip content={<ChartTooltipContent labelFormatter={(label) => label} />} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#colorRevenue)" strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
            </TabsContent>
            <TabsContent value="monthly">
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} tickFormatter={(value) => `৳${value >= 1000 ? `${value / 1000}k` : value}`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Sales by Category</CardTitle></CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="total" nameKey="category"
                    label={({ category, percent }) => `${category} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                    {categoryData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <ChartTooltip content={({ payload }) => {
                    if (!payload?.length) return null;
                    const data = payload[0].payload;
                    return (<div className="bg-background border rounded-lg px-3 py-2 shadow-lg"><p className="font-medium capitalize">{data.category}</p><p className="text-sm text-muted-foreground">৳{data.total.toLocaleString()}</p></div>);
                  }} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">No category data available</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Daily Orders</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart data={dailyData.slice(-14)}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="orders" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SalesAnalytics;
