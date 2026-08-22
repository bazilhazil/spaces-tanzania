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
      .select("id,status")
      .eq("property_id", input.propertyId)
      .eq("visitor_id", user.id)
      .not("status", "in", "(won,lost)")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      const { error: upErr } = await supabase
        .from("leads")
        .update({
          contact_method: input.contactMethod,
          message: input.message ?? undefined,
          last_activity_at: new Date().toISOString(),
        } as never)
        .eq("id", (existing as { id: string }).id);
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
