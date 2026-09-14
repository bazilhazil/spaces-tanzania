import { supabase } from "@/integrations/supabase/client";

/**
 * Business Intelligence data layer.
 *
 * All numbers come from one admin-only database report (public.admin_analytics)
 * so the dashboard never aggregates partial, RLS-filtered client data and never
 * exposes personal information beyond the names needed to open a profile.
 */

export type AnalyticsRange = "1d" | "7d" | "30d" | "90d" | "ytd";

export const ANALYTICS_RANGES: AnalyticsRange[] = ["1d", "7d", "30d", "90d", "ytd"];

export function rangeBounds(range: AnalyticsRange): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date(to);
  switch (range) {
    case "1d": from.setHours(0, 0, 0, 0); break;
    case "7d": from.setDate(to.getDate() - 7); break;
    case "30d": from.setDate(to.getDate() - 30); break;
    case "90d": from.setDate(to.getDate() - 90); break;
    case "ytd": from.setMonth(0, 1); from.setHours(0, 0, 0, 0); break;
  }
  return { from, to };
}

export interface AnalyticsKpis {
  active_properties: number;
  new_properties: number;
  active_users: number;
  new_users: number;
  new_leads: number;
  viewing_requests: number;
  active_deals: number;
  completed_deals: number;
  confirmed_revenue: number;
}

export interface AnalyticsPrevious {
  new_users: number;
  new_properties: number;
  new_leads: number;
  deals: number;
  completed_deals: number;
  revenue: number;
}

export interface AnalyticsFunnel {
  views: number;
  leads: number;
  viewings: number;
  viewings_completed: number;
  deals: number;
  deals_completed: number;
}

export interface AnalyticsAttention {
  leads_waiting: number;
  silent_properties: number;
  viewings_pending: number;
  stale_deals: number;
  failed_payments: number;
  pending_verifications: number;
  open_tickets: number;
  properties_review: number;
}

export interface TopProperty {
  id: string;
  title: string;
  region: string | null;
  district: string | null;
  views: number;
  favorites: number;
  leads: number;
  viewings: number;
  completed_deals: number;
}

export interface AnalyticsReport {
  from: string;
  to: string;
  span_days: number;
  kpis: AnalyticsKpis;
  previous: AnalyticsPrevious;
  funnel: AnalyticsFunnel;
  attention: AnalyticsAttention;
  revenue: {
    rows: { purpose: string; confirmed: number; pending: number }[];
    confirmed: number;
    pending: number;
  };
  top_properties: TopProperty[];
  most_viewed: { id: string; title: string; views: number }[];
  most_contacted: { id: string; title: string; leads: number }[];
  top_locations: { name: string; views: number; leads: number; listings: number }[];
  top_areas: { name: string; activity: number; listings: number }[];
  top_types: { name: string; listings: number; views: number; leads: number }[];
  agents: {
    id: string; name: string | null; leads_handled: number;
    viewings_completed: number; deals_completed: number; conversion: number;
  }[];
  owners: {
    id: string; name: string | null; active_listings: number; views: number;
    leads: number; viewings: number; completed_deals: number;
  }[];
}

export async function fetchAnalytics(range: AnalyticsRange): Promise<AnalyticsReport> {
  const { from, to } = rangeBounds(range);
  const { data, error } = await supabase.rpc("admin_analytics" as never, {
    _from: from.toISOString(),
    _to: to.toISOString(),
  } as never);
  if (error) throw error;
  return data as unknown as AnalyticsReport;
}

/** Median first-response time, in minutes, across conversations started in range. */
export async function fetchResponseMinutes(range: AnalyticsRange): Promise<number | null> {
  const { from } = rangeBounds(range);
  const { data } = await supabase
    .from("messages")
    .select("conversation_id,sender_id,created_at")
    .gte("created_at", from.toISOString())
    .order("created_at", { ascending: true })
    .limit(2000);
  const rows = data ?? [];
  if (!rows.length) return null;
  const byConv = new Map<string, typeof rows>();
  rows.forEach((m) => {
    const arr = byConv.get(m.conversation_id) ?? [];
    arr.push(m);
    byConv.set(m.conversation_id, arr);
  });
  const gaps: number[] = [];
  byConv.forEach((arr) => {
    const first = arr[0];
    const reply = arr.find((m) => m.sender_id !== first.sender_id);
    if (first && reply) gaps.push((+new Date(reply.created_at) - +new Date(first.created_at)) / 60000);
  });
  if (!gaps.length) return null;
  gaps.sort((a, b) => a - b);
  return Math.round(gaps[Math.floor(gaps.length / 2)]);
}

