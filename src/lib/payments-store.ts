// SPACES payments — client-side store.
// Payment gateway integration is not yet live; this module simulates the
// end-to-end flow (checkout → invoice → history) so the UI can be built,
// tested and previewed exactly as it will behave once gateways go live.

import { INVOICES, PAYMENT_METHODS, type Invoice, type PaymentMethodId } from "./billing-mock";

const KEY = "spaces.payments.invoices.v1";
const CFG_KEY = "spaces.payments.gatewayConfigured.v1";

export type PaymentPurpose =
  | "subscription"
  | "boost"
  | "verification";

export type PaymentIntent = {
  purpose: PaymentPurpose;
  reference: string; // plan id, addon id, verification id
  label: string;
  amountTZS: number;
  durationDays?: number; // for boosts
};

function read(): Invoice[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Invoice[];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function write(list: Invoice[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("spaces:invoices-changed"));
}

export function isGatewayConfigured(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(CFG_KEY) === "1";
}

export function setGatewayConfigured(v: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CFG_KEY, v ? "1" : "0");
  window.dispatchEvent(new Event("spaces:gateway-changed"));
}

export function listInvoices(): Invoice[] {
  return [...read(), ...INVOICES];
}

export function recordPayment(intent: PaymentIntent, method: PaymentMethodId): Invoice {
  const now = new Date();
  const id = `INV-${now.getFullYear()}-${String(now.getTime()).slice(-4)}`;
  const inv: Invoice = {
    id,
    date: now.toISOString().slice(0, 10),
    amountTZS: intent.amountTZS,
    description: intent.label,
    status: "paid",
    method,
  };
  write([inv, ...read()]);
  return inv;
}

export function methodName(id: PaymentMethodId | null | undefined): string {
  if (!id) return "—";
  return PAYMENT_METHODS.find((m) => m.id === id)?.name ?? id;
}

export type VerificationFee = {
  id: "identity" | "property" | "business";
  name: string;
  description: string;
  priceTZS: number;
};

export const VERIFICATION_FEES: VerificationFee[] = [
  { id: "identity", name: "Identity Verification", description: "Personal ID review + trust badge.", priceTZS: 15_000 },
  { id: "property", name: "Property Verification", description: "Title, ownership & photo review.", priceTZS: 35_000 },
  { id: "business", name: "Business Verification", description: "Agency license & business review.", priceTZS: 50_000 },
];
