-- Move eligibility helper out of the exposed API schema
CREATE OR REPLACE FUNCTION private.can_review(_reviewer uuid, _subject_type text, _property_id uuid, _subject_user_id uuid, _booking_id uuid, _deal_id uuid)
 RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE b RECORD; d RECORD;
BEGIN
  IF _reviewer IS NULL THEN RETURN false; END IF;
  IF _subject_user_id IS NOT NULL AND _subject_user_id = _reviewer THEN RETURN false; END IF;

  IF _booking_id IS NOT NULL THEN
    SELECT * INTO b FROM public.bookings WHERE id = _booking_id;
    IF NOT FOUND OR b.status <> 'completed' THEN RETURN false; END IF;
    IF _reviewer NOT IN (COALESCE(b.buyer_id,'00000000-0000-0000-0000-000000000000'::uuid),
                         COALESCE(b.owner_id,'00000000-0000-0000-0000-000000000000'::uuid),
                         COALESCE(b.agent_id,'00000000-0000-0000-0000-000000000000'::uuid),
                         COALESCE(b.recipient_id,'00000000-0000-0000-0000-000000000000'::uuid)) THEN
      RETURN false;
    END IF;
    IF _subject_type = 'property' THEN
      RETURN _property_id = b.property_id AND _reviewer = b.buyer_id;
    ELSE
      RETURN _subject_user_id IN (COALESCE(b.buyer_id, '00000000-0000-0000-0000-000000000000'::uuid),
                                  COALESCE(b.owner_id, '00000000-0000-0000-0000-000000000000'::uuid),
                                  COALESCE(b.agent_id, '00000000-0000-0000-0000-000000000000'::uuid),
                                  COALESCE(b.recipient_id,'00000000-0000-0000-0000-000000000000'::uuid));
    END IF;
  END IF;

  IF _deal_id IS NOT NULL THEN
    SELECT * INTO d FROM public.deals WHERE id = _deal_id;
    IF NOT FOUND OR d.stage <> 'completed' THEN RETURN false; END IF;
    IF _reviewer NOT IN (COALESCE(d.buyer_id,'00000000-0000-0000-0000-000000000000'::uuid),
                         COALESCE(d.owner_id,'00000000-0000-0000-0000-000000000000'::uuid),
                         COALESCE(d.agent_id,'00000000-0000-0000-0000-000000000000'::uuid)) THEN
      RETURN false;
    END IF;
    IF _subject_type = 'property' THEN
      RETURN _property_id = d.property_id AND _reviewer = d.buyer_id;
    ELSE
      RETURN _subject_user_id IN (COALESCE(d.buyer_id,'00000000-0000-0000-0000-000000000000'::uuid),
                                  COALESCE(d.owner_id,'00000000-0000-0000-0000-000000000000'::uuid),
                                  COALESCE(d.agent_id,'00000000-0000-0000-0000-000000000000'::uuid));
    END IF;
  END IF;

  RETURN false;
END; $function$;

REVOKE ALL ON FUNCTION private.can_review(uuid, text, uuid, uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_review(uuid, text, uuid, uuid, uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Eligible users create reviews" ON public.reviews;
CREATE POLICY "Eligible users create reviews" ON public.reviews FOR INSERT TO authenticated
WITH CHECK (reviewer_id = auth.uid()
  AND private.can_review(auth.uid(), subject_type::text, property_id, subject_user_id, booking_id, deal_id));

DROP FUNCTION IF EXISTS public.can_review(uuid, text, uuid, uuid, uuid, uuid);

-- Allow the reviewed party to write exactly one response, so the RPCs can run as the caller
DROP POLICY IF EXISTS "Subjects respond to reviews" ON public.reviews;
CREATE POLICY "Subjects respond to reviews" ON public.reviews FOR UPDATE TO authenticated
USING (
  status = 'published' AND (
    subject_user_id = auth.uid()
    OR (property_id IS NOT NULL AND (
         EXISTS (SELECT 1 FROM public.properties p WHERE p.id = reviews.property_id AND p.owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.property_agents pa WHERE pa.property_id = reviews.property_id AND pa.agent_id = auth.uid())
    ))
  )
)
WITH CHECK (
  status = 'published' AND response_by = auth.uid() AND (
    subject_user_id = auth.uid()
    OR (property_id IS NOT NULL AND (
         EXISTS (SELECT 1 FROM public.properties p WHERE p.id = reviews.property_id AND p.owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.property_agents pa WHERE pa.property_id = reviews.property_id AND pa.agent_id = auth.uid())
    ))
  )
);

-- RPCs now run with the caller's own permissions (RLS enforced), keeping their internal checks
CREATE OR REPLACE FUNCTION public.respond_to_review(_review_id uuid, _response text)
 RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public'
AS $function$
DECLARE r RECORD;
BEGIN
  SELECT * INTO r FROM public.reviews WHERE id = _review_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Review not found'; END IF;
  IF r.status <> 'published' THEN RAISE EXCEPTION 'Only published reviews can be answered'; END IF;
  IF r.response IS NOT NULL THEN RAISE EXCEPTION 'You have already responded to this review'; END IF;
  IF _response IS NULL OR length(btrim(_response)) < 2 THEN RAISE EXCEPTION 'Response is empty'; END IF;

  UPDATE public.reviews
    SET response = btrim(_response), response_at = now(), response_by = auth.uid()
    WHERE id = _review_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not allowed to respond to this review'; END IF;
END; $function$;

CREATE OR REPLACE FUNCTION public.moderate_review(_review_id uuid, _status text, _reason text DEFAULT NULL::text)
 RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'Admins only';
  END IF;
  IF _status NOT IN ('pending','published','flagged','removed') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  UPDATE public.reviews
     SET status = _status::public.review_status, status_reason = _reason
   WHERE id = _review_id;
END; $function$;

REVOKE ALL ON FUNCTION public.respond_to_review(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.moderate_review(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_review(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_review(uuid, text, text) TO authenticated;