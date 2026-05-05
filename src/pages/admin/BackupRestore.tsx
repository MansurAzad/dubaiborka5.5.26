import { useState, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Download, Upload, Trash2, RotateCcw, Database, Shield,
  FileJson, Clock, HardDrive, AlertTriangle, CheckCircle2, RefreshCw,
  Package, ShoppingCart, Users, Settings, FileText, Tag,
} from "lucide-react";

const ALL_TABLES = [
  "products", "product_variants", "product_images", "product_reviews",
  "categories", "orders", "order_items", "profiles",
  "site_content", "coupons", "delivery_zones", "blog_posts",
  "bundle_deals", "newsletter_subscribers", "social_proof_messages",
  "referrals", "reward_points", "saved_addresses", "wishlist",
  "cart_items", "chat_histories", "email_campaigns",
  "customer_segments", "customer_segment_members", "staff_permissions",
  "user_roles", "blocked_users", "back_in_stock_alerts",
  "price_drop_alerts", "returns",
];

const TABLE_GROUPS = [
  {
    label: "প্রোডাক্ট ও ক্যাটাগরি",
    icon: Package,
    tables: ["products", "product_variants", "product_images", "product_reviews", "categories"],
  },
  {
    label: "অর্ডার ও কাস্টমার",
    icon: ShoppingCart,
    tables: ["orders", "order_items", "profiles", "cart_items", "wishlist", "saved_addresses", "returns"],
  },
  {
    label: "সাইট সেটিংস",
    icon: Settings,
    tables: ["site_content", "delivery_zones", "coupons", "bundle_deals", "social_proof_messages"],
  },
  {
    label: "মার্কেটিং ও কমিউনিকেশন",
    icon: FileText,
    tables: ["blog_posts", "newsletter_subscribers", "email_campaigns", "chat_histories"],
  },
  {
    label: "ইউজার ম্যানেজমেন্ট",
    icon: Users,
    tables: ["user_roles", "staff_permissions", "blocked_users", "referrals", "reward_points"],
  },
  {
    label: "অ্যালার্ট ও সেগমেন্ট",
    icon: Tag,
    tables: ["back_in_stock_alerts", "price_drop_alerts", "customer_segments", "customer_segment_members"],
  },
];

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} মিনিট আগে`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ঘণ্টা আগে`;
  const days = Math.floor(hrs / 24);
  return `${days} দিন আগে`;
}

