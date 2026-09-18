import { useEffect, useState } from "react";
import { Home, Wallet, FileText, Wrench, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { StatCard, EmptyState, SkeletonCard } from "@/components/ds";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { FormDialog, TextField, AreaField, SelectField, Field } from "./forms";
import {
  createPayment, createTicket, fetchMyTenancy, formatTzs, labelize, uploadManagementDocument,
  PAYMENT_METHODS, TICKET_CATEGORIES, type MyTenancy,
} from "@/lib/management-db";

const opts = (values: readonly string[]) => values.map((v) => ({ value: v, label: labelize(v) }));

export function TenantPortal() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MyTenancy | null>(null);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      setData(await fetchMyTenancy(user.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load your tenancy");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);

  if (loading) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2].map((i) => <SkeletonCard key={i} />)}</div>;

  if (!data) {
    return (
      <EmptyState
        icon={Home}
        title="No tenancy yet"
        description="When your landlord or property manager adds you as a tenant on Spaces, your home, rent and lease appear here."
      />
    );
  }

  const outstanding = data.charges.reduce(
    (s, c) => s + Math.max(Number(c.amount_due) - Number(c.amount_paid), 0), 0,
  );
  const nextDue = data.charges.filter((c) => c.status !== "paid").sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
  const openTickets = data.tickets.filter((t) => !["closed", "completed", "rejected"].includes(t.status));

  return (
    <div className="space-y-6">
      {/* MY HOME */}
      <div className="ds-card space-y-1 p-5">
        <p className="ds-caption">My home</p>
        <p className="font-display text-xl font-semibold">{data.property?.title ?? "Your home"}</p>
        <p className="text-sm text-muted-foreground">
          {data.unit ? `Unit ${data.unit.name}` : "Whole property"}
          {data.property?.district ? ` · ${data.property.district}` : ""}
          {data.property?.region ? `, ${data.property.region}` : ""}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Current rent" value={formatTzs(data.lease?.monthly_rent ?? data.unit?.rent_amount)} icon={Wallet} />
        <StatCard label="Amount due" value={formatTzs(outstanding)} icon={Wallet} tone={outstanding > 0 ? "danger" : "success"} />
        <StatCard label="Next due date" value={nextDue?.due_date ?? "—"} icon={FileText} tone="muted" />
        <StatCard label="Open requests" value={openTickets.length} icon={Wrench} tone="gold" />
      </div>

      {/* MY RENT */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl font-semibold">My rent</h2>
          {nextDue && <ProofOfPaymentForm tenancy={data} chargeId={nextDue.id} onDone={load} />}
        </div>
        {!data.charges.length ? (
          <EmptyState icon={Wallet} title="No rent records yet" description="Rent charges added by your landlord appear here." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {data.charges.map((c) => (
              <div key={c.id} className="ds-card space-y-1 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{formatTzs(c.amount_due)}</p>
                  <Badge variant={c.status === "paid" ? "default" : "secondary"}>{labelize(c.status)}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Due {c.due_date} · Paid {formatTzs(c.amount_paid)}</p>
              </div>
            ))}
          </div>
        )}
        {data.payments.length > 0 && (
          <div className="ds-card p-4">
            <p className="ds-caption mb-2">Previous payments</p>
            <ul className="space-y-2">
              {data.payments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>{formatTzs(p.amount)} · {labelize(p.method)}</span>
                  <Badge variant="secondary">{labelize(p.status)}</Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* MY LEASE */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">My lease</h2>
        {!data.lease ? (
          <EmptyState icon={FileText} title="No lease recorded" description="Your landlord has not added a lease for your tenancy yet." />
        ) : (
          <div className="ds-card space-y-1 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{formatTzs(data.lease.monthly_rent)} · {labelize(data.lease.payment_frequency)}</p>
              <Badge variant="secondary">{labelize(data.lease.status)}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {data.lease.start_date} → {data.lease.end_date ?? "open ended"} · Notice {data.lease.notice_period_days ?? 0} days
            </p>
            {data.lease.late_fee_type !== "none" && (
              <p className="text-sm text-muted-foreground">
                Late payment: {data.lease.late_fee_type === "percent" ? `${data.lease.late_fee_value ?? 0}%` : formatTzs(data.lease.late_fee_value)}
                {data.lease.late_fee_grace_days ? ` after ${data.lease.late_fee_grace_days} days` : ""}
              </p>
            )}
            {data.lease.special_terms && <p className="text-sm">{data.lease.special_terms}</p>}
          </div>
        )}
      </section>

      {/* MAINTENANCE */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl font-semibold">Maintenance</h2>
          <ReportIssueForm tenancy={data} onDone={load} />
        </div>
        {!data.tickets.length ? (
          <EmptyState icon={Wrench} title="No requests yet" description="Report a problem and your landlord or manager will see it here." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {data.tickets.map((t) => (
              <div key={t.id} className="ds-card space-y-1 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{labelize(t.category)}</p>
                  <Badge variant="secondary">{labelize(t.status)}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{t.description}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ProofOfPaymentForm({ tenancy, chargeId, onDone }: {
  tenancy: MyTenancy; chargeId: string; onDone: () => void;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("mobile_money");
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);

  return (
    <FormDialog
      open={open} onOpenChange={setOpen}
      title="Upload proof of payment"
      description="Your landlord or manager checks it and confirms. Nothing is confirmed automatically."
      trigger={<Button className="w-full rounded-full sm:w-auto"><Upload className="mr-1 h-4 w-4" /> Upload proof of payment</Button>}
      submitLabel="Send for verification"
      onSubmit={async () => {
        if (!user || !amount) { toast.error("Amount is required"); return; }
        const payment = await createPayment({
          charge_id: chargeId, lease_id: tenancy.lease?.id ?? null, tenant_id: tenancy.tenant.id,
          property_id: tenancy.tenant.property_id, owner_id: tenancy.tenant.owner_id,
          amount: Number(amount), method, reference: reference.trim() || null,
          paid_at: new Date().toISOString(), status: "pending_verification", recorded_by: user.id,
        });
        if (file) {
          await uploadManagementDocument({
            file, userId: user.id, ownerId: tenancy.tenant.owner_id, docType: "proof_of_payment",
            propertyId: tenancy.tenant.property_id, tenantId: tenancy.tenant.id,
            chargeId, paymentId: payment.id,
          });
        }
        toast.success("Sent — pending verification"); setOpen(false); setAmount(""); setFile(null); onDone();
      }}
    >
      <TextField label="Amount paid (TZS)" value={amount} onChange={setAmount} type="number" />
      <SelectField label="Payment method" value={method} onChange={setMethod} options={opts(PAYMENT_METHODS)} />
      <TextField label="Reference" value={reference} onChange={setReference} placeholder="Mobile money or bank reference" />
      <Field label="Proof (photo or PDF)">
        <Input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </Field>
    </FormDialog>
  );
}

function ReportIssueForm({ tenancy, onDone }: { tenancy: MyTenancy; onDone: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("plumbing");
  const [priority, setPriority] = useState("normal");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  return (
    <FormDialog
      open={open} onOpenChange={setOpen}
      title="Report an issue"
      trigger={<Button variant="outline" className="w-full rounded-full sm:w-auto">Report an issue</Button>}
      submitLabel="Send request"
      onSubmit={async () => {
        if (!user || !description.trim()) { toast.error("Please describe the problem"); return; }
        const ticket = await createTicket({
          property_id: tenancy.tenant.property_id, unit_id: tenancy.tenant.unit_id,
          lease_id: tenancy.lease?.id ?? null, tenant_id: tenancy.tenant.id,
          owner_id: tenancy.tenant.owner_id, reported_by: user.id,
          category, priority, description: description.trim(), status: "new",
        });
        if (file) {
          await uploadManagementDocument({
            file, userId: user.id, ownerId: tenancy.tenant.owner_id, docType: "maintenance",
            propertyId: tenancy.tenant.property_id, tenantId: tenancy.tenant.id, ticketId: ticket.id,
          });
        }
        toast.success("Request sent"); setOpen(false); setDescription(""); setFile(null); onDone();
      }}
    >
      <SelectField label="Category" value={category} onChange={setCategory} options={opts(TICKET_CATEGORIES)} />
      <SelectField label="Priority" value={priority} onChange={setPriority} options={opts(["low", "normal", "high", "urgent"])} />
      <AreaField label="What is the problem?" value={description} onChange={setDescription} />
      <Field label="Photo or video (optional)">
        <Input type="file" accept="image/*,video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </Field>
    </FormDialog>
  );
}
