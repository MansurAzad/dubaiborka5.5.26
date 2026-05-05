import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, MapPin, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface SavedAddress {
  id: string;
  label: string;
  full_name: string;
  phone: string;
  address: string;
  city: string;
  district: string | null;
  postal_code: string | null;
  is_default: boolean;
}

const emptyForm = { label: "Home", full_name: "", phone: "", address: "", city: "", district: "", postal_code: "" };

const AddressBook = () => {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SavedAddress | null>(null);
  const [form, setForm] = useState(emptyForm);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchAddresses = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("saved_addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false });
    setAddresses((data as SavedAddress[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAddresses(); }, [user]);

  const handleSave = async () => {
    if (!user || !form.full_name || !form.phone || !form.address || !form.city) {
      toast({ title: "সব ফিল্ড পূরণ করুন", variant: "destructive" });
      return;
    }

    const payload = { ...form, user_id: user.id, is_default: addresses.length === 0 };

    if (editing) {
      const { error } = await supabase.from("saved_addresses").update(form).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("saved_addresses").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    }

    toast({ title: editing ? "অ্যাড্রেস আপডেট হয়েছে" : "নতুন অ্যাড্রেস যোগ হয়েছে" });
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm);
    fetchAddresses();
  };

  const handleSetDefault = async (id: string) => {
    if (!user) return;
    await supabase.from("saved_addresses").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("saved_addresses").update({ is_default: true }).eq("id", id);
    fetchAddresses();
    toast({ title: "ডিফল্ট অ্যাড্রেস সেট হয়েছে" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("এই অ্যাড্রেস মুছে ফেলতে চান?")) return;
    await supabase.from("saved_addresses").delete().eq("id", id);
    fetchAddresses();
    toast({ title: "অ্যাড্রেস মুছে ফেলা হয়েছে" });
  };

  const openEdit = (addr: SavedAddress) => {
    setEditing(addr);
    setForm({ label: addr.label, full_name: addr.full_name, phone: addr.phone, address: addr.address, city: addr.city, district: addr.district || "", postal_code: addr.postal_code || "" });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" /> সেভ করা অ্যাড্রেস
        </h3>
        <Button size="sm" onClick={() => { setEditing(null); setForm(emptyForm); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> নতুন অ্যাড্রেস
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">{[1, 2].map(i => <div key={i} className="h-24 bg-muted rounded-xl" />)}</div>
      ) : addresses.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MapPin className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>কোনো সেভ করা অ্যাড্রেস নেই</p>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <div key={addr.id} className="card-luxury flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-foreground">{addr.label}</span>
                  {addr.is_default && <Badge variant="secondary" className="text-xs">ডিফল্ট</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {addr.full_name} • {addr.phone}<br />
                  {addr.address}, {addr.city}{addr.district ? `, ${addr.district}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!addr.is_default && (
                  <Button variant="ghost" size="icon" onClick={() => handleSetDefault(addr.id)} title="ডিফল্ট সেট করুন">
                    <Check className="w-4 h-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => openEdit(addr)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(addr.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "অ্যাড্রেস এডিট" : "নতুন অ্যাড্রেস যোগ করুন"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>লেবেল</Label><Input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="Home / Office" className="mt-1" /></div>
              <div><Label>নাম *</Label><Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="পূর্ণ নাম" className="mt-1" /></div>
            </div>
            <div><Label>ফোন *</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="01XXXXXXXXX" className="mt-1" /></div>
            <div><Label>ঠিকানা *</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="বাসা/রোড/এলাকা" className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>শহর *</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Dhaka" className="mt-1" /></div>
              <div><Label>জেলা</Label><Input value={form.district} onChange={e => setForm({ ...form, district: e.target.value })} placeholder="Dhaka" className="mt-1" /></div>
            </div>
            <Button onClick={handleSave} className="w-full">{editing ? "আপডেট করুন" : "সেভ করুন"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddressBook;
