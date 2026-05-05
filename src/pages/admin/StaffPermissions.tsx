import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Save } from "lucide-react";

const PERMISSIONS = [
  { key: "products.manage", label: "Products", description: "প্রোডাক্ট CRUD" },
  { key: "orders.manage", label: "Orders", description: "অর্ডার ম্যানেজ" },
  { key: "orders.update_status", label: "Order Status", description: "অর্ডার স্ট্যাটাস আপডেট" },
  { key: "customers.view", label: "Customers", description: "কাস্টমার দেখা" },
  { key: "reviews.manage", label: "Reviews", description: "রিভিউ ম্যানেজ" },
  { key: "coupons.manage", label: "Coupons", description: "কুপন ম্যানেজ" },
  { key: "shipping.manage", label: "Shipping", description: "শিপিং ম্যানেজ" },
  { key: "content.manage", label: "Content", description: "কন্টেন্ট এডিট" },
  { key: "reports.view", label: "Reports", description: "রিপোর্ট দেখা" },
  { key: "settings.manage", label: "Settings", description: "সেটিংস" },
];

const StaffPermissions = () => {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: staffMembers = [] } = useQuery({
    queryKey: ["admin-staff-members"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("role", ["admin", "moderator"]);
      if (!roles?.length) return [];
      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, phone").in("user_id", userIds);
      const { data: perms } = await supabase.from("staff_permissions").select("user_id, permission").in("user_id", userIds);

      return roles.map(r => ({
        user_id: r.user_id,
        role: r.role,
        name: profiles?.find(p => p.user_id === r.user_id)?.full_name || "Unknown",
        permissions: (perms?.filter(p => p.user_id === r.user_id) || []).map(p => p.permission),
      }));
    },
  });

  const [changes, setChanges] = useState<Record<string, Set<string>>>({});

  const getPermissions = (userId: string, original: string[]) => {
    return changes[userId] || new Set(original);
  };

  const togglePermission = (userId: string, perm: string, originalPerms: string[]) => {
    const current = new Set(changes[userId] || new Set(originalPerms));
    current.has(perm) ? current.delete(perm) : current.add(perm);
    setChanges(prev => ({ ...prev, [userId]: current }));
  };

  const handleSave = async () => {
    setSaving(true);
    for (const [userId, permsSet] of Object.entries(changes)) {
      // Delete old and re-insert
      await supabase.from("staff_permissions").delete().eq("user_id", userId);
      const inserts = Array.from(permsSet).map(permission => ({ user_id: userId, permission }));
      if (inserts.length > 0) {
        await supabase.from("staff_permissions").insert(inserts);
      }
    }
    toast.success("পারমিশন আপডেট হয়েছে");
    setChanges({});
    queryClient.invalidateQueries({ queryKey: ["admin-staff-members"] });
    setSaving(false);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" /> Staff Permissions
            </h1>
            <p className="text-muted-foreground">স্টাফ সদস্যদের গ্রানুলার পারমিশন সেট করুন</p>
          </div>
          <Button onClick={handleSave} disabled={saving || Object.keys(changes).length === 0}>
            <Save className="w-4 h-4 mr-2" /> {saving ? "সেভ হচ্ছে..." : "সেভ করুন"}
          </Button>
        </div>

        {staffMembers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              কোনো স্টাফ সদস্য পাওয়া যায়নি। প্রথমে user_roles টেবিলে admin বা moderator রোল যোগ করুন।
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-card z-10">Staff</TableHead>
                    <TableHead>Role</TableHead>
                    {PERMISSIONS.map(p => (
                      <TableHead key={p.key} className="text-center text-xs whitespace-nowrap">{p.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffMembers.map(staff => {
                    const perms = getPermissions(staff.user_id, staff.permissions);
                    const isAdmin = staff.role === "admin";
                    return (
                      <TableRow key={staff.user_id}>
                        <TableCell className="sticky left-0 bg-card z-10 font-medium">{staff.name}</TableCell>
                        <TableCell>
                          <Badge variant={isAdmin ? "default" : "secondary"}>{staff.role}</Badge>
                        </TableCell>
                        {PERMISSIONS.map(p => (
                          <TableCell key={p.key} className="text-center">
                            {isAdmin ? (
                              <span className="text-primary text-xs">✓ All</span>
                            ) : (
                              <Checkbox
                                checked={perms.has(p.key)}
                                onCheckedChange={() => togglePermission(staff.user_id, p.key, staff.permissions)}
                              />
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default StaffPermissions;
