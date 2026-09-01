import { supabase } from "@/integrations/supabase/client";

/**
 * Admin Operations Center data layer.
 *
 * Reads only from the existing SPACES tables (properties, profiles, leads,
 * bookings, deals, verification_requests, safety_reports, payments) and writes
 * only to the shared admin_actions log. No duplicate systems.
 */

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

const CONFIRMED = ["paid", "succeeded"];

// -------------------------------------------------------------- today

export interface AdminToday {
  newUsers: number;
  newSpaces: number;
  newLeads: number;
  newViewings: number;
  activeDeals: number;
  pendingVerifications: number;
  openReports: number;
  revenueToday: number;
  currency: string;
}

async function count(table: string, build: (q: any) => any): Promise<number> {
  const { count: c } = await build(supabase.from(table as never).select("id", { count: "exact", head: true }));
  return c ?? 0;
}

export async function fetchAdminToday(): Promise<AdminToday> {
  const since = startOfToday();
  const [newUsers, newSpaces, newLeads, newViewings, activeDeals, pendingVerifications, openReports, pay] =
    await Promise.all([
      count("profiles", (q) => q.gte("created_at", since)),
      count("properties", (q) => q.gte("created_at", since)),
      count("leads", (q) => q.gte("created_at", since)),
      count("bookings", (q) => q.gte("created_at", since)),
      count("deals", (q) => q.not("stage", "in", "(completed,cancelled)")),
      count("verification_requests", (q) => q.eq("status", "pending")),
      count("safety_reports", (q) => q.in("status", ["new", "under_review", "more_info"])),
      supabase.from("payments").select("amount,currency,status,created_at").gte("created_at", since).limit(1000),
    ]);

  const rows = ((pay.data ?? []) as any[]).filter((p) => CONFIRMED.includes(p.status));
  return {
    newUsers,
    newSpaces,
    newLeads,
    newViewings,
    activeDeals,
    pendingVerifications,
    openReports,
    revenueToday: rows.reduce((s, p) => s + Number(p.amount ?? 0), 0),
    currency: rows[0]?.currency ?? "TZS",
  };
}

// ---------------------------------------------------- needs attention

export type AttentionGroup =
  | "spaces"
  | "users"
  | "leads"
  | "viewings"
  | "verification"
  | "reports"
  | "payments";

export interface AttentionItem {
  id: string;
  kind:
    | "property_pending"
    | "verification_pending"
    | "report_open"
    | "payment_issue"
    | "property_suspended"
    | "user_suspended"
    | "user_new"
    | "viewing_pending"
    | "lead_waiting";
  group: AttentionGroup;
  /** 1 = most urgent. Used to sort Today's Tasks. */
  urgency: number;
  title: string;
  detail: string;
  at: string;
  section: string; // admin section to open
}

/** Lower number = handled first. */
export const GROUP_ORDER: AttentionGroup[] = [
  "reports",
  "payments",
  "verification",
  "spaces",
  "viewings",
  "leads",
  "users",
];

