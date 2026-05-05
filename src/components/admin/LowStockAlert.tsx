import { useMemo, forwardRef } from "react";
import { AlertTriangle, Package, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

interface LowStockAlertProps {
  threshold?: number;
}

const LowStockAlert = forwardRef<HTMLDivElement, LowStockAlertProps>(
  ({ threshold = 1 }, ref) => {
    const { data: lowStockProducts = [], isLoading: loading } = useQuery({
      queryKey: ["admin-low-stock", threshold],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("products")
          .select("id, name, stock, image_url, category")
          .lte("stock", threshold)
          .order("stock", { ascending: true })
          .limit(10);
        if (error) throw error;
        return data || [];
      },
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    });

    const { outOfStock, lowStock } = useMemo(() => ({
      outOfStock: lowStockProducts.filter((p) => p.stock === 0),
      lowStock: lowStockProducts.filter((p) => p.stock! > 0),
    }), [lowStockProducts]);

    if (loading) return null;
    if (lowStockProducts.length === 0) return null;

    return (
      <Card ref={ref} className="border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
            <AlertTriangle className="w-5 h-5" />
            Inventory Alerts
            <Badge variant="secondary" className="ml-auto">{lowStockProducts.length} items</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {outOfStock.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-destructive">Out of Stock</p>
              {outOfStock.map((product) => (
                <div key={product.id} className="flex items-center gap-3 p-2 bg-destructive/10 rounded-lg">
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center overflow-hidden">
                    {product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.category}</p>
                  </div>
                  <Badge variant="destructive">0 left</Badge>
                </div>
              ))}
            </div>
          )}

          {lowStock.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Low Stock (≤{threshold})</p>
              {lowStock.map((product) => (
                <div key={product.id} className="flex items-center gap-3 p-2 bg-orange-100/50 dark:bg-orange-900/20 rounded-lg">
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center overflow-hidden">
                    {product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.category}</p>
                  </div>
                  <Badge variant="outline" className="text-orange-600 border-orange-300">{product.stock} left</Badge>
                </div>
              ))}
            </div>
          )}

          <Link to="/admin/products">
            <Button variant="ghost" size="sm" className="w-full mt-2">
              Manage Products <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }
);

LowStockAlert.displayName = "LowStockAlert";

export default LowStockAlert;
