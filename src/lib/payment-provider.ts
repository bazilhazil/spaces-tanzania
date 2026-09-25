// Generic payment-provider boundary. A real provider (e.g. Selcom) is plugged in
// here later; the rest of the financial system only talks to this interface.
// No provider is connected: nothing here makes external calls or marks a payment paid.

export type ProviderStatus = "not_connected" | "connected";

export type StartPaymentResult =
  | { ok: true; redirectUrl?: string; providerTransactionId?: string }
  | { ok: false; reason: "provider_not_connected" | "failed"; message?: string };

export interface PaymentProvider {
  id: string;
  name: string;
  status: ProviderStatus;
  startPayment(input: { paymentItemId: string; dealId: string; amount: number; currency: string }): Promise<StartPaymentResult>;
}

const notConnected: PaymentProvider = {
  id: "none",
  name: "Not connected",
  status: "not_connected",
  async startPayment() {
    return { ok: false, reason: "provider_not_connected" };
  },
};

export function activePaymentProvider(): PaymentProvider {
  return notConnected;
}
