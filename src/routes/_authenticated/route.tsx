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
    if (!initialized || loading) return;
    if (session) {
      redirected.current = false;
      return;
    }
    if (redirected.current) return;
    redirected.current = true;
    // Capture the path we're on ONCE, at the moment auth is known-missing,
    // so we don't feed a growing `?redirect=` back into the effect.
    const here =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : "/";
    navigate({ to: "/login", replace: true, search: { redirect: here } });
    // `navigate` is intentionally excluded — TanStack's useNavigate returns
    // a new function each render, which would re-fire this effect forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, loading, session]);

  if (!initialized || loading) return <AuthLoadingScreen />;
  if (!session) return <AuthLoadingScreen label="Redirecting to sign in…" />;

  return <Outlet />;
}
