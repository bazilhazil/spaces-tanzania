
CREATE POLICY "participants delete conversation"
ON public.conversations
FOR DELETE TO authenticated
USING (auth.uid() = buyer_id OR auth.uid() = owner_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins delete reports"
ON public.property_reports
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR auth.uid() = reporter_id);

DROP POLICY IF EXISTS "admins insert roles" ON public.user_roles;

CREATE POLICY "admins insert any role"
ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "users self-insert buyer role"
ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND role = 'buyer'::app_role);
