import { supabase } from "@/integrations/supabase/client";

/**
 * Property management data layer (units, tenants, leases, rent, maintenance).
 *
 * Additive to the existing marketplace: nothing here changes listings, leads,
 * viewings, deals or payments. Access is enforced in the database through the
 * existing ownership / agent-assignment rules.
 */

export const BUCKET = "management-docs";

export type OccupancyStatus =
  | "vacant" | "occupied" | "notice_given" | "maintenance" | "ready" | "available";

export const OCCUPANCY_STATUSES: OccupancyStatus[] = [
  "vacant", "occupied", "notice_given", "maintenance", "ready", "available",
];

export type LeaseStatus = "draft" | "active" | "expiring" | "expired" | "terminated" | "renewed";
export const LEASE_STATUSES: LeaseStatus[] = [
  "draft", "active", "expiring", "expired", "terminated", "renewed",
];

export type ChargeStatus = "unpaid" | "partial" | "paid" | "overdue";
export type PaymentMethod = "mobile_money" | "bank_transfer" | "cash" | "other";
export const PAYMENT_METHODS: PaymentMethod[] = ["mobile_money", "bank_transfer", "cash", "other"];
export type PaymentStatus = "pending_verification" | "approved" | "rejected";

export type TicketStatus =
  | "new" | "reviewing" | "approved" | "assigned" | "in_progress" | "completed" | "closed" | "rejected";
export const TICKET_STATUSES: TicketStatus[] = [
  "new", "reviewing", "approved", "assigned", "in_progress", "completed", "closed", "rejected",
];
export const TICKET_CATEGORIES = [
  "plumbing", "electrical", "structural", "appliance", "security", "cleaning", "other",
] as const;

export type ManagedProperty = { id: string; title: string; owner_id: string; region: string | null; district: string | null };

export type Unit = {
  id: string; property_id: string; owner_id: string; name: string; unit_type: string | null;
  bedrooms: number | null; bathrooms: number | null; rent_amount: number | null;
  deposit_amount: number | null; service_charge: number | null; currency: string;
  occupancy_status: OccupancyStatus; notes: string | null; created_at: string;
};

export type Tenant = {
  id: string; owner_id: string; property_id: string; unit_id: string | null; user_id: string | null;
  full_name: string; phone: string | null; email: string | null; avatar_url: string | null;
  id_document_ref: string | null; emergency_name: string | null; emergency_phone: string | null;
  notes: string | null; status: "active" | "notice" | "past"; created_at: string;
};

export type Lease = {
  id: string; property_id: string; unit_id: string | null; tenant_id: string; owner_id: string;
  manager_id: string | null; start_date: string; end_date: string | null; renewal_date: string | null;
  notice_period_days: number | null; monthly_rent: number; deposit_amount: number | null;
  service_charge: number | null; currency: string; payment_frequency: string;
  late_fee_type: "none" | "fixed" | "percent"; late_fee_value: number | null;
  late_fee_grace_days: number | null; special_terms: string | null; document_path: string | null;
  signed_document_path: string | null; status: LeaseStatus; created_at: string;
};

export type RentCharge = {
  id: string; lease_id: string; tenant_id: string; property_id: string; unit_id: string | null;
  owner_id: string; period_start: string | null; period_end: string | null; due_date: string;
  amount_due: number; amount_paid: number; currency: string; status: ChargeStatus;
  notes: string | null; created_at: string;
};

export type RentPayment = {
  id: string; charge_id: string; lease_id: string; tenant_id: string; property_id: string;
  owner_id: string; amount: number; currency: string; method: PaymentMethod; reference: string | null;
  paid_at: string | null; proof_path: string | null; receipt_path: string | null;
  status: PaymentStatus; review_note: string | null; reviewed_at: string | null;
  recorded_by: string | null; created_at: string;
};

export type Contractor = {
  id: string; owner_id: string; name: string; company: string | null; phone: string | null;
  email: string | null; service_category: string | null; location: string | null;
  notes: string | null; verified: boolean; created_at: string;
};

export type MaintenanceTicket = {
  id: string; property_id: string; unit_id: string | null; lease_id: string | null;
  tenant_id: string | null; owner_id: string; contractor_id: string | null; reported_by: string | null;
  category: string; description: string; priority: "low" | "normal" | "high" | "urgent";
  status: TicketStatus; estimated_cost: number | null; approved_cost: number | null;
  actual_cost: number | null; currency: string; notes: string | null; closed_at: string | null;
  created_at: string;
};

