CREATE TABLE public.phone_otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX phone_otp_codes_phone_idx ON public.phone_otp_codes (phone, created_at DESC);
ALTER TABLE public.phone_otp_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.phone_otp_codes FROM anon, authenticated;
GRANT ALL ON public.phone_otp_codes TO service_role;

CREATE TABLE public.sms_delivery_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  masked_recipient text NOT NULL,
  purpose text NOT NULL,
  success boolean NOT NULL,
  provider_message_id text,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sms_delivery_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sms_delivery_log FROM anon, authenticated;
GRANT SELECT ON public.sms_delivery_log TO authenticated;
GRANT ALL ON public.sms_delivery_log TO service_role;
CREATE POLICY "Admins can view sms delivery log" ON public.sms_delivery_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));