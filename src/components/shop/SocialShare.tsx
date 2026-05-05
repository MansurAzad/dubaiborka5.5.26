import { Share2, Facebook, MessageCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface SocialShareProps {
  url: string;
  title: string;
  description?: string;
}

const SocialShare = ({ url, title, description = "" }: SocialShareProps) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const fullUrl = url.startsWith("http") ? url : `${window.location.origin}${url}`;
  const encodedUrl = encodeURIComponent(fullUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedDesc = encodeURIComponent(description);

  const shareLinks = [
    { name: "WhatsApp", icon: <MessageCircle className="w-4 h-4" />, href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`, color: "hover:text-green-500" },
    { name: "Facebook", icon: <Facebook className="w-4 h-4" />, href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, color: "hover:text-blue-500" },
    { name: "Twitter", icon: <span className="text-xs font-bold">𝕏</span>, href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`, color: "hover:text-foreground" },
  ];

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(fullUrl);
    toast({ title: "লিংক কপি হয়েছে!", description: "প্রোডাক্ট লিংক ক্লিপবোর্ডে কপি করা হয়েছে" });
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm text-muted-foreground"
      >
        <Share2 className="w-4 h-4" />
        Share
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 bg-card border border-border rounded-xl p-3 shadow-lg min-w-[180px] space-y-1">
            {shareLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-foreground ${link.color}`}
              >
                {link.icon}
                <span className="text-sm">{link.name}</span>
              </a>
            ))}
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-foreground"
            >
              <Share2 className="w-4 h-4" />
              <span className="text-sm">Copy Link</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default SocialShare;
