// Server-only payment reconciliation. Confirms Selcom results against the
// gateway and applies them to the SPACES payment record exactly once.

import { fetchSelcomOrderStatus, type SelcomPaymentStatus } from "./selcom.server";

const FINAL = new Set(["paid", "succeeded", "refunded", "failed", "cancelled", "expired"]);

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type ReconcileResult = {
  status: string;
  changed: boolean;
};

/**
 * Reads the true payment result from Selcom and stores it. Idempotent:
 * a payment that already reached a final state is never re-applied, so a
 * repeated webhook cannot double-credit or double-count revenue.
 */
export async function reconcilePayment(reference: string): Promise<ReconcileResult | null> {
  const db = await admin();
  const { data: row } = await db
    .from("payments")
    .select("id, status, provider")
    .eq("reference", reference)
    .maybeSingle();

  if (!row) return null;
  const current = String((row as { status: string }).status);
  if (FINAL.has(current)) return { status: current, changed: false };

  const result = await fetchSelcomOrderStatus(reference);
  if (!result.ok) return { status: current, changed: false };

  const next: SelcomPaymentStatus = result.status;
  if (next === current) return { status: current, changed: false };

  const patch: Record<string, unknown> = { status: next, updated_at: new Date().toISOString() };
  if (result.providerReference) patch["provider_reference"] = result.providerReference;
  if (result.channel) patch["channel"] = result.channel;
  if (next === "paid") patch["paid_at"] = new Date().toISOString();

  // Guarded update: only transition rows still in a non-final state.
  const { data: updated } = await db
    .from("payments")
    .update(patch as never)
    .eq("id", (row as { id: string }).id)
    .not("status", "in", "(paid,succeeded,refunded,failed,cancelled,expired)")
    .select("id, status")
    .maybeSingle();

  return { status: updated ? next : current, changed: Boolean(updated) };
}
