import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/admin-shell";
import { useAuth } from "@/hooks/use-auth";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin") || roles.includes("super_admin");
  return (
    <AdminShell>
      {!isAdmin && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-[color:var(--color-warning-200)] bg-[color:var(--color-warning-50)] px-4 py-3 text-sm text-[color:var(--color-warning-900)]">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>Demo view — you're browsing the Admin Control Center without an <strong>admin</strong> or <strong>super_admin</strong> role. Real actions are disabled.</span>
        </div>
      )}
      <Outlet />
    </AdminShell>
  );
}

