import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AuthLoadingScreen } from "@/components/auth-loading-screen";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { session, initialized, loading } = useAuth();
  const navigate = useNavigate();
  const location = useRouterState({ select: (s) => s.location });

  useEffect(() => {
    if (initialized && !loading && !session) {
      navigate({
        to: "/login",
        replace: true,
        search: { redirect: location.href },
      });
    }
  }, [initialized, loading, session, navigate, location.href]);

  // Wait for auth bootstrap AND profile/roles before revealing protected UI.
  if (!initialized || loading) return <AuthLoadingScreen />;
  if (!session) return <AuthLoadingScreen label="Redirecting to sign in…" />;

  return <Outlet />;
}
