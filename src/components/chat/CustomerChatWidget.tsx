import { useState, useRef, useEffect, forwardRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Image, Loader2, ShoppingBag, Package, Truck, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";

// ─── Types ───────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  products?: Product[];
  orders?: OrderInfo[];
  orderResult?: OrderResult;
  hasMoreProducts?: boolean;
  searchContext?: { category?: string; query?: string; offset?: number };
  timestamp: Date;
  isStreaming?: boolean;
}

interface Product {
  id: string;
  name: string;
  price: number;
  sale_price: number | null;
  image_url: string | null;
  category: string;
  stock: number;
  description?: string;
  average_rating?: string;
  review_count?: number;
}

interface OrderInfo {
  id: string;
  order_short_id: string;
  status: string;
  status_text: string;
  total: number;
  created_at: string;
  tracking_number?: string;
  courier_name?: string;
  estimated_delivery?: string;
  items?: { product_name: string; quantity: number; price: number }[];
}

interface OrderResult {
  success: boolean;
  order_short_id: string;
  items: string[];
  subtotal: number;
  shipping_charge: number;
  grand_total: number;
  payment_method: string;
  customer_name: string;
  phone: string;
  city: string;
}

// ─── Sub-components ──────────────────────────────────────────
const ProductCard = forwardRef<HTMLDivElement, { product: Product; onAddToCart: (p: Product) => void; onViewDetail: (p: Product) => void; onSelect?: (p: Product) => void }>(({ product, onAddToCart, onViewDetail, onSelect }, ref) => (
  <div 
    ref={ref}
    className="bg-background rounded-xl border border-border/60 overflow-hidden cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
    onClick={() => onSelect?.(product)}
  >
    {/* Large Product Image */}
    <div 
      className="w-full aspect-[4/5] overflow-hidden bg-muted cursor-pointer"
      onClick={(e) => { e.stopPropagation(); onViewDetail(product); }}
    >
      {product.image_url ? (
        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" loading="lazy" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">ছবি নেই</div>
      )}
    </div>
    {/* Product Info */}
    <div className="p-2.5 space-y-1.5">
      <p 
        className="font-semibold text-sm leading-tight text-foreground hover:text-primary cursor-pointer transition-colors line-clamp-2"
        onClick={(e) => { e.stopPropagation(); onViewDetail(product); }}
      >
        {product.name}
      </p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {product.sale_price ? (
            <>
              <span className="text-primary font-bold text-base">৳{product.sale_price.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground line-through">৳{product.price.toLocaleString()}</span>
            </>
          ) : (
            <span className="text-primary font-bold text-base">৳{product.price.toLocaleString()}</span>
          )}
        </div>
        <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded-full", product.stock > 0 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400")}>
          {product.stock > 0 ? `স্টক: ${product.stock}` : "স্টক নেই"}
        </span>
      </div>
      <Button size="sm" className="w-full h-8 text-xs" onClick={(e) => { e.stopPropagation(); onAddToCart(product); }} disabled={product.stock === 0}>
        <ShoppingBag className="w-3.5 h-3.5 mr-1" />
        কার্টে যোগ করুন
      </Button>
    </div>
  </div>
));
ProductCard.displayName = "ProductCard";

const OrderCard = ({ order }: { order: OrderInfo }) => (
  <div className="bg-background rounded-lg p-3 border border-border/50 space-y-2">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Package className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm">#{order.order_short_id}</span>
      </div>
      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{order.status_text}</span>
    </div>
    {order.items && order.items.length > 0 && (
      <div className="space-y-1">
        {order.items.map((item, i) => (
          <div key={i} className="text-xs text-muted-foreground flex justify-between">
            <span>{item.product_name} x{item.quantity}</span>
            <span>৳{(item.price * item.quantity).toLocaleString()}</span>
          </div>
        ))}
      </div>
    )}
    <div className="flex items-center justify-between text-sm border-t border-border/50 pt-1.5">
      <span className="text-muted-foreground">মোট:</span>
      <span className="font-bold text-primary">৳{Number(order.total).toLocaleString()}</span>
    </div>
    {order.tracking_number && (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Truck className="w-3 h-3" /><span>{order.courier_name}: {order.tracking_number}</span>
      </div>
    )}
  </div>
);

