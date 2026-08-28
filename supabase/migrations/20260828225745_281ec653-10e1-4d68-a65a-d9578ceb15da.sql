DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' AND c.relkind IN ('r','v')
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', r.relname);
  END LOOP;
END $$;

-- Minimal public (signed-out) surface, matching existing RLS policies.
GRANT SELECT ON public.public_properties TO anon;
GRANT SELECT ON public.public_profiles TO anon;
GRANT SELECT ON public.public_listing_pages TO anon;
GRANT SELECT ON public.properties TO anon;
GRANT SELECT ON public.property_media TO anon;
GRANT SELECT ON public.reviews TO anon;
GRANT INSERT ON public.contact_messages TO anon;
GRANT INSERT ON public.property_views TO anon;