// Server-only phone OTP engine: generation, rate limiting, verification and
// session minting. The code itself never leaves the server.
import { normalizeTanzanianPhoneNumber } from "./phone";
import { sakuraConfigured, sendSakuraSms } from "./sakura.server";

export const OTP_TTL_SECONDS = 300; // 5 minutes
export const RESEND_COOLDOWN_SECONDS = 45;
export const MAX_SENDS_PER_WINDOW = 3;
export const SEND_WINDOW_MINUTES = 15;
export const MAX_ATTEMPTS = 5;

export type RequestOtpResult =
  | { ok: true; expiresIn: number; cooldown: number }
  | { ok: false; reason: "invalid_phone" | "unconfigured" | "cooldown" | "rate_limited" | "send_failed" };

export type VerifyOtpResult =
  | { ok: true; tokenHash: string; isNew: boolean }
  | { ok: false; reason: "invalid_phone" | "expired" | "wrong" | "too_many" | "failed" };

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateCode(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String((buf[0]! % 900000) + 100000);
}

function aliasEmail(e164: string): string {
  return `p${e164.replace(/\D/g, "")}@phone.spacestz.com`;
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function requestPhoneOtp(rawPhone: string): Promise<RequestOtpResult> {
  const phone = normalizeTanzanianPhoneNumber(rawPhone);
  if (!phone) return { ok: false, reason: "invalid_phone" };
  if (!sakuraConfigured()) return { ok: false, reason: "unconfigured" };

  const db = await admin();
  const windowStart = new Date(Date.now() - SEND_WINDOW_MINUTES * 60_000).toISOString();
  const { data: recent } = await db
    .from("phone_otp_codes")
    .select("created_at")
    .eq("phone", phone)
    .gte("created_at", windowStart)
    .order("created_at", { ascending: false });

  const sends = recent ?? [];
  if (sends.length >= MAX_SENDS_PER_WINDOW) return { ok: false, reason: "rate_limited" };
  const last = sends[0]?.created_at ? new Date(sends[0].created_at).getTime() : 0;
  if (last && Date.now() - last < RESEND_COOLDOWN_SECONDS * 1000) {
    return { ok: false, reason: "cooldown" };
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString();

  const { error: insertError } = await db.from("phone_otp_codes").insert({
    phone,
    code_hash: await sha256(`${phone}:${code}`),
    expires_at: expiresAt,
  });
  if (insertError) return { ok: false, reason: "send_failed" };

  const sent = await sendSakuraSms(
    phone,
    `SPACES verification code: ${code}. This code expires in 5 minutes. Do not share it.`,
    "phone_otp",
  );
  if (!sent.ok) {
    return { ok: false, reason: sent.reason === "unconfigured" ? "unconfigured" : "send_failed" };
  }

  return { ok: true, expiresIn: OTP_TTL_SECONDS, cooldown: RESEND_COOLDOWN_SECONDS };
}

export async function verifyPhoneOtp(rawPhone: string, code: string): Promise<VerifyOtpResult> {
  const phone = normalizeTanzanianPhoneNumber(rawPhone);
  if (!phone || !/^\d{6}$/.test(code)) return { ok: false, reason: "invalid_phone" };

  const db = await admin();
  const { data: row } = await db
    .from("phone_otp_codes")
    .select("id, code_hash, expires_at, attempts, consumed_at")
    .eq("phone", phone)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return { ok: false, reason: "expired" };
  if (new Date(row.expires_at).getTime() < Date.now()) return { ok: false, reason: "expired" };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "too_many" };

  const matches = row.code_hash === (await sha256(`${phone}:${code}`));
  if (!matches) {
    const attempts = row.attempts + 1;
    await db.from("phone_otp_codes").update({ attempts }).eq("id", row.id);
    return { ok: false, reason: attempts >= MAX_ATTEMPTS ? "too_many" : "wrong" };
  }

  // One-time use.
  await db.from("phone_otp_codes").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);

  // Find (or create) the account for this number — never duplicate users.
  const { data: profile } = await db.from("profiles").select("id, email").eq("phone", phone).maybeSingle();

  let userId = profile?.id ?? null;
  let email = profile?.email ?? null;
  let isNew = false;

  if (!userId) {
    const created = await db.auth.admin.createUser({
      phone,
      phone_confirm: true,
      email: aliasEmail(phone),
      email_confirm: true,
      user_metadata: { phone },
    });
    if (created.error || !created.data.user) return { ok: false, reason: "failed" };
    userId = created.data.user.id;
    email = created.data.user.email ?? aliasEmail(phone);
    isNew = true;
  } else {
    const existing = await db.auth.admin.getUserById(userId);
    email = existing.data.user?.email ?? null;
    if (!email) {
      const updated = await db.auth.admin.updateUserById(userId, {
        email: aliasEmail(phone),
        email_confirm: true,
      });
      email = updated.data.user?.email ?? null;
    }
    if (!existing.data.user?.phone) {
      await db.auth.admin.updateUserById(userId, { phone, phone_confirm: true });
    }
  }

  if (!email) return { ok: false, reason: "failed" };

  const link = await db.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = link.data.properties?.hashed_token;
  if (link.error || !tokenHash) return { ok: false, reason: "failed" };

  return { ok: true, tokenHash, isNew };
}

export async function sendTestSms(rawPhone: string): Promise<{ ok: boolean; reason?: string; messageId?: string | null }> {
  const phone = normalizeTanzanianPhoneNumber(rawPhone);
  if (!phone) return { ok: false, reason: "invalid_phone" };
  if (!sakuraConfigured()) return { ok: false, reason: "unconfigured" };
  const sent = await sendSakuraSms(
    phone,
    "SPACES test message: your SMS integration is working.",
    "admin_test",
  );
  return sent.ok ? { ok: true, messageId: sent.messageId } : { ok: false, reason: "send_failed" };
}
