import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fetchCrmLeads } from "@/lib/crm-workflow";
import { fetchDeals } from "@/lib/deals-db";
import { fetchIncomingViewings } from "@/lib/viewings-db";
import { listNotificationsDb, type DbNotification } from "@/lib/notifications-db";
import { fetchMyAssignments } from "@/lib/property-agents";
import { signedUrl } from "@/lib/property-media";

/**
 * Read-only aggregation for the simple Owner/Agent home screen.
 * Reuses the very same fetchers the Inquiries, Viewings, Deals and
 * Notifications pages use — no new tables, no duplicate systems.
 */
export type AttentionKind = "lead" | "viewing" | "deal" | "verification" | "draft";

export type AttentionItem = {
  id: string;
  kind: AttentionKind;
  title: string;
  detail: string;
  to: string;
};

export type SpaceCard = {
  id: string;
  title: string;
  location: string;
  price: number;
  currency: string;
  status: string;
  views: number;
  leads: number;
  cover?: string;
};

export type ActivityItem = {
  id: string;
  title: string;
  body: string;
  at: string;
  link: string | null;
};

export type DashboardHome = {
  attention: AttentionItem[];
  spaces: SpaceCard[];
  activity: ActivityItem[];
  loading: boolean;
  refresh: () => Promise<void>;
};

const EMPTY = { attention: [], spaces: [], activity: [] };

export function useDashboardHome(mode: "owner" | "agent"): DashboardHome {
  const { user } = useAuth();
  const [state, setState] = useState<{
    attention: AttentionItem[]; spaces: SpaceCard[]; activity: ActivityItem[];
  }>(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setState(EMPTY);
      setLoading(false);
      return;
    }

    const assignments = mode === "agent" ? await fetchMyAssignments(user.id) : {};
    const assignedIds = Object.keys(assignments);

    const [leads, deals, viewings, notes, propsRes, verifRes] = await Promise.all([
      fetchCrmLeads().catch(() => []),
      fetchDeals().catch(() => []),
      fetchIncomingViewings().catch(() => []),
      listNotificationsDb(8).catch(() => [] as DbNotification[]),
      mode === "agent"
        ? (assignedIds.length
            ? supabase
                .from("properties")
                .select("id,title,region,district,price,currency,status,view_count,updated_at")
                .in("id", assignedIds)
                .order("updated_at", { ascending: false })
                .limit(6)
            : Promise.resolve({ data: [] as any[] } as never))
        : supabase
            .from("properties")
            .select("id,title,region,district,price,currency,status,view_count,updated_at")
            .eq("owner_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(6),
      supabase
        .from("verification_requests")
        .select("id,status,subject_type")
        .eq("requester_id", user.id)
        .in("status", ["more_info", "rejected"]),
    ]);

    const list = (((propsRes as any).data ?? []) as any[]);
    const ids = list.map((p) => p.id);

    // Covers + per-property lead counts (from the leads we already loaded).
    const covers: Record<string, string> = {};
    if (ids.length) {
      const { data: media } = await supabase
        .from("property_media")
        .select("property_id,storage_path,is_cover,position")
        .in("property_id", ids)
        .order("position", { ascending: true });
      const chosen: Record<string, string> = {};
      for (const m of (media ?? []) as any[]) {
        if (!chosen[m.property_id] || m.is_cover) chosen[m.property_id] = m.storage_path;
      }
      await Promise.all(
        Object.entries(chosen).map(async ([pid, path]) => {
          const url = await signedUrl(path);
          if (url) covers[pid] = url;
        }),
      );
    }
    const leadsByProp = new Map<string, number>();
    for (const l of leads) {
      if (!l.propertyId) continue;
      leadsByProp.set(l.propertyId, (leadsByProp.get(l.propertyId) ?? 0) + 1);
    }

    const spaces: SpaceCard[] = list.map((p) => ({
      id: p.id,
      title: p.title,
      location: [p.district, p.region].filter(Boolean).join(", ") || "Tanzania",
      price: Number(p.price) || 0,
      currency: p.currency ?? "TZS",
      status: p.status,
      views: Number(p.view_count) || 0,
      leads: leadsByProp.get(p.id) ?? 0,
      cover: covers[p.id],
    }));

    const attention: AttentionItem[] = [];

    for (const l of leads.filter((x) => x.status === "new").slice(0, 4)) {
      attention.push({
        id: `lead-${l.id}`,
        kind: "lead",
        title: l.name || l.propertyTitle || "New inquiry",
        detail: l.propertyTitle ?? "",
        to: "/leads",
      });
    }

    for (const v of viewings.filter((x) => x.status === "pending").slice(0, 4)) {
      attention.push({
        id: `viewing-${v.id}`,
        kind: "viewing",
        title: v.buyerName || "Viewing request",
        detail: v.propertyTitle,
        to: "/viewings",
      });
    }

    const now = Date.now();
    for (const d of deals
      .filter(
        (x) =>
          x.stage !== "completed" &&
          x.stage !== "cancelled" &&
          (x.health === "at_risk" ||
            (x.next_follow_up_at && new Date(x.next_follow_up_at).getTime() < now)),
      )
      .slice(0, 3)) {
      attention.push({
        id: `deal-${d.id}`,
        kind: "deal",
        title: d.buyer_name || d.reference,
        detail: d.property_title ?? "",
        to: "/deals",
      });
    }

    for (const v of (((verifRes as any).data ?? []) as any[]).slice(0, 2)) {
      attention.push({
        id: `verif-${v.id}`,
        kind: "verification",
        title: String(v.subject_type ?? "").replace(/_/g, " ") || "Verification",
        detail: "",
        to: "/verification",
      });
    }

    for (const p of spaces.filter((s) => s.status === "draft").slice(0, 3)) {
      attention.push({
        id: `draft-${p.id}`,
        kind: "draft",
        title: p.title,
        detail: p.location,
        to: "/dashboard/properties",
      });
    }

    const activity: ActivityItem[] = notes.slice(0, 5).map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body ?? "",
      at: n.createdAt,
      link: n.link,
    }));

    setState({ attention, spaces, activity });
    setLoading(false);
  }, [user, mode]);

  useEffect(() => {
    setLoading(true);
    void load().catch(() => setLoading(false));
  }, [load]);

  return { ...state, loading, refresh: load };
}
