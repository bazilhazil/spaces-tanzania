import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Ask the backend to text a fresh verification code. Never returns the code. */
export const requestPhoneCode = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ phone: z.string().min(6).max(20) }).parse(data))
  .handler(async ({ data }) => {
    const { requestPhoneOtp } = await import("./phone-otp.server");
    return await requestPhoneOtp(data.phone);
  });

/** Verify a code and mint a one-time sign-in token for the browser. */
export const verifyPhoneCode = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ phone: z.string().min(6).max(20), code: z.string().length(6) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { verifyPhoneOtp } = await import("./phone-otp.server");
    return await verifyPhoneOtp(data.phone, data.code);
  });

/** Is text messaging configured on the server? (no credentials exposed) */
export const phoneCodeAvailable = createServerFn({ method: "GET" }).handler(async () => {
  const { sakuraConfigured } = await import("./sakura.server");
  return { available: sakuraConfigured() };
});

/** Admin-only: send a real test SMS through the same secure path. */
export const sendAdminTestSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ phone: z.string().min(6).max(20) }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { data: isSuper } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (!isAdmin && !isSuper) throw new Error("Forbidden");
    const { sendTestSms } = await import("./phone-otp.server");
    return await sendTestSms(data.phone);
  });
