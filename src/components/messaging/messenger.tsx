import { useMemo, useRef, useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Search, Star, Archive, Trash2, Send, Paperclip, MapPin, Image as ImageIcon,
  Calendar, Home, MoreVertical, Check, CheckCheck, Circle, Shield, Ban,
  Flag, BellOff, Plus, ArrowLeft, Sparkles, X, Inbox as InboxIcon,
  MailOpen, Star as StarIcon, Archive as ArchiveIcon, SendHorizontal,
  Trash, ExternalLink, CalendarCheck, CalendarX, CalendarClock,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  CONVERSATIONS, MESSAGES, QUICK_REPLIES, ME, foldersFor, otherParty,
  getProperty, relativeTime, priceLabel,
  type Conversation, type ChatMessage, type MessageFolder, type Participant,
} from "@/lib/messaging-mock";
import { properties } from "@/lib/mock-data";

const FOLDERS: { key: MessageFolder; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "inbox",    label: "Inbox",    icon: InboxIcon },
  { key: "unread",   label: "Unread",   icon: MailOpen },
  { key: "starred",  label: "Starred",  icon: StarIcon },
  { key: "sent",     label: "Sent",     icon: SendHorizontal },
  { key: "archived", label: "Archived", icon: ArchiveIcon },
  { key: "deleted",  label: "Deleted",  icon: Trash },
];

const roleTint: Record<Participant["role"], string> = {
  buyer: "bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]",
  owner: "bg-emerald-50 text-emerald-700",
  agent: "bg-amber-50 text-amber-700",
  admin: "bg-purple-50 text-purple-700",
};

