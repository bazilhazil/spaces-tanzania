DROP POLICY IF EXISTS "Assigned agents can view leads" ON public.leads;
CREATE POLICY "Assigned agents can view leads" ON public.leads FOR SELECT TO authenticated
  USING (private.agent_permission_for(property_id, auth.uid()) >= 'manage_leads'::agent_permission);
CREATE POLICY "Assigned agents can view bookings" ON public.bookings FOR SELECT TO authenticated
  USING (private.agent_permission_for(property_id, auth.uid()) >= 'manage_viewings'::agent_permission);