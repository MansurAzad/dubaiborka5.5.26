import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { ROUTE_PERMISSIONS, type PermissionKey } from "@/lib/permissions";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface PermissionGuardProps {
  children: ReactNode;
  /** Override required permission. Defaults to lookup from ROUTE_PERMISSIONS. */
  permission?: PermissionKey | "admin_only";
}

const AccessDenied = ({ required }: { required: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-background p-6">
    <div className="max-w-md w-full text-center space-y-4 p-8 border rounded-lg bg-card">
      <ShieldAlert className="w-16 h-16 text-destructive mx-auto" />
      <h1 className="text-2xl font-bold">অ্যাক্সেস নেই</h1>
      <p className="text-muted-foreground">
        এই পেজ দেখার অনুমতি আপনার নেই। প্রয়োজনীয় পারমিশন:{" "}
        <code className="bg-muted px-2 py-0.5 rounded text-sm">{required}</code>
      </p>
      <p className="text-sm text-muted-foreground">
        আপনি একজন Moderator হলে Admin-কে আপনার পারমিশন আপডেট করতে বলুন।
      </p>
      <div className="flex gap-2 justify-center pt-2">
        <Button asChild variant="outline">
          <Link to="/admin">Dashboard</Link>
        </Button>
        <Button asChild>
          <Link to="/">Home</Link>
        </Button>
      </div>
    </div>
  </div>
);

const PermissionGuard = ({ children, permission }: PermissionGuardProps) => {
  const location = useLocation();
  const { isAdmin, isStaff, hasPermission, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isStaff) return <Navigate to="/" replace />;

  const required =
    permission ?? ROUTE_PERMISSIONS[location.pathname] ?? "admin_only";

  if (required === "admin_only") {
    if (!isAdmin) return <AccessDenied required="Admin role" />;
    return <>{children}</>;
  }

  if (!hasPermission(required)) {
    return <AccessDenied required={required} />;
  }

  return <>{children}</>;
};

export default PermissionGuard;
