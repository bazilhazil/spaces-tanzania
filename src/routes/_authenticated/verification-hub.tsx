import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/verification-hub")({
  beforeLoad: () => {
    throw redirect({ to: "/verification", replace: true });
  },
});
