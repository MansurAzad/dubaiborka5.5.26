import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Truck, RefreshCw, CheckCircle, Send, Wallet, ExternalLink, Edit, Zap, Copy } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Shipment {
  id: string;
  order_id: string;
  consignment_id: string | null;
  tracking_code: string | null;
  invoice: string | null;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  cod_amount: number;
  cod_paid_amount: number;
  cod_payment_status: string;
  cod_settled_at: string | null;
  delivery_status: string | null;
  status: string;
  admin_approved: boolean;
  submitted_at: string | null;
  last_synced_at: string | null;
  error_message: string | null;
  created_at: string;
  note: string | null;
}

const statusBadge = (s: string | null) => {
  if (!s) return <Badge variant="outline">—</Badge>;
  const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "outline",
    submitted: "secondary",
    in_review: "secondary",
    delivered: "default",
    cancelled: "destructive",
    delivery_failed: "destructive",
    lost: "destructive",
    hold: "secondary",
    partial_delivered: "secondary",
  };
  return <Badge variant={map[s] || "outline"}>{s}</Badge>;
};

const AutomationCard = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: rows } = useQuery({
    queryKey: ["courier-automation-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("key,value")
        .in("key", ["courier_auto_approve", "courier_auto_submit", "courier_webhook_secret"]);
      return data || [];
    },
  });
  const get = (k: string) => rows?.find((r) => r.key === k)?.value as any;
  const autoApprove = !!get("courier_auto_approve")?.enabled;
  const autoSubmit = !!get("courier_auto_submit")?.enabled;
  const webhookSecret = get("courier_webhook_secret")?.secret as string | undefined;
  const projectRef = "izeabmhtxtrelfqgkuua";
  const webhookUrl = webhookSecret
    ? `https://${projectRef}.supabase.co/functions/v1/steadfast-webhook?secret=${webhookSecret}`
    : "";

  const setFlag = async (key: string, enabled: boolean) => {
    const { error } = await supabase
      .from("system_settings")
      .upsert({ key, value: { enabled }, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) {
      toast({ title: "ব্যর্থ", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "✓ আপডেট হয়েছে", description: `${key} = ${enabled ? "ON" : "OFF"}` });
    qc.invalidateQueries({ queryKey: ["courier-automation-settings"] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" /> অটোমেশন কন্ট্রোল
        </CardTitle>
        <CardDescription>
          Order confirmed → শিপমেন্ট তৈরি → Steadfast সাবমিট → স্ট্যাটাস সিঙ্ক — সম্পূর্ণ ফ্লো অটোমেট করুন।
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg border">
          <div>
            <Label className="text-base">Auto Approve</Label>
            <p className="text-xs text-muted-foreground">
              নতুন কনফার্মড অর্ডার সরাসরি admin-approved হিসেবে চিহ্নিত হবে।
            </p>
          </div>
          <Switch checked={autoApprove} onCheckedChange={(v) => setFlag("courier_auto_approve", v)} />
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg border">
          <div>
            <Label className="text-base">Auto Submit to Steadfast</Label>
            <p className="text-xs text-muted-foreground">
              Auto Approve হলে সাথে সাথেই Steadfast-এ জমা হবে। ভুল রোধে toggle off রাখুন।
            </p>
          </div>
          <Switch
            checked={autoSubmit}
            disabled={!autoApprove}
            onCheckedChange={(v) => setFlag("courier_auto_submit", v)}
          />
        </div>
        {!autoApprove && autoSubmit === false && (
          <Alert>
            <AlertDescription className="text-xs">
              Auto Submit ব্যবহার করতে আগে Auto Approve চালু করুন।
            </AlertDescription>
          </Alert>
        )}
        {webhookUrl && (
          <div className="space-y-2 p-3 rounded-lg border bg-muted/40">
            <Label className="text-sm">Steadfast Webhook URL</Label>
            <p className="text-xs text-muted-foreground">
              এই URL টি Steadfast portal-এর webhook সেটিংসে পেস্ট করুন। প্রতিটি স্ট্যাটাস আপডেট সরাসরি এখানে আসবে।
            </p>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="font-mono text-xs" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(webhookUrl);
                  toast({ title: "✓ কপি হয়েছে" });
                }}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const SteadfastCourier = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [editing, setEditing] = useState<Shipment | null>(null);
  const [errorDetail, setErrorDetail] = useState<{ title: string; message: string; shipmentId?: string } | null>(null);
  const [bulkResults, setBulkResults] = useState<Array<{ id: string; ok: boolean; error?: string; status?: string }> | null>(null);

  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ["courier-shipments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courier_shipments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as Shipment[];
    },
  });

  const callApi = async (action: string, shipment_id?: string) => {
    const { data, error } = await supabase.functions.invoke(
      "steadfast-courier",
      { body: { action, shipment_id } },
    );
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const checkBalance = async () => {
    setBusy("balance");
    try {
      const data = await callApi("get_balance");
      setBalance(data?.current_balance ?? null);
      toast({ title: "ব্যালেন্স", description: `৳ ${data?.current_balance ?? "—"}` });
    } catch (e) {
      toast({
        title: "ব্যর্থ",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const approve = async (id: string) => {
    setBusy(id);
    try {
      const data = await callApi("approve", id);
      toast({
        title: data?.auto_submitted ? "✓ Approve + Submit সম্পন্ন" : "✓ অনুমোদিত",
        description: data?.auto_submitted
          ? "Steadfast-এ স্বয়ংক্রিয়ভাবে সাবমিট হয়েছে"
          : "এখন Submit চাপুন বা auto-submit চালু করুন",
      });
      qc.invalidateQueries({ queryKey: ["courier-shipments"] });
    } catch (e) {
      toast({
        title: "ব্যর্থ",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const bulkSync = async () => {
    setBusy("bulk");
    setBulkResults(null);
    try {
      const data = await callApi("bulk_sync");
      const results = (data?.results || []) as Array<{ id: string; ok: boolean; error?: string; status?: string }>;
      setBulkResults(results);
      const failed = data?.failed || 0;
      toast({
        title: failed > 0 ? `⚠ ${data?.synced} সফল, ${failed} ব্যর্থ` : "✓ Bulk Sync সম্পন্ন",
        description: `${data?.synced || 0} শিপমেন্ট আপডেট হয়েছে`,
        variant: failed > 0 ? "destructive" : "default",
      });
      qc.invalidateQueries({ queryKey: ["courier-shipments"] });
    } catch (e) {
      setErrorDetail({ title: "Bulk Sync ব্যর্থ", message: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const submit = async (id: string) => {
    setBusy(id);
    try {
      await callApi("submit_order", id);
      toast({ title: "✓ Steadfast-এ সাবমিট হয়েছে" });
      qc.invalidateQueries({ queryKey: ["courier-shipments"] });
    } catch (e) {
      setErrorDetail({ title: "সাবমিট ব্যর্থ", message: (e as Error).message, shipmentId: id });
    } finally {
      setBusy(null);
    }
  };

  const sync = async (id: string) => {
    setBusy(id);
    try {
      await callApi("sync_status", id);
      toast({ title: "✓ স্ট্যাটাস আপডেট" });
      qc.invalidateQueries({ queryKey: ["courier-shipments"] });
    } catch (e) {
      setErrorDetail({ title: "সিঙ্ক ব্যর্থ", message: (e as Error).message, shipmentId: id });
    } finally {
      setBusy(null);
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    setBusy(editing.id);
    try {
      const { error } = await supabase
        .from("courier_shipments")
        .update({
          recipient_name: editing.recipient_name,
          recipient_phone: editing.recipient_phone,
          recipient_address: editing.recipient_address,
          cod_amount: editing.cod_amount,
          note: editing.note,
        })
        .eq("id", editing.id);
      if (error) throw error;
      toast({ title: "✓ আপডেট হয়েছে" });
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["courier-shipments"] });
    } catch (e) {
      toast({
        title: "ব্যর্থ",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const filterBy = (status: string) =>
    shipments.filter((s) => {
      if (status === "all") return true;
      if (status === "pending") return s.status === "pending";
      if (status === "submitted") return s.status === "submitted";
      if (status === "delivered") return s.delivery_status === "delivered";
      if (status === "issues")
        return ["cancelled", "delivery_failed", "lost"].includes(
          s.delivery_status || "",
        );
      return true;
    });

  const renderTable = (rows: Shipment[]) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice / Order</TableHead>
            <TableHead>Recipient</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>COD / Settlement</TableHead>
            <TableHead>Steadfast Tracking</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                কোনো শিপমেন্ট নেই
              </TableCell>
            </TableRow>
          ) : (
            rows.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <div className="font-medium text-sm">{s.invoice || "—"}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.order_id.slice(0, 8)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium">{s.recipient_name}</div>
                  <div className="text-xs text-muted-foreground">{s.recipient_phone}</div>
                </TableCell>
                <TableCell className="max-w-[220px]">
                  <p className="text-xs whitespace-normal">{s.recipient_address}</p>
                </TableCell>
                <TableCell>
                  <div className="font-medium">৳ {s.cod_amount}</div>
                  <Badge
                    variant={
                      s.cod_payment_status === "paid"
                        ? "default"
                        : s.cod_payment_status === "partial"
                        ? "secondary"
                        : "outline"
                    }
                    className="text-[10px] mt-1"
                  >
                    {s.cod_payment_status === "paid"
                      ? `Paid ৳${s.cod_paid_amount}`
                      : s.cod_payment_status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {s.tracking_code ? (
                    <div>
                      <div className="font-mono text-xs">{s.tracking_code}</div>
                      <div className="text-xs text-muted-foreground">
                        CID: {s.consignment_id}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {statusBadge(s.status)}
                    {s.delivery_status && statusBadge(s.delivery_status)}
                    {s.admin_approved && s.status === "pending" && (
                      <Badge variant="default" className="text-[10px]">Approved</Badge>
                    )}
                    {s.error_message && (
                      <button
                        type="button"
                        onClick={() => setErrorDetail({ title: "শিপমেন্টে ত্রুটি", message: s.error_message!, shipmentId: s.id })}
                        className="inline-flex items-center text-[10px] text-destructive underline underline-offset-2 text-left"
                        title="Click to view error"
                      >
                        ⚠ Error – বিস্তারিত
                      </button>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing(s)}
                    disabled={!!busy}
                    title="Edit"
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  {!s.admin_approved && s.status === "pending" && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => approve(s.id)}
                      disabled={busy === s.id}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />Approve
                    </Button>
                  )}
                  {s.admin_approved && s.status === "pending" && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => submit(s.id)}
                      disabled={busy === s.id}
                    >
                      <Send className="w-3 h-3 mr-1" />Submit
                    </Button>
                  )}
                  {s.consignment_id && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sync(s.id)}
                      disabled={busy === s.id}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />Sync
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-3">
              <Truck className="w-8 h-8 text-primary" /> Steadfast Courier
            </h1>
            <p className="text-muted-foreground">
              অর্ডার confirm হলে অটো শিপমেন্ট তৈরি হয়। Approve → Submit → Steadfast থেকে স্ট্যাটাস সিঙ্ক।
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={checkBalance} disabled={busy === "balance"}>
              <Wallet className="w-4 h-4 mr-2" />
              ব্যালেন্স {balance !== null && `৳ ${balance}`}
            </Button>
            <Button
              variant="default"
              onClick={bulkSync}
              disabled={busy === "bulk"}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${busy === "bulk" ? "animate-spin" : ""}`} />
              সব Sync করুন
            </Button>
            <Button variant="outline" asChild>
              <a
                href="https://portal.packzy.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4 mr-2" />Portal
              </a>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>শিপমেন্ট পাইপলাইন</CardTitle>
            <CardDescription>
              Pending → Approve (Admin) → Submit (Steadfast) → Sync স্ট্যাটাস
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending">
              <TabsList className="grid grid-cols-5 w-full max-w-2xl">
                <TabsTrigger value="pending">
                  Pending ({filterBy("pending").length})
                </TabsTrigger>
                <TabsTrigger value="submitted">
                  Submitted ({filterBy("submitted").length})
                </TabsTrigger>
                <TabsTrigger value="delivered">
                  Delivered ({filterBy("delivered").length})
                </TabsTrigger>
                <TabsTrigger value="issues">
                  Issues ({filterBy("issues").length})
                </TabsTrigger>
                <TabsTrigger value="all">All ({shipments.length})</TabsTrigger>
              </TabsList>
              {(["pending", "submitted", "delivered", "issues", "all"] as const).map((t) => (
                <TabsContent key={t} value={t} className="mt-4">
                  {isLoading ? (
                    <p className="text-muted-foreground text-sm">লোড হচ্ছে...</p>
                  ) : (
                    renderTable(filterBy(t))
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {bulkResults && bulkResults.some((r) => !r.ok) && (
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-destructive text-base">
                Bulk Sync রিপোর্ট – {bulkResults.filter((r) => !r.ok).length} ব্যর্থ
              </CardTitle>
              <CardDescription>
                নিচের শিপমেন্টগুলো সিঙ্ক হয়নি। Resync বাটনে চাপুন বা বিস্তারিত ত্রুটি দেখুন।
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {bulkResults.filter((r) => !r.ok).map((r) => {
                  const ship = shipments.find((s) => s.id === r.id);
                  return (
                    <div
                      key={r.id}
                      className="flex flex-wrap items-center justify-between gap-2 p-2 rounded border bg-muted/30 text-xs"
                    >
                      <div className="font-mono">{ship?.invoice || r.id.slice(0, 8)}</div>
                      <div className="flex-1 min-w-[200px] text-destructive truncate" title={r.error}>
                        {r.error}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setErrorDetail({ title: "Sync Error", message: r.error || "Unknown", shipmentId: r.id })}
                        >
                          বিস্তারিত
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => sync(r.id)}
                          disabled={busy === r.id}
                        >
                          <RefreshCw className={`w-3 h-3 mr-1 ${busy === r.id ? "animate-spin" : ""}`} />
                          Resync
                        </Button>
                      </div>
                    </div>
                  );
                })}
                <Button variant="ghost" size="sm" onClick={() => setBulkResults(null)}>
                  রিপোর্ট বন্ধ করুন
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>শিপমেন্ট তথ্য সম্পাদনা</DialogTitle>
            </DialogHeader>
            {editing && (
              <div className="space-y-3">
                <div>
                  <Label>প্রাপকের নাম</Label>
                  <Input
                    value={editing.recipient_name}
                    onChange={(e) =>
                      setEditing({ ...editing, recipient_name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>মোবাইল</Label>
                  <Input
                    value={editing.recipient_phone}
                    onChange={(e) =>
                      setEditing({ ...editing, recipient_phone: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>ঠিকানা</Label>
                  <Input
                    value={editing.recipient_address}
                    onChange={(e) =>
                      setEditing({ ...editing, recipient_address: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>COD পরিমাণ (৳)</Label>
                  <Input
                    type="number"
                    value={editing.cod_amount}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        cod_amount: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label>নোট (ঐচ্ছিক)</Label>
                  <Input
                    value={editing.note || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, note: e.target.value })
                    }
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                বাতিল
              </Button>
              <Button onClick={saveEdit} disabled={!!busy}>
                সংরক্ষণ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Error detail dialog */}
        <Dialog open={!!errorDetail} onOpenChange={(o) => !o && setErrorDetail(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-destructive">{errorDetail?.title}</DialogTitle>
            </DialogHeader>
            <pre className="text-xs bg-muted p-3 rounded max-h-[300px] overflow-auto whitespace-pre-wrap break-all">
              {errorDetail?.message}
            </pre>
            <DialogFooter>
              {errorDetail?.shipmentId && (
                <Button
                  onClick={async () => {
                    const id = errorDetail.shipmentId!;
                    setErrorDetail(null);
                    await sync(id);
                  }}
                  disabled={!!busy}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />আবার চেষ্টা করুন
                </Button>
              )}
              <Button variant="ghost" onClick={() => setErrorDetail(null)}>
                বন্ধ করুন
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default SteadfastCourier;
