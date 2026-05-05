import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Send, Loader2, Sparkles, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// ─── Command definitions with navigation ─────────────────────
interface Command {
  label: string;
  keywords: string[];
  path?: string;
  description: string;
}

const ADMIN_COMMANDS: Command[] = [
  { label: "📊 ড্যাশবোর্ড", keywords: ["ড্যাশবোর্ড", "dashboard", "সামারি", "হোম"], path: "/admin", description: "অ্যাডমিন ড্যাশবোর্ডে যান" },
  { label: "📦 প্রোডাক্ট ম্যানেজ", keywords: ["প্রোডাক্ট", "product", "পণ্য", "আইটেম"], path: "/admin/products", description: "সকল প্রোডাক্ট দেখুন ও ম্যানেজ করুন" },
  { label: "🛒 অর্ডার ম্যানেজ", keywords: ["অর্ডার", "order", "অর্ডার লিস্ট"], path: "/admin/orders", description: "সকল অর্ডার দেখুন ও ম্যানেজ করুন" },
  { label: "👥 কাস্টমার", keywords: ["কাস্টমার", "customer", "গ্রাহক", "ক্রেতা"], path: "/admin/customers", description: "কাস্টমার তালিকা দেখুন" },
  { label: "⭐ রিভিউ", keywords: ["রিভিউ", "review", "মতামত", "রেটিং"], path: "/admin/reviews", description: "প্রোডাক্ট রিভিউ ম্যানেজ করুন" },
  { label: "🏷️ কুপন", keywords: ["কুপন", "coupon", "ডিসকাউন্ট", "প্রমো"], path: "/admin/coupons", description: "কুপন কোড তৈরি ও ম্যানেজ করুন" },
  { label: "📧 ইমেইল ক্যাম্পেইন", keywords: ["ইমেইল", "email", "ক্যাম্পেইন", "campaign", "মেইল"], path: "/admin/email-campaigns", description: "ইমেইল মার্কেটিং ক্যাম্পেইন" },
  { label: "📈 রিপোর্ট", keywords: ["রিপোর্ট", "report", "এনালিটিক্স", "analytics", "রেভিনিউ"], path: "/admin/reports", description: "অ্যাডভান্সড রিপোর্ট ও এনালিটিক্স" },
  { label: "🔄 রিটার্ন", keywords: ["রিটার্ন", "return", "ফেরত", "রিফান্ড"], path: "/admin/returns", description: "রিটার্ন রিকোয়েস্ট ম্যানেজ করুন" },
  { label: "🚚 শিপিং", keywords: ["শিপিং", "shipping", "ডেলিভারি চার্জ"], path: "/admin/shipping", description: "শিপিং সেটিংস ম্যানেজ করুন" },
  { label: "📝 কন্টেন্ট এডিটর", keywords: ["কন্টেন্ট", "content", "সাইট কন্টেন্ট", "এডিটর"], path: "/admin/content", description: "সাইটের কন্টেন্ট এডিট করুন" },
  { label: "🏠 হোমপেইজ সেকশন", keywords: ["হোমপেইজ", "homepage", "সেকশন", "ব্যানার"], path: "/admin/homepage", description: "হোমপেইজ সেকশন ম্যানেজ করুন" },
  { label: "📰 ব্লগ পোস্ট", keywords: ["ব্লগ", "blog", "পোস্ট", "আর্টিকেল"], path: "/admin/blog", description: "ব্লগ পোস্ট তৈরি ও ম্যানেজ করুন" },
  { label: "📍 ডেলিভারি জোন", keywords: ["ডেলিভারি জোন", "delivery zone", "জোন", "এলাকা"], path: "/admin/delivery-zones", description: "ডেলিভারি জোন সেটাপ করুন" },
  { label: "🔔 নোটিফিকেশন", keywords: ["নোটিফিকেশন", "notification", "নোটিফাই", "অ্যালার্ট"], path: "/admin/notifications", description: "নোটিফিকেশন সেটিংস" },
  { label: "💬 চ্যাট হিস্ট্রি", keywords: ["চ্যাট", "chat", "হিস্ট্রি", "কথোপকথন", "মেসেজ"], path: "/admin/chat-histories", description: "কাস্টমার চ্যাট হিস্ট্রি দেখুন" },
  { label: "✏️ বাল্ক এডিট", keywords: ["বাল্ক", "bulk", "একসাথে", "এডিট"], path: "/admin/bulk-edit", description: "একসাথে অনেক প্রোডাক্ট এডিট করুন" },
  { label: "👮 স্টাফ পারমিশন", keywords: ["স্টাফ", "staff", "পারমিশন", "permission", "কর্মী"], path: "/admin/staff-permissions", description: "স্টাফ পারমিশন ম্যানেজ করুন" },
  { label: "🚛 কুরিয়ার ইন্টিগ্রেশন", keywords: ["কুরিয়ার", "courier", "স্টেডফাস্ট", "পাঠাও", "রেডএক্স"], path: "/admin/courier-integration", description: "কুরিয়ার সার্ভিস ইন্টিগ্রেশন" },
  { label: "🎁 রেফারেল", keywords: ["রেফারেল", "referral", "রেফার", "ইনভাইট"], path: "/admin/referrals", description: "রেফারেল প্রোগ্রাম ম্যানেজ করুন" },
  { label: "📱 মেটা পিক্সেল", keywords: ["মেটা", "meta", "পিক্সেল", "pixel", "ফেসবুক"], path: "/admin/meta-pixel", description: "Meta Pixel সেটাপ করুন" },
  { label: "📊 গুগল এনালিটিক্স", keywords: ["গুগল", "google", "এনালিটিক্স", "GA", "ট্র্যাকিং"], path: "/admin/google-analytics", description: "Google Analytics সেটাপ করুন" },
  { label: "⚙️ সেটিংস", keywords: ["সেটিংস", "settings", "কনফিগ", "পরিবর্তন"], path: "/admin/settings", description: "অ্যাডমিন সেটিংস" },
  { label: "👤 সেগমেন্ট", keywords: ["সেগমেন্ট", "segment", "গ্রুপ", "ভাগ"], path: "/admin/segments", description: "কাস্টমার সেগমেন্ট ম্যানেজ করুন" },
];

