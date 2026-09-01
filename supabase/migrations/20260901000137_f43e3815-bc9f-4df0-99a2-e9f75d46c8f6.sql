CREATE POLICY "Admins can view all leads"
ON public.leads FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));