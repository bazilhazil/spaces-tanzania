import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const STATUSES = [
  "paid",
  "succeeded",
  "processing",
  "failed",
  "refunded",
  "cancelled",
  "expired",
  "pending",
] as const;

/**
 * Admin-only payment status change. The privileged database helper is no longer
 * callable from the browser: the caller's admin role is verified here first and
 * the change is then applied with the trusted server client.
 */
export const adminSetPaymentStatusFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ paymentId: z.string().uuid(), status: z.enum(STATUSES) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: roleRows } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const roles = ((roleRows ?? []) as { role: string }[]).map((r) => r.role);
    if (!roles.includes("admin") && !roles.includes("super_admin")) {
      throw new Error("You don't have permission to do this.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("admin_set_payment_status", {
      _payment_id: data.paymentId,
      _status: data.status,
    } as never);
    if (error) throw error;
    return { ok: true as const };
  });
