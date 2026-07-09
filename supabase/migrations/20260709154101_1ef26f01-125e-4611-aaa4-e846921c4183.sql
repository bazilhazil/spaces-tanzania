
DROP POLICY IF EXISTS "Deal docs read by participants" ON storage.objects;
CREATE POLICY "Deal docs read by participants" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'deal-documents' AND EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id::text = split_part(name,'/',1)
      AND (d.buyer_id = auth.uid() OR d.owner_id = auth.uid() OR d.agent_id = auth.uid()
           OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  )
);

DROP POLICY IF EXISTS "Deal docs upload by participants" ON storage.objects;
CREATE POLICY "Deal docs upload by participants" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'deal-documents' AND EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id::text = split_part(name,'/',1)
      AND (d.buyer_id = auth.uid() OR d.owner_id = auth.uid() OR d.agent_id = auth.uid()
           OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  )
);

DROP POLICY IF EXISTS "Deal docs delete by participants" ON storage.objects;
CREATE POLICY "Deal docs delete by participants" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'deal-documents' AND EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id::text = split_part(name,'/',1)
      AND (d.owner_id = auth.uid() OR d.agent_id = auth.uid()
           OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  )
);