export function formatTzs(amount?: number | null): string {
  const n = Number(amount ?? 0);
  return `TZS ${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function labelize(value?: string | null): string {
  if (!value) return "—";
  return value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * The generated types are regenerated from the schema; until they include the
 * management tables everywhere, queries go through a small loose wrapper. The
 * database still enforces every access rule.
 */
type QueryResult = { data: unknown; error: { message: string } | null; count?: number | null };
interface Loose extends PromiseLike<QueryResult> {
  select: (q?: string, o?: unknown) => Loose;
  insert: (v: unknown) => Loose;
  update: (v: unknown) => Loose;
  delete: () => Loose;
  eq: (c: string, v: unknown) => Loose;
  in: (c: string, v: unknown) => Loose;
  order: (c: string, o?: unknown) => Loose;
  limit: (n: number) => Loose;
  single: () => Promise<QueryResult>;
  maybeSingle: () => Promise<QueryResult>;
}
const db = {
  from: (t: string) => (supabase.from as unknown as (table: string) => Loose)(t),
};

/** Listings the signed-in user may manage: own listings plus full-management assignments. */
export async function fetchManagedProperties(userId: string): Promise<ManagedProperty[]> {
  const [own, assigned, managed] = await Promise.all([
    supabase.from("properties").select("id,title,owner_id,region,district")
      .eq("owner_id", userId).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("property_agents").select("property_id,permission").eq("agent_id", userId)
      .eq("permission", "full_management" as never),
    // Active Property Manager assignments (any owner).
    supabase.from("property_managers").select("property_id").eq("manager_id", userId).eq("status", "active"),
  ]);
  const list = (own.data ?? []) as ManagedProperty[];
  const ids = [
    ...((assigned.data ?? []) as { property_id: string }[]),
    ...((managed.data ?? []) as { property_id: string }[]),
  ].map((r) => r.property_id)
    .filter((id, i, arr) => arr.indexOf(id) === i && !list.some((p) => p.id === id));
  if (ids.length) {
    const { data } = await supabase.from("properties").select("id,title,owner_id,region,district")
      .in("id", ids).is("deleted_at", null);
    list.push(...((data ?? []) as ManagedProperty[]));
  }
  return list;
}

async function rows<T>(table: string, propertyIds: string[], order = "created_at"): Promise<T[]> {
  if (!propertyIds.length) return [];
  const { data, error } = await db.from(table).select("*").in("property_id", propertyIds).order(order);
  if (error) throw error;
  return (data ?? []) as T[];
}

export async function fetchUnits(propertyIds: string[]) { return rows<Unit>("property_units", propertyIds, "name"); }
export async function fetchTenants(propertyIds: string[]) { return rows<Tenant>("tenants", propertyIds); }
export async function fetchLeases(propertyIds: string[]) { return rows<Lease>("leases", propertyIds); }
export async function fetchCharges(propertyIds: string[]) { return rows<RentCharge>("rent_charges", propertyIds, "due_date"); }
export async function fetchPayments(propertyIds: string[]) { return rows<RentPayment>("rent_payments", propertyIds); }
export async function fetchTickets(propertyIds: string[]) { return rows<MaintenanceTicket>("maintenance_tickets", propertyIds); }

export type ManagementDocument = {
  id: string;
  name: string;
  doc_type: string;
  storage_path: string;
  property_id: string | null;
  created_at: string;
};
export async function fetchDocuments(propertyIds: string[]) {
  return rows<ManagementDocument>("management_documents", propertyIds);
}

export async function fetchContractors(userId: string): Promise<Contractor[]> {
  const { data, error } = await db.from("contractors").select("*").eq("owner_id", userId).order("name");
  if (error) throw error;
  return (data ?? []) as Contractor[];
}

async function insert<T>(table: string, payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await db.from(table).insert(payload as never).select("*").single();
  if (error) throw error;
  return data as T;
}
async function patch<T>(table: string, id: string, payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await db.from(table).update(payload as never).eq("id", id).select("*").single();
  if (error) throw error;
  return data as T;
}

export const createUnit = (p: Record<string, unknown>) => insert<Unit>("property_units", p);
export const updateUnit = (id: string, p: Record<string, unknown>) => patch<Unit>("property_units", id, p);
export const createTenant = (p: Record<string, unknown>) => insert<Tenant>("tenants", p);
export const updateTenant = (id: string, p: Record<string, unknown>) => patch<Tenant>("tenants", id, p);
export const createLease = (p: Record<string, unknown>) => insert<Lease>("leases", p);
export const updateLease = (id: string, p: Record<string, unknown>) => patch<Lease>("leases", id, p);
export const createCharge = (p: Record<string, unknown>) => insert<RentCharge>("rent_charges", p);
export const createPayment = (p: Record<string, unknown>) => insert<RentPayment>("rent_payments", p);
export const createContractor = (p: Record<string, unknown>) => insert<Contractor>("contractors", p);
export const createTicket = (p: Record<string, unknown>) => insert<MaintenanceTicket>("maintenance_tickets", p);
export const updateTicket = (id: string, p: Record<string, unknown>) => patch<MaintenanceTicket>("maintenance_tickets", id, p);

/** Manager decision on a submitted payment. The database recalculates the balance. */
export async function reviewPayment(id: string, approve: boolean, note?: string) {
  const { data: session } = await supabase.auth.getUser();
  return patch<RentPayment>("rent_payments", id, {
    status: approve ? "approved" : "rejected",
    review_note: note ?? null,
    reviewed_by: session.user?.id ?? null,
    reviewed_at: new Date().toISOString(),
  });
}

/** Upload a document into the private management bucket and register it. */
export async function uploadManagementDocument(opts: {
  file: File;
  userId: string;
  ownerId: string;
  docType: "lease" | "proof_of_payment" | "receipt" | "identification" | "maintenance" | "notice" | "other";
  propertyId?: string | null;
  tenantId?: string | null;
  leaseId?: string | null;
  chargeId?: string | null;
  paymentId?: string | null;
  ticketId?: string | null;
}): Promise<string> {
  const ext = opts.file.name.split(".").pop() ?? "dat";
  const path = `${opts.userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, opts.file, { upsert: false });
  if (error) throw error;
  await insert("management_documents", {
    owner_id: opts.ownerId,
    property_id: opts.propertyId ?? null,
    tenant_id: opts.tenantId ?? null,
    lease_id: opts.leaseId ?? null,
    charge_id: opts.chargeId ?? null,
    payment_id: opts.paymentId ?? null,
    ticket_id: opts.ticketId ?? null,
    doc_type: opts.docType,
    name: opts.file.name,
    storage_path: path,
    mime_type: opts.file.type || null,
    size: opts.file.size,
    uploaded_by: opts.userId,
  });
  return path;
}

