import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, RefreshCw, Cloud, Trash2, ExternalLink, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCloudinaryRecentFailures, clearCloudinaryFailures } from "@/lib/storage-upload";
import { toast } from "sonner";

interface StatusResult {
  success: boolean;
  reachable?: boolean;
  reason?: string;
  message?: string;
  cloud_name?: string | null;
  api_key_masked?: string;
  api_secret_present?: boolean;
  http_status?: number;
  latency_ms?: number;
  configured?: boolean;
  checked_at?: string;
}

const REASON_LABELS: Record<string, { title: string; hint: string }> = {
  missing_credentials: {
    title: "ক্রেডেন্শিয়াল সেট নেই",
    hint: "Backend → Secrets-এ CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY এবং CLOUDINARY_API_SECRET — তিনটিই যোগ করুন।",
  },
  invalid_cloud_name: {
    title: "ভুল cloud_name",
    hint: "Cloudinary Dashboard থেকে সঠিক Cloud name কপি করে CLOUDINARY_CLOUD_NAME সিক্রেটে আপডেট করুন।",
  },
  invalid_credentials: {
    title: "ভুল API key/secret",
    hint: "Cloudinary Settings → API Keys থেকে সঠিক key/secret কপি করে আপডেট করুন।",
  },
  rate_limited: {
    title: "Rate limit ছাড়িয়েছে",
    hint: "Cloudinary plan-এর কোটা শেষ। কিছুক্ষণ অপেক্ষা করুন বা plan upgrade করুন।",
  },
  api_error: { title: "Cloudinary API ত্রুটি", hint: "নিচের message চেক করুন।" },
  network_error: { title: "Network ত্রুটি", hint: "Edge function থেকে Cloudinary-এ পৌঁছানো যায়নি।" },
  exception: { title: "Unexpected exception", hint: "Edge function logs দেখুন।" },
};

export default function CloudinarySettings() {
  const [status, setStatus] = useState<StatusResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [failures, setFailures] = useState(getCloudinaryRecentFailures());

  const check = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cloudinary-status");
      if (error) {
        setStatus({ success: false, message: error.message, reason: "network_error" });
        toast.error("Status check failed", { description: error.message });
      } else {
        setStatus(data as StatusResult);
        if ((data as StatusResult).success) toast.success("Cloudinary connected ✓");
        else toast.warning("Cloudinary issue detected", { description: (data as StatusResult).message });
      }
    } catch (e: any) {
      setStatus({ success: false, message: e?.message || String(e), reason: "exception" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reason = status?.reason ? REASON_LABELS[status.reason] : null;

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Cloud className="h-6 w-6" /> Cloudinary Settings
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Lovable Cloud (primary) + Cloudinary (mirror) — Cloudinary fail করলে Lovable Cloud URL automatic fallback হবে।
            </p>
          </div>
          <Button onClick={check} disabled={loading} variant="outline">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Test Connection
          </Button>
        </div>

        {/* Status card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {status?.success ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span>Connected</span>
                  <Badge variant="secondary">{status.latency_ms}ms</Badge>
                </>
              ) : status ? (
                <>
                  <XCircle className="h-5 w-5 text-destructive" />
                  <span>Not Working</span>
                </>
              ) : (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Checking…</span>
                </>
              )}
            </CardTitle>
            <CardDescription>
              {status?.checked_at && `Last checked: ${new Date(status.checked_at).toLocaleString()}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="border rounded-lg p-3">
                <div className="text-xs text-muted-foreground">Cloud name</div>
                <div className="font-mono mt-1 truncate">{status?.cloud_name || <span className="text-destructive">—</span>}</div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-xs text-muted-foreground">API key</div>
                <div className="font-mono mt-1">{status?.api_key_masked || <span className="text-destructive">—</span>}</div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-xs text-muted-foreground">API secret</div>
                <div className="mt-1">
                  {status?.api_secret_present ? (
                    <Badge variant="secondary">Set ✓</Badge>
                  ) : (
                    <Badge variant="destructive">Missing</Badge>
                  )}
                </div>
              </div>
            </div>

            {!status?.success && reason && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{reason.title}</AlertTitle>
                <AlertDescription className="space-y-1">
                  <div>{reason.hint}</div>
                  {status?.message && (
                    <div className="text-xs opacity-80 font-mono break-all">
                      {status.http_status ? `HTTP ${status.http_status} • ` : ""}{status.message}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {!status?.success && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>আপলোড চলবে — fallback সক্রিয়</AlertTitle>
                <AlertDescription>
                  Cloudinary fail করলেও ইমেজ Lovable Cloud Storage-এ সংরক্ষিত হচ্ছে। প্রোডাক্টে সেই URL ব্যবহৃত হবে।
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Update credentials */}
        <Card>
          <CardHeader>
            <CardTitle>Update Credentials</CardTitle>
            <CardDescription>
              নিরাপত্তার জন্য Cloudinary secret-গুলো Backend Secrets-এ এনক্রিপ্টেড আকারে রাখা হয় — UI থেকে সরাসরি দেখানো বা সম্পাদনা করা হয় না।
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ol className="list-decimal list-inside text-sm space-y-2 text-muted-foreground">
              <li><span className="text-foreground font-medium">Cloudinary Dashboard</span>-এ লগইন করুন → Settings → API Keys।</li>
              <li>
                Cloud name, API Key, API Secret — তিনটিই কপি করুন।
                <a
                  href="https://console.cloudinary.com/settings/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 ml-2 text-primary hover:underline"
                >
                  Open <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                নিচের তিনটি সিক্রেটে আপডেট করুন (Lovable চ্যাটে বলুন: <em>"Cloudinary সিক্রেট আপডেট করতে চাই"</em>) অথবা সরাসরি Backend secrets থেকে:
                <ul className="list-disc list-inside ml-4 mt-1 font-mono text-xs">
                  <li>CLOUDINARY_CLOUD_NAME</li>
                  <li>CLOUDINARY_API_KEY</li>
                  <li>CLOUDINARY_API_SECRET</li>
                </ul>
              </li>
              <li>আপডেট হলে এই পেজে <strong>Test Connection</strong> চাপুন।</li>
            </ol>

            <Alert>
              <AlertTitle className="text-sm">Upload preset (unsigned) প্রয়োজন নেই</AlertTitle>
              <AlertDescription className="text-xs">
                এই প্রজেক্টে signed upload ব্যবহার হয় — শুধু API Key + Secret থাকলেই চলবে।
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Recent failures log */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Recent Failures (last 20)</CardTitle>
              <CardDescription>ব্রাউজারে সংরক্ষিত Cloudinary mirror error log।</CardDescription>
            </div>
            {failures.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearCloudinaryFailures();
                  setFailures([]);
                  toast.success("Log cleared");
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {failures.length === 0 ? (
              <p className="text-sm text-muted-foreground">কোনো recent failure নেই ✓</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {failures.map((f, i) => (
                  <div key={i} className="text-xs border rounded p-2 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">{new Date(f.at).toLocaleString()}</span>
                      {f.reason && <Badge variant="outline" className="text-[10px]">{f.reason}</Badge>}
                    </div>
                    <div className="font-mono break-all">{f.message}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