/** Percentage change vs the previous equal period; null when there is not enough data. */
export function growth(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export function conversionRate(report: AnalyticsReport): number {
  const { new_leads, completed_deals } = report.kpis;
  if (!new_leads) return 0;
  return Math.round((completed_deals / new_leads) * 100);
}

/* ------------------------------------------------------------------ *
 * Saved-property (shortlist) insights — admin only.
 * Aggregate counts only: no buyer identity is ever read or returned.
 * ------------------------------------------------------------------ */

export interface SavesInsights {
  total: number;
  topProperties: { id: string; title: string; count: number }[];
  byType: { name: string; count: number }[];
  byLocation: { name: string; count: number }[];
}

export async function fetchSavesInsights(): Promise<SavesInsights> {
  // `favorites` is readable in bulk only by admins (RLS), and we deliberately
  // never select user_id so buyer behaviour stays private.
  const { data: favs, error } = await supabase.from("favorites").select("property_id");
  if (error) throw error;
  const rows = (favs ?? []) as { property_id: string }[];
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.property_id, (counts.get(r.property_id) ?? 0) + 1);
  const ids = [...counts.keys()];
  if (!ids.length) return { total: 0, topProperties: [], byType: [], byLocation: [] };

  const { data: props } = await supabase
    .from("properties")
    .select("id,title,property_type,region,district")
    .in("id", ids);

  const byType = new Map<string, number>();
  const byLocation = new Map<string, number>();
  const top: { id: string; title: string; count: number }[] = [];
  for (const p of (props ?? []) as any[]) {
    const c = counts.get(p.id) ?? 0;
    top.push({ id: p.id, title: p.title ?? "Untitled", count: c });
    if (p.property_type) byType.set(p.property_type, (byType.get(p.property_type) ?? 0) + c);
    const loc = [p.district, p.region].filter(Boolean).join(", ");
    if (loc) byLocation.set(loc, (byLocation.get(loc) ?? 0) + c);
  }
  const rank = (m: Map<string, number>) =>
    [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);

  return {
    total: rows.length,
    topProperties: top.sort((a, b) => b.count - a.count).slice(0, 5),
    byType: rank(byType),
    byLocation: rank(byLocation),
  };
}

/* ------------------------------------------------------------------ *
 * Inquiry follow-up insights — admin only, aggregate counts.
 * No buyer identity is read or returned.
 * ------------------------------------------------------------------ */

export interface LeadInsights {
  total: number;
  newLeads: number;
  contacted: number;
  viewingRequested: number;
  viewingCompleted: number;
  won: number;
  lost: number;
  /** Median hours between an inquiry arriving and the first response. */
  medianResponseHours: number | null;
  responseRate: number;
  conversionRate: number;
}

export async function fetchLeadInsights(): Promise<LeadInsights> {
  const { data, error } = await supabase
    .from("leads")
    .select("status,created_at,first_responded_at")
    .limit(5000);
  if (error) throw error;
  const rows = (data ?? []) as { status: string; created_at: string; first_responded_at: string | null }[];

  const count = (...s: string[]) => rows.filter((r) => s.includes(r.status)).length;
  const gaps = rows
    .filter((r) => r.first_responded_at)
    .map((r) => (+new Date(r.first_responded_at!) - +new Date(r.created_at)) / 3_600_000)
    .filter((h) => h >= 0)
    .sort((a, b) => a - b);
  const median = gaps.length ? Math.round(gaps[Math.floor(gaps.length / 2)] * 10) / 10 : null;
  const won = count("won");

  return {
    total: rows.length,
    newLeads: count("new"),
    contacted: count("contacted", "interested"),
    viewingRequested: count("viewing_scheduled"),
    viewingCompleted: count("viewing_completed"),
    won,
    lost: count("lost", "closed"),
    medianResponseHours: median,
    responseRate: rows.length ? Math.round((gaps.length / rows.length) * 100) : 0,
    conversionRate: rows.length ? Math.round((won / rows.length) * 100) : 0,
  };
}

