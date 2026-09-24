/**
 * Server-only email dispatch for SPACES app events.
 *
 * Recipients are always derived here from the real database record — never
 * from anything the browser sends — so one event can only ever reach the
 * person it belongs to. Failures never bubble into the app workflow: they are
 * recorded in the server log and reported as a plain flag.
 */
import { sendTemplateEmail } from "./email-templates/send-email";

const SITE_URL = "https://spacestz.com";

export type EmailEvent =
  | "lead_created"
  | "viewing_requested"
  | "viewing_updated"
  | "deal_updated"
  | "property_approved"
  | "property_changes";

export interface EmailEventResult {
  ok: boolean;
  /** Why nothing was sent — never a provider/technical message. */
  reason?: "no_recipient" | "not_allowed" | "not_found" | "suppressed" | "failed" | "rate_limited";
}

/** Simple per-recipient burst guard (per server instance). */
const recent = new Map<string, number[]>();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_HOUR = 20;

function allowed(key: string) {
  const now = Date.now();
  const hits = (recent.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= MAX_PER_HOUR) {
    recent.set(key, hits);
    return false;
  }
  hits.push(now);
  recent.set(key, hits);
  return true;
}

function when(iso?: string | null) {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: "Africa/Dar_es_Salaam" });
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function emailFor(userId?: string | null): Promise<string | null> {
  if (!userId) return null;
  const db = await admin();
  // Respect the recipient's "Email notifications" preference.
  const { data: pref } = await db.from("notification_preferences").select("email").eq("user_id", userId).maybeSingle();
  if ((pref as { email?: boolean } | null)?.email === false) return null;
  const { data } = await db.from("profiles").select("email").eq("id", userId).maybeSingle();
  const email = (data as { email?: string | null } | null)?.email ?? null;
  return email && email.includes("@") ? email : null;
}

async function propertyInfo(propertyId?: string | null) {
  if (!propertyId) return null;
  const db = await admin();
  const { data } = await db
    .from("properties")
    .select("id,title,city,region,slug,owner_id,status")
    .eq("id", propertyId)
    .maybeSingle();
  return data as
    | { id: string; title: string | null; city: string | null; region: string | null; slug: string | null; owner_id: string; status: string }
    | null;
}

async function deliver(
  template: string,
  to: string | null,
  idempotencyKey: string,
  templateData: Record<string, unknown>,
): Promise<EmailEventResult> {
  if (!to) return { ok: false, reason: "no_recipient" };
  if (!allowed(to)) return { ok: false, reason: "rate_limited" };
  try {
    const result = await sendTemplateEmail(template, to, { templateData, idempotencyKey });
    if (!result.sent) return { ok: false, reason: "suppressed" };
    return { ok: true };
  } catch (error) {
    // Never expose provider detail to the caller or the user.
    console.error("[email] delivery failed", {
      template,
      idempotencyKey,
      code: (error as { code?: string })?.code ?? "unknown",
    });
    return { ok: false, reason: "failed" };
  }
}

/**
 * Sends the email for one app event. `actorId` is the authenticated caller;
 * they must be a genuine participant in the record or an administrator.
 */
