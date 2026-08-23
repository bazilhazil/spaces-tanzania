DROP POLICY IF EXISTS "report evidence upload own" ON storage.objects;
CREATE POLICY "report evidence upload own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'report-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "report evidence read own" ON storage.objects;
CREATE POLICY "report evidence read own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'report-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "report evidence read admin" ON storage.objects;
CREATE POLICY "report evidence read admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'report-evidence' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')));