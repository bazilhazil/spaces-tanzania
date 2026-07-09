import { properties, agents, type Property, type Agent } from "@/lib/mock-data";

export type DealStage =
  | "new_inquiry"
  | "qualified"
  | "viewing_scheduled"
  | "viewing_completed"
  | "negotiation"
  | "offer_submitted"
  | "offer_accepted"
  | "agreement"
  | "completed"
  | "cancelled"
  | "lost"
  | "archived";

export type DealPriority = "low" | "medium" | "high" | "urgent";

export type DealActivityKind =
  | "inquiry_received"
  | "message_sent"
  | "call_made"
  | "viewing_scheduled"
  | "viewing_completed"
  | "offer_submitted"
  | "counter_offer"
  | "offer_accepted"
  | "offer_rejected"
  | "agreement_uploaded"
  | "document_uploaded"
  | "stage_changed"
  | "note_added"
  | "agent_assigned"
  | "deal_completed"
  | "deal_cancelled"
  | "reminder";

export interface DealActivity {
  id: string;
  at: string;
  kind: DealActivityKind;
  label: string;
  detail?: string;
  by?: string;
}

export type OfferStatus = "pending" | "countered" | "accepted" | "rejected" | "withdrawn";

export interface Offer {
  id: string;
  at: string;
  by: "buyer" | "owner" | "agent";
  amount: number;
  currency: "TZS" | "USD";
  status: OfferStatus;
  note?: string;
}

export type DocumentKind =
  | "offer_letter"
  | "lease_agreement"
  | "sale_agreement"
  | "inspection_report"
  | "identity"
  | "other";

export interface DealDocument {
  id: string;
  name: string;
  kind: DocumentKind;
  sizeKb: number;
  uploadedAt: string;
  uploadedBy: string;
  status?: "pending_review" | "approved" | "rejected";
}

export interface DealReminder {
  id: string;
  kind: "deadline" | "agreement_pending" | "viewing_tomorrow" | "follow_up";
  label: string;
  dueAt: string;
}

export interface DealNote {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
  pinned?: boolean;
}

export interface Deal {
  id: string;
  reference: string;
  buyerName: string;
  buyerAvatar?: string;
  buyerPhone: string;
  buyerEmail?: string;
  propertyId: string;
  ownerName: string;
  assignedAgentId: string;
  stage: DealStage;
  priority: DealPriority;
  value: number;
  currency: "TZS" | "USD";
  expectedClose: string;
  createdAt: string;
  lastActivityAt: string;
  tags?: string[];
  offers: Offer[];
  activity: DealActivity[];
  documents: DealDocument[];
  reminders: DealReminder[];
  notes: DealNote[];
}

/* ============================ META ============================ */

