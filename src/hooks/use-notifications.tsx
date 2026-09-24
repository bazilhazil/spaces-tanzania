// One shared, live notification feed per signed-in session.
// - single realtime channel (filtered to the user's own rows)
// - unread count for every bell in the app
// - small auto-dismissing toast for new notifications
// - one "You have N new notifications" summary after sign-in
// - refetches on reconnect / tab focus so nothing is missed
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";

export type LiveNotification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
  data: Record<string, any>;
};

type Ctx = {
  unread: number;
  recent: LiveNotification[];
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  linkFor: (n: Pick<LiveNotification, "link" | "kind" | "data">) => string;
  /** Monotonic counter that changes whenever the feed changes. */
  version: number;
};

const NotificationsContext = createContext<Ctx | undefined>(undefined);

const FIELDS = "id,kind,title,body,link,read_at,created_at,data";

/** Where a notification should take the user. */
export function notificationLink(n: Pick<LiveNotification, "link" | "kind" | "data">): string {
  if (n.link) return n.link;
  const d = n.data ?? {};
  if (d.conversation_id) return `/messages?c=${d.conversation_id}`;
  if (d.booking_id) return "/viewings";
  if (d.deal_id) return "/deals";
  if (d.lead_id) return "/leads";
  if (d.report_id) return "/admin/safety";
  if (d.request_id) return "/verification";
  if (d.property_id) return `/properties/${d.property_id}`;
  return "/notifications";
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [unread, setUnread] = useState(0);
  const [recent, setRecent] = useState<LiveNotification[]>([]);
  const [version, setVersion] = useState(0);
  const summaryShownFor = useRef<string | null>(null);
  const seen = useRef<Set<string>>(new Set());
  const userId = user?.id ?? null;

  const refresh = useCallback(async () => {
    if (!userId) return;
    const [{ count }, { data }] = await Promise.all([
      supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null),
      supabase.from("notifications").select(FIELDS).eq("user_id", userId).order("created_at", { ascending: false }).limit(8),
    ]);
    const rows = (data ?? []) as LiveNotification[];
    rows.forEach((r) => seen.current.add(r.id + r.created_at));
    setUnread(count ?? 0);
    setRecent(rows);
    setVersion((v) => v + 1);
    return;
  }, [userId]);

  // Initial fetch + one concise summary after sign-in.
  useEffect(() => {
    if (!userId) {
      setUnread(0); setRecent([]); seen.current.clear(); summaryShownFor.current = null;
      return;
    }
    let cancelled = false;
    void (async () => {
      await refresh();
      if (cancelled) return;
      const key = `spaces.notifSummary.${userId}`;
      const already = typeof window !== "undefined" && window.sessionStorage.getItem(key);
      if (summaryShownFor.current !== userId && !already) {
        summaryShownFor.current = userId;
        window.sessionStorage.setItem(key, "1");
        const { count } = await supabase
          .from("notifications").select("id", { count: "exact", head: true })
          .eq("user_id", userId).is("read_at", null);
        if (!cancelled && count && count > 0) {
          toast(t("notifLive.summary", { n: count }), {
            duration: 5000,
            action: { label: t("notifLive.view"), onClick: () => { window.location.assign("/notifications"); } },
          });
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // The one realtime channel for this session.
  useEffect(() => {
    if (!userId) return;
    let wasDisconnected = false;
    const channel = supabase
      .channel(`live-notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as LiveNotification | undefined;
          const isNew =
            (payload.eventType === "INSERT" ||
              (payload.eventType === "UPDATE" && row && !row.read_at && (payload.old as any)?.created_at !== row.created_at)) &&
            row && !row.read_at && !seen.current.has(row.id + row.created_at);
          void refresh();
          if (isNew && row) {
            seen.current.add(row.id + row.created_at);
            toast(row.title, {
              description: row.body,
              duration: 5000,
              action: {
                label: t("notifLive.view"),
                onClick: () => {
                  void supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", row.id);
                  window.location.assign(notificationLink(row));
                },
              },
            });
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          if (wasDisconnected) void refresh(); // catch anything missed while offline
          wasDisconnected = false;
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          wasDisconnected = true;
        }
      });

    const onOnline = () => void refresh();
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [userId, refresh, t]);

  const markRead = useCallback(async (id: string) => {
    setRecent((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    setUnread((u) => Math.max(0, u - 1));
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null);
    void refresh();
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    setUnread(0);
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
    void refresh();
  }, [userId, refresh]);

  return (
    <NotificationsContext.Provider value={{ unread, recent, refresh, markRead, markAllRead, linkFor: notificationLink, version }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
