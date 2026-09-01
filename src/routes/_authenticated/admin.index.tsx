import { createFileRoute } from "@tanstack/react-router";
import { AdminHomePanel } from "@/components/admin/ops-panels";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminHomePanel,
});
