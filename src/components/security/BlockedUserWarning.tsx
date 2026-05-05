import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Phone, MessageCircle, Send, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useBlockedUser } from "@/hooks/useBlockedUser";
import { useAuth } from "@/contexts/AuthContext";

const PHONE = "+8801845853634";
const WHATSAPP_URL = "https://wa.me/8801845853634";
const CALL_URL = `tel:${PHONE}`;

const BlockedUserWarning = () => {
  const { isBlocked, reason, loading } = useBlockedUser();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({ name: "", phone: "", message: "" });
  const [sending, setSending] = useState(false);

  if (loading || !isBlocked) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim() || !formData.message.trim()) {
      toast({ title: "সব ফিল্ড পূরণ করুন", variant: "destructive" });
      return;
    }
    setSending(true);

    // Send appeal via WhatsApp with pre-filled message
    const appealMsg = encodeURIComponent(
      `⚠️ অ্যাকাউন্ট আনব্লক রিকুয়েস্ট\n\n` +
      `👤 নাম: ${formData.name}\n` +
      `📞 ফোন: ${formData.phone}\n` +
      `📧 ইমেইল: ${user?.email || "N/A"}\n\n` +
      `💬 বার্তা: ${formData.message}`
    );
    window.open(`https://wa.me/8801845853634?text=${appealMsg}`, "_blank");
    
    toast({ title: "✅ আপনার রিকুয়েস্ট পাঠানো হয়েছে", description: "আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।" });
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-card border border-destructive/30 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-destructive/10 border-b border-destructive/20 p-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-destructive/20 flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground">অ্যাকাউন্ট সাময়িকভাবে বন্ধ</h2>
          <p className="text-sm text-muted-foreground mt-1">Account Temporarily Suspended</p>
        </div>

        {/* Reason */}
        <div className="p-6 space-y-5">
          <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">কারণ:</p>
                <p className="text-sm text-muted-foreground">{reason}</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            আপনি যদি মনে করেন এটি ভুল হয়েছে, অনুগ্রহ করে নিচের ফর্ম পূরণ করুন অথবা সরাসরি যোগাযোগ করুন।
          </p>

          {/* Contact Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="blocked-name">আপনার নাম</Label>
              <Input
                id="blocked-name"
                placeholder="পূর্ণ নাম"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                maxLength={100}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="blocked-phone">ফোন নম্বর</Label>
              <Input
                id="blocked-phone"
                type="tel"
                placeholder="01XXXXXXXXX"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                maxLength={15}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="blocked-message">আপনার বার্তা</Label>
              <Textarea
                id="blocked-message"
                placeholder="কেন আপনার অ্যাকাউন্ট আনব্লক করা উচিত তা লিখুন..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={3}
                maxLength={500}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={sending}>
              <Send className="w-4 h-4 mr-2" />
              {sending ? "পাঠানো হচ্ছে..." : "রিকুয়েস্ট পাঠান"}
            </Button>
          </form>

          {/* Direct Contact Buttons */}
          <div className="flex gap-3">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp
            </a>
            <a
              href={CALL_URL}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors"
            >
              <Phone className="w-5 h-5" />
              কল করুন
            </a>
          </div>

          {/* Sign Out */}
          <button
            onClick={() => signOut()}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground underline transition-colors"
          >
            অন্য অ্যাকাউন্টে সাইন ইন করুন
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default BlockedUserWarning;
