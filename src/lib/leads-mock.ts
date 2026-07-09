import { properties, agents, type Property, type Agent } from "@/lib/mock-data";

export type LeadStage =
  | "new"
  | "contacted"
  | "viewing_scheduled"
  | "negotiating"
  | "offer_made"
  | "deal_closed"
  | "lost"
  | "archived";

export type LeadSource =
  | "listing_inquiry"
  | "search_alert"
  | "whatsapp"
  | "phone"
  | "referral"
  | "walk_in"
  | "agent_added";

export type ActivityKind =
  | "created"
  | "stage_changed"
  | "message_sent"
  | "call_made"
  | "whatsapp_sent"
  | "viewing_requested"
  | "viewing_completed"
  | "offer_made"
  | "deal_closed"
  | "note_added"
  | "task_created"
  | "task_completed"
  | "assigned";

export interface Activity {
  id: string;
  at: string;
  kind: ActivityKind;
  label: string;
  detail?: string;
  by?: string;
}

export type TaskType = "call" | "whatsapp" | "meeting" | "follow_up" | "custom";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  type: TaskType;
  title: string;
  dueAt: string;
  priority: TaskPriority;
  completed: boolean;
  completedAt?: string;
}

export interface Note {
  id: string;
  body: string;
  visibility: "private" | "public";
  authorName: string;
  createdAt: string;
  attachments?: { name: string; size: string }[];
}

export interface Lead {
  id: string;
  customerName: string;
  customerAvatar?: string;
  phone: string;
  email?: string;
  propertyId: string;
  budgetMin?: number;
  budgetMax?: number;
  budgetCurrency: "TZS" | "USD";
  preferredArea?: string;
  stage: LeadStage;
  score: number; // 0-100
  source: LeadSource;
  assignedAgentId: string;
  createdAt: string;
  lastActivityAt: string;
  tags?: string[];
  activity: Activity[];
  tasks: Task[];
  notes: Note[];
}

/* ============================ META ============================ */