export async function fetchNeedsAttention(): Promise<AttentionItem[]> {
  const since = startOfToday();
  const [props, verifications, reports, payments, users, leads, viewings, newUsers] = await Promise.all([
    supabase.from("properties").select("id,title,status,created_at,under_review").in("status", ["pending", "draft", "paused"]).order("created_at", { ascending: false }).limit(20),
    supabase.from("verification_requests").select("id,subject_type,created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(20),
    supabase.from("safety_reports").select("id,reference,reason,priority,created_at").in("status", ["new", "under_review", "more_info"]).order("created_at", { ascending: false }).limit(20),
    supabase.from("payments").select("id,amount,currency,status,purpose,created_at").in("status", ["pending", "failed"]).order("created_at", { ascending: false }).limit(20),
    supabase.from("profiles").select("id,full_name,account_status,updated_at").in("account_status", ["suspended", "banned"]).limit(20),
    supabase.from("leads").select("id,visitor_name,status,created_at,last_activity_at").in("status", ["new", "contacted"]).order("created_at", { ascending: false }).limit(30),
    supabase.from("bookings").select("id,status,scheduled_at,created_at,buyer_name").eq("status", "pending").order("created_at", { ascending: false }).limit(20),
    supabase.from("profiles").select("id,full_name,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(20),
  ]);

  const items: AttentionItem[] = [];

  for (const p of ((props.data ?? []) as any[])) {
    if (p.status === "paused") {
      items.push({ id: `ps-${p.id}`, kind: "property_suspended", group: "spaces", urgency: 2, title: p.title ?? "Untitled space", detail: "Suspended listing needs review", at: p.created_at, section: "properties" });
    } else {
      items.push({ id: `pp-${p.id}`, kind: "property_pending", group: "spaces", urgency: p.status === "draft" ? 4 : 1, title: p.title ?? "Untitled space", detail: p.status === "draft" ? "Draft awaiting submission" : "Awaiting approval", at: p.created_at, section: "properties" });
    }
  }
  for (const v of ((verifications.data ?? []) as any[])) {
    items.push({ id: `v-${v.id}`, kind: "verification_pending", group: "verification", urgency: 2, title: `${String(v.subject_type ?? "account").replace(/_/g, " ")} verification`, detail: "Awaiting review", at: v.created_at, section: "verification" });
  }
  for (const r of ((reports.data ?? []) as any[])) {
    items.push({ id: `r-${r.id}`, kind: "report_open", group: "reports", urgency: r.priority === "urgent" ? 0 : r.priority === "high" ? 1 : 2, title: `${r.reference}`, detail: `${String(r.reason).replace(/_/g, " ")} · ${r.priority} priority`, at: r.created_at, section: "reports" });
  }
  for (const p of ((payments.data ?? []) as any[])) {
    items.push({ id: `y-${p.id}`, kind: "payment_issue", group: "payments", urgency: p.status === "failed" ? 1 : 3, title: `${p.currency ?? "TZS"} ${Number(p.amount ?? 0).toLocaleString()}`, detail: `Payment ${p.status} · ${String(p.purpose ?? "other").replace(/_/g, " ")}`, at: p.created_at, section: "payments" });
  }
  for (const u of ((users.data ?? []) as any[])) {
    items.push({ id: `u-${u.id}`, kind: "user_suspended", group: "users", urgency: 2, title: u.full_name || "Unnamed user", detail: `Account ${u.account_status}`, at: u.updated_at, section: "users" });
  }
  for (const u of ((newUsers.data ?? []) as any[])) {
    items.push({ id: `nu-${u.id}`, kind: "user_new", group: "users", urgency: 5, title: u.full_name || "New user", detail: "Registered today", at: u.created_at, section: "users" });
  }
  const dayAgo = Date.now() - 24 * 3600 * 1000;
  for (const b of ((viewings.data ?? []) as any[])) {
    const stale = new Date(b.created_at).getTime() < dayAgo;
    items.push({ id: `b-${b.id}`, kind: "viewing_pending", group: "viewings", urgency: stale ? 1 : 3, title: b.buyer_name || "Viewing request", detail: stale ? "Waiting over 24 hours" : "Awaiting owner response", at: b.created_at, section: "viewings" });
  }
  for (const l of ((leads.data ?? []) as any[])) {
    const last = new Date(l.last_activity_at ?? l.created_at).getTime();
    if (l.status === "new" || last < dayAgo) {
      items.push({ id: `l-${l.id}`, kind: "lead_waiting", group: "leads", urgency: l.status === "new" ? 2 : 4, title: l.visitor_name || "New inquiry", detail: l.status === "new" ? "Waiting for first response" : "No recent activity", at: l.created_at, section: "leads" });
    }
  }

  return items
    .sort((a, b) => (a.urgency - b.urgency) || (a.at < b.at ? 1 : -1))
    .slice(0, 60);
}


// ------------------------------------------------------------- leads

export type LeadOpsFilter = "new" | "waiting" | "stale" | "unassigned" | "all";

export interface AdminLead {
  id: string;
  visitor: string;
  contact: string | null;
  status: string;
  propertyId: string | null;
  propertyTitle: string;
  ownerName: string;
  agentName: string | null;
  dealId: string | null;
  createdAt: string;
  lastActivityAt: string;
}

export async function fetchAdminLeads(filter: LeadOpsFilter = "new"): Promise<AdminLead[]> {
  let q = supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(200);
  if (filter === "new") q = q.eq("status", "new");
  else if (filter === "waiting") q = q.in("status", ["new", "contacted"]);
  const { data } = await q;
  let rows = (data ?? []) as any[];
  if (!rows.length) return [];

  const dayAgo = Date.now() - 24 * 3600 * 1000;
  if (filter === "stale") rows = rows.filter((r) => new Date(r.last_activity_at ?? r.created_at).getTime() < dayAgo && !["won", "lost", "closed"].includes(r.status));

  const dealIds = Array.from(new Set(rows.map((r) => r.deal_id).filter(Boolean)));
  const propIds = Array.from(new Set(rows.map((r) => r.property_id).filter(Boolean)));
  const [deals, props] = await Promise.all([
    dealIds.length ? supabase.from("deals").select("id,agent_id").in("id", dealIds) : Promise.resolve({ data: [] as any[] }),
    propIds.length ? supabase.from("properties").select("id,title,owner_id").in("id", propIds) : Promise.resolve({ data: [] as any[] }),
  ]);
  const dealAgent = new Map(((deals.data ?? []) as any[]).map((d) => [d.id, d.agent_id]));
  const propMap = new Map(((props.data ?? []) as any[]).map((p) => [p.id, p]));

  const peopleIds = Array.from(new Set([
    ...rows.map((r) => r.owner_id),
    ...[...dealAgent.values()],
  ].filter(Boolean)));
  const { data: people } = peopleIds.length
    ? await supabase.from("profiles").select("id,full_name").in("id", peopleIds)
    : { data: [] as any[] };
  const names = new Map(((people ?? []) as any[]).map((p) => [p.id, p.full_name]));

  let out = rows.map((r) => {
    const agentId = r.deal_id ? dealAgent.get(r.deal_id) : null;
    return {
      id: r.id,
      visitor: r.visitor_name || "Unnamed visitor",
      contact: r.visitor_phone ?? r.visitor_email ?? null,
      status: r.status,
      propertyId: r.property_id ?? null,
      propertyTitle: propMap.get(r.property_id)?.title ?? "—",
      ownerName: names.get(r.owner_id) || "Unknown owner",
      agentName: agentId ? names.get(agentId) || "Assigned agent" : null,
      dealId: r.deal_id ?? null,
      createdAt: r.created_at,
      lastActivityAt: r.last_activity_at ?? r.created_at,
    } satisfies AdminLead;
  });
  if (filter === "unassigned") out = out.filter((l) => !l.agentName);
  return out;
}

export interface AgentOption {
  id: string;
  name: string;
}

export async function fetchAgentOptions(): Promise<AgentOption[]> {
  const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "agent").limit(500);
  const ids = Array.from(new Set(((roles ?? []) as any[]).map((r) => r.user_id)));
  if (!ids.length) return [];
  const { data } = await supabase.from("profiles").select("id,full_name").in("id", ids);
  return ((data ?? []) as any[]).map((p) => ({ id: p.id, name: p.full_name || "Unnamed agent" }));
}

/** Reassigns the agent on the deal linked to a lead and records the admin action. */
export async function reassignLeadAgent(lead: AdminLead, agentId: string, agentName: string) {
  if (!lead.dealId) throw new Error("This inquiry has no deal yet, so there is nothing to assign.");
  const { error } = await supabase.from("deals").update({ agent_id: agentId } as never).eq("id", lead.dealId);
  if (error) throw error;
  await logAdminAction({
    action: "lead_reassigned",
    targetType: "lead",
    targetId: lead.id,
    targetLabel: `${lead.visitor} → ${agentName}`,
    meta: { deal_id: lead.dealId, agent_id: agentId },
  });
}

// ---------------------------------------------------------- viewings

export type ViewingOpsFilter = "pending" | "upcoming" | "completed" | "cancelled" | "all";

export interface AdminViewing {
  id: string;
  propertyTitle: string;
  propertyId: string | null;
  buyerName: string;
  contact: string | null;
  scheduledAt: string;
  status: string;
  createdAt: string;
  notes: string | null;
}

export async function fetchAdminViewings(filter: ViewingOpsFilter = "pending"): Promise<AdminViewing[]> {
  let q = supabase.from("bookings").select("*").order("scheduled_at", { ascending: false }).limit(200);
  if (filter === "pending") q = q.in("status", ["pending", "requested", "suggested"]);
  else if (filter === "upcoming") q = q.in("status", ["confirmed", "accepted"]).gte("scheduled_at", new Date().toISOString());
  else if (filter === "completed") q = q.eq("status", "completed");
  else if (filter === "cancelled") q = q.in("status", ["cancelled", "declined"]);
  const { data } = await q;
  const rows = (data ?? []) as any[];
  if (!rows.length) return [];
  const ids = Array.from(new Set(rows.map((r) => r.property_id).filter(Boolean)));
  const { data: props } = ids.length ? await supabase.from("properties").select("id,title").in("id", ids) : { data: [] as any[] };
  const titles = new Map(((props ?? []) as any[]).map((p) => [p.id, p.title]));
  return rows.map((r) => ({
    id: r.id,
    propertyTitle: titles.get(r.property_id) || "—",
    propertyId: r.property_id ?? null,
    buyerName: r.buyer_name || "Buyer",
    contact: r.contact_phone ?? r.buyer_email ?? null,
    scheduledAt: r.scheduled_at,
    status: r.status,
    createdAt: r.created_at,
    notes: r.notes ?? r.message ?? null,
  }));
}

// ------------------------------------------------------------- deals

export type DealOpsFilter = "active" | "attention" | "completed" | "cancelled" | "all";

export interface AdminDeal {
  id: string;
  reference: string;
  stage: string;
  health: string;
  priority: string;
  value: number | null;
  currency: string;
  propertyId: string | null;
  propertyTitle: string;
  buyerName: string;
  ownerName: string;
  agentName: string | null;
  leadId: string | null;
  lastActivityAt: string;
}

export async function fetchAdminDeals(filter: DealOpsFilter = "active"): Promise<AdminDeal[]> {
  let q = supabase.from("deals").select("*").order("last_activity_at", { ascending: false }).limit(200);
  if (filter === "active") q = q.not("stage", "in", "(completed,cancelled)");
  else if (filter === "completed") q = q.eq("stage", "completed");
  else if (filter === "cancelled") q = q.eq("stage", "cancelled");
  else if (filter === "attention") q = q.in("health", ["at_risk", "waiting"]);
  const { data } = await q;
  const rows = (data ?? []) as any[];
  if (!rows.length) return [];

  const propIds = Array.from(new Set(rows.map((r) => r.property_id).filter(Boolean)));
  const peopleIds = Array.from(new Set(rows.flatMap((r) => [r.owner_id, r.agent_id, r.buyer_id]).filter(Boolean)));
  const [props, people] = await Promise.all([
    propIds.length ? supabase.from("properties").select("id,title").in("id", propIds) : Promise.resolve({ data: [] as any[] }),
    peopleIds.length ? supabase.from("profiles").select("id,full_name").in("id", peopleIds) : Promise.resolve({ data: [] as any[] }),
  ]);
  const titles = new Map(((props.data ?? []) as any[]).map((p) => [p.id, p.title]));
  const names = new Map(((people.data ?? []) as any[]).map((p) => [p.id, p.full_name]));

  return rows.map((r) => ({
    id: r.id,
    reference: r.reference,
    stage: r.stage,
    health: r.health,
    priority: r.priority,
    value: r.value != null ? Number(r.value) : null,
    currency: r.currency ?? "TZS",
    propertyId: r.property_id ?? null,
    propertyTitle: titles.get(r.property_id) || "—",
    buyerName: r.buyer_name || names.get(r.buyer_id) || "Buyer",
    ownerName: names.get(r.owner_id) || "Owner",
    agentName: r.agent_id ? names.get(r.agent_id) || "Agent" : null,
    leadId: r.lead_id ?? null,
    lastActivityAt: r.last_activity_at,
  }));
}

// ----------------------------------------------------------- revenue

export interface RevenueBreakdown {
  currency: string;
  today: number;
  month: number;
  total: number;
  byPurpose: { purpose: string; amount: number; count: number }[];
}

export async function fetchRevenueBreakdown(): Promise<RevenueBreakdown> {
  const { data } = await supabase
    .from("payments")
    .select("amount,currency,status,purpose,created_at")
    .in("status", CONFIRMED)
    .limit(5000);
  const rows = (data ?? []) as any[];
  const today = startOfToday();
  const month = startOfMonth();
  const byPurpose = new Map<string, { amount: number; count: number }>();
  for (const r of rows) {
    const key = r.purpose ?? "other";
    const e = byPurpose.get(key) ?? { amount: 0, count: 0 };
    e.amount += Number(r.amount ?? 0);
    e.count += 1;
    byPurpose.set(key, e);
  }
  const sum = (fn: (r: any) => boolean) => rows.filter(fn).reduce((s, r) => s + Number(r.amount ?? 0), 0);
  return {
    currency: rows[0]?.currency ?? "TZS",
    today: sum((r) => r.created_at >= today),
    month: sum((r) => r.created_at >= month),
    total: sum(() => true),
    byPurpose: [...byPurpose.entries()].map(([purpose, v]) => ({ purpose, ...v })).sort((a, b) => b.amount - a.amount),
  };
}

// ------------------------------------------------------------ search

export interface AdminSearchResult {
  id: string;
  type: "user" | "property" | "lead" | "viewing" | "deal" | "report";
  title: string;
  subtitle: string;
  section: string;
}

export async function adminSearch(term: string): Promise<AdminSearchResult[]> {
  const q = term.trim();
  if (q.length < 2) return [];
  const like = `%${q}%`;
  const [users, props, leads, viewings, deals, reports] = await Promise.all([
    supabase.from("profiles").select("id,full_name,email,phone").or(`full_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`).limit(6),
    supabase.from("properties").select("id,title,region,district,status").ilike("title", like).limit(6),
    supabase.from("leads").select("id,visitor_name,status,created_at").ilike("visitor_name", like).limit(6),
    supabase.from("bookings").select("id,buyer_name,status,scheduled_at").ilike("buyer_name", like).limit(6),
    supabase.from("deals").select("id,reference,stage,buyer_name").or(`reference.ilike.${like},buyer_name.ilike.${like}`).limit(6),
    supabase.from("safety_reports").select("id,reference,reason,status").or(`reference.ilike.${like},reason.ilike.${like}`).limit(6),
  ]);

  const out: AdminSearchResult[] = [
    ...((users.data ?? []) as any[]).map((u) => ({ id: u.id, type: "user" as const, title: u.full_name || "Unnamed user", subtitle: u.email ?? u.phone ?? "User", section: "users" })),
    ...((props.data ?? []) as any[]).map((p) => ({ id: p.id, type: "property" as const, title: p.title ?? "Untitled space", subtitle: [p.district, p.region].filter(Boolean).join(", ") || String(p.status), section: "properties" })),
    ...((leads.data ?? []) as any[]).map((l) => ({ id: l.id, type: "lead" as const, title: l.visitor_name || "Inquiry", subtitle: `Inquiry · ${l.status}`, section: "leads" })),
    ...((viewings.data ?? []) as any[]).map((b) => ({ id: b.id, type: "viewing" as const, title: b.buyer_name || "Viewing request", subtitle: `Viewing · ${b.status}`, section: "viewings" })),
    ...((deals.data ?? []) as any[]).map((d) => ({ id: d.id, type: "deal" as const, title: d.reference, subtitle: `Deal · ${String(d.stage).replace(/_/g, " ")}`, section: "deals" })),
    ...((reports.data ?? []) as any[]).map((r) => ({ id: r.id, type: "report" as const, title: r.reference, subtitle: `Report · ${r.status}`, section: "reports" })),
  ];
  return out;
}

// ------------------------------------------------------- activity log

export interface AdminActionLog {
  id: string;
  adminName: string;
  action: string;
  targetType: string;
  targetLabel: string | null;
  reason: string | null;
  createdAt: string;
}

export async function logAdminAction(input: {
  action: string;
  targetType: string;
  targetId?: string | null;
  targetLabel?: string | null;
  reason?: string | null;
  meta?: Record<string, unknown>;
}) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase.from("admin_actions").insert({
    admin_id: auth.user.id,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId ?? null,
    target_label: input.targetLabel ?? null,
    reason: input.reason ?? null,
    meta: (input.meta ?? {}) as never,
  } as never);
}

