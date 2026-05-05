import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export const useAdminAuth = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (["SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED", "INITIAL_SESSION"].includes(event)) {
        queryClient.invalidateQueries({ queryKey: ["staff-role"] });
      }
      if (event === "SIGNED_OUT") {
        queryClient.removeQueries({ queryKey: ["staff-role"] });
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const { data: roleInfo, isLoading } = useQuery({
    queryKey: ["staff-role", user?.id],
    queryFn: async () => {
      if (!user) return { isAdmin: false, isModerator: false, permissions: [] as string[] };
      const [rolesRes, permsRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("staff_permissions").select("permission").eq("user_id", user.id),
      ]);

      if (rolesRes.error) throw rolesRes.error;
      if (permsRes.error) throw permsRes.error;

      const roles = (rolesRes.data || []).map((r) => r.role as string);
      return {
        isAdmin: roles.includes("admin"),
        isModerator: roles.includes("moderator"),
        permissions: (permsRes.data || []).map((p) => p.permission),
      };
    },
    enabled: !authLoading && !!user,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const isAdmin = roleInfo?.isAdmin ?? false;
  const isModerator = roleInfo?.isModerator ?? false;
  const permissions = roleInfo?.permissions ?? [];

  return {
    isAdmin,
    isModerator,
    isStaff: isAdmin || isModerator,
    permissions,
    hasPermission: (perm: string) => isAdmin || permissions.includes(perm),
    loading: isLoading || authLoading,
    user,
  };
};