const QUICK_SUGGESTIONS = [
  "📊 ড্যাশবোর্ড সামারি দেখাও",
  "⚠️ লো স্টক প্রোডাক্ট দেখাও",
  "🛒 আজকের অর্ডার দেখাও",
  "➕ নতুন প্রোডাক্ট যুক্ত করো",
  "📦 ১০টি বোরকা ভেরিয়েন্টসহ যুক্ত করো",
  "📈 রেভিনিউ রিপোর্ট দেখাও",
];

// Match user input to a command
function matchCommand(text: string): Command | null {
  const lower = text.toLowerCase().trim();
  for (const cmd of ADMIN_COMMANDS) {
    for (const kw of cmd.keywords) {
      if (lower.includes(kw.toLowerCase())) return cmd;
    }
  }
  return null;
}

// Navigation command patterns
const NAV_PATTERNS = [
  { pattern: /(?:যাও|ওপেন|খোলো|দেখাও|নিয়ে যাও|go to|open|navigate|show)\s*(.+)/i, extract: 1 },
  { pattern: /(.+)\s*(?:পেইজ|পেজ|page)\s*(?:যাও|খোলো|ওপেন)?/i, extract: 1 },
  { pattern: /(.+)\s*(?:ম্যানেজ|manage)/i, extract: 1 },
];