const OrderConfirmation = ({ result }: { result: OrderResult }) => (
  <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 border border-green-200 dark:border-green-800 space-y-2">
    <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
      <span className="text-lg">✅</span>
      <span className="font-bold text-sm">অর্ডার কনফার্মড!</span>
    </div>
    <div className="text-xs space-y-1 text-foreground">
      <p><strong>অর্ডার ID:</strong> #{result.order_short_id}</p>
      <p><strong>নাম:</strong> {result.customer_name}</p>
      <p><strong>ফোন:</strong> {result.phone}</p>
    </div>
    <div className="border-t border-green-200 dark:border-green-800 pt-1.5 text-xs space-y-0.5">
      {result.items.map((item, i) => <p key={i} className="text-foreground">{item}</p>)}
    </div>
    <div className="border-t border-green-200 dark:border-green-800 pt-1.5 text-xs space-y-0.5">
      <div className="flex justify-between"><span>সাবটোটাল:</span><span>৳{result.subtotal.toLocaleString()}</span></div>
      <div className="flex justify-between"><span>শিপিং:</span><span>৳{result.shipping_charge.toLocaleString()}</span></div>
      <div className="flex justify-between font-bold text-sm text-primary"><span>মোট:</span><span>৳{result.grand_total.toLocaleString()}</span></div>
    </div>
  </div>
);

// ─── Voice hooks ─────────────────────────────────────────────
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
        if (result.isFinal) sessionFinal += result[0].transcript;
        else interimText += result[0].transcript;
      }
      const baseText = accumulatedTextRef.current;
      const combined = (baseText + sessionFinal + interimText).trim();
      setTranscript(combined);
      if (sessionFinal) accumulatedTextRef.current = (baseText + sessionFinal).trim() + " ";
    };

    recognition.onend = () => {
      if (isListeningRef.current && !isIOS && !isSafari) {
        try {
          const newRecognition = createRecognition();
          if (newRecognition) { recognitionRef.current = newRecognition; newRecognition.start(); }
        } catch { isListeningRef.current = false; setIsListening(false); }
      } else if (isIOS || isSafari) {
        isListeningRef.current = false;
        setIsListening(false);
      }
    };

    recognition.onerror = (e: any) => {
      console.log("Speech recognition error:", e.error);
      if (e.error === "no-speech" || e.error === "aborted") return;
      if (e.error === "not-allowed") { isListeningRef.current = false; setIsListening(false); return; }
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
    try { recognition.start(); setIsListening(true); setTranscript(""); }
    catch (err) { console.error("Failed to start speech recognition:", err); isListeningRef.current = false; setIsListening(false); }
  }, [supported, createRecognition]);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    setIsListening(false);
  }, []);

  return { isListening, transcript, startListening, stopListening, supported, clearTranscript: () => { setTranscript(""); accumulatedTextRef.current = ""; } };
}

function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  const speak = useCallback((text: string) => {
    if (!supported || !ttsEnabled) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*_#`~\[\]()>|]/g, "").replace(/\n+/g, ". ");
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = "bn-BD";
    utterance.rate = 0.95;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [supported, ttsEnabled]);

  const stop = useCallback(() => { window.speechSynthesis?.cancel(); setIsSpeaking(false); }, []);

  return { isSpeaking, ttsEnabled, setTtsEnabled, speak, stop, supported };
}

// ─── Image compression helper ────────────────────────────────
function compressImage(dataUrl: string, maxWidth = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl); // fallback to original
    img.src = dataUrl;
  });
}

// ─── Streaming helper ────────────────────────────────────────
interface StreamMeta {
  products?: Product[];
  orders?: OrderInfo[];
  order_result?: OrderResult;
  has_more?: boolean;
  search_context?: { category?: string; query?: string; offset?: number };
}

