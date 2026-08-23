// SPACES payments — checkout intents and pricing metadata.
// Payment gateways are NOT connected yet. This module deliberately contains no
// simulation: nothing here marks a payment as successful. Invoices and
// subscriptions are read from the database (see @/lib/billing-db).

import { PAYMENT_METHODS, type PaymentMethodId } from "./billing-mock";

export type PaymentPurpose = "subscription" | "boost" | "verification";

export type PaymentIntent = {
  purpose: PaymentPurpose;
  reference: string; // plan id, addon id, verification id
  label: string;
  amountTZS: number;
  durationDays?: number; // for boosts
};

/** No live payment provider is connected yet. */
export function isGatewayConfigured(): boolean {
  return false;
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
