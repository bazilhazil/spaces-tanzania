
-- Explicit admin-only write policies on user_roles to prevent privilege escalation
CREATE POLICY "admins insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

CREATE POLICY "admins update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

CREATE POLICY "admins delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));
