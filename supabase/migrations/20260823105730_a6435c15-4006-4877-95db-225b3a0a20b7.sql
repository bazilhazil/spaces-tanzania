DROP POLICY IF EXISTS "requester manages own request" ON public.verification_requests;
DROP POLICY IF EXISTS "requesters read own verifications" ON public.verification_requests;
DROP POLICY IF EXISTS "requesters submit own verifications" ON public.verification_requests;

CREATE POLICY "requesters read own verifications"
ON public.verification_requests
FOR SELECT
TO authenticated
USING (auth.uid() = requester_id);

CREATE POLICY "requesters submit own verifications"
ON public.verification_requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = requester_id
  AND status = 'pending'
  AND reviewer_id IS NULL
  AND reviewed_at IS NULL
  AND review_reason IS NULL
  AND subject_type IN ('user', 'owner', 'agent', 'property', 'business')
  AND (
    (subject_type = 'property' AND property_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id AND p.owner_id = auth.uid()
    ))
    OR (subject_type <> 'property' AND property_id IS NULL)
  )
);

DROP POLICY IF EXISTS "admins update verifications" ON public.verification_requests;
CREATE POLICY "admins update verifications"
ON public.verification_requests
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);

CREATE OR REPLACE FUNCTION public.tg_verification_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE a RECORD;
BEGIN
  INSERT INTO public.verification_events(request_id, actor_id, action, to_status, internal)
  VALUES (NEW.id, NEW.requester_id, 'submitted', NEW.status, false);

  INSERT INTO public.notifications(user_id, kind, title, body, link, data)
  VALUES (NEW.requester_id, 'verification_submitted', 'Verification submitted',
          'We received your ' || NEW.subject_type || ' verification and will review it shortly.',
          '/verification', jsonb_build_object('request_id', NEW.id, 'subject_type', NEW.subject_type));

  FOR a IN SELECT user_id FROM public.user_roles WHERE role IN ('admin','super_admin') LOOP
    INSERT INTO public.notifications(user_id, kind, title, body, link, data)
    VALUES (a.user_id, 'verification_queue', 'New verification submission',
            'A new ' || NEW.subject_type || ' verification is awaiting review.',
            '/admin/verification', jsonb_build_object('request_id', NEW.id));
  END LOOP;
  RETURN NEW;
END; $$;