export const STAGE_META: Record<LeadStage, { label: string; color: string; dot: string; ring: string }> = {
  new:               { label: "New Inquiry",       color: "bg-sky-500/10 text-sky-700 dark:text-sky-300",           dot: "bg-sky-500",       ring: "ring-sky-500/30" },
  contacted:         { label: "Contacted",         color: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",   dot: "bg-indigo-500",    ring: "ring-indigo-500/30" },
  viewing_scheduled: { label: "Viewing Scheduled", color: "bg-violet-500/10 text-violet-700 dark:text-violet-300",   dot: "bg-violet-500",    ring: "ring-violet-500/30" },
  negotiating:       { label: "Negotiating",       color: "bg-amber-500/10 text-amber-700 dark:text-amber-300",      dot: "bg-amber-500",     ring: "ring-amber-500/30" },
  offer_made:        { label: "Offer Made",        color: "bg-orange-500/10 text-orange-700 dark:text-orange-300",   dot: "bg-orange-500",    ring: "ring-orange-500/30" },
  deal_closed:       { label: "Deal Closed",       color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",dot: "bg-emerald-500",   ring: "ring-emerald-500/30" },
  lost:              { label: "Lost",              color: "bg-rose-500/10 text-rose-700 dark:text-rose-300",         dot: "bg-rose-500",      ring: "ring-rose-500/30" },
  archived:          { label: "Archived",          color: "bg-slate-500/10 text-slate-700 dark:text-slate-300",      dot: "bg-slate-500",     ring: "ring-slate-500/30" },
};

export const PIPELINE_STAGES: LeadStage[] = [
  "new", "contacted", "viewing_scheduled", "negotiating", "offer_made", "deal_closed",
];

export const ALL_STAGES: LeadStage[] = [
  ...PIPELINE_STAGES, "lost", "archived",
];

export const SOURCE_META: Record<LeadSource, string> = {
  listing_inquiry: "Listing inquiry",
  search_alert:    "Search alert",
  whatsapp:        "WhatsApp",
  phone:           "Phone",
  referral:        "Referral",
  walk_in:         "Walk-in",
  agent_added:     "Added by agent",
};

export const ACTIVITY_META: Record<ActivityKind, { label: string; dot: string }> = {
  created:            { label: "Lead created",       dot: "bg-primary" },
  stage_changed:      { label: "Stage changed",      dot: "bg-indigo-500" },
  message_sent:       { label: "Message sent",       dot: "bg-sky-500" },
  call_made:          { label: "Call made",          dot: "bg-cyan-500" },
  whatsapp_sent:      { label: "WhatsApp sent",      dot: "bg-emerald-500" },
  viewing_requested:  { label: "Viewing requested",  dot: "bg-violet-500" },
  viewing_completed:  { label: "Viewing completed",  dot: "bg-violet-600" },
  offer_made:         { label: "Offer made",         dot: "bg-orange-500" },
  deal_closed:        { label: "Deal closed",        dot: "bg-emerald-600" },
  note_added:         { label: "Note added",         dot: "bg-slate-500" },
  task_created:       { label: "Task created",       dot: "bg-amber-500" },
  task_completed:     { label: "Task completed",     dot: "bg-emerald-500" },
  assigned:           { label: "Assigned",           dot: "bg-primary" },
};

export const TASK_META: Record<TaskType, { label: string; icon: string }> = {
  call:      { label: "Call customer",   icon: "phone" },
  whatsapp:  { label: "Send WhatsApp",   icon: "message" },
  meeting:   { label: "Schedule meeting",icon: "calendar" },
  follow_up: { label: "Follow up",        icon: "clock" },
  custom:    { label: "Task",             icon: "check" },
};

/* ============================ SEED DATA ============================ */

const now = Date.now();
const ago = (h: number) => new Date(now - h * 3600_000).toISOString();
const future = (h: number) => new Date(now + h * 3600_000).toISOString();

const CUSTOMERS: { name: string; phone: string; email?: string; avatar?: string }[] = [
  { name: "Amina Hassan",        phone: "+255 714 220 118", email: "amina.h@mail.co.tz",     avatar: "https://i.pravatar.cc/120?img=47" },
  { name: "James Mwakalinga",    phone: "+255 754 811 902", email: "j.mwakalinga@gmail.com", avatar: "https://i.pravatar.cc/120?img=15" },
  { name: "Grace Kimario",       phone: "+255 762 448 100",                                    avatar: "https://i.pravatar.cc/120?img=32" },
  { name: "Salim Rajabu",        phone: "+255 787 099 431", email: "salim.r@spaces.co.tz",   avatar: "https://i.pravatar.cc/120?img=22" },
  { name: "Neema Charles",       phone: "+255 715 003 217", email: "neema.charles@mail.tz",  avatar: "https://i.pravatar.cc/120?img=44" },
  { name: "David Massawe",       phone: "+255 787 001 774",                                    avatar: "https://i.pravatar.cc/120?img=12" },
  { name: "Faiza Abdallah",      phone: "+255 767 552 981", email: "faiza.a@icloud.com",     avatar: "https://i.pravatar.cc/120?img=48" },
  { name: "Peter Sanga",         phone: "+255 754 118 200",                                    avatar: "https://i.pravatar.cc/120?img=8" },
  { name: "Rehema Ally",         phone: "+255 719 331 442", email: "rehema.a@yahoo.com",     avatar: "https://i.pravatar.cc/120?img=45" },
  { name: "Baraka Mushi",        phone: "+255 786 077 208",                                    avatar: "https://i.pravatar.cc/120?img=17" },
  { name: "Zainab Mohamedi",     phone: "+255 748 220 190", email: "zainab.m@mail.co.tz",    avatar: "https://i.pravatar.cc/120?img=41" },
  { name: "Emmanuel Kileo",      phone: "+255 715 998 001",                                    avatar: "https://i.pravatar.cc/120?img=11" },
];

const STAGE_ROTATION: LeadStage[] = [
  "new", "new", "contacted", "contacted", "viewing_scheduled",
  "viewing_scheduled", "negotiating", "offer_made", "deal_closed",
  "lost", "contacted", "new",
];

const SOURCE_ROTATION: LeadSource[] = [
  "listing_inquiry", "whatsapp", "listing_inquiry", "search_alert", "phone",
  "listing_inquiry", "referral", "listing_inquiry", "whatsapp", "walk_in",
  "search_alert", "listing_inquiry",
];

function buildLead(i: number): Lead {
  const c = CUSTOMERS[i];
  const property = properties[i % properties.length];
  const stage = STAGE_ROTATION[i];
  const source = SOURCE_ROTATION[i];
  const agent = agents[i % agents.length];
  const createdHoursAgo = 6 + i * 9;
  const lastHoursAgo = Math.max(1, createdHoursAgo - (i * 3));

  const budgetBase = property.price;
  const budgetMin = Math.round(budgetBase * 0.85);
  const budgetMax = Math.round(budgetBase * 1.1);

  const scoreBase =
    stage === "deal_closed" ? 96 :
    stage === "offer_made"  ? 88 :
    stage === "negotiating" ? 82 :
    stage === "viewing_scheduled" ? 74 :
    stage === "contacted"   ? 62 :
    stage === "lost"        ? 22 :
    stage === "archived"    ? 30 :
    45;

  const activity: Activity[] = [
    { id: `a-${i}-0`, at: ago(createdHoursAgo), kind: "created",  label: "Lead created",  detail: `Source: ${SOURCE_META[source]}` },
    { id: `a-${i}-1`, at: ago(createdHoursAgo - 1), kind: "assigned", label: `Assigned to ${agent.name}` },
  ];
  if (stage !== "new") activity.push({ id: `a-${i}-2`, at: ago(createdHoursAgo - 2), kind: "message_sent",  label: "Message sent", detail: "Sent property brochure and availability" });
  if (stage === "viewing_scheduled" || stage === "negotiating" || stage === "offer_made" || stage === "deal_closed") {
    activity.push({ id: `a-${i}-3`, at: ago(createdHoursAgo - 6), kind: "viewing_requested", label: "Viewing requested" });
  }
  if (stage === "negotiating" || stage === "offer_made" || stage === "deal_closed") {
    activity.push({ id: `a-${i}-4`, at: ago(lastHoursAgo + 4), kind: "viewing_completed", label: "Viewing completed", detail: "Positive feedback from customer" });
  }
  if (stage === "offer_made" || stage === "deal_closed") {
    activity.push({ id: `a-${i}-5`, at: ago(lastHoursAgo + 2), kind: "offer_made", label: "Offer made", detail: `Offer: ${Math.round(budgetBase * 0.95).toLocaleString()} ${property.currency}` });
  }
  if (stage === "deal_closed") {
    activity.push({ id: `a-${i}-6`, at: ago(lastHoursAgo), kind: "deal_closed", label: "Deal closed", detail: "Payment received. Contract signed." });
  }

  const tasks: Task[] = [];
  if (stage === "new") tasks.push({ id: `t-${i}-1`, type: "call",     title: "Introductory call",       dueAt: future(2 + i),  priority: "high",   completed: false });
  if (stage === "contacted") tasks.push({ id: `t-${i}-1`, type: "whatsapp", title: "Share floor plans",   dueAt: future(6 + i),  priority: "medium", completed: false });
  if (stage === "viewing_scheduled") tasks.push({ id: `t-${i}-1`, type: "meeting", title: "Confirm viewing 24h prior", dueAt: future(20), priority: "high", completed: false });
  if (stage === "negotiating") tasks.push({ id: `t-${i}-1`, type: "follow_up", title: "Follow up on counter-offer", dueAt: future(4), priority: "high", completed: false });
  if (stage === "offer_made") tasks.push({ id: `t-${i}-1`, type: "call", title: "Confirm signing appointment", dueAt: future(1), priority: "high", completed: false });

  const notes: Note[] = [];
  if (i % 3 === 0) notes.push({
    id: `n-${i}-1`,
    body: "Customer is relocating from Nairobi. Needs move-in within 30 days. Willing to sign a 12-month lease upfront.",
    visibility: "private",
    authorName: agent.name,
    createdAt: ago(lastHoursAgo + 5),
  });
  if (i % 4 === 1) notes.push({
    id: `n-${i}-2`,
    body: "Prefers furnished. Interested in parking for two cars.",
    visibility: "public",
    authorName: agent.name,
    createdAt: ago(lastHoursAgo + 2),
    attachments: [{ name: "Requirements.pdf", size: "148 KB" }],
  });

  return {
    id: `lead-${i + 1}`,
    customerName: c.name,
    customerAvatar: c.avatar,
    phone: c.phone,
    email: c.email,
    propertyId: property.id,
    budgetMin,
    budgetMax,
    budgetCurrency: property.currency,
    preferredArea: `${property.ward}, ${property.city}`,
    stage,
    score: scoreBase + ((i * 3) % 7) - 3,
    source,
    assignedAgentId: agent.id,
    createdAt: ago(createdHoursAgo),
    lastActivityAt: ago(lastHoursAgo),
    tags: stage === "deal_closed" ? ["hot", "closed"] : stage === "negotiating" ? ["hot"] : stage === "offer_made" ? ["hot", "urgent"] : [],
    activity: activity.reverse(),
    tasks,
    notes,
  };
}

export const LEADS: Lead[] = CUSTOMERS.map((_, i) => buildLead(i));

/* ============================ HELPERS ============================ */

export function propertyOfLead(l: Lead): Property | undefined {
  return properties.find((p) => p.id === l.propertyId);
}

export function agentOfLead(l: Lead): Agent | undefined {
  return agents.find((a) => a.id === l.assignedAgentId);
}

export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const abs = Math.abs(diffMs);
  const past = diffMs >= 0;
  const min = Math.round(abs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${past ? "" : "in "}${min}m${past ? " ago" : ""}`;
  const h = Math.round(min / 60);
  if (h < 24) return `${past ? "" : "in "}${h}h${past ? " ago" : ""}`;
  const d = Math.round(h / 24);
  if (d < 7) return `${past ? "" : "in "}${d}d${past ? " ago" : ""}`;
  const w = Math.round(d / 7);
  return `${past ? "" : "in "}${w}w${past ? " ago" : ""}`;
}

export function formatBudget(l: Lead): string {
  if (!l.budgetMin && !l.budgetMax) return "—";
  const c = l.budgetCurrency;
  const fmt = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${Math.round(n / 1_000)}K` : String(n);
  if (l.budgetMin && l.budgetMax) return `${c} ${fmt(l.budgetMin)} – ${fmt(l.budgetMax)}`;
  return `${c} ${fmt((l.budgetMin ?? l.budgetMax) as number)}`;
}

export function scoreTone(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Hot",    color: "bg-rose-500/10 text-rose-700 dark:text-rose-300" };
  if (score >= 60) return { label: "Warm",   color: "bg-amber-500/10 text-amber-700 dark:text-amber-300" };
  if (score >= 40) return { label: "Nurture",color: "bg-sky-500/10 text-sky-700 dark:text-sky-300" };
  return               { label: "Cold",   color: "bg-slate-500/10 text-slate-700 dark:text-slate-300" };
}

export function computeKpis(leads: Lead[]) {
  const total = leads.length;
  const closed = leads.filter((l) => l.stage === "deal_closed").length;
  const lost = leads.filter((l) => l.stage === "lost").length;
  const negotiating = leads.filter((l) => l.stage === "negotiating" || l.stage === "offer_made").length;
  const pendingFollowUps = leads.reduce((acc, l) => acc + l.tasks.filter((t) => !t.completed).length, 0);
  const todayIso = new Date();
  todayIso.setHours(0, 0, 0, 0);
  const todaysLeads = leads.filter((l) => new Date(l.createdAt).getTime() >= todayIso.getTime()).length;
  const conversion = total === 0 ? 0 : Math.round((closed / total) * 100);

  // Avg closing time in days (closed only)
  const closedLeads = leads.filter((l) => l.stage === "deal_closed");
  const avgDays = closedLeads.length === 0 ? 0 : Math.round(
    closedLeads.reduce((sum, l) => sum + (new Date(l.lastActivityAt).getTime() - new Date(l.createdAt).getTime()) / 86_400_000, 0) / closedLeads.length,
  );

  const bySource: Record<LeadSource, number> = {
    listing_inquiry: 0, search_alert: 0, whatsapp: 0, phone: 0, referral: 0, walk_in: 0, agent_added: 0,
  };
  leads.forEach((l) => { bySource[l.source] += 1; });

  const byAgent = new Map<string, { agent: Agent | undefined; count: number; closed: number }>();
  leads.forEach((l) => {
    const cur = byAgent.get(l.assignedAgentId) ?? { agent: agentOfLead(l), count: 0, closed: 0 };
    cur.count += 1;
    if (l.stage === "deal_closed") cur.closed += 1;
    byAgent.set(l.assignedAgentId, cur);
  });
  const topAgent = Array.from(byAgent.values()).sort((a, b) => b.closed - a.closed || b.count - a.count)[0];

  const byProperty = new Map<string, { property: Property | undefined; count: number }>();
  leads.forEach((l) => {
    const cur = byProperty.get(l.propertyId) ?? { property: propertyOfLead(l), count: 0 };
    cur.count += 1;
    byProperty.set(l.propertyId, cur);
  });
  const topProperty = Array.from(byProperty.values()).sort((a, b) => b.count - a.count)[0];

  return {
    total, closed, lost, negotiating, pendingFollowUps, todaysLeads, conversion, avgDays,
    bySource, topAgent, topProperty,
  };
}
