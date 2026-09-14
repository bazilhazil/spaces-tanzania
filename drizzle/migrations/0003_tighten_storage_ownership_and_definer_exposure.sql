-- 1. property-media: writes must reference a property the caller actually owns.
DROP POLICY IF EXISTS "Owners can upload own property media" ON storage.objects;
DROP POLICY IF EXISTS "Owners manage own property media" ON storage.objects;
DROP POLICY IF EXISTS "Owners delete own property media" ON storage.objects;

CREATE POLICY "Owners can upload own property media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'property-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (storage.foldername(name))[2] ~ '^[0-9a-fA-F-]{36}$'
  AND EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = ((storage.foldername(name))[2])::uuid
      AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Owners manage own property media"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'property-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (storage.foldername(name))[2] ~ '^[0-9a-fA-F-]{36}$'
  AND EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = ((storage.foldername(name))[2])::uuid
      AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
)
WITH CHECK (
  bucket_id = 'property-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (storage.foldername(name))[2] ~ '^[0-9a-fA-F-]{36}$'
  AND EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = ((storage.foldername(name))[2])::uuid
      AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Owners delete own property media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'property-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (
    (storage.foldername(name))[2] !~ '^[0-9a-fA-F-]{36}$'
    OR EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = ((storage.foldername(name))[2])::uuid
        AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  )
);

-- 2. support bucket: strict flat per-user path, and attachments referenced by a
--    message must belong to the caller's own uploads on a ticket they can post to.
DROP POLICY IF EXISTS "support attachments insert" ON storage.objects;
CREATE POLICY "support attachments insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'support'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND array_length(storage.foldername(name), 1) = 1
  AND position('..' in name) = 0
);

CREATE OR REPLACE FUNCTION public.tg_support_message_attachment_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.attachment_path IS NOT NULL
     AND NEW.attachment_path NOT LIKE (auth.uid()::text || '/%')
     AND NOT public.has_role(auth.uid(), 'admin')
     AND NOT public.has_role(auth.uid(), 'super_admin')
  THEN
    RAISE EXCEPTION 'Attachment does not belong to you';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.tg_support_message_attachment_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS support_message_attachment_guard ON public.support_messages;
CREATE TRIGGER support_message_attachment_guard
BEFORE INSERT OR UPDATE ON public.support_messages
FOR EACH ROW EXECUTE FUNCTION public.tg_support_message_attachment_guard();

-- 3. Move agent_permission_for out of the API-exposed schema.
CREATE OR REPLACE FUNCTION private.agent_permission_for(_property_id uuid, _agent_id uuid)
RETURNS public.agent_permission
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller uuid := auth.uid();
  _perm public.agent_permission;
BEGIN
  IF _caller IS NOT NULL
     AND _agent_id IS DISTINCT FROM _caller
     AND NOT EXISTS (
       SELECT 1 FROM public.properties p
       WHERE p.id = _property_id AND p.owner_id = _caller
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles ur
       WHERE ur.user_id = _caller AND ur.role IN ('admin','super_admin')
     )
  THEN
    RETURN NULL;
  END IF;

  SELECT pa.permission INTO _perm
  FROM public.property_agents pa
  WHERE pa.property_id = _property_id AND pa.agent_id = _agent_id
  LIMIT 1;

  RETURN _perm;
END;
$$;

GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.agent_permission_for(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Assigned agents can view properties" ON public.properties;
CREATE POLICY "Assigned agents can view properties"
ON public.properties FOR SELECT TO authenticated
USING (private.agent_permission_for(id, auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Assigned agents can edit properties" ON public.properties;
CREATE POLICY "Assigned agents can edit properties"
ON public.properties FOR UPDATE TO authenticated
USING (private.agent_permission_for(id, auth.uid()) = ANY (ARRAY['edit_listing'::agent_permission, 'full_management'::agent_permission]))
WITH CHECK (private.agent_permission_for(id, auth.uid()) = ANY (ARRAY['edit_listing'::agent_permission, 'full_management'::agent_permission]));

DROP POLICY IF EXISTS "Users create own promotions" ON public.property_promotions;
CREATE POLICY "Users create own promotions"
ON public.property_promotions FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND status = 'pending_payment'
  AND EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_promotions.property_id
      AND (p.owner_id = auth.uid() OR private.agent_permission_for(p.id, auth.uid()) IS NOT NULL)
  )
);

REVOKE EXECUTE ON FUNCTION public.agent_permission_for(uuid, uuid) FROM PUBLIC, anon, authenticated;