// ─── Voice Input Hook ────────────────────────────────────────
function useVoiceInput() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const accumulatedTextRef = useRef("");
  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSafari = typeof navigator !== "undefined" && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const supported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      try { recognitionRef.current?.abort(); } catch { /* ignore */ }
    };
  }, []);

  const createRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.lang = "bn-BD";
    recognition.continuous = !(isIOS || isSafari);
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interimText = "";
      let sessionFinal = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          sessionFinal += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }
      const baseText = accumulatedTextRef.current;
      setTranscript((baseText + sessionFinal + interimText).trim());
      if (sessionFinal) {
        accumulatedTextRef.current = (baseText + sessionFinal).trim() + " ";
      }
    };

    recognition.onend = () => {
      if (isListeningRef.current && !isIOS && !isSafari) {
        try {
          const newRecognition = createRecognition();
          if (newRecognition) {
            recognitionRef.current = newRecognition;
            newRecognition.start();
          }
        } catch {
          isListeningRef.current = false;
          setIsListening(false);
        }
      } else if (isIOS || isSafari) {
        isListeningRef.current = false;
        setIsListening(false);
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      if (e.error === "not-allowed") {
        isListeningRef.current = false;
        setIsListening(false);
        return;
      }
      if (!isListeningRef.current) setIsListening(false);
    };

    return recognition;
  }, [isIOS, isSafari]);

  const startListening = useCallback(() => {
    if (!supported) return;
    try { recognitionRef.current?.abort(); } catch { /* ignore */ }

    const recognition = createRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;
    isListeningRef.current = true;
    accumulatedTextRef.current = "";

    try {
      recognition.start();
      setIsListening(true);
      setTranscript("");
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      isListeningRef.current = false;
      setIsListening(false);
    }
  }, [supported, createRecognition]);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    setIsListening(false);
  }, []);

  return { isListening, transcript, startListening, stopListening, supported, clearTranscript: () => { setTranscript(""); accumulatedTextRef.current = ""; } };
}

const AdminAIChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "আসসালামু আলাইকুম! 👋 আমি আপনার **অ্যাডমিন AI এজেন্ট**।\n\nআমি আপনাকে সাহায্য করতে পারি:\n- 📊 ড্যাশবোর্ড ও রিপোর্ট\n- 📦 ইনভেন্টরি ম্যানেজমেন্ট\n- 🛒 অর্ডার ম্যানেজমেন্ট\n- 💰 প্রাইসিং ও কুপন\n- 👥 কাস্টমার ডেটা\n\n**কমান্ড দেখতে** `/help` লিখুন। কী করতে চান?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const voice = useVoiceInput();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Sync voice transcript to input
  useEffect(() => {
    if (voice.transcript) setInput(voice.transcript);
  }, [voice.transcript]);

  // Check for navigation commands locally
  const handleLocalCommand = useCallback((text: string): boolean => {
    const trimmed = text.trim();

    // /help command
    if (trimmed === "/help" || trimmed === "হেল্প" || trimmed === "কমান্ড" || trimmed === "commands") {
      const commandList = ADMIN_COMMANDS.map(c => `- ${c.label} → *${c.description}*`).join("\n");
      setMessages(prev => [...prev,
        { id: Date.now().toString(), role: "user", content: trimmed, timestamp: new Date() },
        { id: (Date.now() + 1).toString(), role: "assistant", content: `## 📋 উপলব্ধ কমান্ড সমূহ\n\nযেকোনো কমান্ডে ক্লিক করুন অথবা টাইপ করুন:\n\n${commandList}\n\n💡 **টিপস:** আপনি সরাসরি বাংলায় লিখতে পারেন, যেমন: "অর্ডার দেখাও", "কুপন ম্যানেজ করো" ইত্যাদি।`, timestamp: new Date() }
      ]);
      setInput("");
      voice.clearTranscript();
      return true;
    }

    // Check for navigation commands
    const cmd = matchCommand(trimmed);
    if (cmd?.path) {
      // Check if it's a navigation intent
      const isNavIntent = NAV_PATTERNS.some(p => p.pattern.test(trimmed)) ||
        trimmed.includes("যাও") || trimmed.includes("খোলো") || trimmed.includes("ওপেন") ||
        trimmed.includes("দেখাও") || trimmed.includes("ম্যানেজ") ||
        // Direct label click
        ADMIN_COMMANDS.some(c => c.label === trimmed);

      if (isNavIntent || ADMIN_COMMANDS.some(c => c.label === trimmed)) {
        setMessages(prev => [...prev,
          { id: Date.now().toString(), role: "user", content: trimmed, timestamp: new Date() },
          { id: (Date.now() + 1).toString(), role: "assistant", content: `✅ **${cmd.label}** পেইজে নিয়ে যাচ্ছি...\n\n${cmd.description}`, timestamp: new Date() }
        ]);
        setInput("");
        voice.clearTranscript();
        setTimeout(() => navigate(cmd.path!), 500);
        return true;
      }
    }

    return false;
  }, [navigate, voice]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    if (voice.isListening) voice.stopListening();

    // Try local commands first
    if (handleLocalCommand(text)) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    voice.clearTranscript();
    setIsLoading(true);

    try {
      const chatHistory = messages.filter(m => m.id !== "welcome").concat(userMsg).slice(-12).map(m => ({ role: m.role, content: m.content }));

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: chatHistory }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.error || "সমস্যা হয়েছে");
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message || "কোনো উত্তর পাওয়া যায়নি।",
        timestamp: new Date(),
      }]);
    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `❌ ${error.message || "দুঃখিত, সমস্যা হয়েছে। আবার চেষ্টা করুন।"}`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, voice, handleLocalCommand]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
          >
            <Bot className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-6rem)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Admin AI Agent</h3>
                  <p className="text-[10px] text-muted-foreground">টাস্ক ও ইনভেন্টরি ম্যানেজমেন্ট</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCommands(!showCommands)}
                  className="h-7 text-[10px] px-2"
                >
                  {showCommands ? "বন্ধ" : "📋 কমান্ড"}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Command Grid Panel */}
            <AnimatePresence>
              {showCommands && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-border"
                >
                  <div className="p-3 max-h-[200px] overflow-y-auto grid grid-cols-2 gap-1.5">
                    {ADMIN_COMMANDS.map((cmd) => (
                      <button
                        key={cmd.path}
                        onClick={() => {
                          setShowCommands(false);
                          sendMessage(cmd.label);
                        }}
                        className="text-left text-[11px] px-2.5 py-2 rounded-lg bg-muted/50 hover:bg-primary/10 border border-border hover:border-primary/30 transition-colors"
                        title={cmd.description}
                      >
                        {cmd.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  )}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&_table]:text-xs [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_td]:border [&_td]:border-border [&_ul]:my-1 [&_ol]:my-1 [&_p]:my-1 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>চিন্তা করছি...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions (only when few messages) */}
            {messages.length <= 2 && !isLoading && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {QUICK_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s.replace(/^[^\s]+\s/, ""))}
                    className="text-[11px] px-2.5 py-1.5 rounded-full bg-primary/5 border border-primary/20 text-foreground hover:bg-primary/10 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Voice Recording Indicator */}
            {voice.isListening && (
              <div className="px-4 pb-2">
                <div className="flex items-center gap-2 bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
                  <span className="w-2.5 h-2.5 bg-destructive rounded-full animate-pulse" />
                  <span className="text-xs text-destructive flex-1">🎤 শুনছি... কথা বলুন</span>
                  <button onClick={voice.stopListening} className="text-xs text-destructive font-medium hover:underline">বন্ধ</button>
                </div>
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 border-t border-border">
              {/* Voice Input Button */}
              <button
                type="button"
                onClick={() => {
                  if (!voice.supported) {
                    toast({ title: "ভয়েস সাপোর্ট নেই", description: "Chrome/Safari ব্রাউজার ব্যবহার করুন।", variant: "destructive" });
                    return;
                  }
                  voice.isListening ? voice.stopListening() : voice.startListening();
                }}
                className={cn(
                  "p-2 rounded-full transition-colors shrink-0",
                  voice.isListening ? "bg-destructive/10 text-destructive" : "hover:bg-muted text-muted-foreground"
                )}
                title={voice.isListening ? "রেকর্ডিং বন্ধ" : "ভয়েস ইনপুট"}
                disabled={isLoading}
              >
                {voice.isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={voice.isListening ? "কথা বলুন..." : "/help বা কমান্ড লিখুন..."}
                className="flex-1 text-sm h-9"
                disabled={isLoading}
              />
              <Button type="submit" size="icon" disabled={!input.trim() || isLoading} className="h-9 w-9 shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AdminAIChat;