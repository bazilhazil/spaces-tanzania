import { supabase } from "@/integrations/supabase/client";
import { createLead } from "@/lib/leads-db";

export type InquiryResult = { ok: true } | { ok: false; error: "auth" | "failed" };

/**
 * Sends a real message to the owner/agent about a property.
 * Reuses the existing conversation for (buyer, property) when one exists so we
 * never fork the thread, and records the inquiry on the existing Lead system.
 */
export async function sendPropertyMessage(input: {
  propertyId: string;
  ownerId: string;
  body: string;
}): Promise<InquiryResult> {
  const body = input.body.trim();
  if (!body) return { ok: false, error: "failed" };

  const { data: sess } = await supabase.auth.getSession();
  const user = sess.session?.user;
  if (!user) return { ok: false, error: "auth" };

  try {
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("property_id", input.propertyId)
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let conversationId = (existing as { id: string } | null)?.id ?? null;

    if (!conversationId) {
      const { data: created, error } = await supabase
        .from("conversations")
        .insert({
          property_id: input.propertyId,
          buyer_id: user.id,
          owner_id: input.ownerId,
        } as never)
        .select("id")
        .maybeSingle();
      if (error || !created) return { ok: false, error: "failed" };
      conversationId = (created as { id: string }).id;
    }

    const { error: msgErr } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body,
    } as never);
    if (msgErr) return { ok: false, error: "failed" };

    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() } as never)
      .eq("id", conversationId);

    await createLead({
      propertyId: input.propertyId,
      ownerId: input.ownerId,
      contactMethod: "message",
      message: body,
      conversationId,
    });

    return { ok: true };
  } catch {
    return { ok: false, error: "failed" };
  }
}