export const STAGE_META: Record<DealStage, { label: string; short: string; color: string; dot: string }> = {
  new_inquiry:       { label: "New Inquiry",         short: "New",         color: "bg-sky-500/10 text-sky-700 dark:text-sky-300",           dot: "bg-sky-500" },
  qualified:         { label: "Qualified Lead",      short: "Qualified",   color: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",  dot: "bg-indigo-500" },
  viewing_scheduled: { label: "Viewing Scheduled",   short: "Scheduled",   color: "bg-violet-500/10 text-violet-700 dark:text-violet-300",  dot: "bg-violet-500" },
  viewing_completed: { label: "Viewing Completed",   short: "Viewed",      color: "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300",dot: "bg-fuchsia-500" },
  negotiation:       { label: "Negotiation",         short: "Negotiating", color: "bg-amber-500/10 text-amber-700 dark:text-amber-300",     dot: "bg-amber-500" },
  offer_submitted:   { label: "Offer Submitted",     short: "Offered",     color: "bg-orange-500/10 text-orange-700 dark:text-orange-300",  dot: "bg-orange-500" },
  offer_accepted:    { label: "Offer Accepted",      short: "Accepted",    color: "bg-lime-500/10 text-lime-700 dark:text-lime-300",        dot: "bg-lime-500" },
  agreement:         { label: "Agreement in Progress", short: "Agreement", color: "bg-teal-500/10 text-teal-700 dark:text-teal-300",        dot: "bg-teal-500" },
  completed:         { label: "Completed",           short: "Completed",   color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",dot: "bg-emerald-500" },
  cancelled:         { label: "Cancelled",           short: "Cancelled",   color: "bg-rose-500/10 text-rose-700 dark:text-rose-300",        dot: "bg-rose-500" },
  lost:              { label: "Lost",                short: "Lost",        color: "bg-red-500/10 text-red-700 dark:text-red-300",           dot: "bg-red-500" },
  archived:          { label: "Archived",            short: "Archived",    color: "bg-slate-500/10 text-slate-700 dark:text-slate-300",     dot: "bg-slate-500" },
};

export const PIPELINE_STAGES: DealStage[] = [
  "new_inquiry", "qualified", "viewing_scheduled", "viewing_completed",
  "negotiation", "offer_submitted", "offer_accepted", "agreement", "completed",
];

export const ALL_STAGES: DealStage[] = [
  ...PIPELINE_STAGES, "cancelled", "lost", "archived",
];

export const PRIORITY_META: Record<DealPriority, { label: string; color: string }> = {
  low:     { label: "Low",     color: "bg-slate-500/10 text-slate-700 dark:text-slate-300" },
  medium:  { label: "Medium",  color: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  high:    { label: "High",    color: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  urgent:  { label: "Urgent",  color: "bg-rose-500/10 text-rose-700 dark:text-rose-300" },
};

export const DOCUMENT_META: Record<DocumentKind, { label: string }> = {
  offer_letter:     { label: "Offer Letter" },
  lease_agreement:  { label: "Lease Agreement" },
  sale_agreement:   { label: "Sale Agreement" },
  inspection_report:{ label: "Inspection Report" },
  identity:         { label: "Identity Document" },
  other:            { label: "Attachment" },
};

/* ============================ SEED ============================ */

const now = Date.now();
const ago = (h: number) => new Date(now - h * 3600_000).toISOString();
const future = (h: number) => new Date(now + h * 3600_000).toISOString();

const BUYERS = [
  { name: "Amina Hassan",     phone: "+255 714 220 118", email: "amina.h@mail.co.tz",    avatar: "https://i.pravatar.cc/120?img=47" },
  { name: "James Mwakalinga", phone: "+255 754 811 902", email: "j.mwakalinga@gmail.com",avatar: "https://i.pravatar.cc/120?img=15" },
  { name: "Grace Kimario",    phone: "+255 762 448 100",                                  avatar: "https://i.pravatar.cc/120?img=32" },
  { name: "Salim Rajabu",     phone: "+255 787 099 431", email: "salim.r@spaces.co.tz",  avatar: "https://i.pravatar.cc/120?img=22" },
  { name: "Neema Charles",    phone: "+255 715 003 217", email: "neema.charles@mail.tz", avatar: "https://i.pravatar.cc/120?img=44" },
  { name: "David Massawe",    phone: "+255 787 001 774",                                  avatar: "https://i.pravatar.cc/120?img=12" },
  { name: "Faiza Abdallah",   phone: "+255 767 552 981", email: "faiza.a@icloud.com",    avatar: "https://i.pravatar.cc/120?img=48" },
  { name: "Peter Sanga",      phone: "+255 754 118 200",                                  avatar: "https://i.pravatar.cc/120?img=8" },
  { name: "Rehema Ally",      phone: "+255 719 331 442", email: "rehema.a@yahoo.com",    avatar: "https://i.pravatar.cc/120?img=45" },
  { name: "Baraka Mushi",     phone: "+255 786 077 208",                                  avatar: "https://i.pravatar.cc/120?img=17" },
  { name: "Zainab Mohamedi",  phone: "+255 748 220 190", email: "zainab.m@mail.co.tz",   avatar: "https://i.pravatar.cc/120?img=41" },
  { name: "Emmanuel Kileo",   phone: "+255 715 998 001",                                  avatar: "https://i.pravatar.cc/120?img=11" },
];

const STAGE_ROT: DealStage[] = [
  "new_inquiry", "qualified", "viewing_scheduled", "viewing_completed",
  "negotiation", "offer_submitted", "offer_accepted", "agreement",
  "completed", "cancelled", "negotiation", "qualified",
];

const PRIORITY_ROT: DealPriority[] = [
  "medium", "high", "high", "medium", "urgent", "high", "urgent", "high", "medium", "low", "urgent", "medium",
];

function buildDeal(i: number): Deal {
  const b = BUYERS[i];
  const property = properties[i % properties.length];
  const agent = agents[i % agents.length];
  const stage = STAGE_ROT[i];
  const priority = PRIORITY_ROT[i];
  const createdH = 24 + i * 30;
  const lastH = Math.max(1, createdH - i * 6);
  const closeH = stage === "completed" ? -24 : stage === "cancelled" || stage === "lost" ? -48 : 24 * (2 + (i % 5));

  const askingPrice = property.price;
  const offers: Offer[] = [];
  if (["negotiation", "offer_submitted", "offer_accepted", "agreement", "completed"].includes(stage)) {
    offers.push({
      id: `o-${i}-1`, at: ago(lastH + 12), by: "buyer",
      amount: Math.round(askingPrice * 0.9), currency: property.currency,
      status: stage === "negotiation" ? "countered" : "accepted",
      note: "Initial offer, cash within 30 days.",
    });
  }
  if (stage === "negotiation") {
    offers.push({
      id: `o-${i}-2`, at: ago(lastH + 6), by: "owner",
      amount: Math.round(askingPrice * 0.96), currency: property.currency,
      status: "pending", note: "Counter offer with two-year lease terms.",
    });
  }
  if (["offer_accepted", "agreement", "completed"].includes(stage)) {
    offers.push({
      id: `o-${i}-3`, at: ago(lastH + 2), by: "buyer",
      amount: Math.round(askingPrice * 0.95), currency: property.currency,
      status: "accepted", note: "Final agreed price.",
    });
  }

  const activity: DealActivity[] = [
    { id: `a-${i}-0`, at: ago(createdH), kind: "inquiry_received", label: "Inquiry received", detail: `From listing: ${property.title}` },
    { id: `a-${i}-1`, at: ago(createdH - 1), kind: "agent_assigned", label: `Assigned to ${agent.name}` },
  ];
  if (stage !== "new_inquiry") activity.push({ id: `a-${i}-m`, at: ago(createdH - 3), kind: "message_sent", label: "Message sent", detail: "Shared brochure & availability" });
  if (["viewing_scheduled","viewing_completed","negotiation","offer_submitted","offer_accepted","agreement","completed"].includes(stage))
    activity.push({ id: `a-${i}-vs`, at: ago(createdH - 8), kind: "viewing_scheduled", label: "Viewing scheduled" });
  if (["viewing_completed","negotiation","offer_submitted","offer_accepted","agreement","completed"].includes(stage))
    activity.push({ id: `a-${i}-vc`, at: ago(createdH - 20), kind: "viewing_completed", label: "Viewing completed", detail: "Positive feedback" });
  if (["offer_submitted","offer_accepted","agreement","completed"].includes(stage))
    activity.push({ id: `a-${i}-os`, at: ago(lastH + 10), kind: "offer_submitted", label: "Offer submitted", detail: `${property.currency} ${Math.round(askingPrice*0.9).toLocaleString()}` });
  if (["offer_accepted","agreement","completed"].includes(stage))
    activity.push({ id: `a-${i}-oa`, at: ago(lastH + 4), kind: "offer_accepted", label: "Offer accepted" });
  if (["agreement","completed"].includes(stage))
    activity.push({ id: `a-${i}-au`, at: ago(lastH + 2), kind: "agreement_uploaded", label: "Agreement uploaded" });
  if (stage === "completed")
    activity.push({ id: `a-${i}-dc`, at: ago(lastH), kind: "deal_completed", label: "Deal completed", detail: "Payment received. Keys handed over." });
  if (stage === "cancelled")
    activity.push({ id: `a-${i}-x`, at: ago(lastH), kind: "deal_cancelled", label: "Deal cancelled", detail: "Buyer withdrew." });

  const documents: DealDocument[] = [];
  if (["offer_submitted","offer_accepted","agreement","completed"].includes(stage)) {
    documents.push({ id: `d-${i}-1`, name: "offer-letter.pdf", kind: "offer_letter", sizeKb: 210, uploadedAt: ago(lastH + 10), uploadedBy: b.name, status: "approved" });
  }
  if (["agreement","completed"].includes(stage)) {
    documents.push({ id: `d-${i}-2`, name: property.listingType === "sale" ? "sale-agreement.pdf" : "lease-agreement.pdf", kind: property.listingType === "sale" ? "sale_agreement" : "lease_agreement", sizeKb: 486, uploadedAt: ago(lastH + 3), uploadedBy: agent.name, status: "pending_review" });
    documents.push({ id: `d-${i}-3`, name: "buyer-id.pdf", kind: "identity", sizeKb: 96, uploadedAt: ago(lastH + 3), uploadedBy: b.name, status: "approved" });
  }
  if (stage === "completed") {
    documents.push({ id: `d-${i}-4`, name: "inspection-report.pdf", kind: "inspection_report", sizeKb: 1200, uploadedAt: ago(lastH + 1), uploadedBy: agent.name, status: "approved" });
  }

  const reminders: DealReminder[] = [];
  if (stage === "viewing_scheduled") reminders.push({ id: `r-${i}-1`, kind: "viewing_tomorrow", label: "Viewing tomorrow at 10:00", dueAt: future(20) });
  if (stage === "agreement") reminders.push({ id: `r-${i}-2`, kind: "agreement_pending", label: "Agreement awaiting signature", dueAt: future(36) });
  if (stage === "negotiation" || stage === "offer_submitted") reminders.push({ id: `r-${i}-3`, kind: "follow_up", label: "Follow up on counter offer", dueAt: future(6) });
  if (["qualified","viewing_completed"].includes(stage)) reminders.push({ id: `r-${i}-4`, kind: "deadline", label: "Send proposal by Friday", dueAt: future(48) });

  const notes: DealNote[] = [];
  if (i % 3 === 0) notes.push({ id: `n-${i}-1`, body: "Buyer relocating from Nairobi. Wants to move in within 30 days.", authorName: agent.name, createdAt: ago(lastH + 5), pinned: true });
  if (i % 4 === 1) notes.push({ id: `n-${i}-2`, body: "Prefers furnished. Parking for two cars.", authorName: agent.name, createdAt: ago(lastH + 2) });

  const acceptedAmount = offers.find(o => o.status === "accepted")?.amount ?? Math.round(askingPrice * 0.92);

  return {
    id: `deal-${i + 1}`,
    reference: `SPX-${String(2400 + i).padStart(4, "0")}`,
    buyerName: b.name,
    buyerAvatar: b.avatar,
    buyerPhone: b.phone,
    buyerEmail: b.email,
    propertyId: property.id,
    ownerName: agent.name,
    assignedAgentId: agent.id,
    stage,
    priority,
    value: stage === "completed" || stage === "agreement" || stage === "offer_accepted" ? acceptedAmount : askingPrice,
    currency: property.currency,
    expectedClose: new Date(now + closeH * 3600_000).toISOString(),
    createdAt: ago(createdH),
    lastActivityAt: ago(lastH),
    tags: stage === "completed" ? ["closed"] : priority === "urgent" ? ["hot"] : [],
    offers,
    activity: activity.reverse(),
    documents,
    reminders,
    notes,
  };
}

export const DEALS: Deal[] = BUYERS.map((_, i) => buildDeal(i));

/* ============================ HELPERS ============================ */

export function propertyOfDeal(d: Deal): Property | undefined {
  return properties.find((p) => p.id === d.propertyId);
}
export function agentOfDeal(d: Deal): Agent | undefined {
  return agents.find((a) => a.id === d.assignedAgentId);
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

export function formatValue(amount: number, currency: "TZS" | "USD"): string {
  const fmt = amount >= 1_000_000
    ? `${(amount / 1_000_000).toFixed(amount >= 10_000_000 ? 0 : 1)}M`
    : amount >= 1_000 ? `${Math.round(amount / 1_000)}K` : String(amount);
  return `${currency} ${fmt}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function computeDealKpis(deals: Deal[]) {
  const active = deals.filter(d => !["completed","cancelled","lost","archived"].includes(d.stage));
  const completed = deals.filter(d => d.stage === "completed");
  const cancelled = deals.filter(d => d.stage === "cancelled" || d.stage === "lost");
  const now = Date.now();
  const weekMs = 7 * 24 * 3600_000;
  const closingThisWeek = active.filter(d => {
    const t = new Date(d.expectedClose).getTime();
    return t >= now && t - now <= weekMs;
  }).length;

  const totalValue = deals.reduce((sum, d) => sum + (d.currency === "USD" ? d.value * 2600 : d.value), 0);

  const avgClosingDays = completed.length === 0 ? 0 : Math.round(
    completed.reduce((s, d) => s + (new Date(d.lastActivityAt).getTime() - new Date(d.createdAt).getTime()) / 86_400_000, 0) / completed.length
  );

  const conversion = deals.length === 0 ? 0 : Math.round((completed.length / deals.length) * 100);

  const byRegion = new Map<string, number>();
  const byCategory = new Map<string, number>();
  const byAgent = new Map<string, { agent: Agent | undefined; count: number; value: number; closed: number }>();

  deals.forEach(d => {
    const p = propertyOfDeal(d);
    if (p) {
      byRegion.set(p.city, (byRegion.get(p.city) ?? 0) + 1);
      byCategory.set(p.category, (byCategory.get(p.category) ?? 0) + 1);
    }
    const a = agentOfDeal(d);
    const cur = byAgent.get(d.assignedAgentId) ?? { agent: a, count: 0, value: 0, closed: 0 };
    cur.count += 1;
    cur.value += (d.currency === "USD" ? d.value * 2600 : d.value);
    if (d.stage === "completed") cur.closed += 1;
    byAgent.set(d.assignedAgentId, cur);
  });

  const topAgents = Array.from(byAgent.values())
    .sort((a, b) => b.closed - a.closed || b.value - a.value)
    .slice(0, 5);

  const highestValue = [...deals].sort((a, b) => {
    const va = a.currency === "USD" ? a.value * 2600 : a.value;
    const vb = b.currency === "USD" ? b.value * 2600 : b.value;
    return vb - va;
  }).slice(0, 5);

  return {
    activeCount: active.length,
    completedCount: completed.length,
    cancelledCount: cancelled.length,
    closingThisWeek,
    totalValueTzs: totalValue,
    avgClosingDays,
    conversion,
    byRegion: Array.from(byRegion.entries()).sort((a, b) => b[1] - a[1]),
    byCategory: Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]),
    topAgents,
    highestValue,
  };
}
