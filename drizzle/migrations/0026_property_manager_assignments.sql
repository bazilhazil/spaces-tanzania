CREATE TABLE public.property_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  manager_id uuid NOT NULL,
  permission text NOT NULL DEFAULT 'manage' CHECK (permission IN ('view','manage')),
  scopes jsonb NOT NULL DEFAULT '["tenants","leases","rent","maintenance","documents","reports"]'::jsonb,
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','active','declined','ended')),
  invited_by uuid,
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  responded_at timestamptz,
  ended_at timestamptz,
  ended_by uuid,
  end_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX property_managers_one_current ON public.property_managers(property_id) WHERE status IN ('invited','active');
CREATE INDEX property_managers_manager_idx ON public.property_managers(manager_id, status);

GRANT SELECT ON public.property_managers TO authenticated;
GRANT ALL ON public.property_managers TO service_role;
ALTER TABLE public.property_managers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm read owner manager admin" ON public.property_managers FOR SELECT TO authenticated
USING (owner_id = auth.uid() OR manager_id = auth.uid()
  OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER property_managers_updated_at BEFORE UPDATE ON public.property_managers
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Access helpers
CREATE OR REPLACE FUNCTION public.is_active_manager(_property_id uuid, _need_manage boolean DEFAULT false)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.property_managers m
    WHERE m.property_id = _property_id AND m.manager_id = auth.uid() AND m.status = 'active'
      AND (NOT _need_manage OR m.permission = 'manage'));
$$;

