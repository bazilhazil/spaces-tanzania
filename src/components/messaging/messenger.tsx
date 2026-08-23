import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import {
  Search, Star, Archive, Trash2, Send, Home, MoreVertical, Check, CheckCheck,
  Shield, Ban, Flag, Plus, ArrowLeft, Sparkles, Inbox as InboxIcon,
  MailOpen, Star as StarIcon, Archive as ArchiveIcon, SendHorizontal, Trash,
  ExternalLink, Loader2, Calendar, ClipboardList,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  listConversations, listMessages, sendMessage as sendMessageDb, markConversationRead,
  searchRecipients, ensureConversation, subscribeToMessaging, relativeTime,
  type DbConversation, type DbMessage, type Peer, type ParticipantRole,
} from "@/lib/messaging-db";
import { ReportSheet } from "@/components/safety/report-sheet";
import { BlockUserDialog, useBlockState } from "@/components/safety/block-user-dialog";
import { safetyErrorKey } from "@/lib/safety-db";

type MessageFolder = "inbox" | "unread" | "starred" | "sent" | "archived" | "deleted";

const FOLDERS: { key: MessageFolder; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "inbox",    label: "Inbox",    icon: InboxIcon },
  { key: "unread",   label: "Unread",   icon: MailOpen },
  { key: "starred",  label: "Starred",  icon: StarIcon },
  { key: "sent",     label: "Sent",     icon: SendHorizontal },
  { key: "archived", label: "Archived", icon: ArchiveIcon },
  { key: "deleted",  label: "Deleted",  icon: Trash },
];

const roleTint: Record<string, string> = {
  buyer: "bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]",
  customer: "bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]",
  owner: "bg-emerald-50 text-emerald-700",
  agent: "bg-amber-50 text-amber-700",
  admin: "bg-purple-50 text-purple-700",
  super_admin: "bg-purple-50 text-purple-700",
};

const QUICK_REPLIES = [
  "Is this still available?",
  "Can I schedule a viewing?",
  "Is the price negotiable?",
  "Thank you, I'll get back to you.",
  "Could you share more photos?",
];

/* ---- local-only conversation flags (star / archive / hide) ---- */
type LocalFlags = Record<string, { starred?: boolean; archived?: boolean; deleted?: boolean }>;
const FLAGS_KEY = "spaces.messaging.flags";

function readFlags(): LocalFlags {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(FLAGS_KEY) ?? "{}") as LocalFlags;
  } catch {
    return {};
  }
}

const INQUIRY_STATUS_LABEL: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  viewing_scheduled: "Viewing",
  viewing_completed: "Viewed",
  negotiating: "Negotiating",
  offer_made: "Offer made",
  won: "Completed",
  lost: "Closed",
};

