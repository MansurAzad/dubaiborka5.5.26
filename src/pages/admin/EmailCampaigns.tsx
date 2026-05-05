import { useState, useEffect } from "react";
import { Send, Plus, Users, Mail, Trash2, Eye } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Campaign {
  id: string;
  subject: string;
  content: string;
  status: string;
  sent_count: number;
  created_at: string;
  sent_at: string | null;
}

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  subscribed: boolean;
  created_at: string;
}

const EmailCampaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const { toast } = useToast();

  const [form, setForm] = useState({ subject: "", content: "" });

  const fetchData = async () => {
    const [campaignRes, subRes] = await Promise.all([
      supabase.from("email_campaigns").select("*").order("created_at", { ascending: false }),
      supabase.from("newsletter_subscribers").select("*").eq("subscribed", true).order("created_at", { ascending: false }),
    ]);
    setCampaigns((campaignRes.data as Campaign[]) || []);
    setSubscribers((subRes.data as Subscriber[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const createCampaign = async () => {
    if (!form.subject || !form.content) {
      toast({ title: "সাবজেক্ট ও কন্টেন্ট দিন", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("email_campaigns").insert({
      subject: form.subject,
      content: form.content,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "ক্যাম্পেইন তৈরি হয়েছে!" });
      setForm({ subject: "", content: "" });
      setShowCreate(false);
      fetchData();
    }
  };

  const sendCampaign = async (campaign: Campaign) => {
    if (subscribers.length === 0) {
      toast({ title: "কোনো সাবস্ক্রাইবার নেই!", variant: "destructive" });
      return;
    }

    setSending(campaign.id);

    try {
      const { error } = await supabase.functions.invoke("send-email-campaign", {
        body: {
          campaignId: campaign.id,
          subject: campaign.subject,
          content: campaign.content,
          subscribers: subscribers.map(s => ({ email: s.email, name: s.name })),
        },
      });

      if (error) throw error;

      await supabase.from("email_campaigns").update({
        status: "sent",
        sent_count: subscribers.length,
        sent_at: new Date().toISOString(),
      }).eq("id", campaign.id);

      toast({ title: `${subscribers.length} জনকে ইমেইল পাঠানো হয়েছে!` });
      fetchData();
    } catch (error: any) {
      toast({ title: "ইমেইল পাঠাতে ব্যর্থ", description: error.message, variant: "destructive" });
    } finally {
      setSending(null);
    }
  };

  const deleteCampaign = async (id: string) => {
    await supabase.from("email_campaigns").delete().eq("id", id);
    fetchData();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Email Campaigns</h1>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <Users className="w-4 h-4" />
              {subscribers.length} সাবস্ক্রাইবার
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" /> নতুন ক্যাম্পেইন
          </Button>
        </div>

        {/* Create Campaign Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>নতুন Email Campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Subject</label>
                <Input
                  value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                  placeholder="ইমেইলের সাবজেক্ট..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Content (HTML সাপোর্টেড)</label>
                <Textarea
                  value={form.content}
                  onChange={e => setForm({ ...form, content: e.target.value })}
                  placeholder="ইমেইলের কন্টেন্ট লিখুন..."
                  rows={8}
                />
              </div>
              <Button onClick={createCampaign} className="w-full">
                <Mail className="w-4 h-4 mr-2" /> ক্যাম্পেইন তৈরি করুন
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Campaigns List */}
        {loading ? (
          <p className="text-muted-foreground">লোড হচ্ছে...</p>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12 bg-muted/50 rounded-xl">
            <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">এখনো কোনো ক্যাম্পেইন নেই</p>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map(campaign => (
              <div key={campaign.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{campaign.subject}</h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      campaign.status === "sent" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {campaign.status === "sent" ? "পাঠানো হয়েছে" : "ড্রাফট"}
                    </span>
                    {campaign.sent_count > 0 && (
                      <span>{campaign.sent_count} জনকে পাঠানো</span>
                    )}
                    <span>{new Date(campaign.created_at).toLocaleDateString("bn-BD")}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {campaign.status === "draft" && (
                    <Button
                      size="sm"
                      onClick={() => sendCampaign(campaign)}
                      disabled={sending === campaign.id}
                    >
                      <Send className="w-4 h-4 mr-1" />
                      {sending === campaign.id ? "পাঠাচ্ছে..." : "পাঠান"}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => deleteCampaign(campaign.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Subscribers Section */}
        <div>
          <h2 className="text-lg font-semibold mb-3">সাবস্ক্রাইবার তালিকা</h2>
          {subscribers.length === 0 ? (
            <p className="text-muted-foreground text-sm">কোনো সাবস্ক্রাইবার নেই</p>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-4 py-2">Email</th>
                    <th className="text-left px-4 py-2">নাম</th>
                    <th className="text-left px-4 py-2">তারিখ</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.slice(0, 20).map(sub => (
                    <tr key={sub.id} className="border-t border-border">
                      <td className="px-4 py-2">{sub.email}</td>
                      <td className="px-4 py-2">{sub.name || "-"}</td>
                      <td className="px-4 py-2">{new Date(sub.created_at).toLocaleDateString("bn-BD")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default EmailCampaigns;
