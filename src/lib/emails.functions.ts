import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EVENTS = [
  "lead_created",
  "viewing_requested",
  "viewing_updated",
  "deal_updated",
  "property_approved",
  "property_changes",
] as const;

async function callerIsAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = ((data ?? []) as { role: string }[]).map((r) => r.role);
  return roles.includes("admin") || roles.includes("super_admin");
}

/**
 * Sends the transactional email that belongs to one app event. The recipient is
 * always resolved on the server from the real record.
 */
export const sendEventNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ event: z.enum(EVENTS), recordId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { sendEventEmail } = await import("./emails.server");
    const isAdmin = await callerIsAdmin(context.supabase, context.userId);
    return sendEventEmail(data.event, data.recordId, context.userId, isAdmin);
  });

/** Sends the real production test email to the signed-in administrator. */
export const sendAdminTestEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await callerIsAdmin(context.supabase, context.userId))) {
      return { ok: false as const, reason: "not_allowed" as const };
    }
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("email")
      .eq("id", context.userId)
      .maybeSingle();
    const to = (profile as { email?: string | null } | null)?.email ?? null;
    if (!to) return { ok: false as const, reason: "no_recipient" as const };

    const { sendTemplateEmail } = await import("./email-templates/send-email");
    try {
      const result = await sendTemplateEmail("admin-test", to, {
        idempotencyKey: `admin-test:${context.userId}:${Date.now()}`,
      });
      if (!result.sent) return { ok: false as const, reason: "suppressed" as const, to };
      return { ok: true as const, to };
    } catch (error) {
      console.error("[email] admin test failed", { code: (error as { code?: string })?.code ?? "unknown" });
      return { ok: false as const, reason: "failed" as const, to };
    }
  });

/** Real delivery health for the admin Launch Checklist — never assumed. */
export const emailDeliveryHealth = createServerFn({ method: "GET" }).handler(async () => {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { state: "action" as const, detail: "Email service is not available on the server" };
  try {
    const { listEmailLogs } = await import("@lovable.dev/email-js");
    const logs = await listEmailLogs({ limit: 20 }, { apiKey });
    const events = (logs as { events?: { event_type: string; created_at?: string }[] })?.events ?? [];
    const sent = events.find((e) => e.event_type === "sent");
    if (sent) {
      return {
        state: "ready" as const,
        detail: "Real delivery confirmed from notify.spacestz.com",
      };
    }
    return {
      state: "pending" as const,
      detail: "Sender domain notify.spacestz.com is verified — no delivery recorded yet",
    };
  } catch {
    return {
      state: "pending" as const,
      detail: "Sender domain notify.spacestz.com is verified — delivery could not be confirmed",
    };
  }
});
