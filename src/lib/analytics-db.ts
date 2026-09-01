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
