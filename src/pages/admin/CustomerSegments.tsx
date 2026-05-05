import { useState, useEffect } from "react";
import { Users, Plus, Trash2, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Segment {
  id: string;
  name: string;
  description: string | null;
  criteria: Record<string, unknown>;
  created_at: string;
}

const CustomerSegments = () => {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [criteriaType, setCriteriaType] = useState("order_count");
  const [criteriaValue, setCriteriaValue] = useState("");
  const { toast } = useToast();

  const fetchSegments = async () => {
    const { data } = await supabase
      .from("customer_segments")
      .select("*")
      .order("created_at", { ascending: false });
    setSegments((data as Segment[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchSegments(); }, []);

  const handleCreate = async () => {
    if (!name) return;
    const criteria = { type: criteriaType, value: criteriaValue };
    const { error } = await supabase
      .from("customer_segments")
      .insert({ name, description: description || null, criteria });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "সেগমেন্ট তৈরি হয়েছে" });
      setOpen(false);
      setName("");
      setDescription("");
      fetchSegments();
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("customer_segments").delete().eq("id", id);
    toast({ title: "সেগমেন্ট মুছে ফেলা হয়েছে" });
    fetchSegments();
  };

  const criteriaLabels: Record<string, string> = {
    order_count: "Total Orders ≥",
    total_spent: "Total Spent ≥ ৳",
    city: "City",
    new_customer: "New Customers (last 30 days)",
    inactive: "Inactive (90+ days)",
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Customer Segments</h1>
            <p className="text-muted-foreground">কাস্টমার গ্রুপিং ও টার্গেটেড অফার</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="btn-gold">
                <Plus className="w-4 h-4 mr-2" />
                নতুন সেগমেন্ট
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>নতুন কাস্টমার সেগমেন্ট</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>নাম</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VIP Customers" className="mt-1.5" />
                </div>
                <div>
                  <Label>বিবরণ</Label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" className="mt-1.5" />
                </div>
                <div>
                  <Label>Criteria Type</Label>
                  <Select value={criteriaType} onValueChange={setCriteriaType}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(criteriaLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!["new_customer", "inactive"].includes(criteriaType) && (
                  <div>
                    <Label>Value</Label>
                    <Input value={criteriaValue} onChange={(e) => setCriteriaValue(e.target.value)} placeholder="Enter value" className="mt-1.5" />
                  </div>
                )}
                <Button onClick={handleCreate} className="w-full btn-gold">তৈরি করুন</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />)}
          </div>
        ) : segments.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>কোনো সেগমেন্ট তৈরি হয়নি</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {segments.map((seg) => (
              <Card key={seg.id}>
                <CardHeader className="pb-2 flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Tag className="w-4 h-4 text-primary" />
                      {seg.name}
                    </CardTitle>
                    {seg.description && (
                      <p className="text-sm text-muted-foreground mt-1">{seg.description}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(seg.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground">
                    Criteria: {(seg.criteria as any)?.type} = {(seg.criteria as any)?.value || "auto"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Created: {new Date(seg.created_at).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default CustomerSegments;