async function streamChat({
  messages,
  onMeta,
  onDelta,
  onDone,
}: {
  messages: any[];
  onMeta: (meta: StreamMeta) => void;
  onDelta: (text: string) => void;
  onDone: () => void;
}) {
  const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/customer-chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, stream: true }),
  });

  if (!resp.ok || !resp.body) {
    const data = await resp.json();
    if (data.error) throw new Error(data.error);
    if (data.products) onMeta({ products: data.products, orders: data.orders, order_result: data.order_result, has_more: data.has_more, search_context: data.search_context });
    onDelta(data.message || "");
    onDone();
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let metaParsed = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIdx: number;
    while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, newlineIdx);
      buffer = buffer.slice(newlineIdx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") { onDone(); return; }
      if (!jsonStr) continue;

      try {
        const parsed = JSON.parse(jsonStr);
        if (!metaParsed && parsed.type === "metadata") {
          onMeta({ products: parsed.products, orders: parsed.orders, order_result: parsed.order_result, has_more: parsed.has_more, search_context: parsed.search_context });
          metaParsed = true;
          continue;
        }
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }

  if (buffer.trim()) {
    for (const raw of buffer.split("\n")) {
      if (!raw || !raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]" || !jsonStr) continue;
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.type === "metadata" && !metaParsed) {
          onMeta({ products: parsed.products, orders: parsed.orders, order_result: parsed.order_result, has_more: parsed.has_more, search_context: parsed.search_context });
          continue;
        }
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch { /* ignore */ }
    }
  }
  onDone();
}

// ─── Build chat history helper ───────────────────────────────
function buildChatHistory(messages: Message[]): any[] {
  // Include welcome message in history so AI remembers its greeting
  const recentMessages = messages.slice(-20);
  return recentMessages.map((m) => ({
    role: m.role,
    content: m.imageUrl
      ? [
          { type: "text", text: m.content || "এই ছবি সম্পর্কে জানতে চাই" },
          { type: "image_url", image_url: { url: m.imageUrl } },
        ]
      : m.content,
  }));
}

// ─── Shared send logic ───────────────────────────────────────
function triggerStreamedResponse({
  chatHistory,
  setMessages,
  setIsLoading,
  ttsSpeak,
}: {
  chatHistory: any[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setIsLoading: (v: boolean) => void;
  ttsSpeak: (text: string) => void;
}) {
  const assistantId = (Date.now() + 1).toString();
  setIsLoading(true);
  setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", timestamp: new Date(), isStreaming: true }]);

  let fullContent = "";
  streamChat({
    messages: chatHistory,
    onMeta: (meta) => {
      setMessages((prev) =>
        prev.map((m) => m.id === assistantId ? { ...m, products: meta.products, orders: meta.orders, orderResult: meta.order_result, hasMoreProducts: meta.has_more, searchContext: meta.search_context } : m)
      );
    },
    onDelta: (chunk) => {
      fullContent += chunk;
      const current = fullContent;
      setMessages((prev) =>
        prev.map((m) => m.id === assistantId ? { ...m, content: current } : m)
      );
    },
    onDone: () => {
      setMessages((prev) =>
        prev.map((m) => m.id === assistantId ? { ...m, isStreaming: false } : m)
      );
      if (fullContent) ttsSpeak(fullContent);
    },
  }).catch((error) => {
    console.error("Chat error:", error);
    // Specific error messages based on error type
    let errorMsg = "দুঃখিত, একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।";
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      errorMsg = "ইন্টারনেট সংযোগ নেই বা সার্ভারে সমস্যা। আপনার ইন্টারনেট চেক করে আবার চেষ্টা করুন। 🌐";
    } else if (error?.message?.includes("timeout") || error?.name === "AbortError") {
      errorMsg = "সার্ভার থেকে উত্তর পেতে দেরি হচ্ছে। কিছুক্ষণ পর আবার চেষ্টা করুন। ⏳";
    } else if (error?.message?.includes("rate limit") || error?.message?.includes("429")) {
      errorMsg = "অনেক বেশি মেসেজ পাঠানো হয়েছে। কিছুক্ষণ অপেক্ষা করে আবার চেষ্টা করুন। 🕐";
    }
    setMessages((prev) => {
      const filtered = prev.filter(m => !m.isStreaming);
      return [...filtered, {
        id: (Date.now() + 2).toString(),
        role: "assistant" as const,
        content: errorMsg,
        timestamp: new Date(),
      }];
    });
  }).finally(() => {
    setIsLoading(false);
  });
}

