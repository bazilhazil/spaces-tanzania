import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AuthLoadingScreen } from "@/components/auth-loading-screen";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { session, initialized, loading, roles, user } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const redirected = useRef(false);

  // Temporary diagnostics for the manage-listing routing bug.
  // eslint-disable-next-line no-console
  console.log("[auth-guard]", {
    pathname,
    userId: user?.id ?? null,
    roles,
    loading,
    initialized,
    hasSession: !!session,
    redirectTarget: !session && initialized && !loading ? "/login" : null,
  });

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
    // eslint-disable-next-line no-console
    console.log("[auth-guard] redirecting to /login from", here);
    navigate({ to: "/login", replace: true, search: { redirect: here } });
    // navigate intentionally excluded — new ref each render would re-fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, loading, session]);

  if (!initialized || loading) return <AuthLoadingScreen />;
  if (!session) return <AuthLoadingScreen label="Redirecting to sign in…" />;

  // Authenticated: render the child route (e.g. /dashboard/properties/$id/manage)
  // regardless of role. Role-based access is enforced per-route/action, not here.
  return <Outlet />;
}