export async function sendEventEmail(
  event: EmailEvent,
  recordId: string,
  actorId: string,
  isAdmin: boolean,
): Promise<EmailEventResult> {
  const db = await admin();

  if (event === "lead_created") {
    const { data } = await db
      .from("leads")
      .select("id,owner_id,visitor_id,visitor_name,property_id,contact_method,message,created_at")
      .eq("id", recordId)
      .maybeSingle();
    const lead = data as {
      id: string; owner_id: string; visitor_id: string | null; visitor_name: string | null;
      property_id: string; contact_method: string; message: string | null;
    } | null;
    if (!lead) return { ok: false, reason: "not_found" };
    if (!isAdmin && actorId !== lead.visitor_id) return { ok: false, reason: "not_allowed" };
    const property = await propertyInfo(lead.property_id);
    return deliver("new-lead", await emailFor(lead.owner_id), `lead:${lead.id}`, {
      propertyTitle: property?.title ?? undefined,
      propertyLocation: [property?.city, property?.region].filter(Boolean).join(", ") || undefined,
      contactMethod: lead.contact_method,
      message: lead.message ?? undefined,
      buyerName: lead.visitor_name ?? undefined,
      leadsUrl: `${SITE_URL}/leads`,
    });
  }

  if (event === "viewing_requested" || event === "viewing_updated") {
    const { data } = await db
      .from("bookings")
      .select("id,owner_id,agent_id,buyer_id,property_id,scheduled_at,status,message,updated_at")
      .eq("id", recordId)
      .maybeSingle();
    const booking = data as {
      id: string; owner_id: string; agent_id: string | null; buyer_id: string; property_id: string;
      scheduled_at: string; status: string; message: string | null; updated_at: string;
    } | null;
    if (!booking) return { ok: false, reason: "not_found" };
    const property = await propertyInfo(booking.property_id);
    const location = [property?.city, property?.region].filter(Boolean).join(", ") || undefined;

    if (event === "viewing_requested") {
      if (!isAdmin && actorId !== booking.buyer_id) return { ok: false, reason: "not_allowed" };
      const recipient = booking.agent_id ?? booking.owner_id;
      return deliver("viewing-request", await emailFor(recipient), `viewing-req:${booking.id}`, {
        propertyTitle: property?.title ?? undefined,
        propertyLocation: location,
        scheduledAt: when(booking.scheduled_at),
        message: booking.message ?? undefined,
        viewingsUrl: `${SITE_URL}/viewings`,
      });
    }

    const isParty = actorId === booking.owner_id || actorId === booking.agent_id;
    if (!isAdmin && !isParty) return { ok: false, reason: "not_allowed" };
    return deliver("viewing-update", await emailFor(booking.buyer_id), `viewing-upd:${booking.id}:${booking.status}:${booking.scheduled_at}`, {
      propertyTitle: property?.title ?? undefined,
      propertyLocation: location,
      scheduledAt: when(booking.scheduled_at),
      status: booking.status,
      viewingsUrl: `${SITE_URL}/viewings`,
    });
  }

  if (event === "deal_updated") {
    const { data } = await db
      .from("deals")
      .select("id,owner_id,agent_id,buyer_id,property_id,stage,updated_at")
      .eq("id", recordId)
      .maybeSingle();
    const deal = data as {
      id: string; owner_id: string | null; agent_id: string | null; buyer_id: string | null;
      property_id: string | null; stage: string;
    } | null;
    if (!deal) return { ok: false, reason: "not_found" };
    const isParty = actorId === deal.owner_id || actorId === deal.agent_id;
    if (!isAdmin && !isParty) return { ok: false, reason: "not_allowed" };
    const property = await propertyInfo(deal.property_id);
    return deliver("deal-update", await emailFor(deal.buyer_id), `deal:${deal.id}:${deal.stage}`, {
      propertyTitle: property?.title ?? undefined,
      stage: deal.stage,
      dealsUrl: `${SITE_URL}/deals`,
    });
  }

  // Moderation outcomes — administrators only.
  if (!isAdmin) return { ok: false, reason: "not_allowed" };
  const { data } = await db
    .from("properties")
    .select("id,title,city,region,slug,owner_id,status,under_review_reason,rejection_reason,updated_at")
    .eq("id", recordId)
    .maybeSingle();
  const property = data as {
    id: string; title: string | null; city: string | null; region: string | null; slug: string | null;
    owner_id: string; status: string; under_review_reason: string | null; rejection_reason: string | null;
  } | null;
  if (!property) return { ok: false, reason: "not_found" };
  const to = await emailFor(property.owner_id);

  if (event === "property_approved") {
    return deliver("property-approved", to, `prop-approved:${property.id}:${property.status}`, {
      propertyTitle: property.title ?? undefined,
      propertyLocation: [property.city, property.region].filter(Boolean).join(", ") || undefined,
      propertyUrl: property.slug ? `${SITE_URL}/properties/${property.slug}` : `${SITE_URL}/dashboard/properties`,
    });
  }

  const reason = property.rejection_reason || property.under_review_reason || undefined;
  return deliver("property-changes", to, `prop-changes:${property.id}:${property.status}:${reason ?? ""}`, {
    propertyTitle: property.title ?? undefined,
    outcome: property.status === "rejected" ? "Rejected" : "Changes requested",
    reason,
    manageUrl: `${SITE_URL}/dashboard/properties`,
  });
}

/** Payment confirmation — only ever called after a genuinely confirmed payment. */
export async function sendPaymentConfirmation(paymentId: string): Promise<EmailEventResult> {
  const db = await admin();
  const { data } = await db
    .from("payments")
    .select("id,user_id,amount,currency,reference,status,paid_at,metadata")
    .eq("id", paymentId)
    .maybeSingle();
  const payment = data as {
    id: string; user_id: string; amount: number; currency: string; reference: string;
    status: string; paid_at: string | null; metadata: Record<string, unknown> | null;
  } | null;
  if (!payment) return { ok: false, reason: "not_found" };
  if (payment.status !== "paid") return { ok: false, reason: "not_allowed" };
  return deliver("payment-confirmation", await emailFor(payment.user_id), `payment:${payment.id}`, {
    amount: `${payment.currency || "TZS"} ${Number(payment.amount).toLocaleString("en-US")}`,
    reference: payment.reference,
    description: String(payment.metadata?.["label"] ?? "SPACES payment"),
    paidAt: when(payment.paid_at),
  });
}
