import { useEffect, useMemo, useState } from "react";
import {
  Building2, Users, FileText, Wallet, Wrench, HardHat, Plus, CheckCircle2, XCircle, Home,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard, EmptyState, SkeletonCard } from "@/components/ds";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { toast } from "sonner";
import { FormDialog, TextField, AreaField, SelectField } from "./forms";
import {
  buildMetrics, createCharge, createContractor, createLease, createPayment, createTenant, createTicket,
  createUnit, fetchCharges, fetchContractors, fetchLeases, fetchManagedProperties, fetchPayments,
  fetchTenants, fetchTickets, fetchUnits, fetchDocuments, signedDocumentUrl, formatTzs, labelize,
  reviewPayment, updateTicket, updateUnit, type ManagementDocument,
  LEASE_STATUSES, OCCUPANCY_STATUSES, PAYMENT_METHODS, TICKET_CATEGORIES, TICKET_STATUSES,
  type Contractor, type Lease, type ManagedProperty, type MaintenanceTicket, type RentCharge,
  type RentPayment, type Tenant, type Unit,
} from "@/lib/management-db";

const opts = (values: readonly string[]) => values.map((v) => ({ value: v, label: labelize(v) }));

export function ManagementCenter() {
  const { user } = useAuth();
  const { t: tr } = useI18n();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<ManagementDocument[]>([]);
  const [properties, setProperties] = useState<ManagedProperty[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [charges, setCharges] = useState<RentCharge[]>([]);
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const props = await fetchManagedProperties(user.id);
      setProperties(props);
      const ids = props.map((p) => p.id);
      const [u, t, l, c, p, k, co, docs] = await Promise.all([
        fetchUnits(ids), fetchTenants(ids), fetchLeases(ids), fetchCharges(ids),
        fetchPayments(ids), fetchTickets(ids), fetchContractors(user.id), fetchDocuments(ids),
      ]);
      setUnits(u); setTenants(t); setLeases(l); setCharges(c);
      setPayments(p); setTickets(k); setContractors(co); setDocuments(docs);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load management records");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);

  const metrics = useMemo(
    () => buildMetrics({ properties, units, tenants, charges, tickets, payments }),
    [properties, units, tenants, charges, tickets, payments],
  );

  const propOptions = properties.map((p) => ({ value: p.id, label: p.title }));
  const ownerFor = (propertyId: string) => properties.find((p) => p.id === propertyId)?.owner_id ?? "";
  const propTitle = (id: string) => properties.find((p) => p.id === id)?.title ?? "Property";
  const unitName = (id?: string | null) => units.find((u) => u.id === id)?.name ?? "Whole property";
  const tenantName = (id?: string | null) => tenants.find((t) => t.id === id)?.full_name ?? "—";

  if (loading) {
    return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}</div>;
  }

  if (!properties.length) {
    return (
      <EmptyState
        icon={Building2}
        title="No properties to manage yet"
        description="Add a property to Spaces first — then you can manage units, tenants, rent and maintenance here."
        action={{ label: "Add a property", href: "/upload" }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={tr("mgmt.properties")} value={metrics.properties} icon={Building2} />
        <StatCard label={tr("mgmt.unitsShort")} value={metrics.units} icon={Home} tone="muted" />
        <StatCard label={tr("mgmt.occupied")} value={metrics.occupied} icon={Users} tone="success" />
        <StatCard label={tr("mgmt.vacant")} value={metrics.vacant} icon={Home} tone="gold" />
        <StatCard label={tr("mgmt.expectedRent")} value={formatTzs(metrics.expectedRent)} icon={Wallet} />
        <StatCard label={tr("mgmt.collectedRent")} value={formatTzs(metrics.collectedRent)} icon={Wallet} tone="success" />
        <StatCard label={tr("mgmt.outstandingRent")} value={formatTzs(metrics.outstandingRent)} icon={Wallet} tone="danger" />
        <StatCard label={tr("mgmt.openMaintenance")} value={metrics.openMaintenance} icon={Wrench} tone="muted" />
      </div>

      <Tabs defaultValue="units">
        <div className="-mx-1 overflow-x-auto px-1">
          <TabsList className="w-max">
            <TabsTrigger value="units">{tr("mgmt.unitsShort")}</TabsTrigger>
            <TabsTrigger value="tenants">{tr("mgmt.tenants")}</TabsTrigger>
            <TabsTrigger value="leases">{tr("mgmt.leases")}</TabsTrigger>
            <TabsTrigger value="rent">{tr("mgmt.rent")}</TabsTrigger>
            <TabsTrigger value="maintenance">{tr("mgmt.maintenance")}</TabsTrigger>
            <TabsTrigger value="contractors">{tr("mgmt.contractors")}</TabsTrigger>
            <TabsTrigger value="documents">{tr("mgmt.documents")}</TabsTrigger>
            <TabsTrigger value="reports">{tr("mgmt.reports")}</TabsTrigger>
          </TabsList>
        </div>

        {/* UNITS ---------------------------------------------------------- */}
        <TabsContent value="units" className="mt-4 space-y-4">
          <UnitForm properties={propOptions} ownerFor={ownerFor} onDone={load} />
          {!units.length ? (
            <EmptyState icon={Home} title="No units yet" description="Add units for buildings with several rentable spaces. Single properties work without units." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {units.map((u) => (
                <div key={u.id} className="ds-card space-y-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{u.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{propTitle(u.property_id)}</p>
                    </div>
                    <Badge variant="secondary">{labelize(u.occupancy_status)}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {u.bedrooms ?? 0} bed · {u.bathrooms ?? 0} bath · {formatTzs(u.rent_amount)}/month
                  </p>
                  <SelectField
                    label="Occupancy"
                    value={u.occupancy_status}
                    options={opts(OCCUPANCY_STATUSES)}
                    onChange={async (v) => {
                      try {
                        await updateUnit(u.id, { occupancy_status: v });
                        toast.success("Unit updated");
                        void load();
                      } catch (e) { toast.error(e instanceof Error ? e.message : "Could not update"); }
                    }}
                  />
                  {u.occupancy_status === "available" && (
                    <p className="text-xs text-muted-foreground">
                      Ready to re-list — publish it from your property page when you are ready.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TENANTS -------------------------------------------------------- */}
        <TabsContent value="tenants" className="mt-4 space-y-4">
          <TenantForm properties={propOptions} units={units} ownerFor={ownerFor} onDone={load} />
          {!tenants.length ? (
            <EmptyState icon={Users} title="No tenants yet" description="Add your first tenant to start tracking rent, leases and maintenance." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {tenants.map((t) => (
                <div key={t.id} className="ds-card space-y-1 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="min-w-0 truncate font-semibold">{t.full_name}</p>
                    <Badge variant="secondary">{labelize(t.status)}</Badge>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{propTitle(t.property_id)} · {unitName(t.unit_id)}</p>
                  {t.phone && <p className="text-sm">{t.phone}</p>}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* LEASES --------------------------------------------------------- */}
        <TabsContent value="leases" className="mt-4 space-y-4">
          <LeaseForm properties={propOptions} units={units} tenants={tenants} ownerFor={ownerFor} onDone={load} />
          {!leases.length ? (
            <EmptyState icon={FileText} title="No leases yet" description="Record a lease to track rent, renewal dates and late-payment terms." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {leases.map((l) => (
                <div key={l.id} className="ds-card space-y-1 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="min-w-0 truncate font-semibold">{tenantName(l.tenant_id)}</p>
                    <Badge variant="secondary">{labelize(l.status)}</Badge>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{propTitle(l.property_id)} · {unitName(l.unit_id)}</p>
                  <p className="text-sm">{formatTzs(l.monthly_rent)} · {labelize(l.payment_frequency)}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.start_date} → {l.end_date ?? "open ended"}
                    {l.late_fee_type !== "none" && ` · late fee ${l.late_fee_type === "percent" ? `${l.late_fee_value ?? 0}%` : formatTzs(l.late_fee_value)}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* RENT ----------------------------------------------------------- */}
        <TabsContent value="rent" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <ChargeForm leases={leases} tenants={tenants} onDone={load} />
            <PaymentForm charges={charges} leases={leases} onDone={load} />
          </div>

          {payments.some((p) => p.status === "pending_verification") && (
            <div className="space-y-3">
              <h3 className="font-semibold">Payments awaiting verification</h3>
              {payments.filter((p) => p.status === "pending_verification").map((p) => (
                <div key={p.id} className="ds-card flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{tenantName(p.tenant_id)} · {formatTzs(p.amount)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {labelize(p.method)}{p.reference ? ` · ${p.reference}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" className="rounded-full" onClick={async () => {
                      await reviewPayment(p.id, true); toast.success("Payment approved"); void load();
                    }}><CheckCircle2 className="mr-1 h-4 w-4" /> Approve</Button>
                    <Button size="sm" variant="outline" className="rounded-full" onClick={async () => {
                      await reviewPayment(p.id, false); toast.success("Payment rejected"); void load();
                    }}><XCircle className="mr-1 h-4 w-4" /> Reject</Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!charges.length ? (
            <EmptyState icon={Wallet} title="No rent records yet" description="Create a rent charge for a lease to start tracking what is due, paid and outstanding." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {charges.map((c) => (
                <div key={c.id} className="ds-card space-y-1 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="min-w-0 truncate font-semibold">{tenantName(c.tenant_id)}</p>
                    <Badge variant={c.status === "paid" ? "default" : "secondary"}>{labelize(c.status)}</Badge>
                  </div>
                  <p className="text-sm">{formatTzs(c.amount_due)} due {c.due_date}</p>
                  <p className="text-xs text-muted-foreground">
                    Paid {formatTzs(c.amount_paid)} · Outstanding {formatTzs(Math.max(Number(c.amount_due) - Number(c.amount_paid), 0))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* MAINTENANCE ---------------------------------------------------- */}
        <TabsContent value="maintenance" className="mt-4 space-y-4">
          <TicketForm properties={propOptions} units={units} tenants={tenants} ownerFor={ownerFor} onDone={load} />
          {!tickets.length ? (
            <EmptyState icon={Wrench} title="No maintenance requests" description="Requests raised by you or by a tenant appear here." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {tickets.map((k) => (
                <div key={k.id} className="ds-card space-y-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="min-w-0 truncate font-semibold">{labelize(k.category)} · {propTitle(k.property_id)}</p>
                    <Badge variant="secondary">{labelize(k.status)}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{k.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Priority {labelize(k.priority)} · Estimated {formatTzs(k.estimated_cost)} · Approved {formatTzs(k.approved_cost)} · Actual {formatTzs(k.actual_cost)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Contractor: {contractors.find((c) => c.id === k.contractor_id)?.name ?? "Not assigned"}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <SelectField
                      label="Status" value={k.status} options={opts(TICKET_STATUSES)}
                      onChange={async (v) => {
                        await updateTicket(k.id, { status: v, closed_at: v === "closed" ? new Date().toISOString() : null });
                        toast.success("Ticket updated"); void load();
                      }}
                    />
                    <SelectField
                      label="Contractor" value={k.contractor_id ?? "none"}
                      options={[{ value: "none", label: "Not assigned" }, ...contractors.map((c) => ({ value: c.id, label: c.name }))]}
                      onChange={async (v) => {
                        await updateTicket(k.id, {
                          contractor_id: v === "none" ? null : v,
                          status: v === "none" ? k.status : (k.status === "new" ? "assigned" : k.status),
                        });
                        toast.success("Contractor updated"); void load();
                      }}
                    />
                  </div>
                  <TicketCostForm ticket={k} onDone={load} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* CONTRACTORS ---------------------------------------------------- */}
        <TabsContent value="contractors" className="mt-4 space-y-4">
          <ContractorForm onDone={load} />
          {!contractors.length ? (
            <EmptyState icon={HardHat} title="No contractors yet" description="Add the plumbers, electricians and handymen you work with so you can assign them to jobs." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {contractors.map((c) => (
                <div key={c.id} className="ds-card space-y-1 p-4">
                  <p className="truncate font-semibold">{c.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {[c.company, c.service_category && labelize(c.service_category), c.location].filter(Boolean).join(" · ") || "—"}
                  </p>
                  {c.phone && <p className="text-sm">{c.phone}</p>}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* DOCUMENTS ------------------------------------------------------ */}
        <TabsContent value="documents" className="mt-4 space-y-4">
          {!documents.length ? (
            <EmptyState icon={FileText} title={tr("mgmt.noDocuments")} description={tr("mgmt.noDocumentsBody")} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {documents.map((d) => (
                <div key={d.id} className="ds-card space-y-2 p-4">
                  <p className="truncate font-semibold">{d.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[labelize(d.doc_type), propTitle(d.property_id ?? "")].filter(Boolean).join(" · ")}
                  </p>
                  <Button
                    size="sm" variant="outline" className="rounded-lg"
                    onClick={async () => {
                      const url = await signedDocumentUrl(d.storage_path);
                      if (url) window.open(url, "_blank", "noopener");
                      else toast.error("Could not open this document");
                    }}
                  >
                    {tr("mgmt.openDocument")}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* REPORTS -------------------------------------------------------- */}
        <TabsContent value="reports" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">{tr("mgmt.reportsNote")}</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label={tr("mgmt.tenants")} value={metrics.tenants} icon={Users} />
            <StatCard label={tr("mgmt.activeLeases")} value={leases.filter((l) => l.status === "active").length} icon={FileText} tone="muted" />
            <StatCard
              label={tr("mgmt.collectionRate")}
              value={metrics.expectedRent > 0 ? `${Math.round((metrics.collectedRent / metrics.expectedRent) * 100)}%` : "—"}
              icon={Wallet}
              tone="success"
            />
            <StatCard label={tr("mgmt.openMaintenance")} value={metrics.openMaintenance} icon={Wrench} tone="danger" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* --------------------------------------------------------------------- */
/* Forms                                                                   */
/* --------------------------------------------------------------------- */

function AddButton({ label }: { label: string }) {
  return <Button className="w-full rounded-full sm:w-auto"><Plus className="mr-1 h-4 w-4" /> {label}</Button>;
}

function UnitForm({ properties, ownerFor, onDone }: {
  properties: { value: string; label: string }[];
  ownerFor: (id: string) => string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [propertyId, setPropertyId] = useState(properties[0]?.value ?? "");
  const [name, setName] = useState("");
  const [unitType, setUnitType] = useState("apartment");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [rent, setRent] = useState("");
  const [deposit, setDeposit] = useState("");
  const [service, setService] = useState("");

  return (
    <FormDialog
      open={open} onOpenChange={setOpen}
      title="Add unit" description="For buildings with several rentable units."
      trigger={<AddButton label="Add unit" />} submitLabel="Add unit"
      onSubmit={async () => {
        if (!propertyId || !name.trim()) { toast.error("Property and unit name are required"); return; }
        await createUnit({
          property_id: propertyId, owner_id: ownerFor(propertyId), name: name.trim(), unit_type: unitType,
          bedrooms: bedrooms ? Number(bedrooms) : null, bathrooms: bathrooms ? Number(bathrooms) : null,
          rent_amount: rent ? Number(rent) : null, deposit_amount: deposit ? Number(deposit) : null,
          service_charge: service ? Number(service) : null,
        });
        toast.success("Unit added"); setOpen(false); setName(""); onDone();
      }}
    >
      <SelectField label="Property" value={propertyId} onChange={setPropertyId} options={properties} />
      <TextField label="Unit name or number" value={name} onChange={setName} placeholder="A01" />
      <SelectField label="Unit type" value={unitType} onChange={setUnitType}
        options={opts(["apartment", "house", "room", "office", "shop", "warehouse", "other"])} />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Bedrooms" value={bedrooms} onChange={setBedrooms} type="number" />
        <TextField label="Bathrooms" value={bathrooms} onChange={setBathrooms} type="number" />
      </div>
      <TextField label="Rent per month (TZS)" value={rent} onChange={setRent} type="number" />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Deposit (TZS)" value={deposit} onChange={setDeposit} type="number" />
        <TextField label="Service charge (TZS)" value={service} onChange={setService} type="number" />
      </div>
    </FormDialog>
  );
}

function TenantForm({ properties, units, ownerFor, onDone }: {
  properties: { value: string; label: string }[];
  units: Unit[];
  ownerFor: (id: string) => string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [propertyId, setPropertyId] = useState(properties[0]?.value ?? "");
  const [unitId, setUnitId] = useState("none");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const unitOptions = [{ value: "none", label: "Whole property" },
    ...units.filter((u) => u.property_id === propertyId).map((u) => ({ value: u.id, label: u.name }))];

  return (
    <FormDialog
      open={open} onOpenChange={setOpen}
      title="Add tenant" trigger={<AddButton label="Add tenant" />} submitLabel="Add tenant"
      onSubmit={async () => {
        if (!propertyId || !fullName.trim()) { toast.error("Property and full name are required"); return; }
        await createTenant({
          property_id: propertyId, owner_id: ownerFor(propertyId),
          unit_id: unitId === "none" ? null : unitId, full_name: fullName.trim(),
          phone: phone.trim() || null, email: email.trim() || null,
          emergency_name: emergencyName.trim() || null, emergency_phone: emergencyPhone.trim() || null,
        });
        toast.success("Tenant added"); setOpen(false); setFullName(""); setPhone(""); setEmail(""); onDone();
      }}
    >
      <SelectField label="Property" value={propertyId} onChange={(v) => { setPropertyId(v); setUnitId("none"); }} options={properties} />
      <SelectField label="Unit" value={unitId} onChange={setUnitId} options={unitOptions} />
      <TextField label="Full name" value={fullName} onChange={setFullName} />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Phone" value={phone} onChange={setPhone} placeholder="0754 000 000" />
        <TextField label="Email" value={email} onChange={setEmail} type="email" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Emergency contact" value={emergencyName} onChange={setEmergencyName} />
        <TextField label="Emergency phone" value={emergencyPhone} onChange={setEmergencyPhone} />
      </div>
    </FormDialog>
  );
}

function LeaseForm({ properties, units, tenants, ownerFor, onDone }: {
  properties: { value: string; label: string }[];
  units: Unit[]; tenants: Tenant[];
  ownerFor: (id: string) => string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [tenantId, setTenantId] = useState(tenants[0]?.id ?? "");
  const tenant = tenants.find((t) => t.id === tenantId);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [rent, setRent] = useState("");
  const [deposit, setDeposit] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [status, setStatus] = useState("active");
  const [lateType, setLateType] = useState("none");
  const [lateValue, setLateValue] = useState("");
  const [graceDays, setGraceDays] = useState("0");
  const [terms, setTerms] = useState("");

  if (!tenants.length) return null;

  return (
    <FormDialog
      open={open} onOpenChange={setOpen}
      title="Create lease" description="Late-payment terms are set per lease — there is no fixed platform charge."
      trigger={<AddButton label="Create lease" />} submitLabel="Create lease"
      onSubmit={async () => {
        if (!tenant || !start) { toast.error("Tenant and start date are required"); return; }
        await createLease({
          property_id: tenant.property_id, unit_id: tenant.unit_id, tenant_id: tenant.id,
          owner_id: ownerFor(tenant.property_id), start_date: start, end_date: end || null,
          monthly_rent: rent ? Number(rent) : 0, deposit_amount: deposit ? Number(deposit) : null,
          payment_frequency: frequency, status,
          late_fee_type: lateType, late_fee_value: lateType === "none" ? null : Number(lateValue || 0),
          late_fee_grace_days: Number(graceDays || 0), special_terms: terms.trim() || null,
        });
        toast.success("Lease created"); setOpen(false); onDone();
      }}
    >
      <SelectField label="Tenant" value={tenantId} onChange={setTenantId}
        options={tenants.map((t) => ({ value: t.id, label: `${t.full_name} · ${units.find((u) => u.id === t.unit_id)?.name ?? "whole property"}` }))} />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Start date" value={start} onChange={setStart} type="date" />
        <TextField label="End date" value={end} onChange={setEnd} type="date" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Monthly rent (TZS)" value={rent} onChange={setRent} type="number" />
        <TextField label="Deposit (TZS)" value={deposit} onChange={setDeposit} type="number" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField label="Payment frequency" value={frequency} onChange={setFrequency}
          options={opts(["monthly", "quarterly", "biannual", "annual"])} />
        <SelectField label="Status" value={status} onChange={setStatus} options={opts(LEASE_STATUSES)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <SelectField label="Late fee" value={lateType} onChange={setLateType}
          options={[{ value: "none", label: "None" }, { value: "fixed", label: "Fixed amount" }, { value: "percent", label: "Percent of rent" }]} />
        <TextField label="Late fee value" value={lateValue} onChange={setLateValue} type="number" />
        <TextField label="Grace days" value={graceDays} onChange={setGraceDays} type="number" />
      </div>
      <AreaField label="Special terms" value={terms} onChange={setTerms} />
    </FormDialog>
  );
}

function ChargeForm({ leases, tenants, onDone }: { leases: Lease[]; tenants: Tenant[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [leaseId, setLeaseId] = useState(leases[0]?.id ?? "");
  const lease = leases.find((l) => l.id === leaseId);
  const [due, setDue] = useState("");
  const [amount, setAmount] = useState("");
  if (!leases.length) return null;

  return (
    <FormDialog
      open={open} onOpenChange={setOpen}
      title="Add rent charge" trigger={<AddButton label="Add rent charge" />} submitLabel="Add charge"
      onSubmit={async () => {
        if (!lease || !due) { toast.error("Lease and due date are required"); return; }
        await createCharge({
          lease_id: lease.id, tenant_id: lease.tenant_id, property_id: lease.property_id,
          unit_id: lease.unit_id, owner_id: lease.owner_id, due_date: due,
          amount_due: Number(amount || lease.monthly_rent),
        });
        toast.success("Rent charge added"); setOpen(false); onDone();
      }}
    >
      <SelectField label="Lease" value={leaseId} onChange={setLeaseId}
        options={leases.map((l) => ({ value: l.id, label: tenants.find((t) => t.id === l.tenant_id)?.full_name ?? "Lease" }))} />
      <TextField label="Due date" value={due} onChange={setDue} type="date" />
      <TextField label="Amount due (TZS)" value={amount} onChange={setAmount} type="number"
        placeholder={lease ? String(lease.monthly_rent) : ""} />
    </FormDialog>
  );
}

function PaymentForm({ charges, leases, onDone }: { charges: RentCharge[]; leases: Lease[]; onDone: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [chargeId, setChargeId] = useState(charges[0]?.id ?? "");
  const charge = charges.find((c) => c.id === chargeId);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("mobile_money");
  const [reference, setReference] = useState("");
  if (!charges.length) return null;

  return (
    <FormDialog
      open={open} onOpenChange={setOpen}
      title="Record a payment" description="Recorded by you and marked as received — no automatic bank checking."
      trigger={<Button variant="outline" className="w-full rounded-full sm:w-auto">Record payment</Button>}
      submitLabel="Record payment"
      onSubmit={async () => {
        if (!charge || !amount) { toast.error("Charge and amount are required"); return; }
        const lease = leases.find((l) => l.id === charge.lease_id);
        await createPayment({
          charge_id: charge.id, lease_id: charge.lease_id, tenant_id: charge.tenant_id,
          property_id: charge.property_id, owner_id: charge.owner_id, amount: Number(amount),
          method, reference: reference.trim() || null, paid_at: new Date().toISOString(),
          status: "approved", recorded_by: user?.id ?? null, currency: lease?.currency ?? "TZS",
        });
        toast.success("Payment recorded"); setOpen(false); setAmount(""); onDone();
      }}
    >
      <SelectField label="Rent charge" value={chargeId} onChange={setChargeId}
        options={charges.map((c) => ({ value: c.id, label: `${c.due_date} · ${formatTzs(c.amount_due)}` }))} />
      <TextField label="Amount (TZS)" value={amount} onChange={setAmount} type="number" />
      <SelectField label="Method" value={method} onChange={setMethod} options={opts(PAYMENT_METHODS)} />
      <TextField label="Reference" value={reference} onChange={setReference} placeholder="Mobile money or bank reference" />
    </FormDialog>
  );
}

function TicketForm({ properties, units, tenants, ownerFor, onDone }: {
  properties: { value: string; label: string }[];
  units: Unit[]; tenants: Tenant[];
  ownerFor: (id: string) => string;
  onDone: () => void;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [propertyId, setPropertyId] = useState(properties[0]?.value ?? "");
  const [unitId, setUnitId] = useState("none");
  const [tenantId, setTenantId] = useState("none");
  const [category, setCategory] = useState("plumbing");
  const [priority, setPriority] = useState("normal");
  const [description, setDescription] = useState("");

  return (
    <FormDialog
      open={open} onOpenChange={setOpen}
      title="New maintenance request" trigger={<AddButton label="New maintenance request" />} submitLabel="Create request"
      onSubmit={async () => {
        if (!propertyId || !description.trim()) { toast.error("Property and description are required"); return; }
        await createTicket({
          property_id: propertyId, owner_id: ownerFor(propertyId),
          unit_id: unitId === "none" ? null : unitId, tenant_id: tenantId === "none" ? null : tenantId,
          category, priority, description: description.trim(), reported_by: user?.id ?? null,
        });
        toast.success("Request created"); setOpen(false); setDescription(""); onDone();
      }}
    >
      <SelectField label="Property" value={propertyId} onChange={(v) => { setPropertyId(v); setUnitId("none"); setTenantId("none"); }} options={properties} />
      <SelectField label="Unit" value={unitId} onChange={setUnitId}
        options={[{ value: "none", label: "Whole property" }, ...units.filter((u) => u.property_id === propertyId).map((u) => ({ value: u.id, label: u.name }))]} />
      <SelectField label="Tenant" value={tenantId} onChange={setTenantId}
        options={[{ value: "none", label: "Not tenant related" }, ...tenants.filter((t) => t.property_id === propertyId).map((t) => ({ value: t.id, label: t.full_name }))]} />
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField label="Category" value={category} onChange={setCategory} options={opts(TICKET_CATEGORIES)} />
        <SelectField label="Priority" value={priority} onChange={setPriority} options={opts(["low", "normal", "high", "urgent"])} />
      </div>
      <AreaField label="Description" value={description} onChange={setDescription} />
    </FormDialog>
  );
}

function TicketCostForm({ ticket, onDone }: { ticket: MaintenanceTicket; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [estimated, setEstimated] = useState(ticket.estimated_cost?.toString() ?? "");
  const [approved, setApproved] = useState(ticket.approved_cost?.toString() ?? "");
  const [actual, setActual] = useState(ticket.actual_cost?.toString() ?? "");
  const [notes, setNotes] = useState(ticket.notes ?? "");

  return (
    <FormDialog
      open={open} onOpenChange={setOpen}
      title="Costs and notes"
      trigger={<Button variant="outline" size="sm" className="w-full rounded-full">Costs and notes</Button>}
      onSubmit={async () => {
        await updateTicket(ticket.id, {
          estimated_cost: estimated ? Number(estimated) : null,
          approved_cost: approved ? Number(approved) : null,
          actual_cost: actual ? Number(actual) : null,
          notes: notes.trim() || null,
        });
        toast.success("Ticket updated"); setOpen(false); onDone();
      }}
    >
      <TextField label="Estimated cost (TZS)" value={estimated} onChange={setEstimated} type="number" />
      <TextField label="Approved cost (TZS)" value={approved} onChange={setApproved} type="number" />
      <TextField label="Actual cost (TZS)" value={actual} onChange={setActual} type="number" />
      <AreaField label="Notes" value={notes} onChange={setNotes} />
    </FormDialog>
  );
}

function ContractorForm({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState("plumbing");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <FormDialog
      open={open} onOpenChange={setOpen}
      title="Add contractor" trigger={<AddButton label="Add contractor" />} submitLabel="Add contractor"
      onSubmit={async () => {
        if (!user || !name.trim()) { toast.error("Name is required"); return; }
        await createContractor({
          owner_id: user.id, name: name.trim(), company: company.trim() || null,
          phone: phone.trim() || null, service_category: category,
          location: location.trim() || null, notes: notes.trim() || null,
        });
        toast.success("Contractor added"); setOpen(false); setName(""); onDone();
      }}
    >
      <TextField label="Name" value={name} onChange={setName} />
      <TextField label="Company" value={company} onChange={setCompany} />
      <TextField label="Phone" value={phone} onChange={setPhone} placeholder="0754 000 000" />
      <SelectField label="Service" value={category} onChange={setCategory} options={opts(TICKET_CATEGORIES)} />
      <TextField label="Location" value={location} onChange={setLocation} placeholder="Dar es Salaam" />
      <AreaField label="Notes" value={notes} onChange={setNotes} />
    </FormDialog>
  );
}
