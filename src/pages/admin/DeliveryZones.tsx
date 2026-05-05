import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MapPin, Plus, Pencil, Trash2 } from "lucide-react";

interface DeliveryZone {
  id: string;
  zone_name: string;
  city: string;
  areas: string[];
  shipping_charge: number;
  estimated_days: number;
  is_active: boolean;
}

const DeliveryZones = () => {
  const queryClient = useQueryClient();
  const [editZone, setEditZone] = useState<DeliveryZone | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ zone_name: "", city: "", areas: "", shipping_charge: 0, estimated_days: 3, is_active: true });

  const { data: zones = [], isLoading } = useQuery({
    queryKey: ["delivery-zones"],
    queryFn: async () => {
      const { data, error } = await supabase.from("delivery_zones").select("*").order("city");
      if (error) throw error;
      return data as DeliveryZone[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form & { id?: string }) => {
      const payload = {
        zone_name: values.zone_name,
        city: values.city,
        areas: values.areas.split(",").map(a => a.trim()).filter(Boolean),
        shipping_charge: values.shipping_charge,
        estimated_days: values.estimated_days,
        is_active: values.is_active,
      };
      if (values.id) {
        const { error } = await supabase.from("delivery_zones").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("delivery_zones").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-zones"] });
      toast.success(editZone ? "Zone updated" : "Zone created");
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("delivery_zones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-zones"] });
      toast.success("Zone deleted");
    },
  });

  const resetForm = () => {
    setForm({ zone_name: "", city: "", areas: "", shipping_charge: 0, estimated_days: 3, is_active: true });
    setEditZone(null);
    setShowForm(false);
  };

  const openEdit = (z: DeliveryZone) => {
    setEditZone(z);
    setForm({ zone_name: z.zone_name, city: z.city, areas: (z.areas || []).join(", "), shipping_charge: z.shipping_charge, estimated_days: z.estimated_days, is_active: z.is_active });
    setShowForm(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Delivery Zones</h1>
            <p className="text-muted-foreground">Manage city/area-based shipping charges</p>
          </div>
          <Button onClick={() => { resetForm(); setShowForm(true); }}><Plus className="w-4 h-4 mr-2" />Add Zone</Button>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zone</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Areas</TableHead>
                <TableHead>Charge</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : zones.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No delivery zones configured</TableCell></TableRow>
              ) : zones.map(z => (
                <TableRow key={z.id}>
                  <TableCell className="font-medium">{z.zone_name}</TableCell>
                  <TableCell>{z.city}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{(z.areas || []).join(", ") || "All areas"}</TableCell>
                  <TableCell className="font-semibold">৳{Number(z.shipping_charge).toLocaleString()}</TableCell>
                  <TableCell>{z.estimated_days} days</TableCell>
                  <TableCell><span className={`text-xs px-2 py-1 rounded-full ${z.is_active ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}>{z.is_active ? "Active" : "Inactive"}</span></TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(z)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(z.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Dialog open={showForm} onOpenChange={() => resetForm()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editZone ? "Edit Zone" : "Add Delivery Zone"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Zone Name</Label><Input value={form.zone_name} onChange={e => setForm({ ...form, zone_name: e.target.value })} placeholder="Inside Dhaka" className="mt-1" /></div>
                <div><Label>City</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Dhaka" className="mt-1" /></div>
              </div>
              <div><Label>Areas (comma separated)</Label><Input value={form.areas} onChange={e => setForm({ ...form, areas: e.target.value })} placeholder="Gulshan, Banani, Dhanmondi..." className="mt-1" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Shipping Charge (৳)</Label><Input type="number" value={form.shipping_charge} onChange={e => setForm({ ...form, shipping_charge: Number(e.target.value) })} className="mt-1" /></div>
                <div><Label>Estimated Days</Label><Input type="number" value={form.estimated_days} onChange={e => setForm({ ...form, estimated_days: Number(e.target.value) })} className="mt-1" /></div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={c => setForm({ ...form, is_active: c })} />
                <Label>Active</Label>
              </div>
              <Button className="w-full" onClick={() => saveMutation.mutate({ ...form, id: editZone?.id })} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editZone ? "Update Zone" : "Create Zone"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default DeliveryZones;