CREATE OR REPLACE FUNCTION public.can_manage_property(_property_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  select exists (
    select 1 from public.properties p
    where p.id = _property_id
      and (
        p.owner_id = auth.uid()
        or exists (select 1 from public.property_agents pa
          where pa.property_id = p.id and pa.agent_id = auth.uid() and pa.permission = 'full_management')
        or exists (select 1 from public.property_managers m
          where m.property_id = p.id and m.manager_id = auth.uid() and m.status = 'active' and m.permission = 'manage')
      )
  )
  or public.has_role(auth.uid(), 'admin')
  or public.has_role(auth.uid(), 'super_admin');
$function$;

-- Read access for active managers (incl. view-only)
CREATE POLICY "managers read property" ON public.properties FOR SELECT TO authenticated USING (public.is_active_manager(id));
CREATE POLICY "managers read units" ON public.property_units FOR SELECT TO authenticated USING (public.is_active_manager(property_id));
CREATE POLICY "managers read tenants" ON public.tenants FOR SELECT TO authenticated USING (public.is_active_manager(property_id));
CREATE POLICY "managers read leases" ON public.leases FOR SELECT TO authenticated USING (public.is_active_manager(property_id));
CREATE POLICY "managers read charges" ON public.rent_charges FOR SELECT TO authenticated USING (public.is_active_manager(property_id));
CREATE POLICY "managers read payments" ON public.rent_payments FOR SELECT TO authenticated USING (public.is_active_manager(property_id));
CREATE POLICY "managers read tickets" ON public.maintenance_tickets FOR SELECT TO authenticated USING (public.is_active_manager(property_id));
CREATE POLICY "managers read docs" ON public.management_documents FOR SELECT TO authenticated USING (property_id IS NOT NULL AND public.is_active_manager(property_id));

-- Allow property_manager role self-grant only with an active assignment or approved onboarding
CREATE OR REPLACE FUNCTION public.tg_user_roles_guard_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin'::app_role)
     OR public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id = auth.uid() AND NEW.role = 'buyer'::app_role THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id = auth.uid() AND NEW.role = 'property_manager'::app_role AND (
       EXISTS (SELECT 1 FROM public.property_managers WHERE manager_id = auth.uid() AND status = 'active')
    OR EXISTS (SELECT 1 FROM public.verification_requests WHERE requester_id = auth.uid()
               AND subject_type = 'property_manager' AND status = 'approved')) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Not allowed to assign role % ', NEW.role USING ERRCODE = '42501';
END;
$function$;

-- Audit helper (reuses admin_actions log)
CREATE OR REPLACE FUNCTION public.log_management_action(_action text, _row public.property_managers, _meta jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.admin_actions(admin_id, action, target_type, target_id, target_label, reason, meta)
  VALUES (coalesce(auth.uid(), _row.owner_id), _action, 'property_manager', _row.property_id,
    (SELECT title FROM public.properties WHERE id = _row.property_id), _row.end_reason,
    jsonb_build_object('assignment_id', _row.id, 'manager_id', _row.manager_id, 'owner_id', _row.owner_id,
      'permission', _row.permission, 'scopes', _row.scopes) || coalesce(_meta, '{}'::jsonb));
END; $$;
REVOKE EXECUTE ON FUNCTION public.log_management_action(text, public.property_managers, jsonb) FROM PUBLIC, anon, authenticated;

-- Search registered users to invite (min 3 chars, no emails/phones returned)
CREATE OR REPLACE FUNCTION public.search_property_managers(_q text)
RETURNS TABLE(id uuid, full_name text, agency_name text, avatar_url text, is_manager boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name, p.agency_name, p.avatar_url,
    EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.role = 'property_manager')
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL AND length(trim(_q)) >= 3 AND p.id <> auth.uid()
    AND p.account_status = 'active'
    AND (p.full_name ILIKE '%'||trim(_q)||'%' OR p.agency_name ILIKE '%'||trim(_q)||'%'
         OR p.business_name ILIKE '%'||trim(_q)||'%' OR p.email ILIKE trim(_q))
  ORDER BY 5 DESC, p.full_name LIMIT 10;
$$;

CREATE OR REPLACE FUNCTION public.invite_property_manager(_property_id uuid, _manager_id uuid, _permission text DEFAULT 'manage', _scopes jsonb DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _owner uuid; _title text; _old public.property_managers; _new public.property_managers;
BEGIN
  SELECT owner_id, title INTO _owner, _title FROM public.properties WHERE id = _property_id AND deleted_at IS NULL;
  IF _owner IS NULL THEN RAISE EXCEPTION 'Property not found'; END IF;
  IF auth.uid() IS DISTINCT FROM _owner AND NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'Only the owner can assign a property manager' USING ERRCODE='42501'; END IF;
  IF _manager_id = _owner THEN RAISE EXCEPTION 'The owner already manages this property'; END IF;
  IF _permission NOT IN ('view','manage') THEN RAISE EXCEPTION 'Invalid permission'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _manager_id) THEN RAISE EXCEPTION 'User not found'; END IF;

  SELECT * INTO _old FROM public.property_managers WHERE property_id = _property_id AND status IN ('invited','active');
  IF FOUND THEN
    IF _old.manager_id = _manager_id THEN RAISE EXCEPTION 'This person is already assigned'; END IF;
    UPDATE public.property_managers SET status='ended', ended_at=now(), ended_by=auth.uid(), end_reason='Manager changed'
      WHERE id = _old.id RETURNING * INTO _old;
    PERFORM public.log_management_action('manager_changed', _old, jsonb_build_object('previous_manager_id', _old.manager_id, 'new_manager_id', _manager_id));
    IF _old.accepted_at IS NOT NULL THEN
      INSERT INTO public.notifications(user_id, kind, title, body, link, data)
      VALUES (_old.manager_id, 'management', 'Management assignment ended', 'You no longer manage "'||_title||'".', '/management', jsonb_build_object('property_id', _property_id));
    END IF;
  END IF;

  INSERT INTO public.property_managers(property_id, owner_id, manager_id, permission, scopes, invited_by)
  VALUES (_property_id, _owner, _manager_id, _permission,
    coalesce(_scopes, '["tenants","leases","rent","maintenance","documents","reports"]'::jsonb), auth.uid())
  RETURNING * INTO _new;
  PERFORM public.log_management_action('manager_invited', _new, NULL);
  INSERT INTO public.notifications(user_id, kind, title, body, link, data)
  VALUES (_manager_id, 'management', 'Property management invitation',
    'You have been invited to manage "'||_title||'".', '/management', jsonb_build_object('property_id', _property_id, 'assignment_id', _new.id));
  RETURN _new.id;
END; $$;

CREATE OR REPLACE FUNCTION public.respond_management_invite(_assignment_id uuid, _accept boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _r public.property_managers; _title text;
BEGIN
  SELECT * INTO _r FROM public.property_managers WHERE id = _assignment_id;
  IF NOT FOUND OR _r.manager_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Invitation not found' USING ERRCODE='42501'; END IF;
  IF _r.status <> 'invited' THEN RAISE EXCEPTION 'This invitation is no longer open'; END IF;
  UPDATE public.property_managers SET status = CASE WHEN _accept THEN 'active' ELSE 'declined' END,
    accepted_at = CASE WHEN _accept THEN now() END, responded_at = now()
  WHERE id = _assignment_id RETURNING * INTO _r;
  IF _accept THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (_r.manager_id, 'property_manager') ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  PERFORM public.log_management_action(CASE WHEN _accept THEN 'manager_accepted' ELSE 'manager_declined' END, _r, NULL);
  SELECT title INTO _title FROM public.properties WHERE id = _r.property_id;
  INSERT INTO public.notifications(user_id, kind, title, body, link, data)
  VALUES (_r.owner_id, 'management',
    CASE WHEN _accept THEN 'Property manager accepted' ELSE 'Property manager declined' END,
    'Your management invitation for "'||_title||'" was '||CASE WHEN _accept THEN 'accepted.' ELSE 'declined.' END,
    '/dashboard/properties/'||_r.property_id||'/manage', jsonb_build_object('property_id', _r.property_id));
END; $$;

CREATE OR REPLACE FUNCTION public.end_property_manager(_assignment_id uuid, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _r public.property_managers; _title text;
BEGIN
  SELECT * INTO _r FROM public.property_managers WHERE id = _assignment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Assignment not found'; END IF;
  IF auth.uid() IS DISTINCT FROM _r.owner_id AND auth.uid() IS DISTINCT FROM _r.manager_id
     AND NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE='42501'; END IF;
  IF _r.status NOT IN ('invited','active') THEN RAISE EXCEPTION 'Assignment already ended'; END IF;
  UPDATE public.property_managers SET status='ended', ended_at=now(), ended_by=auth.uid(),
    end_reason=coalesce(nullif(trim(_reason),''), 'Manager removed') WHERE id=_assignment_id RETURNING * INTO _r;
  PERFORM public.log_management_action('manager_removed', _r, NULL);
  SELECT title INTO _title FROM public.properties WHERE id = _r.property_id;
  INSERT INTO public.notifications(user_id, kind, title, body, link, data)
  VALUES (CASE WHEN auth.uid() = _r.manager_id THEN _r.owner_id ELSE _r.manager_id END, 'management',
    'Management assignment ended', 'Management of "'||_title||'" has ended.', '/management', jsonb_build_object('property_id', _r.property_id));
END; $$;

CREATE OR REPLACE FUNCTION public.update_manager_permission(_assignment_id uuid, _permission text, _scopes jsonb DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _r public.property_managers; _prev text;
BEGIN
  SELECT * INTO _r FROM public.property_managers WHERE id = _assignment_id;
  IF NOT FOUND OR (auth.uid() IS DISTINCT FROM _r.owner_id AND NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))) THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE='42501'; END IF;
  IF _permission NOT IN ('view','manage') THEN RAISE EXCEPTION 'Invalid permission'; END IF;
  _prev := _r.permission;
  UPDATE public.property_managers SET permission=_permission, scopes=coalesce(_scopes, scopes) WHERE id=_assignment_id RETURNING * INTO _r;
  PERFORM public.log_management_action('manager_permission_changed', _r, jsonb_build_object('previous_permission', _prev));
END; $$;

-- Owner name lookup for invitation cards (only for parties of an assignment)
CREATE OR REPLACE FUNCTION public.my_management_assignments()
RETURNS TABLE(id uuid, property_id uuid, property_title text, owner_id uuid, owner_name text, manager_id uuid, manager_name text,
  permission text, scopes jsonb, status text, invited_at timestamptz, accepted_at timestamptz, ended_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.property_id, p.title, m.owner_id, op.full_name, m.manager_id, mp.full_name,
    m.permission, m.scopes, m.status, m.invited_at, m.accepted_at, m.ended_at
  FROM public.property_managers m
  JOIN public.properties p ON p.id = m.property_id
  LEFT JOIN public.profiles op ON op.id = m.owner_id
  LEFT JOIN public.profiles mp ON mp.id = m.manager_id
  WHERE auth.uid() IS NOT NULL AND (m.manager_id = auth.uid() OR m.owner_id = auth.uid())
  ORDER BY m.created_at DESC;
$$;

-- Controlled onboarding: admin approval of a property_manager verification request grants the capability
CREATE OR REPLACE FUNCTION public.tg_pm_onboarding_approved()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.subject_type = 'property_manager' AND NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.requester_id, 'property_manager') ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER verification_pm_onboarding AFTER UPDATE OF status ON public.verification_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_pm_onboarding_approved();

REVOKE EXECUTE ON FUNCTION public.search_property_managers(text), public.invite_property_manager(uuid,uuid,text,jsonb),
  public.respond_management_invite(uuid,boolean), public.end_property_manager(uuid,text),
  public.update_manager_permission(uuid,text,jsonb), public.my_management_assignments(), public.is_active_manager(uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_property_managers(text), public.invite_property_manager(uuid,uuid,text,jsonb),
  public.respond_management_invite(uuid,boolean), public.end_property_manager(uuid,text),
  public.update_manager_permission(uuid,text,jsonb), public.my_management_assignments(), public.is_active_manager(uuid,boolean) TO authenticated;