-- Profile photos: a signed-in person may only read files in their own folder.
-- Other people never fetch these objects directly — profile pictures are shown
-- through the long-lived signed URL stored on the profile.
DROP POLICY IF EXISTS "avatars_read_authenticated" ON storage.objects;

CREATE POLICY "avatars_read_own_or_admin"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = (select auth.uid())::text
    OR has_role((select auth.uid()), 'admin'::app_role)
    OR has_role((select auth.uid()), 'super_admin'::app_role)
  )
);

-- Listing photos of live listings stay publicly readable (they are the public
-- listing gallery), but only files that are actually registered as media of a
-- live, non-deleted listing — no other file in the owner's folder.
DROP POLICY IF EXISTS "Public reads live property media" ON storage.objects;

CREATE POLICY "Public reads live property media"
ON storage.objects FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'property-media'
  AND EXISTS (
    SELECT 1
    FROM public.property_media m
    JOIN public.properties p ON p.id = m.property_id
    WHERE m.storage_path = storage.objects.name
      AND p.status IN ('live', 'sold', 'rented')
      AND p.deleted_at IS NULL
  )
);