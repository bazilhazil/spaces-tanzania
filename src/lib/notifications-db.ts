// Live notification feed backed by public.notifications (the single SPACES
// notification system). Property alerts land here through database triggers.
import { supabase } from "@/integrations/supabase/client";
import { signedUrl } from "@/lib/property-media";

export type DbNotification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
  data: Record<string, any>;
  property?: {
    id: string;
    title: string;
    price: number | null;
    currency: string | null;
    location: string;
    image: string | null;
    verified: boolean;
  } | null;
};

const PROPERTY_KINDS = new Set([
  "price_change",
  "property_verified",
  "property_available",
  "saved_search_match",
]);

export async function listNotificationsDb(limit = 100): Promise<DbNotification[]> {
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = (data ?? []) as any[];
  const items: DbNotification[] = rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    body: r.body ?? "",
    link: r.link ?? null,
    read: !!r.read_at,
    createdAt: r.created_at,
    data: (r.data ?? {}) as Record<string, any>,
    property: null,
  }));

  // Enrich property alerts with real listing data (image, price, location).
  const ids = Array.from(
    new Set(
      items
        .filter((n) => PROPERTY_KINDS.has(n.kind) && typeof n.data.property_id === "string")
        .map((n) => n.data.property_id as string),
    ),
  );
  if (!ids.length) return items;

  const [{ data: props }, { data: media }] = await Promise.all([
    supabase.from("properties").select("id,title,price,currency,region,district,ward,verified").in("id", ids),
    supabase.from("property_media").select("property_id,storage_path,is_cover,position").in("property_id", ids).order("position", { ascending: true }),
  ]);

  const coverByProp: Record<string, string> = {};
  for (const m of (media ?? []) as any[]) {
    if (!coverByProp[m.property_id] || m.is_cover) coverByProp[m.property_id] = m.storage_path;
  }
  const urlEntries = await Promise.all(
    Object.entries(coverByProp).map(async ([pid, path]) => [pid, await signedUrl(path)] as const),
  );
  const urls = Object.fromEntries(urlEntries) as Record<string, string | null>;

  const byId: Record<string, DbNotification["property"]> = {};
  for (const p of (props ?? []) as any[]) {
    byId[p.id] = {
      id: p.id,
      title: p.title ?? "Untitled",
      price: p.price ?? null,
      currency: p.currency ?? "TZS",
      location: [p.ward, p.district, p.region].filter(Boolean).join(", "),
      image: urls[p.id] ?? null,
      verified: p.verified === true,
    };
  }

  return items.map((n) =>
    PROPERTY_KINDS.has(n.kind) && n.data.property_id
      ? { ...n, property: byId[n.data.property_id] ?? null }
      : n,
  );
}

export async function markNotificationRead(id: string) {
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
}

export async function markAllNotificationsRead() {
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
}

export async function deleteNotification(id: string) {
  await supabase.from("notifications").delete().eq("id", id);
}

/** Realtime feed subscription; returns an unsubscribe function. */
export function subscribeNotifications(userId: string, onChange: () => void) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
      () => onChange(),
    )
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}

export function isPropertyAlert(kind: string) {
  return PROPERTY_KINDS.has(kind);
}
