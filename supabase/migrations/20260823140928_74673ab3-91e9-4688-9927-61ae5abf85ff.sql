-- 1) Recipients must be able to mark messages as read
DROP POLICY IF EXISTS "participants update messages" ON public.messages;
CREATE POLICY "participants update messages"
ON public.messages FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (auth.uid() = c.buyer_id OR auth.uid() = c.owner_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (auth.uid() = c.buyer_id OR auth.uid() = c.owner_id)
  )
);

-- 2) Safe peer profile lookup for conversation participants
CREATE OR REPLACE FUNCTION public.get_conversation_peers()
RETURNS TABLE(
  id uuid,
  full_name text,
  avatar_url text,
  agency_name text,
  verified boolean,
  role public.app_role
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH peers AS (
    SELECT DISTINCT CASE WHEN c.buyer_id = auth.uid() THEN c.owner_id ELSE c.buyer_id END AS uid
    FROM public.conversations c
    WHERE auth.uid() IS NOT NULL
      AND (c.buyer_id = auth.uid() OR c.owner_id = auth.uid())
  )
  SELECT p.id,
         p.full_name,
         p.avatar_url,
         p.agency_name,
         (p.verified_identity OR p.verified_owner OR p.verified_agent OR p.verified_business) AS verified,
         COALESCE(
           (SELECT ur.role FROM public.user_roles ur WHERE ur.user_id = p.id
             ORDER BY CASE ur.role
               WHEN 'super_admin' THEN 1 WHEN 'admin' THEN 2 WHEN 'agent' THEN 3
               WHEN 'owner' THEN 4 ELSE 5 END
             LIMIT 1),
           'buyer'::public.app_role) AS role
  FROM public.profiles p
  JOIN peers ON peers.uid = p.id;
$$;

REVOKE ALL ON FUNCTION public.get_conversation_peers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_conversation_peers() TO authenticated;

-- 3) Safe people search to start new conversations
CREATE OR REPLACE FUNCTION public.search_message_recipients(_q text)
RETURNS TABLE(
  id uuid,
  full_name text,
  avatar_url text,
  agency_name text,
  verified boolean,
  role public.app_role
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id,
         p.full_name,
         p.avatar_url,
         p.agency_name,
         (p.verified_identity OR p.verified_owner OR p.verified_agent OR p.verified_business) AS verified,
         COALESCE(
           (SELECT ur.role FROM public.user_roles ur WHERE ur.user_id = p.id
             ORDER BY CASE ur.role
               WHEN 'super_admin' THEN 1 WHEN 'admin' THEN 2 WHEN 'agent' THEN 3
               WHEN 'owner' THEN 4 ELSE 5 END
             LIMIT 1),
           'buyer'::public.app_role) AS role
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.id <> auth.uid()
    AND COALESCE(_q,'') <> ''
    AND (p.full_name ILIKE '%' || _q || '%' OR p.agency_name ILIKE '%' || _q || '%')
  ORDER BY p.full_name
  LIMIT 20;
$$;

REVOKE ALL ON FUNCTION public.search_message_recipients(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_message_recipients(text) TO authenticated;

-- 4) Realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
