CREATE OR REPLACE FUNCTION public.my_commission_summary() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
  SELECT jsonb_build_object(
    'protected', COALESCE(sum(amount) FILTER (WHERE status='protected'),0),
    'pending', COALESCE(sum(amount) FILTER (WHERE status IN ('estimated','pending_completion')),0),
    'payable', COALESCE(sum(amount) FILTER (WHERE status='payable'),0),
    'paid', COALESCE(sum(amount) FILTER (WHERE status='paid'),0),
    'count', count(*))
  FROM public.deal_commissions WHERE agent_id = auth.uid();
$$;