DROP POLICY IF EXISTS "Assigned agents can view leads" ON public.leads;
CREATE POLICY "Assigned agents can view leads" ON public.leads
  FOR SELECT TO authenticated
  USING (
    private.agent_permission_for(property_id, auth.uid())
      = ANY (ARRAY['manage_leads'::agent_permission, 'full_management'::agent_permission])
  );

DROP POLICY IF EXISTS "Assigned agents can update leads" ON public.leads;
CREATE POLICY "Assigned agents can update leads" ON public.leads
  FOR UPDATE TO authenticated
  USING (
    private.agent_permission_for(property_id, auth.uid())
      = ANY (ARRAY['manage_leads'::agent_permission, 'full_management'::agent_permission])
  )
  WITH CHECK (
    private.agent_permission_for(property_id, auth.uid())
      = ANY (ARRAY['manage_leads'::agent_permission, 'full_management'::agent_permission])
  );