import { useState, useCallback } from "react";
import { Plus, Edit, Trash2, Tag, Loader2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  minimum_order_amount: number;
  max_uses: number | null;
  current_uses: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

const Coupons = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    code: "", description: "", discount_type: "percentage", discount_value: 10,
    minimum_order_amount: 0, max_uses: "", valid_until: "", is_active: true,
  });

  const { data: coupons = [], isLoading: loading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Coupon[];
    },
    staleTime: 2 * 60 * 1000,
  });

  const invalidateCoupons = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
  }, [queryClient]);

  const resetForm = () => {
    setFormData({ code: "", description: "", discount_type: "percentage", discount_value: 10, minimum_order_amount: 0, max_uses: "", valid_until: "", is_active: true });
    setEditingCoupon(null);
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code, description: coupon.description || "", discount_type: coupon.discount_type,
      discount_value: coupon.discount_value, minimum_order_amount: coupon.minimum_order_amount || 0,
      max_uses: coupon.max_uses?.toString() || "", valid_until: coupon.valid_until?.split("T")[0] || "", is_active: coupon.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.code || !formData.discount_value) {
      toast({ title: "ত্রুটি", description: "কোড এবং ডিসকাউন্ট মান দিন", variant: "destructive" });
      return;
    }
    setSaving(true);
    const couponData = {
      code: formData.code.toUpperCase().trim(), description: formData.description || null,
      discount_type: formData.discount_type, discount_value: formData.discount_value,
      minimum_order_amount: formData.minimum_order_amount || 0,
      max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
      valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
      is_active: formData.is_active,
    };

    if (editingCoupon) {
      const { error } = await supabase.from("coupons").update(couponData).eq("id", editingCoupon.id);
      if (error) { toast({ title: "ত্রুটি", description: error.message, variant: "destructive" }); }
      else { toast({ title: "সফল", description: "কুপন আপডেট হয়েছে" }); setDialogOpen(false); resetForm(); invalidateCoupons(); }
    } else {
      const { error } = await supabase.from("coupons").insert(couponData);
      if (error) {
        if (error.code === "23505") { toast({ title: "কোড আছে", description: "এই কোড আগে ব্যবহার করা হয়েছে", variant: "destructive" }); }
        else { toast({ title: "ত্রুটি", description: error.message, variant: "destructive" }); }
      } else { toast({ title: "সফল", description: "নতুন কুপন তৈরি হয়েছে" }); setDialogOpen(false); resetForm(); invalidateCoupons(); }
    }
    setSaving(false);
  };

  const handleToggleActive = async (coupon: Coupon) => {
    const { error } = await supabase.from("coupons").update({ is_active: !coupon.is_active }).eq("id", coupon.id);
    if (error) { toast({ title: "ত্রুটি", description: error.message, variant: "destructive" }); }
    else { invalidateCoupons(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("এই কুপন মুছে ফেলতে চান?")) return;
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error) { toast({ title: "ত্রুটি", description: error.message, variant: "destructive" }); }
    else { toast({ title: "মুছে ফেলা হয়েছে", description: "কুপন সফলভাবে মুছে ফেলা হয়েছে" }); invalidateCoupons(); }
  };

  const isExpired = (date: string | null) => date ? new Date(date) < new Date() : false;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">কুপন ও ডিসকাউন্ট</h1>
            <p className="text-muted-foreground">প্রোমো কোড ম্যানেজ করুন</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" /> নতুন কুপন</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>{editingCoupon ? "কুপন সম্পাদনা" : "নতুন কুপন"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>কুপন কোড *</Label><Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="SAVE20" className="uppercase" /></div>
                <div><Label>বিবরণ</Label><Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="২০% ছাড় সব প্রোডাক্টে" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>ডিসকাউন্ট টাইপ</Label>
                    <Select value={formData.discount_type} onValueChange={(v) => setFormData({ ...formData, discount_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="percentage">শতাংশ (%)</SelectItem><SelectItem value="fixed">নির্দিষ্ট টাকা (৳)</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label>ডিসকাউন্ট মান *</Label><Input type="number" value={formData.discount_value} onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>ন্যূনতম অর্ডার (৳)</Label><Input type="number" value={formData.minimum_order_amount} onChange={(e) => setFormData({ ...formData, minimum_order_amount: parseFloat(e.target.value) || 0 })} /></div>
                  <div><Label>সর্বোচ্চ ব্যবহার</Label><Input type="number" value={formData.max_uses} onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })} /></div>
                </div>
                <div><Label>মেয়াদ শেষ</Label><Input type="date" value={formData.valid_until} onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })} /></div>
                <Button onClick={handleSubmit} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {editingCoupon ? "আপডেট করুন" : "কুপন তৈরি করুন"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <Tag className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">কোনো কুপন নেই</h3>
            <p className="text-muted-foreground mb-4">প্রথম কুপন তৈরি করুন</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>কোড</TableHead><TableHead>ডিসকাউন্ট</TableHead><TableHead>ন্যূনতম</TableHead>
                <TableHead>ব্যবহার</TableHead><TableHead>মেয়াদ</TableHead><TableHead>স্ট্যাটাস</TableHead>
                <TableHead className="text-right">অ্যাকশন</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell><div><span className="font-mono font-bold">{coupon.code}</span>{coupon.description && <p className="text-xs text-muted-foreground">{coupon.description}</p>}</div></TableCell>
                  <TableCell><Badge variant="outline">{coupon.discount_type === "percentage" ? `${coupon.discount_value}%` : `৳${coupon.discount_value}`}</Badge></TableCell>
                  <TableCell>{coupon.minimum_order_amount > 0 ? `৳${coupon.minimum_order_amount.toLocaleString()}` : "-"}</TableCell>
                  <TableCell>{coupon.current_uses}{coupon.max_uses && ` / ${coupon.max_uses}`}</TableCell>
                  <TableCell>{coupon.valid_until ? <span className={isExpired(coupon.valid_until) ? "text-destructive" : ""}>{new Date(coupon.valid_until).toLocaleDateString("bn-BD")}</span> : "-"}</TableCell>
                  <TableCell>
                    <button onClick={() => handleToggleActive(coupon)}>
                      {coupon.is_active ? <Badge className="bg-green-500 hover:bg-green-600">সক্রিয়</Badge> : <Badge variant="secondary">নিষ্ক্রিয়</Badge>}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(coupon)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(coupon.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </AdminLayout>
  );
};

export default Coupons;