export function Messenger() {
  const [conversations, setConversations] = useState<Conversation[]>(CONVERSATIONS);
  const [messages, setMessages] = useState<ChatMessage[]>(MESSAGES);
  const [folder, setFolder] = useState<MessageFolder>("inbox");
  const [activeId, setActiveId] = useState<string | null>(CONVERSATIONS[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  const folders = useMemo(() => foldersFor(conversations), [conversations]);
  const filtered = useMemo(() => {
    const list = folders[folder];
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((c) => {
      const p = otherParty(c);
      const prop = getProperty(c.propertyId);
      return (
        p.name.toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q) ||
        (prop?.title.toLowerCase().includes(q) ?? false)
      );
    });
  }, [folders, folder, query]);

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const activeMessages = useMemo(
    () => (active ? messages.filter((m) => m.conversationId === active.id) : []),
    [messages, active],
  );

  function updateConv(id: string, patch: Partial<Conversation>) {
    setConversations((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  function openConv(id: string) {
    setActiveId(id);
    setMobileView("chat");
    updateConv(id, { unread: 0 });
  }
  function sendMessage(kind: ChatMessage["kind"], payload: Partial<ChatMessage> = {}) {
    if (!active) return;
    const msg: ChatMessage = {
      id: `m${Date.now()}`,
      conversationId: active.id,
      senderId: ME.id,
      kind,
      createdAt: new Date().toISOString(),
      status: "sent",
      ...payload,
    };
    setMessages((ms) => [...ms, msg]);
    const preview =
      kind === "text" ? (payload.text ?? "")
      : kind === "photo" ? "📷 Photo"
      : kind === "location" ? "📍 Location"
      : kind === "property" ? "🏠 Property"
      : kind === "viewing" ? "📅 Viewing request"
      : "";
    updateConv(active.id, { lastMessage: preview, lastAt: msg.createdAt });
    // simulate delivery ticks
    setTimeout(() => {
      setMessages((ms) => ms.map((m) => (m.id === msg.id ? { ...m, status: "delivered" } : m)));
    }, 700);
    setTimeout(() => {
      setMessages((ms) => ms.map((m) => (m.id === msg.id ? { ...m, status: "read" } : m)));
    }, 2200);
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
            const count = folders[key].length;
            const unread = folders[key].reduce((n, c) => n + c.unread, 0);
            const active = folder === key;
            return (
              <button
                key={key}
                onClick={() => setFolder(key)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition",
                  active ? "bg-background font-semibold text-foreground shadow-[var(--shadow-soft)]" : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{label}</span>
                {key === "unread" && unread > 0 ? (
                  <Badge className="h-5 min-w-5 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{unread}</Badge>
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
              <div className="font-semibold">End-to-end secure</div>
              <div className="text-muted-foreground">Reports go to Trust & Safety</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Conversation list */}
      <section className={cn(
        "flex flex-col border-r border-border/70",
        mobileView === "chat" ? "hidden md:flex" : "flex",
      )}>
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
          {filtered.length === 0 ? (
            <div className="grid place-items-center p-10 text-center text-sm text-muted-foreground">
              <InboxIcon className="mb-2 h-8 w-8 opacity-40" />
              No conversations here yet.
            </div>
          ) : (
            <ul>
              {filtered.map((c) => {
                const p = otherParty(c);
                const prop = getProperty(c.propertyId);
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
                      <div className="relative shrink-0">
                        <Avatar className="h-11 w-11">
                          <AvatarImage src={p.avatar} alt={p.name} />
                          <AvatarFallback>{p.name[0]}</AvatarFallback>
                        </Avatar>
                        {p.online && (
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-semibold text-sm">{p.name}</span>
                          {p.verified && <Shield className="h-3 w-3 shrink-0 text-[color:var(--color-brand-600)]" />}
                          <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">{relativeTime(c.lastAt)}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider", roleTint[p.role])}>
                            {p.role}
                          </span>
                          {prop && (
                            <span className="truncate text-[11px] text-muted-foreground">· {prop.title}</span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <p className={cn(
                            "line-clamp-1 flex-1 text-xs",
                            c.unread > 0 ? "font-semibold text-foreground" : "text-muted-foreground",
                          )}>
                            {c.typing ? <span className="text-[color:var(--color-brand-600)]">typing…</span> : c.lastMessage}
                          </p>
                          {c.starred && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
                          {c.muted && <BellOff className="h-3 w-3 text-muted-foreground" />}
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
      <section className={cn(
        "flex flex-col bg-background",
        mobileView === "list" ? "hidden md:flex" : "flex",
      )}>
        {active ? (
          <ChatPane
            conv={active}
            messages={activeMessages}
            onBack={() => setMobileView("list")}
            onSend={sendMessage}
            onUpdate={(patch) => updateConv(active.id, patch)}
            onDelete={() => { updateConv(active.id, { deleted: true }); setActiveId(null); setMobileView("list"); }}
            onViewingAction={(mid, status) => {
              setMessages((ms) => ms.map((m) => m.id === mid && m.viewing ? { ...m, viewing: { ...m.viewing, status } } : m));
              toast.success(status === "approved" ? "Viewing approved" : status === "rejected" ? "Viewing declined" : "Viewing rescheduled");
            }}
          />
        ) : (
          <div className="grid flex-1 place-items-center p-10 text-center">
            <div className="max-w-sm space-y-2">
              <Sparkles className="mx-auto h-8 w-8 text-[color:var(--color-brand-600)]" />
              <h3 className="font-display text-xl font-semibold">Your inbox is quiet</h3>
              <p className="text-sm text-muted-foreground">Select a conversation on the left or start a new one to reach out to owners, agents or buyers.</p>
              <Button onClick={() => setComposerOpen(true)} className="rounded-xl">Start new message</Button>
            </div>
          </div>
        )}
      </section>

      <NewMessageDialog
        open={composerOpen}
        onOpenChange={setComposerOpen}
        onCreate={(participant, prop, text) => {
          const id = `c${Date.now()}`;
          const conv: Conversation = {
            id,
            participants: [ME, participant],
            propertyId: prop?.id,
            lastMessage: text,
            lastAt: new Date().toISOString(),
            unread: 0, starred: false, archived: false, muted: false, deleted: false,
          };
          setConversations((cs) => [conv, ...cs]);
          setMessages((ms) => [
            ...ms,
            ...(prop ? [{
              id: `m${Date.now()}p`, conversationId: id, senderId: ME.id, kind: "property" as const,
              propertyId: prop.id, createdAt: new Date().toISOString(), status: "sent" as const,
            }] : []),
            {
              id: `m${Date.now()}t`, conversationId: id, senderId: ME.id, kind: "text", text,
              createdAt: new Date().toISOString(), status: "sent",
            },
          ]);
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
  conv, messages, onBack, onSend, onUpdate, onDelete, onViewingAction,
}: {
  conv: Conversation;
  messages: ChatMessage[];
  onBack: () => void;
  onSend: (kind: ChatMessage["kind"], payload?: Partial<ChatMessage>) => void;
  onUpdate: (patch: Partial<Conversation>) => void;
  onDelete: () => void;
  onViewingAction: (id: string, status: "approved" | "rejected" | "rescheduled") => void;
}) {
  const p = otherParty(conv);
  const prop = getProperty(conv.propertyId);
  const [text, setText] = useState("");
  const [showViewing, setShowViewing] = useState(false);
  const [showShareProp, setShowShareProp] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, conv.id]);

  function handleSend() {
    const v = text.trim();
    if (!v) return;
    onSend("text", { text: v });
    setText("");
  }

  return (
    <>
      {/* header */}
      <header className="flex items-center gap-3 border-b border-border/70 px-4 py-3">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarImage src={p.avatar} alt={p.name} />
            <AvatarFallback>{p.name[0]}</AvatarFallback>
          </Avatar>
          {p.online && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-semibold">{p.name}</span>
            {p.verified && <Shield className="h-3.5 w-3.5 text-[color:var(--color-brand-600)]" />}
            <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider", roleTint[p.role])}>{p.role}</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            {conv.typing ? <span className="text-[color:var(--color-brand-600)]">typing…</span>
              : p.online ? <><Circle className="mr-1 inline h-2 w-2 fill-emerald-500 text-emerald-500" /> Active now</>
              : "Offline"}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => onUpdate({ starred: !conv.starred })} aria-label="Star">
            <Star className={cn("h-4 w-4", conv.starred && "fill-amber-400 text-amber-400")} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full"><MoreVertical className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => onUpdate({ muted: !conv.muted })}>
                <BellOff className="mr-2 h-4 w-4" /> {conv.muted ? "Unmute" : "Mute"} conversation
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { onUpdate({ archived: !conv.archived }); toast.success(conv.archived ? "Unarchived" : "Archived"); }}>
                <Archive className="mr-2 h-4 w-4" /> {conv.archived ? "Unarchive" : "Archive"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setReportOpen(true)}>
                <Flag className="mr-2 h-4 w-4" /> Report user
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBlockOpen(true)} className="text-destructive focus:text-destructive">
                <Ban className="mr-2 h-4 w-4" /> Block user
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* pinned property */}
      {prop && (
        <div className="border-b border-border/70 bg-muted/40 px-4 py-2">
          <Link to="/properties/$slug" params={{ slug: prop.slug }} className="flex items-center gap-3 text-xs">
            <img src={prop.images[0]} alt="" className="h-10 w-14 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{prop.title}</div>
              <div className="text-muted-foreground">{priceLabel(prop)} · {prop.ward}, {prop.city}</div>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
        </div>
      )}

      {/* messages */}
      <ScrollArea className="flex-1" viewportRef={scrollRef}>
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-6">
          {messages.map((m, i) => (
            <MessageBubble
              key={m.id}
              msg={m}
              sender={m.senderId === ME.id ? ME : p}
              prev={messages[i - 1]}
              onViewingAction={onViewingAction}
            />
          ))}
          {conv.typing && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Avatar className="h-6 w-6"><AvatarImage src={p.avatar} /><AvatarFallback>{p.name[0]}</AvatarFallback></Avatar>
              <div className="rounded-2xl bg-muted px-3 py-2">
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/50" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/50" style={{ animationDelay: "120ms" }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/50" style={{ animationDelay: "240ms" }} />
                </span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* quick replies */}
      <div className="border-t border-border/70 px-4 py-2 overflow-x-auto no-scrollbar">
        <div className="flex gap-2">
          {QUICK_REPLIES.map((q) => (
            <button
              key={q}
              onClick={() => onSend("text", { text: q })}
              className="shrink-0 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition hover:border-primary hover:text-primary"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* composer */}
      <div className="border-t border-border/70 bg-card p-3">
        <div className="flex items-end gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground" aria-label="Attach">
                <Paperclip className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-56 p-1">
              <button
                onClick={() => setShowShareProp(true)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-accent"
              >
                <Home className="h-4 w-4 text-[color:var(--color-brand-600)]" /> Share property
              </button>
              <button
                onClick={() => {
                  onSend("photo", { photoUrl: properties[0].images[1] });
                  toast.success("Photo sent");
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-accent"
              >
                <ImageIcon className="h-4 w-4 text-emerald-600" /> Send photo
              </button>
              <button
                onClick={() => onSend("location", { location: { label: "Msasani, Dar es Salaam", lat: -6.7565, lng: 39.2695 } })}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-accent"
              >
                <MapPin className="h-4 w-4 text-rose-600" /> Share location
              </button>
              <button
                onClick={() => setShowViewing(true)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-accent"
              >
                <Calendar className="h-4 w-4 text-amber-600" /> Schedule viewing
              </button>
            </PopoverContent>
          </Popover>

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

      <ShareViewingDialog
        open={showViewing}
        onOpenChange={setShowViewing}
        propertyId={prop?.id}
        onConfirm={(when, propertyId) => {
          onSend("viewing", { viewing: { propertyId, when, status: "pending" } });
          setShowViewing(false);
          toast.success("Viewing requested");
        }}
      />
      <SharePropertyDialog
        open={showShareProp}
        onOpenChange={setShowShareProp}
        onSelect={(id) => { onSend("property", { propertyId: id }); setShowShareProp(false); toast.success("Property shared"); }}
      />
      <ConfirmDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        title={`Report ${p.name}?`}
        description="Our Trust & Safety team reviews reports within 24 hours."
        confirmLabel="Submit report"
        onConfirm={() => { toast.success("Report submitted"); setReportOpen(false); }}
      />
      <ConfirmDialog
        open={blockOpen}
        onOpenChange={setBlockOpen}
        title={`Block ${p.name}?`}
        description="They won't be able to message you or see your listings."
        confirmLabel="Block user"
        destructive
        onConfirm={() => { toast.success("User blocked"); setBlockOpen(false); onUpdate({ archived: true }); }}
      />
    </>
  );
}

/* ============================ BUBBLES ============================ */

function MessageBubble({ msg, sender, prev, onViewingAction }: {
  msg: ChatMessage; sender: Participant; prev?: ChatMessage;
  onViewingAction: (id: string, status: "approved" | "rejected" | "rescheduled") => void;
}) {
  const mine = msg.senderId === ME.id;
  const showAvatar = !prev || prev.senderId !== msg.senderId;

  if (msg.kind === "system") {
    return (
      <div className="my-2 flex justify-center">
        <span className="rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground">{msg.text}</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-end gap-2", mine && "flex-row-reverse")}>
      <div className="w-7">
        {showAvatar && !mine && (
          <Avatar className="h-7 w-7"><AvatarImage src={sender.avatar} /><AvatarFallback>{sender.name[0]}</AvatarFallback></Avatar>
        )}
      </div>
      <div className={cn("flex max-w-[75%] flex-col gap-1", mine && "items-end")}>
        {msg.kind === "text" && (
          <div className={cn(
            "rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm",
            mine
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-muted text-foreground rounded-bl-md",
          )}>
            {msg.text}
          </div>
        )}
        {msg.kind === "photo" && msg.photoUrl && (
          <img src={msg.photoUrl} alt="" className="max-w-xs rounded-2xl border border-border/50" />
        )}
        {msg.kind === "location" && msg.location && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${msg.location.lat},${msg.location.lng}`}
            target="_blank" rel="noreferrer"
            className="flex w-64 items-center gap-3 rounded-2xl border border-border bg-card p-3 hover:bg-accent"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{msg.location.label}</div>
              <div className="text-[10px] text-muted-foreground">Open in Maps</div>
            </div>
          </a>
        )}
        {msg.kind === "property" && msg.propertyId && <PropertyCardMessage propertyId={msg.propertyId} />}
        {msg.kind === "viewing" && msg.viewing && (
          <ViewingCardMessage viewing={msg.viewing} mine={mine} onAction={(s) => onViewingAction(msg.id, s)} />
        )}
        <div className={cn("flex items-center gap-1 px-1 text-[10px] text-muted-foreground", mine && "flex-row-reverse")}>
          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          {mine && (
            msg.status === "read"      ? <CheckCheck className="h-3 w-3 text-[color:var(--color-brand-600)]" />
            : msg.status === "delivered" ? <CheckCheck className="h-3 w-3" />
            : msg.status === "sent"      ? <Check className="h-3 w-3" />
            : <Circle className="h-2 w-2" />
          )}
        </div>
      </div>
    </div>
  );
}

function PropertyCardMessage({ propertyId }: { propertyId: string }) {
  const prop = getProperty(propertyId);
  if (!prop) return null;
  return (
    <div className="w-72 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
      <img src={prop.images[0]} alt={prop.title} className="h-36 w-full object-cover" />
      <div className="space-y-1.5 p-3">
        <div className="font-display text-sm font-semibold text-primary">{priceLabel(prop)}</div>
        <div className="line-clamp-1 text-sm font-medium">{prop.title}</div>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <MapPin className="h-3 w-3" /> {prop.ward}, {prop.city}
        </div>
        <Link to="/properties/$slug" params={{ slug: prop.slug }} className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
          Open listing
        </Link>
      </div>
    </div>
  );
}

function ViewingCardMessage({
  viewing, mine, onAction,
}: {
  viewing: NonNullable<ChatMessage["viewing"]>;
  mine: boolean;
  onAction: (s: "approved" | "rejected" | "rescheduled") => void;
}) {
  const prop = getProperty(viewing.propertyId);
  const when = new Date(viewing.when);
  const badge = {
    pending:     { icon: CalendarClock,  label: "Pending",     tint: "bg-amber-50 text-amber-700" },
    approved:    { icon: CalendarCheck,  label: "Approved",    tint: "bg-emerald-50 text-emerald-700" },
    rejected:    { icon: CalendarX,      label: "Declined",    tint: "bg-rose-50 text-rose-700" },
    rescheduled: { icon: CalendarClock,  label: "Rescheduled", tint: "bg-sky-50 text-sky-700" },
  }[viewing.status];
  const Icon = badge.icon;
  return (
    <div className="w-72 space-y-2 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-600">
          <Calendar className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Viewing request</div>
          <div className="truncate text-sm font-semibold">{prop?.title ?? "Property"}</div>
        </div>
      </div>
      <div className="rounded-xl bg-muted/50 p-2 text-xs">
        <div className="font-semibold">{when.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}</div>
        <div className="text-muted-foreground">{when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
      </div>
      <div className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", badge.tint)}>
        <Icon className="h-3 w-3" /> {badge.label}
      </div>
      {viewing.status === "pending" && !mine && (
        <div className="flex gap-2 pt-1">
          <Button size="sm" className="flex-1 rounded-lg" onClick={() => onAction("approved")}>Approve</Button>
          <Button size="sm" variant="outline" className="flex-1 rounded-lg" onClick={() => onAction("rescheduled")}>Reschedule</Button>
          <Button size="sm" variant="ghost" className="rounded-lg text-destructive" onClick={() => onAction("rejected")}>Decline</Button>
        </div>
      )}
    </div>
  );
}

/* ============================ DIALOGS ============================ */

function NewMessageDialog({
  open, onOpenChange, onCreate,
}: {
  open: boolean; onOpenChange: (b: boolean) => void;
  onCreate: (participant: Participant, prop: ReturnType<typeof getProperty>, text: string) => void;
}) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Participant | null>(null);
  const [propId, setPropId] = useState<string>("");
  const [text, setText] = useState("Hello, I'm interested in your listing.");

  const contacts: Participant[] = useMemo(() => {
    const all: Participant[] = properties.slice(0, 6).map((p) => ({
      id: `contact-${p.agentId}-${p.id}`,
      name: `Agent for ${p.title.split(" ").slice(0, 3).join(" ")}`,
      role: "agent",
      avatar: `https://i.pravatar.cc/240?u=${p.agentId}${p.id}`,
      verified: true, online: Math.random() > 0.5,
    }));
    if (!q.trim()) return all;
    return all.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
  }, [q]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
          <DialogDescription>Reach out to an owner or agent about a listing.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">To</label>
            <Input placeholder="Search people…" value={q} onChange={(e) => setQ(e.target.value)} className="rounded-xl" />
            <div className="max-h-40 overflow-auto rounded-xl border border-border/60">
              {contacts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={cn(
                    "flex w-full items-center gap-2 border-b border-border/40 px-3 py-2 text-left text-sm last:border-0",
                    selected?.id === c.id ? "bg-[color:var(--color-brand-50)]" : "hover:bg-muted/50",
                  )}
                >
                  <Avatar className="h-7 w-7"><AvatarImage src={c.avatar} /><AvatarFallback>{c.name[0]}</AvatarFallback></Avatar>
                  <span className="flex-1 truncate">{c.name}</span>
                  {selected?.id === c.id && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Attach property (optional)</label>
            <select
              value={propId}
              onChange={(e) => setPropId(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">— None —</option>
              {properties.slice(0, 8).map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
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
            disabled={!selected || !text.trim()}
            onClick={() => selected && onCreate(selected, getProperty(propId), text.trim())}
          >
            Send message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ShareViewingDialog({
  open, onOpenChange, propertyId, onConfirm,
}: {
  open: boolean; onOpenChange: (b: boolean) => void; propertyId?: string;
  onConfirm: (whenIso: string, propertyId: string) => void;
}) {
  const [date, setDate] = useState<string>(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));
  const [time, setTime] = useState("10:00");
  const [pid, setPid] = useState<string>(propertyId ?? properties[0]?.id ?? "");
  useEffect(() => { if (propertyId) setPid(propertyId); }, [propertyId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule a viewing</DialogTitle>
          <DialogDescription>Send a viewing request to the other party for approval.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Property</label>
            <select value={pid} onChange={(e) => setPid(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
              {properties.slice(0, 8).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time</label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="rounded-xl" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onConfirm(new Date(`${date}T${time}:00`).toISOString(), pid)}>Request viewing</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SharePropertyDialog({
  open, onOpenChange, onSelect,
}: { open: boolean; onOpenChange: (b: boolean) => void; onSelect: (id: string) => void }) {
  const [q, setQ] = useState("");
  const list = properties.filter((p) => p.title.toLowerCase().includes(q.toLowerCase())).slice(0, 8);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share a property</DialogTitle>
          <DialogDescription>Send a rich property card in this conversation.</DialogDescription>
        </DialogHeader>
        <Input placeholder="Search properties…" value={q} onChange={(e) => setQ(e.target.value)} className="rounded-xl" />
        <div className="max-h-80 space-y-2 overflow-auto">
          {list.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="flex w-full items-center gap-3 rounded-2xl border border-border p-2 text-left hover:bg-accent"
            >
              <img src={p.images[0]} className="h-14 w-20 rounded-lg object-cover" alt="" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{p.title}</div>
                <div className="text-[11px] text-muted-foreground">{priceLabel(p)} · {p.ward}</div>
              </div>
            </button>
          ))}
        </div>
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
