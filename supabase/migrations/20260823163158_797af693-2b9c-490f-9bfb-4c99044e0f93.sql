-- 1) Deals insert policy: real conversation participation check
DROP POLICY IF EXISTS "Deals insert by participants" ON public.deals;
CREATE POLICY "Deals insert by participants"
ON public.deals FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')
  OR (
    (owner_id = auth.uid() OR agent_id = auth.uid() OR buyer_id = auth.uid())
    AND (property_id IS NULL OR (
          (owner_id IS NULL OR private.is_property_owner(property_id, owner_id))
      AND (agent_id IS NULL OR private.is_property_agent(property_id, agent_id) OR private.is_property_owner(property_id, agent_id))
    ))
    AND (conversation_id IS NULL OR EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = deals.conversation_id
        AND (c.buyer_id = auth.uid() OR c.owner_id = auth.uid())
        AND (deals.buyer_id IS NULL OR deals.buyer_id = c.buyer_id)
        AND (deals.property_id IS NULL OR c.property_id IS NULL OR deals.property_id = c.property_id)
    ))
  )
);

-- 2) SECURITY DEFINER surface reduction
CREATE OR REPLACE FUNCTION public.my_review_opportunities()
 RETURNS TABLE(source text, source_id uuid, property_id uuid, property_title text, counterpart_id uuid, counterpart_name text, occurred_at timestamp with time zone, property_reviewed boolean, counterpart_reviewed boolean, can_review_property boolean)
 LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public'
AS $function$
  SELECT 'booking'::text, b.id, b.property_id, p.title,
         CASE WHEN auth.uid() = b.buyer_id THEN COALESCE(b.recipient_id, b.agent_id, b.owner_id) ELSE b.buyer_id END,
         CASE WHEN auth.uid() = b.buyer_id THEN pr.full_name ELSE b.buyer_name END,
         b.scheduled_at,
         EXISTS (SELECT 1 FROM public.reviews r WHERE r.reviewer_id = auth.uid() AND r.booking_id = b.id AND r.subject_type='property'),
         EXISTS (SELECT 1 FROM public.reviews r WHERE r.reviewer_id = auth.uid() AND r.booking_id = b.id AND r.subject_type='user'),
         auth.uid() = b.buyer_id
  FROM public.bookings b
  LEFT JOIN public.properties p ON p.id = b.property_id
  LEFT JOIN public.profiles pr ON pr.id = COALESCE(b.recipient_id, b.agent_id, b.owner_id)
  WHERE b.status = 'completed'
    AND auth.uid() IN (b.buyer_id, b.owner_id, COALESCE(b.agent_id, b.owner_id), COALESCE(b.recipient_id, b.owner_id))
  UNION ALL
  SELECT 'deal'::text, d.id, d.property_id, p.title,
         CASE WHEN auth.uid() = d.buyer_id THEN COALESCE(d.agent_id, d.owner_id) ELSE d.buyer_id END,
         CASE WHEN auth.uid() = d.buyer_id THEN pr.full_name ELSE d.buyer_name END,
         COALESCE(d.completed_at, d.updated_at),
         EXISTS (SELECT 1 FROM public.reviews r WHERE r.reviewer_id = auth.uid() AND r.deal_id = d.id AND r.subject_type='property'),
         EXISTS (SELECT 1 FROM public.reviews r WHERE r.reviewer_id = auth.uid() AND r.deal_id = d.id AND r.subject_type='user'),
         auth.uid() = d.buyer_id
  FROM public.deals d
  LEFT JOIN public.properties p ON p.id = d.property_id
  LEFT JOIN public.profiles pr ON pr.id = COALESCE(d.agent_id, d.owner_id)
  WHERE d.stage = 'completed'
    AND auth.uid() IN (COALESCE(d.buyer_id,'00000000-0000-0000-0000-000000000000'::uuid),
                       COALESCE(d.owner_id,'00000000-0000-0000-0000-000000000000'::uuid),
                       COALESCE(d.agent_id,'00000000-0000-0000-0000-000000000000'::uuid));
$function$;

REVOKE ALL ON FUNCTION public.can_review(uuid, text, uuid, uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.moderate_review(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.respond_to_review(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_review(uuid, text, uuid, uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_review(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_review(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION private.is_property_owner(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_property_agent(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_property_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_property_agent(uuid, uuid) TO authenticated;