import { useQuery } from "@tanstack/react-query";
import { Users, Gift, TrendingUp, Award } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const ReferralDashboard = () => {
  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ["admin-referrals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-profiles-referral"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name, referral_code");
      return data || [];
    },
  });

  const totalReferrals = referrals.length;
  const usedReferrals = referrals.filter(r => r.is_used).length;
  const conversionRate = totalReferrals > 0 ? Math.round((usedReferrals / totalReferrals) * 100) : 0;
  const uniqueReferrers = new Set(referrals.map(r => r.referrer_id)).size;

  const getProfileName = (userId: string) => {
    const profile = profiles.find(p => p.user_id === userId);
    return profile?.full_name || userId.slice(0, 8);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Referral Dashboard</h1>
          <p className="text-muted-foreground">Track referral activity and conversions</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Gift className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{totalReferrals}</p>
                  <p className="text-xs text-muted-foreground">Total Referrals</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{usedReferrals}</p>
                  <p className="text-xs text-muted-foreground">Used Referrals</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Award className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{conversionRate}%</p>
                  <p className="text-xs text-muted-foreground">Conversion Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{uniqueReferrers}</p>
                  <p className="text-xs text-muted-foreground">Active Referrers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Top Referrers</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const referrerCounts = referrals.reduce((acc, r) => {
                acc[r.referrer_id] = (acc[r.referrer_id] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);
              const topReferrers = Object.entries(referrerCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10);

              return (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Referrer</TableHead>
                      <TableHead>Referral Code</TableHead>
                      <TableHead>Total Referrals</TableHead>
                      <TableHead>Used</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topReferrers.map(([userId, count]) => {
                      const profile = profiles.find(p => p.user_id === userId);
                      const usedCount = referrals.filter(r => r.referrer_id === userId && r.is_used).length;
                      return (
                        <TableRow key={userId}>
                          <TableCell className="font-medium">{getProfileName(userId)}</TableCell>
                          <TableCell><code className="text-xs bg-muted px-2 py-1 rounded">{profile?.referral_code || "—"}</code></TableCell>
                          <TableCell>{count}</TableCell>
                          <TableCell>
                            <Badge variant={usedCount > 0 ? "default" : "secondary"}>{usedCount}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {topReferrers.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No referrals yet</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              );
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Referrer</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Discount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : referrals.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No referrals found</TableCell></TableRow>
                ) : (
                  referrals.slice(0, 20).map(ref => (
                    <TableRow key={ref.id}>
                      <TableCell className="text-sm">{new Date(ref.created_at).toLocaleDateString("bn-BD")}</TableCell>
                      <TableCell>{getProfileName(ref.referrer_id)}</TableCell>
                      <TableCell><code className="text-xs bg-muted px-2 py-1 rounded">{ref.referral_code}</code></TableCell>
                      <TableCell>
                        <Badge variant={ref.is_used ? "default" : "outline"}>
                          {ref.is_used ? "Used" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>{ref.discount_percent}%</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default ReferralDashboard;