const BackupRestore = () => {
  const queryClient = useQueryClient();
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set(ALL_TABLES));
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [selectedBackupId, setSelectedBackupId] = useState<string | null>(null);
  const [restoreTables, setRestoreTables] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);

  const { data: backups = [], isLoading } = useQuery({
    queryKey: ["backup-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backup_history")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const toggleGroup = useCallback((tables: string[]) => {
    setSelectedTables((prev) => {
      const next = new Set(prev);
      const allSelected = tables.every((t) => next.has(t));
      tables.forEach((t) => (allSelected ? next.delete(t) : next.add(t)));
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedTables((prev) =>
      prev.size === ALL_TABLES.length ? new Set() : new Set(ALL_TABLES)
    );
  }, []);

  const invokeBackupFn = useCallback(
    async (action: string, extra: Record<string, any> = {}) => {
      const { data, error } = await supabase.functions.invoke("site-backup", {
        body: { action, ...extra },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data;
    },
    []
  );

  const backupMutation = useMutation({
    mutationFn: async () => {
      setProcessing(true);
      return invokeBackupFn("backup", {
        tables: Array.from(selectedTables),
      });
    },
    onSuccess: (data) => {
      toast.success(`ব্যাকআপ সম্পন্ন! ${data.totalRows} রো, ${data.tables} টেবিল`);
      queryClient.invalidateQueries({ queryKey: ["backup-history"] });
    },
    onError: (err: Error) => toast.error(`ব্যাকআপ ব্যর্থ: ${err.message}`),
    onSettled: () => setProcessing(false),
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBackupId) throw new Error("No backup selected");
      setProcessing(true);
      return invokeBackupFn("restore", {
        backup_id: selectedBackupId,
        tables: restoreTables.size > 0 ? Array.from(restoreTables) : undefined,
      });
    },
    onSuccess: (data) => {
      const total = Object.values(data.results as Record<string, any>).reduce(
        (s: number, r: any) => s + (r.restored || 0), 0
      );
      toast.success(`রিস্টোর সম্পন্ন! ${total} রো পুনরুদ্ধার হয়েছে`);
      setRestoreConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["backup-history"] });
    },
    onError: (err: Error) => toast.error(`রিস্টোর ব্যর্থ: ${err.message}`),
    onSettled: () => setProcessing(false),
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      setProcessing(true);
      return invokeBackupFn("reset", {
        tables: Array.from(selectedTables),
      });
    },
    onSuccess: () => {
      toast.success("রিসেট সম্পন্ন!");
      setResetConfirmOpen(false);
    },
    onError: (err: Error) => toast.error(`রিসেট ব্যর্থ: ${err.message}`),
    onSettled: () => setProcessing(false),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => invokeBackupFn("delete_backup", { backup_id: id }),
    onSuccess: () => {
      toast.success("ব্যাকআপ মুছে ফেলা হয়েছে");
      queryClient.invalidateQueries({ queryKey: ["backup-history"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleDownload = useCallback(async (id: string) => {
    try {
      const data = await invokeBackupFn("download", { backup_id: id });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("ডাউনলোড সম্পন্ন");
    } catch (err: any) {
      toast.error(err.message);
    }
  }, [invokeBackupFn]);

  const handleFileRestore = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setProcessing(true);
      const text = await file.text();
      const backupData = JSON.parse(text);

      // First upload to storage so we have a record
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `upload-restore-${timestamp}.json`;

      // Create backup via the function for proper handling
      const { error: uploadErr } = await supabase.storage
        .from("site-backups")
        .upload(fileName, text, { contentType: "application/json" });

      if (uploadErr) {
        // If storage upload fails, just do local restore info
        toast.info("স্টোরেজ আপলোড ব্যর্থ, সরাসরি রিস্টোর চেষ্টা হবে না।");
        setProcessing(false);
        return;
      }

      const tablesInBackup = Object.keys(backupData);
      // Insert backup history record
      const { data: record } = await supabase.from("backup_history").insert({
        backup_name: fileName,
        backup_type: "uploaded",
        tables_included: tablesInBackup,
        file_path: fileName,
        file_size_bytes: file.size,
        status: "completed",
        notes: "Uploaded from local file",
      }).select().single();

      if (record) {
        setSelectedBackupId(record.id);
        setRestoreTables(new Set(tablesInBackup));
        setRestoreConfirmOpen(true);
      }
      queryClient.invalidateQueries({ queryKey: ["backup-history"] });
    } catch (err: any) {
      toast.error("ফাইল পড়া ব্যর্থ: " + err.message);
    } finally {
      setProcessing(false);
      e.target.value = "";
    }
  }, [queryClient]);

  const openRestore = useCallback((backup: any) => {
    setSelectedBackupId(backup.id);
    setRestoreTables(new Set(backup.tables_included || []));
    setRestoreConfirmOpen(true);
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold flex items-center gap-2">
              <Shield className="w-7 h-7 text-primary" />
              ব্যাকআপ ও রিসেট সিস্টেম
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              সম্পূর্ণ ওয়েবসাইট ব্যাকআপ, রিস্টোর এবং রিসেট ম্যানেজমেন্ট
            </p>
          </div>
        </div>

        {/* Table Selection */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="w-5 h-5" />
                টেবিল নির্বাচন করুন
              </CardTitle>
              <Button variant="outline" size="sm" onClick={toggleAll}>
                {selectedTables.size === ALL_TABLES.length ? "সব বাদ দিন" : "সব নির্বাচন"}
              </Button>
            </div>
            <CardDescription>ব্যাকআপ বা রিসেটের জন্য টেবিল গ্রুপ নির্বাচন করুন</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {TABLE_GROUPS.map((group) => {
                const Icon = group.icon;
                const allSelected = group.tables.every((t) => selectedTables.has(t));
                const someSelected = group.tables.some((t) => selectedTables.has(t));
                return (
                  <div
                    key={group.label}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      allSelected
                        ? "border-primary bg-primary/5"
                        : someSelected
                        ? "border-primary/40 bg-primary/[0.02]"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                    onClick={() => toggleGroup(group.tables)}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <Switch
                        checked={allSelected}
                        onCheckedChange={() => toggleGroup(group.tables)}
                        className="scale-90"
                      />
                      <Icon className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">{group.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 ml-10">
                      {group.tables.map((t) => (
                        <Badge
                          key={t}
                          variant={selectedTables.has(t) ? "default" : "outline"}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-primary/20 bg-primary/[0.02]">
            <CardContent className="p-5 text-center space-y-3">
              <div className="w-12 h-12 mx-auto bg-primary/10 rounded-xl flex items-center justify-center">
                <HardDrive className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold">ক্লাউড ব্যাকআপ</h3>
              <p className="text-xs text-muted-foreground">নির্বাচিত টেবিলগুলো ক্লাউডে সেভ করুন</p>
              <Button
                className="w-full"
                onClick={() => backupMutation.mutate()}
                disabled={processing || selectedTables.size === 0}
              >
                <HardDrive className="w-4 h-4 mr-2" />
                {processing && backupMutation.isPending ? "ব্যাকআপ হচ্ছে..." : "ব্যাকআপ নিন"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-blue-500/20 bg-blue-500/[0.02]">
            <CardContent className="p-5 text-center space-y-3">
              <div className="w-12 h-12 mx-auto bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Upload className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="font-bold">ফাইল থেকে রিস্টোর</h3>
              <p className="text-xs text-muted-foreground">JSON ব্যাকআপ ফাইল আপলোড করে রিস্টোর করুন</p>
              <label className="block">
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleFileRestore}
                  disabled={processing}
                />
                <Button variant="outline" className="w-full" asChild disabled={processing}>
                  <span>
                    <FileJson className="w-4 h-4 mr-2" />
                    JSON আপলোড
                  </span>
                </Button>
              </label>
            </CardContent>
          </Card>

          <Card className="border-destructive/20 bg-destructive/[0.02]">
            <CardContent className="p-5 text-center space-y-3">
              <div className="w-12 h-12 mx-auto bg-destructive/10 rounded-xl flex items-center justify-center">
                <RotateCcw className="w-6 h-6 text-destructive" />
              </div>
              <h3 className="font-bold">ডেটা রিসেট</h3>
              <p className="text-xs text-muted-foreground">নির্বাচিত টেবিলের সব ডেটা মুছে ফেলুন</p>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setResetConfirmOpen(true)}
                disabled={processing || selectedTables.size === 0}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                রিসেট করুন
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Backup History */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" />
              ব্যাকআপ হিস্ট্রি
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : backups.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">কোনো ব্যাকআপ নেই</p>
            ) : (
              <div className="space-y-2">
                {backups.map((b: any) => (
                  <div
                    key={b.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {b.status === "completed" ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{b.backup_name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{timeAgo(b.created_at)}</span>
                          <span>•</span>
                          <span>{formatBytes(b.file_size_bytes || 0)}</span>
                          <span>•</span>
                          <Badge variant="outline" className="text-[10px]">
                            {b.backup_type}
                          </Badge>
                          <span>•</span>
                          <span>{b.tables_included?.length || 0} টেবিল</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => openRestore(b)}>
                        <Upload className="w-3 h-3 mr-1" /> রিস্টোর
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => handleDownload(b.id)}>
                        <Download className="w-3 h-3 mr-1" /> ডাউনলোড
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => {
                          if (confirm("এই ব্যাকআপ মুছে ফেলতে চান?")) deleteMutation.mutate(b.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reset Confirm Dialog */}
        <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                ডেটা রিসেট নিশ্চিত করুন
              </DialogTitle>
              <DialogDescription>
                এই কাজটি অপরিবর্তনীয়! নির্বাচিত {selectedTables.size} টেবিলের সব ডেটা স্থায়ীভাবে মুছে যাবে।
                আগে ব্যাকআপ নেওয়া উচিত।
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap gap-1 my-2">
              {Array.from(selectedTables).map((t) => (
                <Badge key={t} variant="destructive" className="text-[10px]">{t}</Badge>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setResetConfirmOpen(false)}>বাতিল</Button>
              <Button
                variant="destructive"
                onClick={() => resetMutation.mutate()}
                disabled={resetMutation.isPending}
              >
                {resetMutation.isPending ? "রিসেট হচ্ছে..." : "হ্যাঁ, রিসেট করুন"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Restore Confirm Dialog */}
        <Dialog open={restoreConfirmOpen} onOpenChange={setRestoreConfirmOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                রিস্টোর নিশ্চিত করুন
              </DialogTitle>
              <DialogDescription>
                নির্বাচিত টেবিলগুলোর বর্তমান ডেটা মুছে ব্যাকআপ থেকে পুনরুদ্ধার করা হবে।
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm font-medium">কোন টেবিলগুলো রিস্টোর করবেন?</p>
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                {Array.from(restoreTables).map((t) => (
                  <Badge
                    key={t}
                    variant="default"
                    className="text-[10px] cursor-pointer"
                    onClick={() => {
                      setRestoreTables((prev) => {
                        const next = new Set(prev);
                        next.has(t) ? next.delete(t) : next.add(t);
                        return next;
                      });
                    }}
                  >
                    {t} ✓
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-2">
              <Button variant="outline" onClick={() => setRestoreConfirmOpen(false)}>বাতিল</Button>
              <Button
                onClick={() => restoreMutation.mutate()}
                disabled={restoreMutation.isPending || restoreTables.size === 0}
              >
                {restoreMutation.isPending ? "রিস্টোর হচ্ছে..." : `${restoreTables.size} টেবিল রিস্টোর করুন`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default BackupRestore;
