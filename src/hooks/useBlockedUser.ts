import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface BlockedInfo {
  isBlocked: boolean;
  reason: string;
}

export const useBlockedUser = () => {
  const { user } = useAuth();
  const [blockedInfo, setBlockedInfo] = useState<BlockedInfo>({ isBlocked: false, reason: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setBlockedInfo({ isBlocked: false, reason: "" });
      setLoading(false);
      return;
    }

    const check = async () => {
      const { data } = await supabase
        .from("blocked_users")
        .select("reason")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      setBlockedInfo(data ? { isBlocked: true, reason: data.reason } : { isBlocked: false, reason: "" });
      setLoading(false);
    };

    check();
  }, [user]);

  return { ...blockedInfo, loading };
};

// Static helper to check block status for a given user_id (used at login)
export const checkIfBlocked = async (userId: string): Promise<BlockedInfo> => {
  const { data } = await supabase
    .from("blocked_users")
    .select("reason")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  return data ? { isBlocked: true, reason: data.reason } : { isBlocked: false, reason: "" };
};
