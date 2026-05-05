import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Shield, UserPlus, UserMinus, Save, Users, Activity, Grid3x3, ShieldCheck, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ALL_PERMISSIONS, MODERATOR_DEFAULT_PERMISSIONS, PERMISSION_ACCESS_MAP } from "@/lib/permissions";

type AppRole = "admin" | "moderator" | "user";

const PERMISSIONS = ALL_PERMISSIONS;

const ROLE_MATRIX = {
  admin: {
    label: "Admin",
    color: "default" as const,
    description: "সম্পূর্ণ নিয়ন্ত্রণ",
    capabilities: [
      "✓ সকল প্রোডাক্ট, অর্ডার, কাস্টমার ম্যানেজ",
      "✓ ইউজার রোল ও পারমিশন কন্ট্রোল",
      "✓ Settings, Backup, Reports সব এক্সেস",
      "✓ ডাটাবেজ ও সাইট কনফিগারেশন",
    ],
  },
  moderator: {
    label: "Moderator",
    color: "secondary" as const,
    description: "নির্দিষ্ট পারমিশন অনুযায়ী এক্সেস",
    capabilities: [
      "✓ অর্ডার ম্যানেজ ও স্ট্যাটাস আপডেট",
      "✓ প্রোডাক্ট, কুপন, শিপিং ম্যানেজ",
      "✓ কাস্টমার, রিভিউ, চ্যাট দেখা",
      "✗ ইউজার রোল পরিবর্তন বা সেটিংস",
    ],
  },
  user: {
    label: "User",
    color: "outline" as const,
    description: "সাধারণ কাস্টমার",
    capabilities: [
      "✓ নিজের অর্ডার, ওয়িশলিস্ট, প্রোফাইল",
      "✓ রিভিউ লেখা ও রিটার্ন রিকোয়েস্ট",
      "✓ রেফারেল ও রিওয়ার্ড পয়েন্ট",
      "✓ Back-in-stock ও Price drop alert",
    ],
  },
};

