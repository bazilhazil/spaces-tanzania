import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AuthLoadingScreen } from "@/components/auth-loading-screen";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { session, initialized, loading } = useAuth();
  const navigate = useNavigate();
  const redirected = useRef(false);

  useEffect(() => {
    // Wait for BOTH: initialization finished AND not loading.
    if (!initialized || loading) return;
    if (session) {
      // Reset so a future sign-out can redirect again.
      redirected.current = false;
      return;
    }
    if (redirected.current) return;
    redirected.current = true;
    const here =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : "/";
    navigate({ to: "/auth", replace: true, search: { redirect: here } });
    // navigate intentionally excluded — new ref each render would re-fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, loading, session]);

  if (!initialized || loading) return <AuthLoadingScreen />;
  if (!session) return <AuthLoadingScreen label="Redirecting to sign in…" />;

  // Authenticated: render the child route (e.g. /dashboard/properties/$id/manage)
  // regardless of role. Role-based access is enforced per-route/action, not here.
  return <Outlet />;
}