export async function fetchAdminActionLog(): Promise<AdminActionLog[]> {
  const { data } = await supabase
    .from("admin_actions")
    .select("id,admin_id,action,target_type,target_label,reason,created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as any[];
  if (!rows.length) return [];
  const ids = Array.from(new Set(rows.map((r) => r.admin_id)));
  const { data: people } = await supabase.from("profiles").select("id,full_name").in("id", ids);
  const names = new Map(((people ?? []) as any[]).map((p) => [p.id, p.full_name]));
  return rows.map((r) => ({
    id: r.id,
    adminName: names.get(r.admin_id) || "Administrator",
    action: r.action,
    targetType: r.target_type,
    targetLabel: r.target_label ?? null,
    reason: r.reason ?? null,
    createdAt: r.created_at,
  }));
}

// --------------------------------------------------- user moderation

export async function setUserAccountStatus(userId: string, status: "active" | "suspended", reason?: string, name?: string) {
  const { error } = await supabase
    .from("profiles")
    .update({
      account_status: status,
      suspension_reason: status === "suspended" ? (reason ?? "Suspended by administrator") : null,
    } as never)
    .eq("id", userId);
  if (error) throw error;
  await logAdminAction({
    action: status === "suspended" ? "user_suspended" : "user_restored",
    targetType: "user",
    targetId: userId,
    targetLabel: name ?? null,
    reason: reason ?? null,
  });
}
