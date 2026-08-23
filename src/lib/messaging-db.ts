import { supabase } from "@/integrations/supabase/client";

/* ============================================================
   Real messaging data layer (Supabase).
   Conversations are (property_id, buyer_id, owner_id) rows; both
   the buyer and the owner can read/write them via RLS.
   ============================================================ */

export type ParticipantRole = "buyer" | "customer" | "owner" | "agent" | "admin" | "super_admin";

export interface Peer {
  id: string;
  name: string;
  avatar: string | null;
  role: ParticipantRole;
  verified: boolean;
  agencyName?: string | null;
}

export interface DbMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export interface DbConversation {
  id: string;
  propertyId: string | null;
  propertyTitle: string | null;
  buyerId: string;
  ownerId: string;
  peer: Peer;
  lastMessage: string;
  lastAt: string;
  unread: number;
  /** Shared inquiry status (single source of truth) for this property conversation. */
  inquiryStatus: string | null;
  /** The inquiry this conversation belongs to, when there is one. */
  inquiryId: string | null;
}

type LeadLite = {
  id: string;
  property_id: string;
  visitor_id: string | null;
  status: string;
  conversation_id: string | null;
  created_at?: string;
};

const UNKNOWN_PEER = (id: string): Peer => ({
  id,
  name: "SPACES user",
  avatar: null,
  role: "buyer",
  verified: false,
});

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

async function loadPeers(): Promise<Map<string, Peer>> {
  const map = new Map<string, Peer>();
  const { data, error } = await supabase.rpc("get_conversation_peers");
  if (error || !data) return map;
  for (const row of data as {
    id: string; full_name: string | null; avatar_url: string | null;
    agency_name: string | null; verified: boolean; role: ParticipantRole;
  }[]) {
    map.set(row.id, {
      id: row.id,
      name: row.full_name || row.agency_name || "SPACES user",
      avatar: row.avatar_url,
      role: row.role ?? "buyer",
      verified: !!row.verified,
      agencyName: row.agency_name,
    });
  }
  return map;
}

/** All conversations where the signed-in user is the buyer OR the owner. */
export async function listConversations(userId: string): Promise<DbConversation[]> {
  const { data: convs, error } = await supabase
    .from("conversations")
    .select("id, property_id, buyer_id, owner_id, last_message_at, created_at")
    .or(`buyer_id.eq.${userId},owner_id.eq.${userId}`)
    .order("last_message_at", { ascending: false });
  if (error || !convs || convs.length === 0) return [];

  const rows = convs as {
    id: string; property_id: string | null; buyer_id: string; owner_id: string;
    last_message_at: string; created_at: string;
  }[];
  const ids = rows.map((c) => c.id);
  const propertyIds = [...new Set(rows.map((c) => c.property_id).filter(Boolean))] as string[];

  const [peers, msgRes, propRes, leadRes] = await Promise.all([
    loadPeers(),
    supabase
      .from("messages")
      .select("id, conversation_id, sender_id, body, created_at, read_at")
      .in("conversation_id", ids)
      .order("created_at", { ascending: true }),
    propertyIds.length
      ? supabase.from("properties").select("id, title").in("id", propertyIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    propertyIds.length
      ? supabase
          .from("leads")
          .select("id, property_id, visitor_id, status, conversation_id, created_at")
          .in("property_id", propertyIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as LeadLite[] }),
  ]);

  const msgs = (msgRes.data ?? []) as {
    id: string; conversation_id: string; sender_id: string; body: string;
    created_at: string; read_at: string | null;
  }[];
  const titles = new Map(
    ((propRes.data ?? []) as { id: string; title: string }[]).map((p) => [p.id, p.title]),
  );
  const leadStatus = new Map<string, string>();
  const leadIdByPair = new Map<string, string>();
  const leadByConversation = new Map<string, LeadLite>();
  for (const l of ((leadRes.data ?? []) as LeadLite[])) {
    const key = `${l.property_id}:${l.visitor_id ?? ""}`;
    if (!leadStatus.has(key)) leadStatus.set(key, l.status);
    if (!leadIdByPair.has(key)) leadIdByPair.set(key, l.id);
    if (l.conversation_id && !leadByConversation.has(l.conversation_id)) {
      leadByConversation.set(l.conversation_id, l);
    }
  }

  return rows.map((c) => {
    const mine = msgs.filter((m) => m.conversation_id === c.id);
    const last = mine[mine.length - 1];
    const peerId = c.buyer_id === userId ? c.owner_id : c.buyer_id;
    return {
      id: c.id,
      propertyId: c.property_id,
      propertyTitle: c.property_id ? titles.get(c.property_id) ?? null : null,
      buyerId: c.buyer_id,
      ownerId: c.owner_id,
      peer: peers.get(peerId) ?? UNKNOWN_PEER(peerId),
      lastMessage: last?.body ?? "No messages yet",
      lastAt: last?.created_at ?? c.last_message_at ?? c.created_at,
      unread: mine.filter((m) => m.sender_id !== userId && !m.read_at).length,
      inquiryStatus:
        leadByConversation.get(c.id)?.status ??
        (c.property_id ? leadStatus.get(`${c.property_id}:${c.buyer_id}`) ?? null : null),
      inquiryId:
        leadByConversation.get(c.id)?.id ??
        (c.property_id ? leadIdByPair.get(`${c.property_id}:${c.buyer_id}`) ?? null : null),
    };
  }).sort((a, b) => +new Date(b.lastAt) - +new Date(a.lastAt));
}

