CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.get_conversation_peers(_uid uuid)
RETURNS TABLE(id uuid, full_name text, avatar_url text, agency_name text, verified boolean, role public.app_role)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH peers AS (
    SELECT DISTINCT CASE WHEN c.buyer_id = _uid THEN c.owner_id ELSE c.buyer_id END AS uid
    FROM public.conversations c
    WHERE _uid IS NOT NULL AND (c.buyer_id = _uid OR c.owner_id = _uid)
  )
  SELECT p.id, p.full_name, p.avatar_url, p.agency_name,
         (p.verified_identity OR p.verified_owner OR p.verified_agent OR p.verified_business),
         COALESCE((SELECT ur.role FROM public.user_roles ur WHERE ur.user_id = p.id
                   ORDER BY CASE ur.role WHEN 'super_admin' THEN 1 WHEN 'admin' THEN 2
                     WHEN 'agent' THEN 3 WHEN 'owner' THEN 4 ELSE 5 END LIMIT 1),
                  'buyer'::public.app_role)
  FROM public.profiles p JOIN peers ON peers.uid = p.id;
$$;

CREATE OR REPLACE FUNCTION private.search_message_recipients(_uid uuid, _q text)
RETURNS TABLE(id uuid, full_name text, avatar_url text, agency_name text, verified boolean, role public.app_role)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.avatar_url, p.agency_name,
         (p.verified_identity OR p.verified_owner OR p.verified_agent OR p.verified_business),
         COALESCE((SELECT ur.role FROM public.user_roles ur WHERE ur.user_id = p.id
                   ORDER BY CASE ur.role WHEN 'super_admin' THEN 1 WHEN 'admin' THEN 2
                     WHEN 'agent' THEN 3 WHEN 'owner' THEN 4 ELSE 5 END LIMIT 1),
                  'buyer'::public.app_role)
  FROM public.profiles p
  WHERE _uid IS NOT NULL AND p.id <> _uid AND COALESCE(_q,'') <> ''
    AND (p.full_name ILIKE '%' || _q || '%' OR p.agency_name ILIKE '%' || _q || '%')
  ORDER BY p.full_name LIMIT 20;
$$;

CREATE OR REPLACE FUNCTION public.get_conversation_peers()
RETURNS TABLE(id uuid, full_name text, avatar_url text, agency_name text, verified boolean, role public.app_role)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT s.id, s.full_name, s.avatar_url, s.agency_name, s.verified, s.role
  FROM private.get_conversation_peers(auth.uid()) s;
$$;

CREATE OR REPLACE FUNCTION public.search_message_recipients(_q text)
RETURNS TABLE(id uuid, full_name text, avatar_url text, agency_name text, verified boolean, role public.app_role)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT s.id, s.full_name, s.avatar_url, s.agency_name, s.verified, s.role
  FROM private.search_message_recipients(auth.uid(), _q) s;
$$;
