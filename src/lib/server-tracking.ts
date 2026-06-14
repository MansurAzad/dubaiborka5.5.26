// Client-side helper to mirror browser events to our server-side tracking edge function.
// Works alongside existing gtag/fbq (dedupes via event_id).
import { supabase } from "@/integrations/supabase/client";

const CLIENT_ID_KEY = "sst_client_id";
function getClientId(): string {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : undefined;
}

export interface ServerTrackUserData {
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  city?: string;
  country?: string;
  external_id?: string;
}

export interface ServerTrackOptions {
  event_name: string;
  event_id?: string;
  user_data?: ServerTrackUserData;
  params?: Record<string, unknown>;
}

export async function serverTrack(opts: ServerTrackOptions): Promise<void> {
  try {
    const payload = {
      event_name: opts.event_name,
      event_id: opts.event_id || `${opts.event_name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      client_id: getClientId(),
      event_source_url: typeof window !== "undefined" ? window.location.href : undefined,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      user_data: {
        ...opts.user_data,
        fbp: getCookie("_fbp"),
        fbc: getCookie("_fbc"),
      },
      params: opts.params || {},
    };
    // Fire-and-forget; do NOT block user flow.
    void supabase.functions.invoke("server-tracking", { body: payload });
  } catch (err) {
    console.warn("serverTrack failed:", err);
  }
}

export function getTrackingClientId() {
  return getClientId();
}