export async function signedDocumentUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export type ManagementMetrics = {
  properties: number; units: number; occupied: number; vacant: number;
  expectedRent: number; collectedRent: number; outstandingRent: number;
  openMaintenance: number; tenants: number; pendingPayments: number;
};

export function buildMetrics(input: {
  properties: ManagedProperty[]; units: Unit[]; tenants: Tenant[];
  charges: RentCharge[]; tickets: MaintenanceTicket[]; payments: RentPayment[];
}): ManagementMetrics {
  const expected = input.charges.reduce((s, c) => s + Number(c.amount_due || 0), 0);
  const collected = input.charges.reduce((s, c) => s + Number(c.amount_paid || 0), 0);
  return {
    properties: input.properties.length,
    units: input.units.length,
    occupied: input.units.filter((u) => u.occupancy_status === "occupied").length,
    vacant: input.units.filter((u) => u.occupancy_status === "vacant").length,
    expectedRent: expected,
    collectedRent: collected,
    outstandingRent: Math.max(expected - collected, 0),
    openMaintenance: input.tickets.filter((t) => !["closed", "completed", "rejected"].includes(t.status)).length,
    tenants: input.tenants.filter((t) => t.status === "active").length,
    pendingPayments: input.payments.filter((p) => p.status === "pending_verification").length,
  };
}

/** Everything the signed-in user needs for their own tenancy (tenant portal). */
export type MyTenancy = {
  tenant: Tenant;
  unit: Unit | null;
  property: { id: string; title: string; region: string | null; district: string | null } | null;
  lease: Lease | null;
  charges: RentCharge[];
  payments: RentPayment[];
  tickets: MaintenanceTicket[];
};

export async function fetchMyTenancy(userId: string): Promise<MyTenancy | null> {
  const { data: t } = await db.from("tenants").select("*").eq("user_id", userId)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  const tenant = t as Tenant | null;
  if (!tenant) return null;

  const [unitRes, propRes, leaseRes, chargeRes, payRes, ticketRes] = await Promise.all([
    tenant.unit_id
      ? db.from("property_units").select("*").eq("id", tenant.unit_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("properties").select("id,title,region,district").eq("id", tenant.property_id).maybeSingle(),
    db.from("leases").select("*").eq("tenant_id", tenant.id).order("start_date", { ascending: false }).limit(1).maybeSingle(),
    db.from("rent_charges").select("*").eq("tenant_id", tenant.id).order("due_date", { ascending: false }),
    db.from("rent_payments").select("*").eq("tenant_id", tenant.id).order("created_at", { ascending: false }),
    db.from("maintenance_tickets").select("*").eq("tenant_id", tenant.id).order("created_at", { ascending: false }),
  ]);

  return {
    tenant,
    unit: (unitRes as { data: unknown }).data as Unit | null,
    property: (propRes.data ?? null) as MyTenancy["property"],
    lease: (leaseRes as { data: unknown }).data as Lease | null,
    charges: (((chargeRes as { data: unknown }).data ?? []) as RentCharge[]),
    payments: (((payRes as { data: unknown }).data ?? []) as RentPayment[]),
    tickets: (((ticketRes as { data: unknown }).data ?? []) as MaintenanceTicket[]),
  };
}

/** True when the signed-in user has a tenancy (drives the tenant navigation entry). */
/** True when an agent has been explicitly assigned full management of a listing. */
export async function hasManagementAssignment(userId: string): Promise<boolean> {
  const { count } = await supabase
    .from("property_agents")
    .select("id", { count: "exact", head: true })
    .eq("agent_id", userId)
    .eq("permission", "full_management" as never);
  return (count ?? 0) > 0;
}

export async function hasTenancy(userId: string): Promise<boolean> {
  const { count } = await db.from("tenants").select("id", { count: "exact", head: true }).eq("user_id", userId);
  return (count ?? 0) > 0;
}