// ─── Main Component ──────────────────────────────────────────
const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: "আসসালামু আলাইকুম! 👋\n\nআমি **এরশাদ হোসেন**, আপনার সুন্দর নামটা জানতে পারি?\n\n১. আমি এখানে নতুন প্রোডাক্ট দেখাতে পারি\n২. আপনার অর্ডার নিতে পারি\n৩. আপনার প্রশ্নের উত্তর দিয়ে সহযোগীতা করতে পারি 😊",
  timestamp: new Date(),
};

const CHAT_STORAGE_KEY = "dbh_chat_messages";

const loadPersistedMessages = (): Message[] => {
  try {
    const stored = sessionStorage.getItem(CHAT_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
    }
  } catch {}
  return [WELCOME_MESSAGE];
};

const CustomerChatWidget = forwardRef<HTMLDivElement>((_, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(loadPersistedMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToCart } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const voice = useVoiceInput();
  const tts = useTTS();

  // Persist messages to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (voice.transcript) setInput(voice.transcript);
  }, [voice.transcript]);

  const handleSend = async () => {
    const messageText = input.trim();
    if (!messageText && !selectedImage) return;
    if (voice.isListening) voice.stopListening();

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      imageUrl: selectedImage || undefined,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    voice.clearTranscript();
    setSelectedImage(null);

    const allMessages = [...messages, userMessage];
    const chatHistory = buildChatHistory(allMessages);

    triggerStreamedResponse({
      chatHistory,
      setMessages,
      setIsLoading,
      ttsSpeak: tts.speak,
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "ছবি অনেক বড়", description: "5MB এর ছোট ছবি দিন", variant: "destructive" });
      return;
    }
    try {
      toast({ title: "ছবি আপলোড হচ্ছে..." });
      const { uploadToCloudinary } = await import("@/lib/cloudinary");
      const result = await uploadToCloudinary(file, "chat");
      if (!result.success || !result.url) {
        throw new Error(result.error || "Upload failed");
      }
      setSelectedImage(result.url);
      toast({ title: "ছবি যোগ হয়েছে ✅" });
    } catch (err: any) {
      toast({ title: "আপলোড ব্যর্থ", description: err.message, variant: "destructive" });
    }
  };

  const handleAddToCart = async (product: Product) => {
    await addToCart(product.id, 1);
    toast({ title: "কার্টে যোগ হয়েছে ✅", description: product.name });
  };

  const handleViewDetail = (product: Product) => {
    navigate(`/product/${product.id}`);
    // Don't close chat — keep history visible when user returns
  };

  const handleSelectProduct = (product: Product) => {
    const msg = `আমি "${product.name}" (ID: ${product.id}) অর্ডার করতে চাই। দাম: ৳${(product.sale_price || product.price).toLocaleString()}`;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: msg,
      timestamp: new Date(),
    };

    setMessages((prev) => {
      const updatedMessages = [...prev, userMessage];
      const chatHistory = buildChatHistory(updatedMessages);

      setTimeout(() => {
        triggerStreamedResponse({
          chatHistory,
          setMessages,
          setIsLoading,
          ttsSpeak: tts.speak,
        });
      }, 0);

      return updatedMessages;
    });
  };

  const handleShowMore = (message: Message) => {
    const ctx = message.searchContext;
    const nextOffset = (ctx?.offset ?? 0) + 5;
    let loadMoreMsg = "আরো প্রোডাক্ট দেখান";
    if (ctx?.category) {
      loadMoreMsg = `আরো ${ctx.category} দেখান (offset: ${nextOffset})`;
    } else if (ctx?.query) {
      loadMoreMsg = `"${ctx.query}" এর আরো প্রোডাক্ট দেখান (offset: ${nextOffset})`;
    } else {
      loadMoreMsg = `আরো প্রোডাক্ট দেখান (offset: ${nextOffset})`;
    }

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: loadMoreMsg, timestamp: new Date() };

    setMessages((prev) => {
      const updated = [...prev];
      const idx = updated.findIndex(m => m.id === message.id);
      if (idx !== -1) updated[idx] = { ...updated[idx], hasMoreProducts: false };
      updated.push(userMsg);

      const chatHistory = buildChatHistory(updated);

      setTimeout(() => {
        triggerStreamedResponse({
          chatHistory,
          setMessages,
          setIsLoading,
          ttsSpeak: tts.speak,
        });
      }, 0);

      return updated;
    });
  };

  const quickActions = [
    { label: "🛍️ প্রোডাক্ট", action: "জনপ্রিয় প্রোডাক্টগুলো দেখান" },
    { label: "📦 অর্ডার ট্র্যাক", action: "আমার অর্ডার ট্র্যাক করতে চাই" },
    { label: "🏷️ অফার", action: "চলমান অফার ও কুপন কোড জানান" },
    { label: "🚚 ডেলিভারি", action: "ডেলিভারি চার্জ ও সময় কত?" },
    { label: "📋 ক্যাটেগরি", action: "কোন কোন ক্যাটেগরি আছে?" },
  ];

  return (
    <>
      {/* Chat Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-all",
          isOpen && "hidden"
        )}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        aria-label="চ্যাট খুলুন"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background" />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed inset-0 z-50 w-full h-[100dvh] sm:inset-auto sm:bottom-4 sm:right-4 sm:w-[380px] sm:max-w-[calc(100vw-2rem)] sm:h-[600px] sm:max-h-[85vh] bg-background border-0 sm:border sm:border-border sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden supports-[height:100dvh]:h-[100dvh]"
          >
            {/* Header */}
            <div className="bg-primary text-primary-foreground p-2.5 sm:p-3 flex items-center justify-between shrink-0 pt-[calc(0.625rem+env(safe-area-inset-top))] sm:pt-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                  <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-xs sm:text-sm">সাপোর্ট এ কথা বলুন</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full animate-pulse" />
                    <p className="text-[10px] sm:text-xs opacity-80">অনলাইন • ২৪/৭</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-0.5 sm:gap-1">
                {tts.supported && (
                  <button
                    onClick={() => { tts.setTtsEnabled(!tts.ttsEnabled); if (tts.isSpeaking) tts.stop(); }}
                    className={cn("p-1 sm:p-1.5 rounded-full transition-colors", tts.ttsEnabled ? "bg-primary-foreground/30" : "hover:bg-primary-foreground/20")}
                    title={tts.ttsEnabled ? "ভয়েস আউটপুট বন্ধ করুন" : "ভয়েস আউটপুট চালু করুন"}
                  >
                    {tts.ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 opacity-60" />}
                  </button>
                )}
                <button onClick={() => { setIsOpen(false); tts.stop(); }} className="p-1 sm:p-1.5 hover:bg-primary-foreground/20 rounded-full transition-colors">
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.map((message) => (
                <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[88%] rounded-2xl p-2.5",
                    message.role === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md"
                  )}>
                    {message.imageUrl && <img src={message.imageUrl} alt="Uploaded" className="max-w-full h-auto rounded-lg mb-2 max-h-40" />}
                    
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-0.5 text-sm">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                      {message.isStreaming && !message.content && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Loader2 className="w-3 h-3 animate-spin" /> টাইপিং...
                        </span>
                      )}
                      {message.isStreaming && message.content && (
                        <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5 align-text-bottom" />
                      )}
                    </div>

                    {/* Product Cards */}
                    {message.products && message.products.length > 0 && (
                      <div className="mt-2.5 space-y-3">
                        {message.products.map((product) => (
                          <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} onViewDetail={handleViewDetail} onSelect={handleSelectProduct} />
                        ))}
                        {message.hasMoreProducts && !message.isStreaming && (
                          <button
                            onClick={() => handleShowMore(message)}
                            disabled={isLoading}
                            className="w-full py-2.5 text-sm font-semibold text-primary hover:bg-primary/10 rounded-xl border-2 border-primary/40 transition-colors flex items-center justify-center gap-2"
                          >
                            <ShoppingBag className="w-4 h-4" />
                            আরো দেখুন
                          </button>
                        )}
                      </div>
                    )}

                    {/* Order Cards */}
                    {message.orders && message.orders.length > 0 && (
                      <div className="mt-2.5 space-y-2">
                        {message.orders.map((order) => <OrderCard key={order.id} order={order} />)}
                      </div>
                    )}

                    {/* Order Confirmation */}
                    {message.orderResult && <div className="mt-2.5"><OrderConfirmation result={message.orderResult} /></div>}

                    {!message.isStreaming && (
                      <p className="text-[10px] opacity-50 mt-1">
                        {message.timestamp.toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && !messages.some(m => m.isStreaming) && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-md p-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">প্রসেস করছি...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            {messages.length <= 4 && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
                {quickActions.map((action) => (
                  <button key={action.label} onClick={() => setInput(action.action)}
                    className="text-xs px-2.5 py-1 bg-muted hover:bg-accent rounded-full transition-colors border border-border/50">
                    {action.label}
                  </button>
                ))}
              </div>
            )}

            {/* Voice Recording Indicator */}
            {voice.isListening && (
              <div className="px-3 pb-2 shrink-0">
                <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                  <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs text-red-700 dark:text-red-400 flex-1">🎤 শুনছি... কথা বলুন</span>
                  <button onClick={voice.stopListening} className="text-xs text-red-600 font-medium hover:underline">বন্ধ</button>
                </div>
              </div>
            )}

            {/* Image Preview */}
            {selectedImage && (
              <div className="px-3 pb-2 shrink-0">
                <div className="relative inline-block">
                  <img src={selectedImage} alt="Selected" className="h-16 w-auto rounded-lg" />
                  <button onClick={() => setSelectedImage(null)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-2 sm:p-3 border-t border-border shrink-0 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              <div className="flex items-center gap-1">
                <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageSelect} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="p-1.5 sm:p-2 hover:bg-muted rounded-full transition-colors shrink-0" title="ছবি">
                  <Image className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                </button>
                
                {/* Voice Input Button */}
                <button
                  onClick={() => {
                    if (!voice.supported) {
                      toast({ title: "ভয়েস সাপোর্ট নেই", description: "আপনার ব্রাউজার ভয়েস ইনপুট সাপোর্ট করে না। Chrome/Safari ব্রাউজার ব্যবহার করুন।", variant: "destructive" });
                      return;
                    }
                    voice.isListening ? voice.stopListening() : voice.startListening();
                  }}
                  className={cn(
                    "p-1.5 sm:p-2 rounded-full transition-colors shrink-0",
                    voice.isListening ? "bg-red-100 dark:bg-red-900/30 text-red-600" : "hover:bg-muted text-muted-foreground"
                  )}
                  title={voice.isListening ? "রেকর্ডিং বন্ধ" : "ভয়েস মেসেজ"}
                  disabled={isLoading}
                >
                  {voice.isListening ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>

                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder={voice.isListening ? "কথা বলুন..." : "মেসেজ লিখুন..."}
                  className="flex-1 h-9 sm:h-10 text-sm"
                  disabled={isLoading}
                />
                <Button onClick={handleSend} disabled={isLoading || (!input.trim() && !selectedImage)} size="icon" className="h-9 w-9 sm:h-10 sm:w-10 shrink-0">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

CustomerChatWidget.displayName = "CustomerChatWidget";

export default CustomerChatWidget;
