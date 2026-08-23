import { supabase } from "@/integrations/supabase/client";

export type LeadContactMethod = "call" | "whatsapp" | "message" | "viewing" | "email";

export interface CreateLeadInput {
  propertyId: string;
  ownerId: string;
  contactMethod: LeadContactMethod;
  message?: string;
  visitorName?: string;
  visitorPhone?: string;
  visitorEmail?: string;
  /** Message conversation this inquiry belongs to, when it came from a chat. */
  conversationId?: string | null;
}

const ACTIVITY_LABEL: Record<LeadContactMethod, string> = {
  call: "Call selected",
  whatsapp: "WhatsApp selected",
  message: "Message sent",
  viewing: "Viewing requested",
  email: "Email inquiry sent",
};

/** Appends one dated line to the lead timeline kept in `notes`. */
function appendTimeline(existing: string | null | undefined, method: LeadContactMethod, message?: string) {
  const line = `${new Date().toISOString()} — ${ACTIVITY_LABEL[method]}${message ? `: ${message.slice(0, 200)}` : ""}`;
  const prev = (existing ?? "").trim();
  const next = prev ? `${prev}\n${line}` : line;
  // Keep the timeline bounded so the column never grows unbounded.
  return next.split("\n").slice(-50).join("\n");
}

/**
 * Records a lead whenever a visitor contacts an owner/agent about a property.
 * Fire-and-forget: never blocks or breaks the contact action.
 */
export async function createLead(input: CreateLeadInput): Promise<boolean> {
  try {
    const { data: session } = await supabase.auth.getSession();
    const user = session.session?.user;
    if (!user || !input.ownerId) return false;

    // Duplicate protection: one active lead per visitor + property.
    const { data: existing } = await supabase
      .from("leads")
      .select("id,status,notes,conversation_id")
      .eq("property_id", input.propertyId)
      .eq("visitor_id", user.id)
      .not("status", "in", "(won,lost)")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      const row = existing as { id: string; notes: string | null; conversation_id: string | null };
      const { error: upErr } = await supabase
        .from("leads")
        .update({
          contact_method: input.contactMethod,
          message: input.message ?? undefined,
          notes: appendTimeline(row.notes, input.contactMethod, input.message),
          conversation_id: row.conversation_id ?? input.conversationId ?? null,
          last_activity_at: new Date().toISOString(),
        } as never)
        .eq("id", row.id);
      return !upErr;
    }


    const { error } = await supabase.from("leads" as never).insert({
      property_id: input.propertyId,
      owner_id: input.ownerId,
      visitor_id: user.id,
      visitor_name:
        input.visitorName ?? (user.user_metadata?.full_name as string | undefined) ?? null,
      visitor_phone: input.visitorPhone ?? user.phone ?? null,
      visitor_email: input.visitorEmail ?? user.email ?? null,
      contact_method: input.contactMethod,
      message: input.message ?? null,
      notes: appendTimeline(null, input.contactMethod, input.message),
      conversation_id: input.conversationId ?? null,

    } as never);
    return !error;
  } catch {
    return false;
  }
}


export interface LeadRow {
  id: string;
  property_id: string;
  owner_id: string;
  visitor_id: string | null;
  visitor_name: string | null;
  visitor_phone: string | null;
  visitor_email: string | null;
  contact_method: string;
  message: string | null;
  status: string;
  created_at: string;
}

/** Leads received by the signed-in owner/agent (for the CRM dashboard). */
export async function fetchMyLeads(limit = 200): Promise<LeadRow[]> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) return [];
  const { data } = await supabase
    .from("leads" as never)
    .select("*")
    .eq("owner_id", uid)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as LeadRow[];
}
