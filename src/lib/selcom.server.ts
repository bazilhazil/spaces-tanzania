// Server-only Selcom payment gateway client.
// Credentials live exclusively in server secrets and never reach the browser.

const DEFAULT_BASE_URL = "https://apigw.selcommobile.com/v1";

type SelcomConfig = {
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  vendorId: string;
};

export function selcomConfig(): SelcomConfig | null {
  const apiKey = process.env["SELCOM_API_KEY"];
  const apiSecret = process.env["SELCOM_API_SECRET"];
  const vendorId = process.env["SELCOM_VENDOR_ID"];
  if (!apiKey || !apiSecret || !vendorId) return null;
  return {
    baseUrl: (process.env["SELCOM_BASE_URL"] || DEFAULT_BASE_URL).replace(/\/+$/, ""),
    apiKey,
    apiSecret,
    vendorId,
  };
}

export function selcomConfigured(): boolean {
  return selcomConfig() !== null;
}

function b64(input: string): string {
  return Buffer.from(input, "utf8").toString("base64");
}

function unb64(input: string): string {
  try {
    return Buffer.from(input, "base64").toString("utf8");
  } catch {
    return input;
  }
}

function timestamp(): string {
  // Selcom expects ISO-8601 with timezone offset.
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}+00:00`
  );
}

async function digest(signedString: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedString));
  return Buffer.from(new Uint8Array(sig)).toString("base64");
}

async function selcomRequest(
  cfg: SelcomConfig,
  method: "GET" | "POST",
  path: string,
  payload: Record<string, string | number>,
): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  const ts = timestamp();
  const fields = Object.keys(payload);
  const signedString = `timestamp=${ts}` + fields.map((f) => `&${f}=${payload[f]}`).join("");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `SELCOM ${b64(cfg.apiKey)}`,
    Digest: await digest(signedString, cfg.apiSecret),
    "Digest-Method": "HS256",
    Timestamp: ts,
    "Signed-Fields": fields.join(","),
  };

  let url = `${cfg.baseUrl}${path}`;
  let body: string | undefined;
  if (method === "GET") {
    const qs = new URLSearchParams(Object.entries(payload).map(([k, v]) => [k, String(v)]));
    url += `?${qs.toString()}`;
  } else {
    body = JSON.stringify(payload);
  }

  const res = await fetch(url, { method, headers, body });
  const text = await res.text();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    parsed = { raw: text };
  }
  return { ok: res.ok, status: res.status, body: parsed };
}

export type CreateOrderInput = {
  orderId: string;
  amount: number;
  currency: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string; // digits, e.g. 255712345678
  redirectUrl: string;
  cancelUrl: string;
  webhookUrl: string;
  remarks: string;
};

export type CreateOrderResult =
  | { ok: true; gatewayUrl: string }
  | { ok: false; reason: "unconfigured" | "rejected" | "network"; detail?: string };

/** Creates a Selcom checkout order and returns the hosted payment page URL. */
export async function createSelcomOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const cfg = selcomConfig();
  if (!cfg) return { ok: false, reason: "unconfigured" };

  const payload: Record<string, string | number> = {
    vendor: cfg.vendorId,
    order_id: input.orderId,
    buyer_email: input.buyerEmail,
    buyer_name: input.buyerName,
    buyer_phone: input.buyerPhone,
    amount: Math.round(input.amount),
    currency: input.currency || "TZS",
    redirect_url: b64(input.redirectUrl),
    cancel_url: b64(input.cancelUrl),
    webhook: b64(input.webhookUrl),
    buyer_remarks: input.remarks,
    merchant_remarks: input.remarks,
    no_of_items: 1,
  };

  try {
    const { body } = await selcomRequest(cfg, "POST", "/checkout/create-order-minimal", payload);
    const code = String(body["resultcode"] ?? "");
    const data = Array.isArray(body["data"]) ? (body["data"][0] as Record<string, unknown> | undefined) : undefined;
    const raw = data?.["payment_gateway_url"];
    if (code === "000" && typeof raw === "string" && raw) {
      const url = raw.startsWith("http") ? raw : unb64(raw);
      return { ok: true, gatewayUrl: url };
    }
    console.error("[selcom] create order rejected", code, JSON.stringify(body).slice(0, 500));
    return { ok: false, reason: "rejected", detail: String(body["message"] ?? code) };
  } catch (e) {
    console.error("[selcom] create order failed", e);
    return { ok: false, reason: "network" };
  }
}

export type SelcomPaymentStatus = "pending" | "processing" | "paid" | "failed" | "cancelled" | "expired";

export type OrderStatusResult =
  | { ok: true; status: SelcomPaymentStatus; providerReference: string | null; channel: string | null }
  | { ok: false; reason: "unconfigured" | "unknown_order" | "network" };

function mapStatus(raw: string): SelcomPaymentStatus {
  const v = raw.toUpperCase();
  if (v === "COMPLETED" || v === "SUCCESS" || v === "PAID" || v === "SETTLED") return "paid";
  if (v === "PENDING" || v === "INPROGRESS" || v === "IN_PROGRESS" || v === "PROCESSING") return "processing";
  if (v === "CANCELLED" || v === "CANCELED" || v === "USERCANCELLED") return "cancelled";
  if (v === "EXPIRED" || v === "TIMEOUT") return "expired";
  if (v === "REJECTED" || v === "FAILED" || v === "FAILURE") return "failed";
  return "processing";
}

/**
 * Authoritative payment result straight from Selcom. Webhooks are never
 * trusted on their own — this call decides whether a payment is confirmed.
 */
export async function fetchSelcomOrderStatus(orderId: string): Promise<OrderStatusResult> {
  const cfg = selcomConfig();
  if (!cfg) return { ok: false, reason: "unconfigured" };
  try {
    const { body } = await selcomRequest(cfg, "GET", "/checkout/order-status", { order_id: orderId });
    const code = String(body["resultcode"] ?? "");
    const data = Array.isArray(body["data"]) ? (body["data"][0] as Record<string, unknown> | undefined) : undefined;
    if (code !== "000" || !data) {
      if (code === "111" || code === "404") return { ok: false, reason: "unknown_order" };
      console.error("[selcom] order status error", code, JSON.stringify(body).slice(0, 500));
      return { ok: false, reason: "network" };
    }
    const raw = String(data["payment_status"] ?? data["result"] ?? "");
    return {
      ok: true,
      status: mapStatus(raw),
      providerReference: (data["transid"] as string | undefined) ?? (data["reference"] as string | undefined) ?? null,
      channel: (data["channel"] as string | undefined) ?? null,
    };
  } catch (e) {
    console.error("[selcom] order status failed", e);
    return { ok: false, reason: "network" };
  }
}
