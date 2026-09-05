import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SITE_URL = "https://spacestz.com";

/** Are online payments configured on the server? (never exposes credentials) */
export const onlinePaymentsAvailable = createServerFn({ method: "GET" }).handler(async () => {
  const { selcomConfigured } = await import("./selcom.server");
  return { available: selcomConfigured() };
});

/** Bank transfer details shown for manual payments (admin-configured, non-secret). */
export const bankTransferDetails = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("admin_settings")
    .select("value")
    .eq("key", "bank_transfer_details")
    .maybeSingle();
  const value = (data as { value?: Record<string, unknown> } | null)?.value ?? {};
  return {
    bank_name: String(value["bank_name"] ?? ""),
    account_name: String(value["account_name"] ?? ""),
    account_number: String(value["account_number"] ?? ""),
    branch: String(value["branch"] ?? ""),
    swift: String(value["swift"] ?? ""),
    instructions: String(value["instructions"] ?? ""),
  };
});

export type StartPaymentResult =
  | { ok: true; gatewayUrl: string }
  | { ok: false; reason: "unconfigured" | "not_found" | "already_final" | "provider_error" };

/**
 * Hands an existing PENDING payment to Selcom and returns the hosted checkout
 * URL. Nothing about the user's account changes here — only a confirmed
 * result from Selcom does that.
 */
export const startOnlinePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ reference: z.string().min(4).max(64) }).parse(data))
  .handler(async ({ data, context }): Promise<StartPaymentResult> => {
    const { createSelcomOrder, selcomConfigured } = await import("./selcom.server");
    if (!selcomConfigured()) return { ok: false, reason: "unconfigured" };

    const { data: row } = await context.supabase
      .from("payments")
      .select("id, amount, currency, status, reference, metadata")
      .eq("reference", data.reference)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!row) return { ok: false, reason: "not_found" };

    const payment = row as { id: string; amount: number; currency: string; status: string; metadata: Record<string, unknown> };
    if (!["pending", "processing"].includes(payment.status)) return { ok: false, reason: "already_final" };

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("id", context.userId)
      .maybeSingle();
    const p = (profile as { full_name?: string; email?: string; phone?: string } | null) ?? {};
    const phone = (p.phone ?? "").replace(/\D/g, "") || "255000000000";

    const result = await createSelcomOrder({
      orderId: data.reference,
      amount: Number(payment.amount),
      currency: payment.currency || "TZS",
      buyerName: p.full_name || "SPACES customer",
      buyerEmail: p.email || `${context.userId}@users.spacestz.com`,
      buyerPhone: phone,
      redirectUrl: `${SITE_URL}/billing?ref=${encodeURIComponent(data.reference)}`,
      cancelUrl: `${SITE_URL}/billing?ref=${encodeURIComponent(data.reference)}&cancelled=1`,
      webhookUrl: `${SITE_URL}/api/public/selcom-webhook`,
      remarks: String(payment.metadata?.["label"] ?? "SPACES payment"),
    });

    if (!result.ok) {
      return { ok: false, reason: result.reason === "unconfigured" ? "unconfigured" : "provider_error" };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("payments")
      .update({ status: "processing", gateway_url: result.gatewayUrl, updated_at: new Date().toISOString() } as never)
      .eq("id", payment.id)
      .eq("status", "pending");

    return { ok: true, gatewayUrl: result.gatewayUrl };
  });

/** Asks Selcom for the confirmed result of one of the caller's payments. */
export const refreshPaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ reference: z.string().min(4).max(64) }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("payments")
      .select("id, status")
      .eq("reference", data.reference)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!row) return { status: "unknown" as const };

    const { reconcilePayment } = await import("./payments.server");
    const result = await reconcilePayment(data.reference);
    return { status: result?.status ?? String((row as { status: string }).status) };
  });
