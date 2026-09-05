// Server-only Sakura SMS transport.
// Credentials never leave this module and are never returned to the browser.

const SAKURA_ENDPOINT = "https://sakurasms.com/api/v1/messages";

export type SakuraSendResult =
  | { ok: true; messageId: string | null }
  | { ok: false; reason: "unconfigured" | "failed" };

export function sakuraConfigured(): boolean {
  return Boolean(process.env["SAKURA_SMS_API_KEY"] && process.env["SAKURA_SMS_SENDER_ID"]);
}

/** Masks a number for logs: +255658610015 → +255*****015 */
export function maskRecipient(e164: string): string {
  return `${e164.slice(0, 4)}*****${e164.slice(-3)}`;
}

export async function sendSakuraSms(
  to: string,
  message: string,
  purpose: string,
): Promise<SakuraSendResult> {
  const apiKey = process.env["SAKURA_SMS_API_KEY"];
  const sender = process.env["SAKURA_SMS_SENDER_ID"];
  if (!apiKey || !sender) return { ok: false, reason: "unconfigured" };

  // Sakura accepts 255XXXXXXXXX (no plus).
  const recipient = to.replace(/^\+/, "");

  let messageId: string | null = null;
  let ok = false;
  let errorCode: string | null = null;

  try {
    const res = await fetch(SAKURA_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to: recipient, sender, message }),
    });
    const payload = (await res.json().catch(() => null)) as
      | { id?: string; provider_id?: string; status?: string }
      | null;
    ok = res.ok;
    errorCode = ok ? null : String(res.status);
    messageId = payload?.id ?? payload?.provider_id ?? null;
  } catch {
    ok = false;
    errorCode = "network";
  }

  // Safe operational logging only — no code, no key, no headers.
  console.info(
    `[sms] purpose=${purpose} to=${maskRecipient(to)} ok=${ok} id=${messageId ?? "-"} at=${new Date().toISOString()}`,
  );

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("sms_delivery_log").insert({
      masked_recipient: maskRecipient(to),
      purpose,
      success: ok,
      provider_message_id: messageId,
      error_code: errorCode,
    });
  } catch {
    // Logging must never break delivery.
  }

  return ok ? { ok: true, messageId } : { ok: false, reason: "failed" };
}
