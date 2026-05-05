import { useState, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Search, CheckSquare } from "lucide-react";

interface ProductRow {
  id: string;
  name: string;
  category: string;
  price: number;
  sale_price: number | null;
  stock: number | null;
  featured: boolean;
}

const BulkProductEdit = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [edits, setEdits] = useState<Record<string, Partial<ProductRow>>>({});
  const [saving, setSaving] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-bulk-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name, category, price, sale_price, stock, featured").order("created_at", { ascending: false });
      return (data || []) as ProductRow[];
    },
  });

  const filtered = useMemo(() => products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  ), [products, search]);

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(p => p.id)));
  };

  const setEdit = (id: string, field: string, value: any) => {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const getValue = (product: ProductRow, field: keyof ProductRow) => {
    return edits[product.id]?.[field] ?? product[field];
  };

  const handleBulkSave = async () => {
    const ids = Object.keys(edits).filter(id => selected.has(id) || Object.keys(edits[id]).length > 0);
    if (ids.length === 0) { toast.error("কোনো পরিবর্তন নেই"); return; }

    setSaving(true);
    let success = 0;
    for (const id of ids) {
      const updates: any = {};
      const e = edits[id];
      if (e.price !== undefined) updates.price = Number(e.price);
      if (e.sale_price !== undefined) updates.sale_price = e.sale_price ? Number(e.sale_price) : null;
      if (e.stock !== undefined) updates.stock = Number(e.stock);
      if (e.featured !== undefined) updates.featured = e.featured;
      if (Object.keys(updates).length === 0) continue;

      const { error } = await supabase.from("products").update(updates).eq("id", id);
      if (!error) success++;
    }

    toast.success(`${success}টি প্রোডাক্ট আপডেট হয়েছে`);
    setEdits({});
    setSelected(new Set());
    queryClient.invalidateQueries({ queryKey: ["admin-bulk-products"] });
    queryClient.invalidateQueries({ queryKey: ["admin-products-list"] });
    setSaving(false);
  };

  // Bulk set price/stock for selected
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkStock, setBulkStock] = useState("");

  const applyBulkPrice = () => {
    if (!bulkPrice) return;
    selected.forEach(id => setEdit(id, "price", Number(bulkPrice)));
    toast.info(`${selected.size}টি প্রোডাক্টে প্রাইস সেট করা হয়েছে`);
  };

  const applyBulkStock = () => {
    if (!bulkStock) return;
    selected.forEach(id => setEdit(id, "stock", Number(bulkStock)));
    toast.info(`${selected.size}টি প্রোডাক্টে স্টক সেট করা হয়েছে`);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Bulk Edit</h1>
            <p className="text-muted-foreground">একসাথে একাধিক প্রোডাক্ট এডিট করুন</p>
          </div>
          <Button onClick={handleBulkSave} disabled={saving || Object.keys(edits).length === 0}>
            <Save className="w-4 h-4 mr-2" /> {saving ? "সেভ হচ্ছে..." : "সব পরিবর্তন সেভ করুন"}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          {selected.size > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{selected.size} সিলেক্টেড —</span>
              <Input type="number" placeholder="Bulk Price" value={bulkPrice} onChange={e => setBulkPrice(e.target.value)} className="w-28 h-8" />
              <Button size="sm" variant="outline" onClick={applyBulkPrice}>Apply</Button>
              <Input type="number" placeholder="Bulk Stock" value={bulkStock} onChange={e => setBulkStock(e.target.value)} className="w-28 h-8" />
              <Button size="sm" variant="outline" onClick={applyBulkStock}>Apply</Button>
            </div>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={selectAll} />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="w-28">Price (৳)</TableHead>
                  <TableHead className="w-28">Sale Price</TableHead>
                  <TableHead className="w-24">Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : filtered.map(product => (
                  <TableRow key={product.id} className={edits[product.id] ? "bg-primary/5" : ""}>
                    <TableCell>
                      <Checkbox checked={selected.has(product.id)} onCheckedChange={() => toggleSelect(product.id)} />
                    </TableCell>
                    <TableCell className="font-medium text-sm">{product.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{product.category}</TableCell>
                    <TableCell>
                      <Input type="number" className="h-8 text-sm" value={String(getValue(product, "price"))} onChange={e => setEdit(product.id, "price", e.target.value)} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" className="h-8 text-sm" value={String(getValue(product, "sale_price") ?? "")} onChange={e => setEdit(product.id, "sale_price", e.target.value || null)} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" className="h-8 text-sm" value={String(getValue(product, "stock") ?? 0)} onChange={e => setEdit(product.id, "stock", e.target.value)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default BulkProductEdit;
