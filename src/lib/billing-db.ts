// SPACES billing — live data from the database (single source of truth).
// Payment gateways are not connected yet, so nothing here ever writes a
// payment; the UI reads whatever the backend has recorded.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PaymentMethodId } from "@/lib/billing-mock";

export type PaymentRow = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  reference: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
};

export type SubscriptionRow = {
  id: string;
  plan: string;
  status: string;
  billing_cycle: string;
  current_period_start: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

export type InvoiceLike = {
  id: string;
  date: string;
  amountTZS: number;
  description: string;
  status: string;
  method: PaymentMethodId | null;
};

export function paymentToInvoice(p: PaymentRow): InvoiceLike {
  const meta = p.metadata ?? {};
  return {
    id: p.reference ?? p.id.slice(0, 8).toUpperCase(),
    date: p.created_at,
    amountTZS: Number(p.amount) || 0,
    description: (typeof meta.label === "string" && meta.label) || p.provider,
    status: p.status,
    method: (typeof meta.method === "string" ? (meta.method as PaymentMethodId) : null),
  };
}

export function useMyPayments() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("payments")
        .select("id, amount, currency, status, provider, reference, created_at, metadata")
        .order("created_at", { ascending: false });
      if (!active) return;
      setRows((data as PaymentRow[] | null) ?? []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  return { payments: rows, invoices: rows.map(paymentToInvoice), loading };
}

export function useMySubscription() {
  const [sub, setSub] = useState<SubscriptionRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("id, plan, status, billing_cycle, current_period_start, current_period_end, cancel_at_period_end")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!active) return;
      setSub((data as SubscriptionRow | null) ?? null);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  return { subscription: sub, loading };
}

export function useMyListingCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return;
      const { count: c } = await supabase
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", uid);
      if (active) setCount(c ?? 0);
    })();
    return () => { active = false; };
  }, []);

  return count;
}
