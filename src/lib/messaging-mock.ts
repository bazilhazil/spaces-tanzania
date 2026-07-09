import { properties, agents, formatPrice, type Property } from "@/lib/mock-data";

export type MessageFolder = "inbox" | "unread" | "starred" | "archived" | "sent" | "deleted";
export type ParticipantRole = "buyer" | "owner" | "agent" | "admin";

export interface Participant {
  id: string;
  name: string;
  role: ParticipantRole;
  avatar: string;
  online?: boolean;
  verified?: boolean;
}

export type MessageKind = "text" | "property" | "photo" | "location" | "viewing" | "system";
export type ViewingStatus = "pending" | "approved" | "rejected" | "rescheduled";
export type DeliveryStatus = "sending" | "sent" | "delivered" | "read";

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  kind: MessageKind;
  text?: string;
  createdAt: string; // ISO
  status: DeliveryStatus;
  propertyId?: string;
  photoUrl?: string;
  location?: { label: string; lat: number; lng: number };
  viewing?: {
    propertyId: string;
    when: string; // ISO
    status: ViewingStatus;
  };
}

export interface Conversation {
  id: string;
  participants: Participant[]; // includes "me"
  propertyId?: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
  starred: boolean;
  archived: boolean;
  muted: boolean;
  deleted: boolean;
  typing?: boolean;
}

export const ME: Participant = {
  id: "me",
  name: "You",
  role: "buyer",
  avatar: "https://i.pravatar.cc/240?img=68",
  online: true,
};

const p = (id: string) => properties.find((x) => x.id === id)!;
const a = (id: string) => agents.find((x) => x.id === id)!;

function toParticipant(agent: ReturnType<typeof a>, role: ParticipantRole = "agent"): Participant {
  return { id: agent.id, name: agent.name, role, avatar: agent.avatar, verified: agent.verified, online: Math.random() > 0.4 };
}

const admin: Participant = {
  id: "admin1",
  name: "SPACES Trust Team",
  role: "admin",
  avatar: "https://i.pravatar.cc/240?img=5",
  verified: true,
  online: true,
};

const owner1: Participant = { id: "o1", name: "David Kileo", role: "owner", avatar: "https://i.pravatar.cc/240?img=23", verified: true, online: true };
const owner2: Participant = { id: "o2", name: "Fatma Abdallah", role: "owner", avatar: "https://i.pravatar.cc/240?img=45", verified: true, online: false };

const now = Date.now();
const iso = (minsAgo: number) => new Date(now - minsAgo * 60_000).toISOString();

export const CONVERSATIONS: Conversation[] = [
  {
    id: "c1",
    participants: [ME, toParticipant(a("a1"))],
    propertyId: "p1",
    lastMessage: "Yes, Saturday at 10am works perfectly.",
    lastAt: iso(3),
    unread: 2,
    starred: true,
    archived: false, muted: false, deleted: false,
    typing: true,
  },
  {
    id: "c2",
    participants: [ME, owner1],
    propertyId: "p2",
    lastMessage: "I've shared the floor plan and photos.",
    lastAt: iso(38),
    unread: 0,
    starred: false, archived: false, muted: false, deleted: false,
  },
  {
    id: "c3",
    participants: [ME, toParticipant(a("a3"))],
    propertyId: "p3",
    lastMessage: "Viewing approved for Sunday 3pm ✅",
    lastAt: iso(180),
    unread: 1,
    starred: false, archived: false, muted: false, deleted: false,
  },
  {
    id: "c4",
    participants: [ME, owner2],
    lastMessage: "Thank you, will consider and revert.",
    lastAt: iso(60 * 20),
    unread: 0,
    starred: true, archived: false, muted: false, deleted: false,
  },
  {
    id: "c5",
    participants: [ME, admin],
    lastMessage: "Your verification documents are approved.",
    lastAt: iso(60 * 26),
    unread: 0,
    starred: false, archived: false, muted: true, deleted: false,
  },
  {
    id: "c6",
    participants: [ME, toParticipant(a("a2"))],
    propertyId: "p4",
    lastMessage: "Archived — deal completed 🎉",
    lastAt: iso(60 * 24 * 7),
    unread: 0,
    starred: false, archived: true, muted: false, deleted: false,
  },
];

export const MESSAGES: ChatMessage[] = [
  // c1
  { id: "m1", conversationId: "c1", senderId: "a1", kind: "text", text: "Karibu! Are you still interested in the Masaki villa?", createdAt: iso(120), status: "read" },
  { id: "m2", conversationId: "c1", senderId: "a1", kind: "property", propertyId: "p1", createdAt: iso(119), status: "read" },
  { id: "m3", conversationId: "c1", senderId: "me", kind: "text", text: "Yes! Can we schedule a viewing this weekend?", createdAt: iso(90), status: "read" },
  { id: "m4", conversationId: "c1", senderId: "a1", kind: "viewing", viewing: { propertyId: "p1", when: new Date(now + 86_400_000 * 2 + 3600_000 * 10).toISOString(), status: "pending" }, createdAt: iso(60), status: "read" },
  { id: "m5", conversationId: "c1", senderId: "me", kind: "text", text: "Yes, Saturday at 10am works perfectly.", createdAt: iso(3), status: "delivered" },

  // c2
  { id: "m10", conversationId: "c2", senderId: "o1", kind: "text", text: "Hi — here are updated pictures of the apartment.", createdAt: iso(120), status: "read" },
  { id: "m11", conversationId: "c2", senderId: "o1", kind: "photo", photoUrl: p("p2").images[0], createdAt: iso(119), status: "read" },
  { id: "m12", conversationId: "c2", senderId: "o1", kind: "location", location: { label: "Msasani, Dar es Salaam", lat: -6.7565, lng: 39.2695 }, createdAt: iso(60), status: "read" },
  { id: "m13", conversationId: "c2", senderId: "o1", kind: "text", text: "I've shared the floor plan and photos.", createdAt: iso(38), status: "read" },

  // c3
  { id: "m20", conversationId: "c3", senderId: "a3", kind: "text", text: "Viewing approved for Sunday 3pm ✅", createdAt: iso(180), status: "delivered" },

  // c4
  { id: "m30", conversationId: "c4", senderId: "me", kind: "text", text: "Thank you, will consider and revert.", createdAt: iso(60 * 20), status: "read" },

  // c5
  { id: "m40", conversationId: "c5", senderId: "admin1", kind: "system", text: "Your verification documents are approved.", createdAt: iso(60 * 26), status: "read" },
];

export const QUICK_REPLIES = [
  "Is this still available?",
  "Can I schedule a viewing?",
  "Is the price negotiable?",
  "Thank you, I'll get back to you.",
  "Could you share more photos?",
];

export function priceLabel(prop: Property) {
  return formatPrice(prop.price, prop.currency, prop.listingType);
}

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

export function foldersFor(convs: Conversation[]): Record<MessageFolder, Conversation[]> {
  return {
    inbox:    convs.filter((c) => !c.archived && !c.deleted),
    unread:   convs.filter((c) => c.unread > 0 && !c.archived && !c.deleted),
    starred:  convs.filter((c) => c.starred && !c.deleted),
    archived: convs.filter((c) => c.archived && !c.deleted),
    sent:     convs.filter((c) => !c.deleted),
    deleted:  convs.filter((c) => c.deleted),
  };
}

export function otherParty(c: Conversation): Participant {
  return c.participants.find((x) => x.id !== "me") ?? c.participants[0];
}

export function getProperty(id?: string): Property | undefined {
  if (!id) return undefined;
  return properties.find((x) => x.id === id);
}