export function Messenger() {
  const { user, initialized } = useAuth();
  const userId = user?.id ?? null;

  const [conversations, setConversations] = useState<DbConversation[]>([]);
  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [flags, setFlags] = useState<LocalFlags>({});
  const [folder, setFolder] = useState<MessageFolder>("inbox");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [loading, setLoading] = useState(true);
  const activeIdRef = useRef<string | null>(null);

  // Deep link from an inquiry: /messages?c=<conversationId> opens that exact chat.
  const search = useSearch({ strict: false }) as { c?: string };
  useEffect(() => {
    if (search.c) { setActiveId(search.c); setMobileView("chat"); }
  }, [search.c]);

  useEffect(() => { setFlags(readFlags()); }, []);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  function setFlag(id: string, patch: LocalFlags[string]) {
    setFlags((prev) => {
      const next = { ...prev, [id]: { ...prev[id], ...patch } };
      try { window.localStorage.setItem(FLAGS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  const refreshConversations = useCallback(async () => {
    if (!userId) return;
    const list = await listConversations(userId);
    setConversations(list);
    setActiveId((cur) => cur ?? list[0]?.id ?? null);
  }, [userId]);

  const refreshMessages = useCallback(async (conversationId: string) => {
    const list = await listMessages(conversationId);
    setMessages(list);
  }, []);

  // Initial load
  useEffect(() => {
    if (!initialized) return;
    if (!userId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const list = await listConversations(userId);
      if (cancelled) return;
      setConversations(list);
      setActiveId((cur) => cur ?? list[0]?.id ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [initialized, userId]);

  // Realtime: refresh list + open thread on any message/conversation change
  useEffect(() => {
    if (!userId) return;
    return subscribeToMessaging(() => {
      void refreshConversations();
      const open = activeIdRef.current;
      if (open) void refreshMessages(open);
    });
  }, [userId, refreshConversations, refreshMessages]);

  // Load + mark read the open thread
  useEffect(() => {
    if (!activeId || !userId) { setMessages([]); return; }
    let cancelled = false;
    (async () => {
      const list = await listMessages(activeId);
      if (cancelled) return;
      setMessages(list);
      await markConversationRead(activeId, userId);
      if (cancelled) return;
      setConversations((cs) => cs.map((c) => (c.id === activeId ? { ...c, unread: 0 } : c)));
    })();
    return () => { cancelled = true; };
  }, [activeId, userId]);

  const visible = useMemo(() => {
    const f = (id: string) => flags[id] ?? {};
    const base = conversations.filter((c) => !f(c.id).deleted);
    let list: DbConversation[];
    switch (folder) {
      case "unread":   list = base.filter((c) => c.unread > 0 && !f(c.id).archived); break;
      case "starred":  list = base.filter((c) => f(c.id).starred); break;
      case "archived": list = base.filter((c) => f(c.id).archived); break;
      case "deleted":  list = conversations.filter((c) => f(c.id).deleted); break;
      case "sent":     list = base; break;
      default:         list = base.filter((c) => !f(c.id).archived);
    }
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((c) =>
      c.peer.name.toLowerCase().includes(q) ||
      c.lastMessage.toLowerCase().includes(q) ||
      (c.propertyTitle?.toLowerCase().includes(q) ?? false));
  }, [conversations, flags, folder, query]);

  const counts = useMemo(() => {
    const f = (id: string) => flags[id] ?? {};
    const base = conversations.filter((c) => !f(c.id).deleted);
    return {
      inbox: base.filter((c) => !f(c.id).archived).length,
      unread: base.reduce((n, c) => n + (f(c.id).archived ? 0 : c.unread), 0),
      starred: base.filter((c) => f(c.id).starred).length,
      sent: base.length,
      archived: base.filter((c) => f(c.id).archived).length,
      deleted: conversations.filter((c) => f(c.id).deleted).length,
    } as Record<MessageFolder, number>;
  }, [conversations, flags]);

  const active = conversations.find((c) => c.id === activeId) ?? null;

  function openConv(id: string) {
    setActiveId(id);
    setMobileView("chat");
  }

  async function handleSend(body: string) {
    if (!active || !userId) return;
    const res = await sendMessageDb(active.id, userId, body);
    if (!res.ok) { toast.error("Message could not be sent"); return; }
    setMessages((ms) => [...ms, res.message]);
    setConversations((cs) =>
      cs.map((c) => (c.id === active.id ? { ...c, lastMessage: body, lastAt: res.message.createdAt } : c))
        .sort((a, b) => +new Date(b.lastAt) - +new Date(a.lastAt)));
  }

  if (initialized && !userId) {
    return (
      <div className="grid place-items-center rounded-2xl border border-border/70 bg-card p-12 text-center">
        <div className="max-w-sm space-y-2">
          <Sparkles className="mx-auto h-8 w-8 text-[color:var(--color-brand-600)]" />
          <h3 className="font-display text-xl font-semibold">Sign in to see your messages</h3>
          <p className="text-sm text-muted-foreground">Your conversations with owners, agents and buyers live here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-[calc(100dvh-8rem)] min-h-[560px] grid-cols-1 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-soft)] md:grid-cols-[260px_340px_1fr]">
      {/* Folder rail */}
      <aside className="hidden md:flex flex-col border-r border-border/70 bg-muted/30">
        <div className="p-4">
          <Button className="w-full rounded-xl gap-2" onClick={() => setComposerOpen(true)}>
            <Plus className="h-4 w-4" /> New message
          </Button>
        </div>
        <nav className="flex-1 space-y-0.5 px-2">
          {FOLDERS.map(({ key, label, icon: Icon }) => {
            const isActive = folder === key;
            const count = counts[key] ?? 0;
            return (
              <button
                key={key}
                onClick={() => setFolder(key)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition",
                  isActive ? "bg-background font-semibold text-foreground shadow-[var(--shadow-soft)]" : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{label}</span>
                {key === "unread" && counts.unread > 0 ? (
                  <Badge className="h-5 min-w-5 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{counts.unread}</Badge>
                ) : count > 0 ? (
                  <span className="text-[10px] font-medium text-muted-foreground">{count}</span>
                ) : null}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-border/70 p-4">
          <div className="flex items-center gap-2 rounded-xl bg-background p-2.5">
            <Shield className="h-4 w-4 text-[color:var(--color-brand-600)]" />
            <div className="min-w-0 text-[11px] leading-tight">
              <div className="font-semibold">Secure messaging</div>
              <div className="text-muted-foreground">Reports go to Trust &amp; Safety</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Conversation list */}
      <section className={cn("flex flex-col border-r border-border/70 min-w-0", mobileView === "chat" ? "hidden md:flex" : "flex")}>
        <header className="border-b border-border/70 p-3 space-y-2">
          <div className="flex items-center justify-between md:hidden">
            <h2 className="font-display text-lg font-semibold">Messages</h2>
            <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setComposerOpen(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chats, people, properties…"
              className="rounded-xl pl-9"
            />
          </div>
          <div className="flex gap-1 md:hidden overflow-x-auto no-scrollbar">
            {FOLDERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFolder(key)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition",
                  folder === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="grid place-items-center p-10 text-sm text-muted-foreground">
              <Loader2 className="mb-2 h-5 w-5 animate-spin" /> Loading conversations…
            </div>
          ) : visible.length === 0 ? (
            <div className="grid place-items-center p-10 text-center text-sm text-muted-foreground">
              <InboxIcon className="mb-2 h-8 w-8 opacity-40" />
              No conversations here yet.
            </div>
          ) : (
            <ul>
              {visible.map((c) => {
                const p = c.peer;
                const f = flags[c.id] ?? {};
                const isActive = c.id === activeId;
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => openConv(c.id)}
                      className={cn(
                        "flex w-full items-start gap-3 border-b border-border/50 px-4 py-3 text-left transition",
                        isActive ? "bg-[color:var(--color-brand-50)]/60" : "hover:bg-muted/50",
                      )}
                    >
                      <Avatar className="h-11 w-11 shrink-0">
                        <AvatarImage src={p.avatar ?? undefined} alt={p.name} />
                        <AvatarFallback>{p.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-semibold text-sm">{p.name}</span>
                          {p.verified && <Shield className="h-3 w-3 shrink-0 text-[color:var(--color-brand-600)]" />}
                          <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">{relativeTime(c.lastAt)}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider", roleTint[p.role] ?? roleTint.buyer)}>
                            {p.role}
                          </span>
                          {c.propertyTitle && (
                            <span className="truncate text-[11px] text-muted-foreground">· {c.propertyTitle}</span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <p className={cn("line-clamp-1 flex-1 text-xs", c.unread > 0 ? "font-semibold text-foreground" : "text-muted-foreground")}>
                            {c.lastMessage}
                          </p>
                          {f.starred && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
                          {c.unread > 0 && (
                            <Badge className="h-5 min-w-5 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{c.unread}</Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </section>

      {/* Chat pane */}
      <section className={cn("flex flex-col bg-background min-w-0", mobileView === "list" ? "hidden md:flex" : "flex")}>
        {active && userId ? (
          <ChatPane
            key={active.id}
            conv={active}
            messages={messages}
            meId={userId}
            starred={!!flags[active.id]?.starred}
            archived={!!flags[active.id]?.archived}
            onBack={() => setMobileView("list")}
            onSend={handleSend}
            onToggleStar={() => setFlag(active.id, { starred: !flags[active.id]?.starred })}
            onToggleArchive={() => {
              const next = !flags[active.id]?.archived;
              setFlag(active.id, { archived: next });
              toast.success(next ? "Archived" : "Unarchived");
            }}
            onHide={() => {
              setFlag(active.id, { deleted: true });
              setActiveId(null);
              setMobileView("list");
              toast.success("Conversation removed from your inbox");
            }}
          />
        ) : (
          <div className="grid flex-1 place-items-center p-10 text-center">
            <div className="max-w-sm space-y-2">
              <Sparkles className="mx-auto h-8 w-8 text-[color:var(--color-brand-600)]" />
              <h3 className="font-display text-xl font-semibold">Your inbox is quiet</h3>
              <p className="text-sm text-muted-foreground">Select a conversation or start a new one to reach out to owners, agents or buyers.</p>
              <Button onClick={() => setComposerOpen(true)} className="rounded-xl">Start new message</Button>
            </div>
          </div>
        )}
      </section>

      <NewMessageDialog
        open={composerOpen}
        onOpenChange={setComposerOpen}
        onCreate={async (peer, text) => {
          if (!userId) return;
          const id = await ensureConversation({ userId, peerId: peer.id });
          if (!id) { toast.error("Could not start conversation"); return; }
          const res = await sendMessageDb(id, userId, text);
          if (!res.ok) { toast.error("Message could not be sent"); return; }
          await refreshConversations();
          setActiveId(id);
          setFolder("inbox");
          setMobileView("chat");
          setComposerOpen(false);
          toast.success("Message sent");
        }}
      />
    </div>
  );
}

/* ============================ CHAT PANE ============================ */

function ChatPane({
  conv, messages, meId, starred, archived, onBack, onSend, onToggleStar, onToggleArchive, onHide,
}: {
  conv: DbConversation;
  messages: DbMessage[];
  meId: string;
  starred: boolean;
  archived: boolean;
  onBack: () => void;
  onSend: (body: string) => void | Promise<void>;
  onToggleStar: () => void;
  onToggleArchive: () => void;
  onHide: () => void;
}) {
  const p = conv.peer;
  const [text, setText] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [reportMessageId, setReportMessageId] = useState<string | null>(null);
  const { blocked, setBlocked } = useBlockState(p.id);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, conv.id]);

  function handleSend() {
    const v = text.trim();
    if (!v) return;
    void onSend(v);
    setText("");
  }

  return (
    <>
      <header className="flex items-center gap-3 border-b border-border/70 px-4 py-3">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar className="h-10 w-10">
          <AvatarImage src={p.avatar ?? undefined} alt={p.name} />
          <AvatarFallback>{p.name[0]}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-semibold">{p.name}</span>
            {p.verified && <Shield className="h-3.5 w-3.5 text-[color:var(--color-brand-600)]" />}
            <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider", roleTint[p.role] ?? roleTint.buyer)}>{p.role}</span>
          </div>
          <div className="flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
            <span className="truncate">{conv.propertyTitle ? conv.propertyTitle : "Direct conversation"}</span>
            {conv.inquiryStatus && (
              <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-foreground">
                {INQUIRY_STATUS_LABEL[conv.inquiryStatus] ?? conv.inquiryStatus}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {conv.inquiryId && (
            <Button asChild variant="outline" size="sm" className="hidden rounded-full sm:inline-flex">
              <Link to="/leads" search={{ lead: conv.inquiryId }}>
                <ClipboardList className="mr-1.5 h-4 w-4" /> View inquiry
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="icon" className="rounded-full" onClick={onToggleStar} aria-label="Star">
            <Star className={cn("h-4 w-4", starred && "fill-amber-400 text-amber-400")} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full"><MoreVertical className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={onToggleArchive}>
                <Archive className="mr-2 h-4 w-4" /> {archived ? "Unarchive" : "Archive"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setReportOpen(true)}>
                <Flag className="mr-2 h-4 w-4" /> Report user
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBlockOpen(true)} className="text-destructive focus:text-destructive">
                <Ban className="mr-2 h-4 w-4" /> Block user
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onHide} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {conv.propertyId && (
        <div className="border-b border-border/70 bg-muted/40 px-4 py-2">
          <Link
            to="/properties/$slug"
            params={{ slug: conv.propertyId }}
            className="flex items-center gap-3 text-xs"
          >
            <div className="grid h-10 w-14 shrink-0 place-items-center rounded-lg bg-background">
              <Home className="h-4 w-4 text-[color:var(--color-brand-600)]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{conv.propertyTitle ?? "Property"}</div>
              <div className="text-muted-foreground">Open listing</div>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-6">
          {messages.length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">No messages yet — say hello.</div>
          )}
          {messages.map((m, i) => {
            const mine = m.senderId === meId;
            return (
              <div key={m.id} className={cn("group flex items-center gap-1", mine ? "flex-row-reverse" : "flex-row")}>
                <div className="min-w-0 flex-1">
                  <MessageBubble msg={m} peer={p} mine={mine} prev={messages[i - 1]} />
                </div>
                {!mine && (
                  <button
                    onClick={() => setReportMessageId(m.id)}
                    aria-label="Report message"
                    className="shrink-0 rounded-full p-1 text-muted-foreground opacity-0 transition group-hover:opacity-100 focus:opacity-100 hover:text-destructive"
                  >
                    <Flag className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border/70 px-4 py-2 overflow-x-auto no-scrollbar">
        <div className="flex gap-2">
          {QUICK_REPLIES.map((q) => (
            <button
              key={q}
              onClick={() => void onSend(q)}
              className="shrink-0 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition hover:border-primary hover:text-primary"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {blocked ? (
        <div className="border-t border-border/70 bg-muted/50 p-4 text-center text-sm text-muted-foreground">
          <Ban className="mr-1.5 inline h-4 w-4" /> This user is blocked.
          <Button variant="link" size="sm" className="px-1.5" onClick={() => setBlockOpen(true)}>
            Unblock
          </Button>
        </div>
      ) : (
        <div className="border-t border-border/70 bg-card p-3">
          <div className="flex items-end gap-2">
            <Button asChild variant="ghost" size="icon" className="rounded-full text-muted-foreground" aria-label="Viewings">
              <Link to="/viewings"><Calendar className="h-5 w-5" /></Link>
            </Button>
            <div className="relative flex-1">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Write a message…"
                className="rounded-2xl pr-12"
              />
            </div>
            <Button onClick={handleSend} disabled={!text.trim()} size="icon" className="rounded-full">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <ReportSheet
        open={reportOpen}
        onOpenChange={setReportOpen}
        target={{ type: "user", label: p.name, userId: p.id, conversationId: conv.id }}
      />
      <ReportSheet
        open={!!reportMessageId}
        onOpenChange={(v) => !v && setReportMessageId(null)}
        target={{
          type: "message",
          label: p.name,
          messageId: reportMessageId,
          conversationId: conv.id,
          userId: p.id,
        }}
      />
      <BlockUserDialog
        open={blockOpen}
        onOpenChange={setBlockOpen}
        userId={p.id}
        name={p.name}
        blocked={blocked}
        onChanged={setBlocked}
      />
    </>
  );
}

/* ============================ BUBBLES ============================ */

function MessageBubble({ msg, peer, mine, prev }: {
  msg: DbMessage; peer: Peer; mine: boolean; prev?: DbMessage;
}) {
  const showAvatar = !prev || prev.senderId !== msg.senderId;
  return (
    <div className={cn("flex items-end gap-2", mine && "flex-row-reverse")}>
      <div className="w-7">
        {showAvatar && !mine && (
          <Avatar className="h-7 w-7">
            <AvatarImage src={peer.avatar ?? undefined} />
            <AvatarFallback>{peer.name[0]}</AvatarFallback>
          </Avatar>
        )}
      </div>
      <div className={cn("flex max-w-[75%] flex-col gap-1", mine && "items-end")}>
        <div className={cn(
          "whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm",
          mine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md",
        )}>
          {msg.body}
        </div>
        <div className={cn("flex items-center gap-1 px-1 text-[10px] text-muted-foreground", mine && "flex-row-reverse")}>
          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          {mine && (msg.readAt
            ? <CheckCheck className="h-3 w-3 text-[color:var(--color-brand-600)]" />
            : <Check className="h-3 w-3" />)}
        </div>
      </div>
    </div>
  );
}

/* ============================ DIALOGS ============================ */

function NewMessageDialog({
  open, onOpenChange, onCreate,
}: {
  open: boolean; onOpenChange: (b: boolean) => void;
  onCreate: (peer: Peer, text: string) => void | Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Peer[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Peer | null>(null);
  const [text, setText] = useState("Hello, I'm interested in your listing.");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      const r = await searchRecipients(term);
      setResults(r);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [q, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
          <DialogDescription>Reach out to an owner, agent or buyer on SPACES.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">To</label>
            <Input placeholder="Search people by name…" value={q} onChange={(e) => setQ(e.target.value)} className="rounded-xl" />
            <div className="max-h-40 overflow-auto rounded-xl border border-border/60">
              {searching && <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>}
              {!searching && results.length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  {q.trim().length < 2 ? "Type at least 2 characters." : "No people found."}
                </div>
              )}
              {results.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={cn(
                    "flex w-full items-center gap-2 border-b border-border/40 px-3 py-2 text-left text-sm last:border-0",
                    selected?.id === c.id ? "bg-[color:var(--color-brand-50)]" : "hover:bg-muted/50",
                  )}
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={c.avatar ?? undefined} />
                    <AvatarFallback>{c.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.role}</span>
                  {selected?.id === c.id && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Message</label>
            <textarea
              value={text} onChange={(e) => setText(e.target.value)} rows={3}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!selected || !text.trim() || sending}
            onClick={async () => {
              if (!selected) return;
              setSending(true);
              await onCreate(selected, text.trim());
              setSending(false);
            }}
          >
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Send message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDialog({
  open, onOpenChange, title, description, confirmLabel, onConfirm, destructive,
}: {
  open: boolean; onOpenChange: (b: boolean) => void;
  title: string; description: string; confirmLabel: string; onConfirm: () => void; destructive?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onConfirm} variant={destructive ? "destructive" : "default"}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { ParticipantRole };
