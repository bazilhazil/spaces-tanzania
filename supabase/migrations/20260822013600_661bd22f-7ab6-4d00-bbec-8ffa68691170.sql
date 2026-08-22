-- 1) New status value + listing flags
ALTER TYPE public.property_status ADD VALUE IF NOT EXISTS 'rejected';

ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS rejection_reason text;

GRANT SELECT (featured, verified) ON public.properties TO anon;
GRANT SELECT (featured, verified, rejection_reason) ON public.properties TO authenticated;

-- 2) Agent permissions on a per-property basis
DO $$ BEGIN
  CREATE TYPE public.agent_permission AS ENUM (
    'view_only','manage_leads','manage_viewings','edit_listing','full_management'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.property_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission public.agent_permission NOT NULL DEFAULT 'view_only',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, agent_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_agents TO authenticated;
GRANT ALL ON public.property_agents TO service_role;

ALTER TABLE public.property_agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage their property agents" ON public.property_agents;
CREATE POLICY "Owners manage their property agents"
  ON public.property_agents FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Agents view their assignments" ON public.property_agents;
CREATE POLICY "Agents view their assignments"
  ON public.property_agents FOR SELECT TO authenticated
  USING (auth.uid() = agent_id);

DROP TRIGGER IF EXISTS property_agents_set_updated_at ON public.property_agents;
CREATE TRIGGER property_agents_set_updated_at
  BEFORE UPDATE ON public.property_agents
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 3) Recursion-safe permission check
CREATE OR REPLACE FUNCTION public.agent_permission_for(_property_id uuid, _agent_id uuid)
RETURNS public.agent_permission
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT permission FROM public.property_agents
  WHERE property_id = _property_id AND agent_id = _agent_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.agent_permission_for(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agent_permission_for(uuid, uuid) TO authenticated;

-- 4) Assigned agents can read + (when permitted) edit the properties they manage
DROP POLICY IF EXISTS "Assigned agents can view properties" ON public.properties;
CREATE POLICY "Assigned agents can view properties"
  ON public.properties FOR SELECT TO authenticated
  USING (public.agent_permission_for(id, auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Assigned agents can edit properties" ON public.properties;
CREATE POLICY "Assigned agents can edit properties"
  ON public.properties FOR UPDATE TO authenticated
  USING (public.agent_permission_for(id, auth.uid()) IN ('edit_listing','full_management'))
  WITH CHECK (public.agent_permission_for(id, auth.uid()) IN ('edit_listing','full_management'));