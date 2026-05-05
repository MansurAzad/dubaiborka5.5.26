import { useState, useMemo, useCallback } from "react";
import { Search, Phone, MapPin, ShieldBan, ShieldCheck, Users, UserCheck, UserX, Download, Pencil, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface UnifiedCustomer {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  created_at: string;
  type: "registered" | "guest";
  email: string | null;
}

interface BlockedUser {
  user_id: string;
  reason: string;
  is_active: boolean;
}

const Customers = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [blockDialog, setBlockDialog] = useState<{ open: boolean; userId: string; name: string }>({ open: false, userId: "", name: "" });
  const [blockReason, setBlockReason] = useState("");
  const [editDialog, setEditDialog] = useState<{ open: boolean; customer: UnifiedCustomer | null }>({ open: false, customer: null });
  const [editForm, setEditForm] = useState({ full_name: "", phone: "", address: "", city: "", email: "" });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; customer: UnifiedCustomer | null }>({ open: false, customer: null });
  const [addDialog, setAddDialog] = useState(false);
  const [addForm, setAddForm] = useState({ full_name: "", phone: "", address: "", city: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-customers-profiles"] });
    queryClient.invalidateQueries({ queryKey: ["admin-customers-guests"] });
  }, [queryClient]);

  // Fetch registered customers from profiles
  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ["admin-customers-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((p): UnifiedCustomer => ({
        id: p.id,
        user_id: p.user_id,
        full_name: p.full_name,
        phone: p.phone,
        address: p.address,
        city: p.city,
        created_at: p.created_at,
        type: "registered",
        email: null,
      }));
    },
    staleTime: 2 * 60 * 1000,
  });

  // Fetch guest customers from orders
  const { data: guestCustomers = [], isLoading: loadingGuests } = useQuery({
    queryKey: ["admin-customers-guests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, guest_name, guest_email, shipping_phone, shipping_address, shipping_city, created_at, is_guest")
        .eq("is_guest", true)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const phoneMap = new Map<string, UnifiedCustomer>();
      for (const o of data || []) {
        const phone = o.shipping_phone;
        if (!phoneMap.has(phone)) {
          phoneMap.set(phone, {
            id: `guest-${o.id}`,
            user_id: `guest-${phone}`,
            full_name: o.guest_name,
            phone,
            address: o.shipping_address,
            city: o.shipping_city,
            created_at: o.created_at,
            type: "guest",
            email: o.guest_email,
          });
        }
      }
      return Array.from(phoneMap.values());
    },
    staleTime: 2 * 60 * 1000,
  });

  const loading = loadingProfiles || loadingGuests;

  const allCustomers = useMemo(() => {
    const registeredPhones = new Set(profiles.filter(p => p.phone).map(p => p.phone));
    const uniqueGuests = guestCustomers.filter(g => !registeredPhones.has(g.phone));
    return [...profiles, ...uniqueGuests].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [profiles, guestCustomers]);

  const { data: blockedUsers = [] } = useQuery({
    queryKey: ["admin-blocked-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blocked_users")
        .select("user_id, reason, is_active")
        .eq("is_active", true);
      if (error) throw error;
      return (data || []) as BlockedUser[];
    },
    staleTime: 60 * 1000,
  });

  const blockedSet = useMemo(() => new Set(blockedUsers.map(b => b.user_id)), [blockedUsers]);

  // --- Mutations ---
  const blockMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const { error } = await supabase
        .from("blocked_users")
        .upsert({ user_id: userId, reason, is_active: true }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blocked-users"] });
      toast({ title: "✅ ইউজার ব্লক করা হয়েছে" });
      setBlockDialog({ open: false, userId: "", name: "" });
      setBlockReason("");
    },
    onError: () => toast({ title: "ব্লক করতে সমস্যা হয়েছে", variant: "destructive" }),
  });

  const unblockMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("blocked_users")
        .update({ is_active: false })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blocked-users"] });
      toast({ title: "✅ ইউজার আনব্লক করা হয়েছে" });
    },
    onError: () => toast({ title: "আনব্লক করতে সমস্যা হয়েছে", variant: "destructive" }),
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, type, data }: { id: string; type: string; data: Record<string, string> }) => {
      if (type === "registered") {
        const { error } = await supabase
          .from("profiles")
          .update({ full_name: data.full_name, phone: data.phone, address: data.address, city: data.city })
          .eq("id", id);
        if (error) throw error;
      } else {
        // Guest: update the order record
        const orderId = id.replace("guest-", "");
        const { error } = await supabase
          .from("orders")
          .update({
            guest_name: data.full_name,
            shipping_phone: data.phone,
            shipping_address: data.address,
            shipping_city: data.city,
            guest_email: data.email,
          })
          .eq("id", orderId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "✅ কাস্টমার আপডেট হয়েছে" });
      setEditDialog({ open: false, customer: null });
    },
    onError: () => toast({ title: "আপডেট করতে সমস্যা হয়েছে", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: string }) => {
      if (type === "registered") {
        const { error } = await supabase.from("profiles").delete().eq("id", id);
        if (error) throw error;
      } else {
        // For guest, we remove guest info from the order
        const orderId = id.replace("guest-", "");
        const { error } = await supabase
          .from("orders")
          .update({ guest_name: null, guest_email: null })
          .eq("id", orderId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "✅ কাস্টমার ডিলিট হয়েছে" });
      setDeleteDialog({ open: false, customer: null });
    },
    onError: () => toast({ title: "ডিলিট করতে সমস্যা হয়েছে", variant: "destructive" }),
  });

  const addMutation = useMutation({
    mutationFn: async (data: typeof addForm) => {
      // Create a manual order record to store guest customer info
      const { error } = await supabase.from("orders").insert({
        guest_name: data.full_name,
        shipping_phone: data.phone,
        shipping_address: data.address || "N/A",
        shipping_city: data.city || "N/A",
        total: 0,
        is_guest: true,
        status: "cancelled",
        notes: "ম্যানুয়ালি যোগ করা কাস্টমার",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "✅ নতুন কাস্টমার যোগ হয়েছে" });
      setAddDialog(false);
      setAddForm({ full_name: "", phone: "", address: "", city: "" });
    },
    onError: () => toast({ title: "কাস্টমার যোগ করতে সমস্যা হয়েছে", variant: "destructive" }),
  });

  // Filter by tab + search
  const filteredCustomers = useMemo(() => {
    let list = allCustomers;
    if (activeTab === "registered") list = list.filter(c => c.type === "registered");
    else if (activeTab === "guest") list = list.filter(c => c.type === "guest");
    else if (activeTab === "blocked") list = list.filter(c => blockedSet.has(c.user_id));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c =>
        c.full_name?.toLowerCase().includes(q) ||
        c.phone?.includes(searchQuery) ||
        c.city?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allCustomers, activeTab, searchQuery, blockedSet]);

  // --- Export CSV ---
  const exportCSV = useCallback(() => {
    const rows = filteredCustomers.map(c => ({
      নাম: c.full_name || "",
      ফোন: c.phone || "",
      ইমেইল: c.email || "",
      ঠিকানা: c.address || "",
      শহর: c.city || "",
      ধরন: c.type === "registered" ? "রেজিস্টার্ড" : "গেস্ট",
      ব্লকড: blockedSet.has(c.user_id) ? "হ্যাঁ" : "না",
      তারিখ: new Date(c.created_at).toLocaleDateString("bn-BD"),
    }));
    if (rows.length === 0) {
      toast({ title: "কোনো ডেটা নেই", variant: "destructive" });
      return;
    }
    const headers = Object.keys(rows[0]);
    const csv = "\uFEFF" + [headers.join(","), ...rows.map(r => headers.map(h => `"${(r as any)[h]}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `✅ ${rows.length}টি কাস্টমার এক্সপোর্ট হয়েছে` });
  }, [filteredCustomers, blockedSet, toast]);

  // --- Helpers ---
  const openEdit = (customer: UnifiedCustomer) => {
    setEditForm({
      full_name: customer.full_name || "",
      phone: customer.phone || "",
      address: customer.address || "",
      city: customer.city || "",
      email: customer.email || "",
    });
    setEditDialog({ open: true, customer });
  };

  const registeredCount = profiles.length;
  const guestCount = allCustomers.filter(c => c.type === "guest").length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Customers</h1>
            <p className="text-muted-foreground">সব রেজিস্টার্ড ও গেস্ট কাস্টমার দেখুন</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-1.5" onClick={() => setAddDialog(true)}>
              <Plus className="w-4 h-4" />ম্যানুয়াল যোগ
            </Button>
            <Button variant="outline" className="gap-1.5" onClick={exportCSV}>
              <Download className="w-4 h-4" />CSV এক্সপোর্ট
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">মোট কাস্টমার</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{allCustomers.length}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">রেজিস্টার্ড</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-primary">{registeredCount}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">গেস্ট</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-muted-foreground">{guestCount}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">ব্লকড</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-destructive">{blockedUsers.length}</div></CardContent></Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="all" className="gap-1.5"><Users className="w-3.5 h-3.5" />সব ({allCustomers.length})</TabsTrigger>
            <TabsTrigger value="registered" className="gap-1.5"><UserCheck className="w-3.5 h-3.5" />রেজিস্টার্ড ({registeredCount})</TabsTrigger>
            <TabsTrigger value="guest" className="gap-1.5"><UserX className="w-3.5 h-3.5" />গেস্ট ({guestCount})</TabsTrigger>
            <TabsTrigger value="blocked" className="gap-1.5"><ShieldBan className="w-3.5 h-3.5" />ব্লকড ({blockedUsers.length})</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-4 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="নাম, ফোন, শহর, ইমেইল দিয়ে খুঁজুন..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
          </div>

          {["all", "registered", "guest", "blocked"].map(tabValue => (
            <TabsContent key={tabValue} value={tabValue} className="mt-4">
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>নাম</TableHead>
                      <TableHead>যোগাযোগ</TableHead>
                      <TableHead>ঠিকানা</TableHead>
                      <TableHead>ধরন</TableHead>
                      <TableHead>তারিখ</TableHead>
                      <TableHead className="text-right">অ্যাকশন</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
                    ) : filteredCustomers.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">কোনো কাস্টমার পাওয়া যায়নি</TableCell></TableRow>
                    ) : (
                      filteredCustomers.map((customer) => {
                        const isBlocked = blockedSet.has(customer.user_id);
                        return (
                          <TableRow key={customer.id} className={isBlocked ? "bg-destructive/5" : ""}>
                            <TableCell>
                              <div className="font-medium">{customer.full_name || "নাম দেওয়া হয়নি"}</div>
                              {customer.email && <div className="text-xs text-muted-foreground">{customer.email}</div>}
                            </TableCell>
                            <TableCell>
                              {customer.phone ? (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground"><Phone className="w-3 h-3" />{customer.phone}</div>
                              ) : <span className="text-muted-foreground">-</span>}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {customer.address && <div className="truncate max-w-[200px]">{customer.address}</div>}
                                {customer.city && <div className="flex items-center gap-1 text-muted-foreground"><MapPin className="w-3 h-3" />{customer.city}</div>}
                                {!customer.address && !customer.city && <span className="text-muted-foreground">-</span>}
                              </div>
                            </TableCell>
                            <TableCell>
                              {isBlocked ? (
                                <Badge variant="destructive" className="gap-1"><ShieldBan className="w-3 h-3" />ব্লকড</Badge>
                              ) : customer.type === "guest" ? (
                                <Badge variant="outline" className="gap-1"><UserX className="w-3 h-3" />গেস্ট</Badge>
                              ) : (
                                <Badge variant="secondary" className="gap-1"><UserCheck className="w-3 h-3" />রেজিস্টার্ড</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">{new Date(customer.created_at).toLocaleDateString("bn-BD")}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(customer)} title="এডিট">
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteDialog({ open: true, customer })} title="ডিলিট">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                                {customer.type === "registered" && (
                                  isBlocked ? (
                                    <Button size="sm" variant="outline" className="gap-1 h-8 text-xs" onClick={() => unblockMutation.mutate(customer.user_id)} disabled={unblockMutation.isPending}>
                                      <ShieldCheck className="w-3 h-3" />আনব্লক
                                    </Button>
                                  ) : (
                                    <Button size="sm" variant="destructive" className="gap-1 h-8 text-xs" onClick={() => setBlockDialog({ open: true, userId: customer.user_id, name: customer.full_name || "Unknown" })}>
                                      <ShieldBan className="w-3 h-3" />ব্লক
                                    </Button>
                                  )
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Block Reason Dialog */}
      <Dialog open={blockDialog.open} onOpenChange={(open) => { if (!open) setBlockDialog({ open: false, userId: "", name: "" }); }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldBan className="w-5 h-5 text-destructive" />ইউজার ব্লক করুন</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground"><strong>{blockDialog.name}</strong> কে ব্লক করতে চাইছেন? ব্লক করার কারণ লিখুন:</p>
          <div className="space-y-2">
            <Label>কারণ</Label>
            <Textarea placeholder="ব্লক করার কারণ লিখুন..." value={blockReason} onChange={(e) => setBlockReason(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialog({ open: false, userId: "", name: "" })}>বাতিল</Button>
            <Button variant="destructive" onClick={() => blockMutation.mutate({ userId: blockDialog.userId, reason: blockReason || "আপনার অ্যাকাউন্ট সাময়িকভাবে বন্ধ করা হয়েছে।" })} disabled={blockMutation.isPending}>
              {blockMutation.isPending ? "ব্লক হচ্ছে..." : "ব্লক করুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => { if (!open) setEditDialog({ open: false, customer: null }); }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Pencil className="w-5 h-5 text-primary" />কাস্টমার এডিট</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>নাম *</Label><Input value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} /></div>
            <div><Label>ফোন *</Label><Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div><Label>ঠিকানা</Label><Input value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} /></div>
            <div><Label>শহর</Label><Input value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} /></div>
            {editDialog.customer?.type === "guest" && (
              <div><Label>ইমেইল</Label><Input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, customer: null })}>বাতিল</Button>
            <Button
              onClick={() => {
                if (!editForm.full_name || !editForm.phone) {
                  toast({ title: "নাম ও ফোন আবশ্যক", variant: "destructive" });
                  return;
                }
                editMutation.mutate({ id: editDialog.customer!.id, type: editDialog.customer!.type, data: editForm });
              }}
              disabled={editMutation.isPending}
            >
              {editMutation.isPending ? "সেভ হচ্ছে..." : "সেভ করুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => { if (!open) setDeleteDialog({ open: false, customer: null }); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>কাস্টমার ডিলিট করুন</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteDialog.customer?.full_name || "এই কাস্টমার"}</strong> কে ডিলিট করতে চাইছেন? এটি আর ফেরত আনা যাবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteDialog.customer) {
                  deleteMutation.mutate({ id: deleteDialog.customer.id, type: deleteDialog.customer.type });
                }
              }}
            >
              {deleteMutation.isPending ? "ডিলিট হচ্ছে..." : "ডিলিট করুন"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Customer Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5 text-primary" />নতুন কাস্টমার যোগ করুন</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>নাম *</Label><Input value={addForm.full_name} onChange={e => setAddForm(f => ({ ...f, full_name: e.target.value }))} placeholder="কাস্টমারের নাম" /></div>
            <div><Label>ফোন *</Label><Input value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} placeholder="01XXXXXXXXX" /></div>
            <div><Label>ঠিকানা (ঐচ্ছিক)</Label><Input value={addForm.address} onChange={e => setAddForm(f => ({ ...f, address: e.target.value }))} placeholder="ঠিকানা" /></div>
            <div><Label>শহর (ঐচ্ছিক)</Label><Input value={addForm.city} onChange={e => setAddForm(f => ({ ...f, city: e.target.value }))} placeholder="শহর" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>বাতিল</Button>
            <Button
              onClick={() => {
                if (!addForm.full_name || !addForm.phone) {
                  toast({ title: "নাম ও ফোন আবশ্যক", variant: "destructive" });
                  return;
                }
                addMutation.mutate(addForm);
              }}
              disabled={addMutation.isPending}
            >
              {addMutation.isPending ? "যোগ হচ্ছে..." : "যোগ করুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Customers;
