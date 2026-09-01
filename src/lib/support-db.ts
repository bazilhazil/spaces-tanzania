import { supabase } from "@/integrations/supabase/client";

/**
 * Support Center data layer.
 *
 * Reuses the existing user, notification, property, lead and deal systems.
 * Tickets live in support_tickets, the conversation in support_messages,
 * and admin-managed help content in support_faqs.
 */

export type SupportStatus = "open" | "in_progress" | "waiting_user" | "resolved" | "closed";
export type SupportPriority = "normal" | "high" | "urgent";

export const SUPPORT_CATEGORIES = [
  "account",
  "finding",
  "listing",
  "viewings",
  "messages",
  "deals",
  "verification",
  "payments",
  "safety",
  "technical",
] as const;
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export interface SupportTicket {
  id: string;
  reference: string;
  userId: string;
  subject: string;
  category: string;
  status: SupportStatus;
  priority: SupportPriority;
  propertyId: string | null;
  leadId: string | null;
  dealId: string | null;
  assignedAdminId: string | null;
  createdAt: string;
  lastMessageAt: string;
  updatedAt: string;
  userName?: string | null;
  userEmail?: string | null;
  propertyTitle?: string | null;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  isStaff: boolean;
  internal: boolean;
  body: string;
  attachmentPath: string | null;
  createdAt: string;
}

function mapTicket(r: any): SupportTicket {
  return {
    id: r.id,
    reference: r.reference,
    userId: r.user_id,
    subject: r.subject,
    category: r.category,
    status: r.status,
    priority: r.priority,
    propertyId: r.property_id ?? null,
    leadId: r.lead_id ?? null,
    dealId: r.deal_id ?? null,
    assignedAdminId: r.assigned_admin_id ?? null,
    createdAt: r.created_at,
    lastMessageAt: r.last_message_at,
    updatedAt: r.updated_at,
  };
}

function mapMessage(r: any): SupportMessage {
  return {
    id: r.id,
    ticketId: r.ticket_id,
    senderId: r.sender_id,
    isStaff: r.is_staff,
    internal: r.internal,
    body: r.body,
    attachmentPath: r.attachment_path ?? null,
    createdAt: r.created_at,
  };
}

// ------------------------------------------------------------------ user

export async function listMyTickets(): Promise<SupportTicket[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data } = await supabase
    .from("support_tickets" as never)
    .select("*")
    .eq("user_id", auth.user.id)
    .order("last_message_at", { ascending: false })
    .limit(200);
  return ((data ?? []) as any[]).map(mapTicket);
}

export async function createTicket(input: {
  subject: string;
  category: string;
  message: string;
  propertyId?: string | null;
  leadId?: string | null;
  dealId?: string | null;
  file?: File | null;
}): Promise<{ ok: true; ticket: SupportTicket } | { ok: false; error: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "not-signed-in" };

  const { data, error } = await supabase
    .from("support_tickets" as never)
    .insert({
      user_id: auth.user.id,
      subject: input.subject.trim().slice(0, 160),
      category: input.category,
      property_id: input.propertyId ?? null,
      lead_id: input.leadId ?? null,
      deal_id: input.dealId ?? null,
    } as never)
    .select("*")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "failed" };

  const ticket = mapTicket(data);
  const attachment = input.file ? await uploadAttachment(input.file, auth.user.id) : null;

  const { error: mErr } = await supabase.from("support_messages" as never).insert({
    ticket_id: ticket.id,
    sender_id: auth.user.id,
    is_staff: false,
    internal: false,
    body: input.message.trim().slice(0, 4000),
    attachment_path: attachment,
  } as never);
  if (mErr) return { ok: false, error: mErr.message };

  return { ok: true, ticket };
}

export async function uploadAttachment(file: File, userId: string): Promise<string | null> {
  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().slice(0, 8);
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("support").upload(path, file, { upsert: false });
  if (error) return null;
  return path;
}

export async function attachmentUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from("support").createSignedUrl(path, 60 * 10);
  return data?.signedUrl ?? null;
}

export async function listTicketMessages(ticketId: string): Promise<SupportMessage[]> {
  const { data } = await supabase
    .from("support_messages" as never)
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  return ((data ?? []) as any[]).map(mapMessage);
}

export async function replyToTicket(
  ticketId: string,
  body: string,
  opts: { file?: File | null; staff?: boolean; internal?: boolean } = {},
): Promise<{ ok: boolean; error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "not-signed-in" };
  const attachment = opts.file ? await uploadAttachment(opts.file, auth.user.id) : null;
  const { error } = await supabase.from("support_messages" as never).insert({
    ticket_id: ticketId,
    sender_id: auth.user.id,
    is_staff: !!opts.staff,
    internal: !!opts.internal,
    body: body.trim().slice(0, 4000),
    attachment_path: attachment,
  } as never);
  if (error) return { ok: false, error: error.message };

  // A user reply moves a "waiting for user" ticket back into the queue.
  if (!opts.staff) {
    await supabase
      .from("support_tickets" as never)
      .update({ status: "open" } as never)
      .eq("id", ticketId)
      .eq("status", "waiting_user");
  }
  return { ok: true };
}

export async function closeMyTicket(ticketId: string): Promise<{ ok: boolean }> {
  const { error } = await supabase
    .from("support_tickets" as never)
    .update({ status: "closed" } as never)
    .eq("id", ticketId);
  return { ok: !error };
}

