import { properties, type Property } from "@/lib/mock-data";

export type ViewingStatus =
  | "requested" | "approved" | "rescheduled" | "completed" | "cancelled" | "no_show";
export type ReminderOffset = "24h" | "2h" | "30m";
export type ReminderChannel = "in_app" | "sms" | "email";

export interface Viewing {
  id: string;
  propertyId: string;
  buyerName: string;
  buyerAvatar: string;
  ownerName: string;
  startsAt: string; // ISO
  durationMin: number;
  status: ViewingStatus;
  notes?: string;
  guests?: { name: string; relation: string }[];
  reminders: ReminderOffset[];
  channels: ReminderChannel[];
  meetingLocation?: string;
  createdAt: string;
  history: { at: string; label: string }[];
}

const now = Date.now();
const iso = (h: number) => new Date(now + h * 3600_000).toISOString();
const ago = (h: number) => new Date(now - h * 3600_000).toISOString();

export const VIEWINGS: Viewing[] = [
  {
    id: "v1",
    propertyId: "p1",
    buyerName: "Amani Mushi",
    buyerAvatar: "https://i.pravatar.cc/240?img=12",
    ownerName: "David Kileo",
    startsAt: iso(18),
    durationMin: 45,
    status: "approved",
    notes: "Interested in the ocean-facing units. Cash buyer.",
    guests: [{ name: "Neema Mushi", relation: "Spouse" }],
    reminders: ["24h", "2h"],
    channels: ["in_app", "email"],
    meetingLocation: "Main gate, Toure Drive, Masaki",
    createdAt: ago(48),
    history: [
      { at: ago(48), label: "Request submitted" },
      { at: ago(46), label: "Approved by owner" },
    ],
  },
  {
    id: "v2",
    propertyId: "p2",
    buyerName: "Fatma Abdallah",
    buyerAvatar: "https://i.pravatar.cc/240?img=45",
    ownerName: "David Kileo",
    startsAt: iso(3),
    durationMin: 30,
    status: "requested",
    notes: "Please confirm parking is included.",
    reminders: ["2h", "30m"],
    channels: ["in_app", "sms"],
    createdAt: ago(6),
    history: [{ at: ago(6), label: "Request submitted" }],
  },
  {
    id: "v3",
    propertyId: "p3",
    buyerName: "Baraka Mwanga",
    buyerAvatar: "https://i.pravatar.cc/240?img=15",
    ownerName: "Neema Kimaro",
    startsAt: iso(72),
    durationMin: 60,
    status: "rescheduled",
    reminders: ["24h"],
    channels: ["in_app", "email"],
    createdAt: ago(70),
    history: [
      { at: ago(70), label: "Request submitted" },
      { at: ago(20), label: "Owner suggested a new time" },
      { at: ago(2), label: "Buyer accepted new time" },
    ],
  },
  {
    id: "v4",
    propertyId: "p4",
    buyerName: "Sarah Mnyika",
    buyerAvatar: "https://i.pravatar.cc/240?img=32",
    ownerName: "Joseph Mushi",
    startsAt: ago(72),
    durationMin: 45,
    status: "completed",
    reminders: ["24h", "2h"],
    channels: ["in_app", "email"],
    createdAt: ago(120),
    history: [
      { at: ago(120), label: "Request submitted" },
      { at: ago(118), label: "Approved by owner" },
      { at: ago(72), label: "Viewing completed" },
    ],
  },
  {
    id: "v5",
    propertyId: "p1",
    buyerName: "Kenneth Lyimo",
    buyerAvatar: "https://i.pravatar.cc/240?img=22",
    ownerName: "David Kileo",
    startsAt: ago(120),
    durationMin: 30,
    status: "cancelled",
    reminders: ["24h"],
    channels: ["in_app"],
    createdAt: ago(160),
    history: [
      { at: ago(160), label: "Request submitted" },
      { at: ago(140), label: "Buyer cancelled" },
    ],
  },
  {
    id: "v6",
    propertyId: "p2",
    buyerName: "Rehema Kalinga",
    buyerAvatar: "https://i.pravatar.cc/240?img=48",
    ownerName: "David Kileo",
    startsAt: ago(240),
    durationMin: 30,
    status: "no_show",
    reminders: ["24h", "2h"],
    channels: ["in_app", "sms"],
    createdAt: ago(300),
    history: [
      { at: ago(300), label: "Request submitted" },
      { at: ago(298), label: "Approved by owner" },
      { at: ago(240), label: "Buyer marked as no-show" },
    ],
  },
];

export function propertyOf(v: Viewing): Property | undefined {
  return properties.find((p) => p.id === v.propertyId);
}

export function statusMeta(s: ViewingStatus) {
  return {
    requested:   { label: "Requested",   tint: "bg-amber-50 text-amber-700 border-amber-200",     dot: "bg-amber-500"   },
    approved:    { label: "Approved",    tint: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
    rescheduled: { label: "Rescheduled", tint: "bg-sky-50 text-sky-700 border-sky-200",           dot: "bg-sky-500"     },
    completed:   { label: "Completed",   tint: "bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)] border-[color:var(--color-brand-200)]", dot: "bg-[color:var(--color-brand-600)]" },
    cancelled:   { label: "Cancelled",   tint: "bg-rose-50 text-rose-700 border-rose-200",         dot: "bg-rose-500"    },
    no_show:     { label: "No-show",     tint: "bg-muted text-muted-foreground border-border",     dot: "bg-muted-foreground" },
  }[s];
}

export function reminderLabel(o: ReminderOffset) {
  return o === "24h" ? "24 hours before" : o === "2h" ? "2 hours before" : "30 minutes before";
}

export function inSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Mon=0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}
