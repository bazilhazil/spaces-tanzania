-- Enums
CREATE TYPE public.property_type AS ENUM ('house','apartment','office','shop','warehouse','land','commercial');
CREATE TYPE public.listing_type AS ENUM ('rent','sale');
CREATE TYPE public.property_status AS ENUM ('draft','live','archived');
CREATE TYPE public.media_type AS ENUM ('image','video');

-- Properties
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_type public.property_type NOT NULL,
  listing_type public.listing_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'TZS',
  negotiable BOOLEAN NOT NULL DEFAULT false,
  bedrooms INT,
  bathrooms INT,
  parking INT,
  area_sqm NUMERIC(10,2),
  region TEXT,
  district TEXT,
  ward TEXT,
  street TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  amenities TEXT[] NOT NULL DEFAULT '{}',
  status public.property_status NOT NULL DEFAULT 'draft',
  view_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.properties TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT ALL ON public.properties TO service_role;

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view live properties"
  ON public.properties FOR SELECT
  USING (status = 'live' OR auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can insert own properties"
  ON public.properties FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners and admins can update"
  ON public.properties FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners and admins can delete"
  ON public.properties FOR DELETE TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_properties_owner ON public.properties(owner_id);
CREATE INDEX idx_properties_status ON public.properties(status);
CREATE INDEX idx_properties_type ON public.properties(property_type, listing_type);

CREATE TRIGGER trg_properties_updated_at BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Media
CREATE TABLE public.property_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  media_type public.media_type NOT NULL DEFAULT 'image',
  position INT NOT NULL DEFAULT 0,
  is_cover BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.property_media TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_media TO authenticated;
GRANT ALL ON public.property_media TO service_role;

ALTER TABLE public.property_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view media of live properties"
  ON public.property_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_media.property_id
        AND (p.status = 'live' OR p.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Owners manage media"
  ON public.property_media FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_media.property_id AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_media.property_id AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  );

CREATE INDEX idx_property_media_prop ON public.property_media(property_id, position);

-- Storage policies (bucket property-media is private)
CREATE POLICY "Owners can upload own property media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'property-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Owners manage own property media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'property-media' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'property-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owners delete own property media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'property-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated can read property media"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'property-media');

CREATE POLICY "Anon can read property media"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'property-media');
