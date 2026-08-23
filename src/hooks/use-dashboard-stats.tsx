import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fetchCrmLeads } from "@/lib/crm-workflow";
import { fetchDeals, computeStats } from "@/lib/deals-db";
import { fetchMyAssignments } from "@/lib/property-agents";
import { listConversations } from "@/lib/messaging-db";

/**
 * Single source of truth for the dashboard cards.
 * Every number below comes from the SAME queries used by
 * Inquiries (fetchCrmLeads), My Deals (fetchDeals/computeStats),
 * My Properties (properties owned + assigned) and Messages (listConversations).
 */
export type DashboardStats = {
  activeInquiries: number;
  completedInquiries: number;
  listings: number;
  totalListings: number;
  activeDeals: number;
  completedDeals: number;
  pipelineValue: number;
  favorites: number;
  viewings: number;
  unreadMessages: number;
  propertyViews: number;
  rating: number | null;
};

const EMPTY: DashboardStats = {
  activeInquiries: 0,
  completedInquiries: 0,
  listings: 0,
  totalListings: 0,
  activeDeals: 0,
  completedDeals: 0,
  pipelineValue: 0,
  favorites: 0,
  viewings: 0,
  unreadMessages: 0,
  propertyViews: 0,
  rating: null,
};

export function useDashboardStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setStats(EMPTY);
      setLoading(false);
      return;
    }
    const assignments = await fetchMyAssignments(user.id);
    const assignedIds = Object.keys(assignments);

    const [leads, deals, ownedRes, assignedRes, favRes, bookRes, convos] = await Promise.all([
      fetchCrmLeads().catch(() => []),
      fetchDeals().catch(() => []),
      supabase.from("properties").select("id,status,view_count").eq("owner_id", user.id),
      assignedIds.length
        ? supabase.from("properties").select("id,status,view_count").in("id", assignedIds)
        : Promise.resolve({ data: [] as any[] } as never),
      supabase.from("favorites").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase
        .from("bookings")
        .select("id,status,buyer_id,owner_id,agent_id,recipient_id")
        .or(
          `buyer_id.eq.${user.id},owner_id.eq.${user.id},agent_id.eq.${user.id},recipient_id.eq.${user.id}`,
        ),
      listConversations(user.id).catch(() => []),
    ]);

    // Properties: owned + assigned, de-duplicated (same rule as My Properties).
    const byId = new Map<string, any>();
    for (const p of (((ownedRes as any).data ?? []) as any[])) byId.set(p.id, p);
    for (const p of (((assignedRes as any).data ?? []) as any[])) if (!byId.has(p.id)) byId.set(p.id, p);
    const props = [...byId.values()];
    const liveProps = props.filter((p) => p.status === "live");

    // Inquiries: same definition as the Inquiries page KPI.
    const activeInquiries = leads.filter((l) => l.status !== "won" && l.status !== "lost").length;
    const completedInquiries = leads.filter((l) => l.status === "won").length;

    // Deals: same computeStats() used by My Deals.
    const dealStats = computeStats(deals);
    const pipelineValue = deals
      .filter((d) => d.stage !== "completed" && d.stage !== "cancelled")
      .reduce((s, d) => s + (Number(d.value) || 0), 0);

    const bookings = (((bookRes as any).data ?? []) as any[]).filter(
      (b) => !["cancelled", "rejected", "completed"].includes(String(b.status)),
    );

    setStats({
      activeInquiries,
      completedInquiries,
      listings: liveProps.length,
      totalListings: props.length,
      activeDeals: dealStats.active,
      completedDeals: dealStats.completed,
      pipelineValue,
      favorites: (favRes as any).count ?? 0,
      viewings: bookings.length,
      unreadMessages: convos.reduce((s, c) => s + (c.unread ?? 0), 0),
      propertyViews: props.reduce((s, p) => s + (Number(p.view_count) || 0), 0),
      rating: null,
    });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void load().catch(() => alive && setLoading(false));

    if (!user) return () => { alive = false; };
    // Realtime: keep the dashboard in sync with the very same records.
    const channel = supabase
      .channel("dashboard-stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "properties" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => void load())
      .subscribe();

    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, [user, load]);

  return { stats, loading, refresh: load };
}