export async function listMessages(conversationId: string): Promise<DbMessage[]> {
  const { data } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, body, created_at, read_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  return ((data ?? []) as {
    id: string; conversation_id: string; sender_id: string; body: string;
    created_at: string; read_at: string | null;
  }[]).map((m) => ({
    id: m.id,
    conversationId: m.conversation_id,
    senderId: m.sender_id,
    body: m.body,
    createdAt: m.created_at,
    readAt: m.read_at,
  }));
}

export async function sendMessage(conversationId: string, senderId: string, body: string) {
  const text = body.trim();
  if (!text) return { ok: false as const };
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, body: text } as never)
    .select("id, conversation_id, sender_id, body, created_at, read_at")
    .maybeSingle();
  if (error || !data) return { ok: false as const };
  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() } as never)
    .eq("id", conversationId);
  const m = data as {
    id: string; conversation_id: string; sender_id: string; body: string;
    created_at: string; read_at: string | null;
  };
  return {
    ok: true as const,
    message: {
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      body: m.body,
      createdAt: m.created_at,
      readAt: m.read_at,
    } satisfies DbMessage,
  };
}

/** Marks every message the other party sent in this conversation as read. */
export async function markConversationRead(conversationId: string, userId: string) {
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() } as never)
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .is("read_at", null);
}

export async function searchRecipients(q: string): Promise<Peer[]> {
  if (!q.trim()) return [];
  const { data, error } = await supabase.rpc("search_message_recipients", { _q: q.trim() });
  if (error || !data) return [];
  return (data as {
    id: string; full_name: string | null; avatar_url: string | null;
    agency_name: string | null; verified: boolean; role: ParticipantRole;
  }[]).map((r) => ({
    id: r.id,
    name: r.full_name || r.agency_name || "SPACES user",
    avatar: r.avatar_url,
    role: r.role ?? "buyer",
    verified: !!r.verified,
    agencyName: r.agency_name,
  }));
}

/**
 * Finds (or creates) the conversation between the signed-in user and `peerId`.
 * The signed-in user takes the buyer slot when creating — RLS requires it.
 */
export async function ensureConversation(input: {
  userId: string;
  peerId: string;
  propertyId?: string | null;
}): Promise<string | null> {
  const { userId, peerId } = input;
  const propertyId = input.propertyId ?? null;

  const { data: existing } = await supabase
    .from("conversations")
    .select("id, property_id")
    .or(
      `and(buyer_id.eq.${userId},owner_id.eq.${peerId}),and(buyer_id.eq.${peerId},owner_id.eq.${userId})`,
    )
    .order("last_message_at", { ascending: false });

  const rows = (existing ?? []) as { id: string; property_id: string | null }[];
  const match = propertyId ? rows.find((r) => r.property_id === propertyId) : rows[0];
  if (match) return match.id;

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ buyer_id: userId, owner_id: peerId, property_id: propertyId } as never)
    .select("id")
    .maybeSingle();
  if (error || !created) return null;
  return (created as { id: string }).id;
}

/** Realtime: fires on any new/updated message or conversation touching this user. */
export function subscribeToMessaging(onChange: () => void) {
  const channel = supabase
    .channel("messaging-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, onChange)
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
