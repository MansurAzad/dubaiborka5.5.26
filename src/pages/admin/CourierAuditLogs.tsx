import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollText, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AuditRow {
  id: string;
  shipment_id: string | null;
  order_id: string | null;
  action: string;
  actor_user_id: string | null;
  actor_role: string | null;
  success: boolean;
  error_message: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

const CourierAuditLogs = () => {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["courier-audit-logs", actionFilter],
    queryFn: async () => {
      let q = supabase
        .from("courier_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (actionFilter !== "all") q = q.eq("action", actionFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data as AuditRow[];
    },
  });

  // Pull actor names from profiles
  const actorIds = Array.from(
    new Set(logs.map((l) => l.actor_user_id).filter(Boolean) as string[]),
  );
  const { data: actors = [] } = useQuery({
    queryKey: ["audit-actors", actorIds.join(",")],
    queryFn: async () => {
      if (actorIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", actorIds);
      return data || [];
    },
    enabled: actorIds.length > 0,
  });
  const actorName = (id: string | null) => {
    if (!id) return "System / Cron";
    const a = actors.find((x: any) => x.user_id === id);
    return a?.full_name || id.slice(0, 8);
  };

  const filtered = logs.filter((l) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (l.shipment_id || "").toLowerCase().includes(s) ||
      (l.order_id || "").toLowerCase().includes(s) ||
      (l.error_message || "").toLowerCase().includes(s) ||
      JSON.stringify(l.details || {}).toLowerCase().includes(s)
    );
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <ScrollText className="w-8 h-8 text-primary" /> Courier Audit Logs
          </h1>
          <p className="text-muted-foreground">
            কুরিয়ার শিপমেন্টের approve / submit / sync কাজের সম্পূর্ণ ট্রেস।
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">ফিল্টার</CardTitle>
            <CardDescription>অ্যাকশন বা শিপমেন্ট ID দিয়ে খুঁজুন</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব Action</SelectItem>
                <SelectItem value="approve">Approve</SelectItem>
                <SelectItem value="submit">Submit</SelectItem>
                <SelectItem value="sync">Sync</SelectItem>
                <SelectItem value="bulk_sync">Bulk Sync</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="শিপমেন্ট/অর্ডার ID বা error text..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <p className="text-muted-foreground text-sm">লোড হচ্ছে...</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>সময়</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Shipment / Order</TableHead>
                      <TableHead>ফলাফল</TableHead>
                      <TableHead>বিস্তারিত</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          কোনো লগ পাওয়া যায়নি
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {new Date(l.created_at).toLocaleString("bn-BD")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{l.action}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{actorName(l.actor_user_id)}</div>
                            <div className="text-[10px] text-muted-foreground capitalize">
                              {l.actor_role || "—"}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {l.shipment_id && <div>S: {l.shipment_id.slice(0, 8)}</div>}
                            {l.order_id && <div className="text-muted-foreground">O: {l.order_id.slice(0, 8)}</div>}
                          </TableCell>
                          <TableCell>
                            {l.success ? (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle2 className="w-3 h-3" /> OK
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="gap-1">
                                <XCircle className="w-3 h-3" /> Failed
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[320px]">
                            {l.error_message ? (
                              <div className="text-xs text-destructive truncate" title={l.error_message}>
                                {l.error_message}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground truncate" title={JSON.stringify(l.details)}>
                                {Object.entries(l.details || {})
                                  .slice(0, 3)
                                  .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
                                  .join(" · ") || "—"}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default CourierAuditLogs;