const RoleManagement = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [searchEmail, setSearchEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingPerms, setPendingPerms] = useState<Record<string, Set<string>>>({});

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ["role-mgmt-staff"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role, created_at")
        .in("role", ["admin", "moderator"]);
      if (!roles?.length) return [];
      const ids = [...new Set(roles.map((r) => r.user_id))];
      const [{ data: profiles }, { data: perms }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, phone").in("user_id", ids),
        supabase.from("staff_permissions").select("user_id, permission").in("user_id", ids),
      ]);
      return roles.map((r) => ({
        user_id: r.user_id,
        role: r.role as AppRole,
        created_at: r.created_at,
        name: profiles?.find((p) => p.user_id === r.user_id)?.full_name || "Unknown",
        phone: profiles?.find((p) => p.user_id === r.user_id)?.phone || "",
        permissions: (perms || []).filter((p) => p.user_id === r.user_id).map((p) => p.permission),
      }));
    },
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["role-mgmt-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const findUserByEmail = async (email: string): Promise<string | null> => {
    // Search by phone in profiles (email lookup requires admin auth API not available client-side)
    const trimmed = email.trim();
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name, phone")
      .or(`phone.ilike.%${trimmed}%,full_name.ilike.%${trimmed}%`)
      .limit(1)
      .maybeSingle();
    return data?.user_id || null;
  };

  const logActivity = async (action: string, details: Record<string, unknown>) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
    const roles = (roleData || []).map((r) => r.role as AppRole);
    const actorRole = roles.includes("admin") ? "admin" : roles.includes("moderator") ? "moderator" : "user";
    await supabase.from("activity_logs").insert({
      user_id: u.user.id,
      user_role: actorRole,
      action,
      resource_type: "user_role",
      details: details as any,
    });
  };

  const promoteToModerator = async () => {
    if (!searchEmail.trim()) {
      toast({ title: "ত্রুটি", description: "নাম বা ফোন নম্বর দিন", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const userId = await findUserByEmail(searchEmail);
      if (!userId) {
        toast({ title: "ইউজার পাওয়া যায়নি", description: "ইউজার অবশ্যই আগে রেজিস্টার্ড থাকতে হবে", variant: "destructive" });
        return;
      }
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "moderator" });
      if (error) throw error;
      await logActivity("promote_moderator", { target_user_id: userId, query: searchEmail });
      toast({ title: "✓ মডারেটর তৈরি হয়েছে", description: "ডিফল্ট পারমিশন স্বয়ংক্রিয় অ্যাসাইন হয়েছে" });
      setSearchEmail("");
      qc.invalidateQueries({ queryKey: ["role-mgmt-staff"] });
    } catch (e: any) {
      toast({ title: "ব্যর্থ", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const removeRole = async (userId: string, role: AppRole) => {
    if (!confirm(`এই ${role} রোল সরিয়ে দিতে চান?`)) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      if (error) throw error;
      await logActivity("remove_role", { target_user_id: userId, role });
      toast({ title: "✓ রোল সরানো হয়েছে" });
      qc.invalidateQueries({ queryKey: ["role-mgmt-staff"] });
    } catch (e: any) {
      toast({ title: "ব্যর্থ", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const togglePerm = (userId: string, perm: string, current: string[]) => {
    const set = new Set(pendingPerms[userId] || current);
    set.has(perm) ? set.delete(perm) : set.add(perm);
    setPendingPerms({ ...pendingPerms, [userId]: set });
  };

  const savePerms = async () => {
    setBusy(true);
    try {
      for (const [userId, set] of Object.entries(pendingPerms)) {
        await supabase.from("staff_permissions").delete().eq("user_id", userId);
        const inserts = [...set].map((permission) => ({ user_id: userId, permission }));
        if (inserts.length) await supabase.from("staff_permissions").insert(inserts);
        await logActivity("update_permissions", { target_user_id: userId, permissions: [...set] });
      }
      toast({ title: "✓ পারমিশন সেভ হয়েছে" });
      setPendingPerms({});
      qc.invalidateQueries({ queryKey: ["role-mgmt-staff"] });
    } catch (e: any) {
      toast({ title: "ব্যর্থ", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const moderators = useMemo(() => staff.filter((s) => s.role === "moderator"), [staff]);
  const admins = useMemo(() => staff.filter((s) => s.role === "admin"), [staff]);
  const hasChanges = Object.keys(pendingPerms).length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <CardTitle>User Roles & Permissions</CardTitle>
        </div>
        <CardDescription>মডারেটর রোল সক্রিয়। ইউজারকে মডারেটর বানান, পারমিশন কাস্টমাইজ করুন এবং রোল ম্যাট্রিক্স দেখুন।</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="manage" className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="manage"><Users className="w-4 h-4 mr-1" />ম্যানেজ</TabsTrigger>
            <TabsTrigger value="permissions"><Shield className="w-4 h-4 mr-1" />পারমিশন</TabsTrigger>
            <TabsTrigger value="matrix"><Grid3x3 className="w-4 h-4 mr-1" />ম্যাট্রিক্স</TabsTrigger>
            <TabsTrigger value="logs"><Activity className="w-4 h-4 mr-1" />অ্যাক্টিভিটি</TabsTrigger>
          </TabsList>

          {/* Manage tab */}
          <TabsContent value="manage" className="space-y-4 mt-4">
            <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
              <Label>নতুন মডারেটর যোগ করুন</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="নাম বা ফোন নম্বর দিয়ে খুঁজুন"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                  />
                </div>
                <Button onClick={promoteToModerator} disabled={busy}>
                  <UserPlus className="w-4 h-4 mr-2" />Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">ডিফল্ট পারমিশন (Orders, Products, Customers, Reviews, Chat, Coupons, Shipping, Content, Reports) স্বয়ংক্রিয়ভাবে অ্যাসাইন হবে।</p>
            </div>

            {isLoading ? (
              <p className="text-sm text-muted-foreground">লোড হচ্ছে...</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Admins ({admins.length})</h4>
                  {admins.length === 0 ? (
                    <p className="text-sm text-muted-foreground">কোনো admin নেই</p>
                  ) : (
                    admins.map((s) => (
                      <div key={`a-${s.user_id}`} className="flex items-center justify-between p-3 border rounded-lg mb-2">
                        <div>
                          <p className="font-medium">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.phone || s.user_id.slice(0, 8)}</p>
                        </div>
                        <Badge>Admin</Badge>
                      </div>
                    ))
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-2">Moderators ({moderators.length})</h4>
                  {moderators.length === 0 ? (
                    <p className="text-sm text-muted-foreground">কোনো moderator নেই</p>
                  ) : (
                    moderators.map((s) => (
                      <div key={`m-${s.user_id}`} className="flex items-center justify-between p-3 border rounded-lg mb-2">
                        <div>
                          <p className="font-medium">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.phone || s.user_id.slice(0, 8)} • {s.permissions.length} পারমিশন</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Moderator</Badge>
                          <Button size="sm" variant="ghost" onClick={() => removeRole(s.user_id, "moderator")} disabled={busy}>
                            <UserMinus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Permissions tab */}
          <TabsContent value="permissions" className="space-y-4 mt-4">
            {moderators.length === 0 ? (
              <Alert>
                <AlertDescription>প্রথমে "ম্যানেজ" ট্যাব থেকে মডারেটর যোগ করুন।</AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="flex justify-end">
                  <Button onClick={savePerms} disabled={busy || !hasChanges} size="sm">
                    <Save className="w-4 h-4 mr-2" />সেভ করুন
                  </Button>
                </div>
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-card z-10 min-w-[150px]">Moderator</TableHead>
                        {PERMISSIONS.map((p) => (
                          <TableHead key={p.key} className="text-center text-xs whitespace-nowrap" title={p.label}>
                            {p.label}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {moderators.map((m) => {
                        const set = pendingPerms[m.user_id] || new Set(m.permissions);
                        return (
                          <TableRow key={m.user_id}>
                            <TableCell className="sticky left-0 bg-card z-10 font-medium">{m.name}</TableCell>
                            {PERMISSIONS.map((p) => (
                              <TableCell key={p.key} className="text-center">
                                <Checkbox checked={set.has(p.key)} onCheckedChange={() => togglePerm(m.user_id, p.key, m.permissions)} />
                              </TableCell>
                            ))}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </>
            )}
          </TabsContent>

          {/* Matrix tab */}
          <TabsContent value="matrix" className="mt-4 space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              {(Object.keys(ROLE_MATRIX) as AppRole[]).map((role) => {
                const r = ROLE_MATRIX[role];
                return (
                  <Card key={role} className="border-2">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{r.label}</CardTitle>
                        <Badge variant={r.color}>{role}</Badge>
                      </div>
                      <CardDescription>{r.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1.5 text-sm">
                        {r.capabilities.map((c, i) => (
                          <li key={i} className={c.startsWith("✗") ? "text-muted-foreground" : ""}>{c}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Detailed permission status table */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">পারমিশন স্ট্যাটাস বিশদ</CardTitle>
                <CardDescription className="flex flex-wrap gap-3 text-xs">
                  <span className="inline-flex items-center gap-1">
                    <Badge variant="default" className="h-5 px-1.5 text-[10px]">Allow</Badge> অনুমোদিত
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">Deny</Badge> নিষিদ্ধ
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">Inherited</Badge> রোল থেকে স্বয়ংক্রিয়
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[180px]">পারমিশন</TableHead>
                        <TableHead className="text-center">Admin</TableHead>
                        <TableHead className="text-center">Moderator (default)</TableHead>
                        <TableHead className="text-center">User</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {PERMISSIONS.map((p) => {
                        const adminStatus: "allow" | "deny" | "inherited" = "inherited";
                        const modStatus = MODERATOR_DEFAULT_PERMISSIONS.includes(p.key) ? "allow" : "deny";
                        const userStatus: "deny" = "deny";
                        const renderBadge = (s: string) => {
                          if (s === "allow") return <Badge variant="default">Allow</Badge>;
                          if (s === "inherited") return <Badge variant="secondary">Inherited</Badge>;
                          return <Badge variant="destructive">Deny</Badge>;
                        };
                        return (
                          <TableRow key={p.key}>
                            <TableCell>
                              <div className="font-medium text-sm">{p.label}</div>
                              <div className="text-xs text-muted-foreground">{p.group} · <code>{p.key}</code></div>
                            </TableCell>
                            <TableCell className="text-center">{renderBadge(adminStatus)}</TableCell>
                            <TableCell className="text-center">{renderBadge(modStatus)}</TableCell>
                            <TableCell className="text-center">{renderBadge(userStatus)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Frontend Page + Backend RLS Mapping</CardTitle>
                <CardDescription className="text-xs">প্রতিটি assigned permission কোন পেজ, অ্যাকশন এবং backend access rule চালু করে।</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[170px]">Permission</TableHead>
                        <TableHead className="min-w-[240px]">Frontend pages</TableHead>
                        <TableHead className="min-w-[260px]">Actions</TableHead>
                        <TableHead className="min-w-[260px]">Backend RLS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {PERMISSIONS.map((p) => {
                        const map = PERMISSION_ACCESS_MAP[p.key];
                        return (
                          <TableRow key={p.key}>
                            <TableCell>
                              <div className="font-medium text-sm">{p.label}</div>
                              <code className="text-xs text-muted-foreground">{p.key}</code>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{map.pages.join(", ")}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{map.actions.join(" • ")}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{map.rls.join(" • ")}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Per-moderator override status */}
            {moderators.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">মডারেটর অনুযায়ী কাস্টম স্ট্যাটাস</CardTitle>
                  <CardDescription className="text-xs">প্রতিটি মডারেটরের বর্তমান পারমিশন (Allow/Deny)। পরিবর্তন করতে "পারমিশন" ট্যাব ব্যবহার করুন।</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="w-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky left-0 bg-card z-10 min-w-[150px]">Moderator</TableHead>
                          {PERMISSIONS.map((p) => (
                            <TableHead key={p.key} className="text-center text-xs whitespace-nowrap" title={p.label}>
                              {p.label}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {moderators.map((m) => (
                          <TableRow key={m.user_id}>
                            <TableCell className="sticky left-0 bg-card z-10 font-medium">{m.name}</TableCell>
                            {PERMISSIONS.map((p) => {
                              const has = m.permissions.includes(p.key);
                              return (
                                <TableCell key={p.key} className="text-center">
                                  <Badge variant={has ? "default" : "destructive"} className="h-5 px-1.5 text-[10px]">
                                    {has ? "Allow" : "Deny"}
                                  </Badge>
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Logs tab */}
          <TabsContent value="logs" className="mt-4">
            <ScrollArea className="h-[400px]">
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">এখনো কোনো অ্যাক্টিভিটি নেই</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log: any) => (
                    <div key={log.id} className="p-3 border rounded-lg text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{log.action}</span>
                        <Badge variant="outline" className="text-xs">{log.user_role}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(log.created_at).toLocaleString("bn-BD")}
                      </p>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default RoleManagement;
