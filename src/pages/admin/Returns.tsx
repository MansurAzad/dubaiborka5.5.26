import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { RotateCcw, Eye, CheckCircle, XCircle, Clock } from "lucide-react";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "outline" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  refunded: { label: "Refunded", variant: "secondary" },
};

const Returns = () => {
  const queryClient = useQueryClient();
  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [refundAmount, setRefundAmount] = useState("");

  const { data: returns = [], isLoading } = useQuery({
    queryKey: ["admin-returns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("returns")
        .select("*, orders(id, total, shipping_phone, shipping_city, status)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const updateReturn = useMutation({
    mutationFn: async ({ id, status, admin_notes, refund_amount }: any) => {
      const { error } = await supabase
        .from("returns")
        .update({ status, admin_notes, refund_amount })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-returns"] });
      toast.success("Return updated successfully");
      setSelectedReturn(null);
    },
    onError: () => toast.error("Failed to update return"),
  });

  const handleUpdate = () => {
    if (!selectedReturn || !newStatus) return;
    updateReturn.mutate({
      id: selectedReturn.id,
      status: newStatus,
      admin_notes: adminNotes,
      refund_amount: refundAmount ? parseFloat(refundAmount) : selectedReturn.refund_amount,
    });
  };

  const stats = {
    total: returns.length,
    pending: returns.filter(r => r.status === "pending").length,
    approved: returns.filter(r => r.status === "approved").length,
    refunded: returns.filter(r => r.status === "refunded").length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Return Management</h1>
          <p className="text-muted-foreground">রিটার্ন ও রিফান্ড ম্যানেজমেন্ট</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <RotateCcw className="w-8 h-8 text-primary" />
              <div><p className="text-sm text-muted-foreground">Total Returns</p><p className="text-2xl font-bold">{stats.total}</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <Clock className="w-8 h-8 text-yellow-500" />
              <div><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold">{stats.pending}</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div><p className="text-sm text-muted-foreground">Approved</p><p className="text-2xl font-bold">{stats.approved}</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <XCircle className="w-8 h-8 text-secondary" />
              <div><p className="text-sm text-muted-foreground">Refunded</p><p className="text-2xl font-bold">{stats.refunded}</p></div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>All Returns</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : returns.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No return requests yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returns.map((ret: any) => (
                    <TableRow key={ret.id}>
                      <TableCell>{format(new Date(ret.created_at), "dd MMM yyyy")}</TableCell>
                      <TableCell className="font-mono text-xs">{ret.order_id?.slice(0, 8)}...</TableCell>
                      <TableCell className="max-w-[200px] truncate">{ret.reason}</TableCell>
                      <TableCell>{ret.refund_amount ? `৳${ret.refund_amount}` : "—"}</TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[ret.status]?.variant || "outline"}>
                          {statusConfig[ret.status]?.label || ret.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedReturn(ret);
                                setNewStatus(ret.status);
                                setAdminNotes(ret.admin_notes || "");
                                setRefundAmount(ret.refund_amount?.toString() || "");
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" /> View
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Return Details</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Reason</p>
                                <p className="font-medium">{ret.reason}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Order Total</p>
                                <p className="font-medium">৳{(ret as any).orders?.total}</p>
                              </div>
                              <div>
                                <label className="text-sm text-muted-foreground">Status</label>
                                <Select value={newStatus} onValueChange={setNewStatus}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                    <SelectItem value="refunded">Refunded</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="text-sm text-muted-foreground">Refund Amount (৳)</label>
                                <input
                                  type="number"
                                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                                  value={refundAmount}
                                  onChange={(e) => setRefundAmount(e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="text-sm text-muted-foreground">Admin Notes</label>
                                <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
                              </div>
                              <Button onClick={handleUpdate} className="w-full" disabled={updateReturn.isPending}>
                                Update Return
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Returns;
