import { useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SocialProofMessage {
  id: string;
  message: string;
  product_name: string;
  city: string;
  time_ago: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

const emptyForm = {
  message: "কেউ একজন {product} কিনেছেন!",
  product_name: "",
  city: "ঢাকা",
  time_ago: "কিছুক্ষণ আগে",
  is_active: true,
  display_order: 0,
};

const SocialProofMessages = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SocialProofMessage | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["social-proof-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_proof_messages")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data || []) as SocialProofMessage[];
    },
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["social-proof-messages"] });
  }, [queryClient]);

  const openCreate = () => {
    setEditing(null);
    setFormData(emptyForm);
    setIsDialogOpen(true);
  };

  const openEdit = (msg: SocialProofMessage) => {
    setEditing(msg);
    setFormData({
      message: msg.message,
      product_name: msg.product_name,
      city: msg.city,
      time_ago: msg.time_ago,
      is_active: msg.is_active,
      display_order: msg.display_order,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_name.trim()) {
      toast({ title: "ত্রুটি", description: "প্রোডাক্টের নাম দিন", variant: "destructive" });
      return;
    }

    const payload = {
      message: formData.message,
      product_name: formData.product_name.trim(),
      city: formData.city.trim(),
      time_ago: formData.time_ago.trim(),
      is_active: formData.is_active,
      display_order: formData.display_order,
    };

    if (editing) {
      const { error } = await supabase.from("social_proof_messages").update(payload).eq("id", editing.id);
      if (error) {
        toast({ title: "ত্রুটি", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "সফল", description: "মেসেজ আপডেট হয়েছে" });
        invalidate();
        setIsDialogOpen(false);
      }
    } else {
      const { error } = await supabase.from("social_proof_messages").insert(payload);
      if (error) {
        toast({ title: "ত্রুটি", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "সফল", description: "মেসেজ যুক্ত হয়েছে" });
        invalidate();
        setIsDialogOpen(false);
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("social_proof_messages").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "ত্রুটি", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "সফল", description: "মেসেজ ডিলিট হয়েছে" });
      invalidate();
    }
    setDeleteId(null);
  };

  const toggleActive = async (msg: SocialProofMessage) => {
    const { error } = await supabase.from("social_proof_messages").update({ is_active: !msg.is_active }).eq("id", msg.id);
    if (!error) invalidate();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2">
              <ShoppingBag className="w-8 h-8 text-primary" /> Social Proof Messages
            </h1>
            <p className="text-muted-foreground">"কেউ একজন ... কিনেছেন!" নোটিফিকেশন ম্যানেজ করুন</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> নতুন মেসেজ
          </Button>
        </div>

        {/* Preview */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm max-w-xs">
          <p className="text-xs text-muted-foreground mb-2">প্রিভিউ:</p>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-foreground">
                কেউ একজন <strong className="text-primary">শিফন হিজাব</strong> কিনেছেন!
              </p>
              <p className="text-xs text-muted-foreground mt-1">📍 ঢাকা • কিছুক্ষণ আগে</p>
            </div>
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>প্রোডাক্ট</TableHead>
                <TableHead>মেসেজ</TableHead>
                <TableHead>শহর</TableHead>
                <TableHead>সময়</TableHead>
                <TableHead>স্ট্যাটাস</TableHead>
                <TableHead>অর্ডার</TableHead>
                <TableHead className="text-right">অ্যাকশন</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
              ) : messages.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">কোনো মেসেজ নেই। নতুন যুক্ত করুন।</TableCell></TableRow>
              ) : (
                messages.map((msg) => (
                  <TableRow key={msg.id}>
                    <TableCell className="font-medium">{msg.product_name}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{msg.message}</TableCell>
                    <TableCell>{msg.city}</TableCell>
                    <TableCell>{msg.time_ago}</TableCell>
                    <TableCell>
                      <Badge
                        variant={msg.is_active ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => toggleActive(msg)}
                      >
                        {msg.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}
                      </Badge>
                    </TableCell>
                    <TableCell>{msg.display_order}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(msg)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(msg.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "মেসেজ এডিট" : "নতুন মেসেজ যুক্ত"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>প্রোডাক্টের নাম *</Label>
              <Input value={formData.product_name} onChange={e => setFormData({ ...formData, product_name: e.target.value })} placeholder="শিফন হিজাব" required />
            </div>
            <div className="space-y-2">
              <Label>মেসেজ টেমপ্লেট</Label>
              <Input value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} placeholder="কেউ একজন {product} কিনেছেন!" />
              <p className="text-xs text-muted-foreground">{"{product}"} লিখলে প্রোডাক্টের নাম বসবে</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>শহর</Label>
                <Input value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} placeholder="ঢাকা" />
              </div>
              <div className="space-y-2">
                <Label>সময়</Label>
                <Input value={formData.time_ago} onChange={e => setFormData({ ...formData, time_ago: e.target.value })} placeholder="কিছুক্ষণ আগে" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ক্রম (Display Order)</Label>
                <Input type="number" value={formData.display_order} onChange={e => setFormData({ ...formData, display_order: Number(e.target.value) })} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={formData.is_active} onCheckedChange={v => setFormData({ ...formData, is_active: v })} />
                <Label>সক্রিয়</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>বাতিল</Button>
              <Button type="submit">{editing ? "আপডেট" : "যুক্ত করুন"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>মেসেজ ডিলিট করবেন?</AlertDialogTitle>
            <AlertDialogDescription>এই মেসেজটি স্থায়ীভাবে মুছে যাবে।</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">ডিলিট</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default SocialProofMessages;