// ----------------------------------------------------------------- admin

export interface SupportFilters {
  status?: SupportStatus | "all";
  category?: string | "all";
  search?: string;
}

export async function listAllTickets(filters: SupportFilters = {}): Promise<SupportTicket[]> {
  let q = supabase.from("support_tickets" as never).select("*").order("last_message_at", { ascending: false }).limit(300);
  if (filters.status && filters.status !== "all") q = q.eq("status", filters.status);
  if (filters.category && filters.category !== "all") q = q.eq("category", filters.category);
  const term = filters.search?.trim();
  if (term) q = q.or(`reference.ilike.%${term}%,subject.ilike.%${term}%`);
  const { data } = await q;
  const tickets = ((data ?? []) as any[]).map(mapTicket);
  return decorate(tickets);
}

async function decorate(tickets: SupportTicket[]): Promise<SupportTicket[]> {
  const userIds = [...new Set(tickets.map((t) => t.userId))];
  const propIds = [...new Set(tickets.map((t) => t.propertyId).filter(Boolean) as string[])];
  const [{ data: profiles }, props] = await Promise.all([
    userIds.length
      ? supabase.from("public_profiles" as never).select("id,full_name").in("id", userIds)
      : Promise.resolve({ data: [] as any[] }),
    propIds.length
      ? supabase.from("properties").select("id,title").in("id", propIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const nameById = new Map(((profiles ?? []) as any[]).map((p) => [p.id, p.full_name]));
  const titleById = new Map((((props as any).data ?? []) as any[]).map((p) => [p.id, p.title]));
  return tickets.map((t) => ({
    ...t,
    userName: nameById.get(t.userId) ?? null,
    propertyTitle: t.propertyId ? titleById.get(t.propertyId) ?? null : null,
  }));
}

export async function updateTicket(
  ticketId: string,
  patch: Partial<{ status: SupportStatus; priority: SupportPriority; assigned_admin_id: string | null }>,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("support_tickets" as never).update(patch as never).eq("id", ticketId);
  return { ok: !error, error: error?.message };
}

export async function assignToMe(ticketId: string): Promise<{ ok: boolean }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false };
  return updateTicket(ticketId, { assigned_admin_id: auth.user.id, status: "in_progress" });
}

export interface SupportStats {
  open: number;
  highPriority: number;
  waitingUser: number;
  resolvedToday: number;
}

export async function fetchSupportStats(): Promise<SupportStats> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const base = () => supabase.from("support_tickets" as never).select("id", { count: "exact", head: true });
  const [open, high, waiting, resolved] = await Promise.all([
    base().in("status", ["open", "in_progress"]),
    base().in("priority", ["high", "urgent"]).not("status", "in", "(resolved,closed)"),
    base().eq("status", "waiting_user"),
    base().eq("status", "resolved").gte("resolved_at", start.toISOString()),
  ]);
  return {
    open: open.count ?? 0,
    highPriority: high.count ?? 0,
    waitingUser: waiting.count ?? 0,
    resolvedToday: resolved.count ?? 0,
  };
}

// ------------------------------------------------------------------- faq

export interface SupportFaq {
  id: string;
  category: string;
  question: string;
  answer: string;
  questionSw: string | null;
  answerSw: string | null;
  published: boolean;
  sortOrder: number;
}

function mapFaq(r: any): SupportFaq {
  return {
    id: r.id,
    category: r.category,
    question: r.question,
    answer: r.answer,
    questionSw: r.question_sw ?? null,
    answerSw: r.answer_sw ?? null,
    published: r.published,
    sortOrder: r.sort_order,
  };
}

export async function listPublishedFaqs(): Promise<SupportFaq[]> {
  const { data } = await supabase
    .from("support_faqs" as never)
    .select("*")
    .eq("published", true)
    .order("sort_order", { ascending: true })
    .limit(300);
  return ((data ?? []) as any[]).map(mapFaq);
}

export async function listAllFaqs(): Promise<SupportFaq[]> {
  const { data } = await supabase
    .from("support_faqs" as never)
    .select("*")
    .order("sort_order", { ascending: true })
    .limit(300);
  return ((data ?? []) as any[]).map(mapFaq);
}

export async function saveFaq(input: {
  id?: string;
  category: string;
  question: string;
  answer: string;
  questionSw?: string | null;
  answerSw?: string | null;
  published: boolean;
  sortOrder?: number;
}): Promise<{ ok: boolean; error?: string }> {
  const payload = {
    category: input.category,
    question: input.question.trim().slice(0, 300),
    answer: input.answer.trim().slice(0, 4000),
    question_sw: input.questionSw?.trim() || null,
    answer_sw: input.answerSw?.trim() || null,
    published: input.published,
    sort_order: input.sortOrder ?? 0,
  };
  const { error } = input.id
    ? await supabase.from("support_faqs" as never).update(payload as never).eq("id", input.id)
    : await supabase.from("support_faqs" as never).insert(payload as never);
  return { ok: !error, error: error?.message };
}

export async function setFaqPublished(id: string, published: boolean): Promise<{ ok: boolean }> {
  const { error } = await supabase.from("support_faqs" as never).update({ published } as never).eq("id", id);
  return { ok: !error };
}

export async function deleteFaq(id: string): Promise<{ ok: boolean }> {
  const { error } = await supabase.from("support_faqs" as never).delete().eq("id", id);
  return { ok: !error };
}
