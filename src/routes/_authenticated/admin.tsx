import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/admin-shell";
import { useAuth } from "@/hooks/use-auth";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw redirect({ to: "/auth" });
    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", authData.user.id);
    const allowed = !roleError && (roleRows ?? []).some(({ role }) => role === "admin" || role === "super_admin");
    if (!allowed) throw redirect({ to: "/dashboard" });
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin") || roles.includes("super_admin");

  if (!isAdmin) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--color-danger-50)] text-[color:var(--color-danger-700)]">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="mt-6 font-display text-2xl font-semibold">Access denied.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The Admin Control Center is restricted to administrators.
        </p>
        <Button asChild className="mt-6">
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}

