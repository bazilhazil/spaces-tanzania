CREATE OR REPLACE FUNCTION private.analytics_report(_from timestamptz, _to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_span interval := _to - _from;
  v_pfrom timestamptz := _from - (_to - _from);
  v_pto timestamptz := _from;
  v_result jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  WITH
  kpi AS (
    SELECT
      (SELECT count(*) FROM properties WHERE status = 'live')::int AS active_properties,
      (SELECT count(*) FROM properties WHERE created_at >= _from AND created_at < _to)::int AS new_properties,
      (SELECT count(*) FROM profiles WHERE created_at >= _from AND created_at < _to)::int AS new_users,
      (SELECT count(*) FROM leads WHERE created_at >= _from AND created_at < _to)::int AS new_leads,
      (SELECT count(*) FROM bookings WHERE created_at >= _from AND created_at < _to)::int AS viewing_requests,
      (SELECT count(*) FROM deals WHERE stage NOT IN ('completed','cancelled'))::int AS active_deals,
      (SELECT count(*) FROM deals WHERE stage = 'completed' AND COALESCE(completed_at, last_activity_at) >= _from AND COALESCE(completed_at, last_activity_at) < _to)::int AS completed_deals,
      (SELECT COALESCE(sum(amount),0) FROM payments WHERE status IN ('succeeded','paid') AND created_at >= _from AND created_at < _to)::numeric AS confirmed_revenue,
      (SELECT count(DISTINCT u) FROM (
          SELECT viewer_id AS u FROM property_views WHERE viewer_id IS NOT NULL AND created_at >= _from AND created_at < _to
          UNION SELECT sender_id FROM messages WHERE created_at >= _from AND created_at < _to
          UNION SELECT buyer_id FROM bookings WHERE created_at >= _from AND created_at < _to
          UNION SELECT owner_id FROM properties WHERE updated_at >= _from AND updated_at < _to
          UNION SELECT visitor_id FROM leads WHERE visitor_id IS NOT NULL AND created_at >= _from AND created_at < _to
        ) s WHERE u IS NOT NULL)::int AS active_users
  ),
  prev AS (
    SELECT
      (SELECT count(*) FROM profiles WHERE created_at >= v_pfrom AND created_at < v_pto)::int AS new_users,
      (SELECT count(*) FROM properties WHERE created_at >= v_pfrom AND created_at < v_pto)::int AS new_properties,
      (SELECT count(*) FROM leads WHERE created_at >= v_pfrom AND created_at < v_pto)::int AS new_leads,
      (SELECT count(*) FROM deals WHERE created_at >= v_pfrom AND created_at < v_pto)::int AS deals,
      (SELECT count(*) FROM deals WHERE stage = 'completed' AND COALESCE(completed_at, last_activity_at) >= v_pfrom AND COALESCE(completed_at, last_activity_at) < v_pto)::int AS completed_deals,
      (SELECT COALESCE(sum(amount),0) FROM payments WHERE status IN ('succeeded','paid') AND created_at >= v_pfrom AND created_at < v_pto)::numeric AS revenue
  ),
  funnel AS (
    SELECT
      (SELECT count(*) FROM property_views WHERE created_at >= _from AND created_at < _to)::int AS views,
      (SELECT count(*) FROM leads WHERE created_at >= _from AND created_at < _to)::int AS leads,
      (SELECT count(*) FROM bookings WHERE created_at >= _from AND created_at < _to)::int AS viewings,
      (SELECT count(*) FROM bookings WHERE status = 'completed' AND created_at >= _from AND created_at < _to)::int AS viewings_completed,
      (SELECT count(*) FROM deals WHERE created_at >= _from AND created_at < _to)::int AS deals,
      (SELECT count(*) FROM deals WHERE stage = 'completed' AND COALESCE(completed_at, last_activity_at) >= _from AND COALESCE(completed_at, last_activity_at) < _to)::int AS deals_completed
  ),
  pstats AS (
    SELECT p.id, p.title, p.region, p.district, p.property_type::text AS property_type, p.status::text AS status, p.owner_id,
      (SELECT count(*) FROM property_views v WHERE v.property_id = p.id AND v.created_at >= _from AND v.created_at < _to)::int AS views,
      (SELECT count(*) FROM favorites f WHERE f.property_id = p.id)::int AS favorites,
      (SELECT count(*) FROM leads l WHERE l.property_id = p.id AND l.created_at >= _from AND l.created_at < _to)::int AS leads,
      (SELECT count(*) FROM bookings b WHERE b.property_id = p.id AND b.created_at >= _from AND b.created_at < _to)::int AS viewings,
      (SELECT count(*) FROM deals d WHERE d.property_id = p.id AND d.stage = 'completed')::int AS completed_deals
    FROM properties p
  ),
  agents AS (
    SELECT d.agent_id AS id,
      count(*)::int AS leads_handled,
      count(*) FILTER (WHERE d.stage = 'completed')::int AS deals_completed,
      (SELECT count(*) FROM bookings b WHERE b.agent_id = d.agent_id AND b.status = 'completed')::int AS viewings_completed
    FROM deals d
    WHERE d.agent_id IS NOT NULL AND d.created_at >= _from AND d.created_at < _to
    GROUP BY d.agent_id
  ),
  owners AS (
    SELECT s.owner_id AS id,
      count(*) FILTER (WHERE s.status = 'live')::int AS active_listings,
      COALESCE(sum(s.views),0)::int AS views,
      COALESCE(sum(s.leads),0)::int AS leads,
      COALESCE(sum(s.viewings),0)::int AS viewings,
      COALESCE(sum(s.completed_deals),0)::int AS completed_deals
    FROM pstats s WHERE s.owner_id IS NOT NULL GROUP BY s.owner_id
  ),
  revenue AS (
    SELECT
      COALESCE(jsonb_agg(jsonb_build_object('purpose', purpose, 'confirmed', confirmed, 'pending', pending)), '[]'::jsonb) AS rows,
      COALESCE(sum(confirmed),0) AS total_confirmed,
      COALESCE(sum(pending),0) AS total_pending
    FROM (
      SELECT COALESCE(purpose,'other') AS purpose,
        COALESCE(sum(amount) FILTER (WHERE status IN ('succeeded','paid')),0)::numeric AS confirmed,
        COALESCE(sum(amount) FILTER (WHERE status = 'pending'),0)::numeric AS pending
      FROM payments WHERE created_at >= _from AND created_at < _to
      GROUP BY 1
    ) r
  ),
  attention AS (
    SELECT
      (SELECT count(*) FROM leads WHERE status = 'new' AND created_at < now() - interval '24 hours')::int AS leads_waiting,
      (SELECT count(*) FROM pstats WHERE views >= 20 AND leads = 0)::int AS silent_properties,
      (SELECT count(*) FROM bookings WHERE status = 'pending')::int AS viewings_pending,
      (SELECT count(*) FROM deals WHERE stage NOT IN ('completed','cancelled') AND last_activity_at < now() - interval '7 days')::int AS stale_deals,
      (SELECT count(*) FROM payments WHERE status = 'failed')::int AS failed_payments,
      (SELECT count(*) FROM verification_requests WHERE status = 'pending')::int AS pending_verifications,
      (SELECT count(*) FROM support_tickets WHERE status IN ('open','in_progress','waiting_user'))::int AS open_tickets,
      (SELECT count(*) FROM properties WHERE status = 'pending' OR under_review)::int AS properties_review
  )
  SELECT jsonb_build_object(
    'from', _from, 'to', _to, 'span_days', GREATEST(1, EXTRACT(day FROM v_span)::int),
    'kpis', to_jsonb(k), 'previous', to_jsonb(pv), 'funnel', to_jsonb(f),
    'attention', to_jsonb(a),
    'revenue', jsonb_build_object('rows', rv.rows, 'confirmed', rv.total_confirmed, 'pending', rv.total_pending),
    'top_properties', COALESCE((
      SELECT jsonb_agg(x) FROM (
        SELECT id, title, region, district, views, favorites, leads, viewings, completed_deals
        FROM pstats ORDER BY (views + leads * 5 + viewings * 8 + completed_deals * 20) DESC, views DESC LIMIT 10
      ) x), '[]'::jsonb),
    'most_viewed', COALESCE((
      SELECT jsonb_agg(x) FROM (SELECT id, title, views FROM pstats WHERE views > 0 ORDER BY views DESC LIMIT 5) x), '[]'::jsonb),
    'most_contacted', COALESCE((
      SELECT jsonb_agg(x) FROM (SELECT id, title, leads FROM pstats WHERE leads > 0 ORDER BY leads DESC LIMIT 5) x), '[]'::jsonb),
    'top_locations', COALESCE((
      SELECT jsonb_agg(x) FROM (
        SELECT COALESCE(region,'—') AS name, sum(views)::int AS views, sum(leads)::int AS leads, count(*)::int AS listings
        FROM pstats GROUP BY 1 ORDER BY sum(views) DESC, sum(leads) DESC LIMIT 6) x), '[]'::jsonb),
    'top_areas', COALESCE((
      SELECT jsonb_agg(x) FROM (
        SELECT COALESCE(district, region, '—') AS name, sum(views + leads * 3 + viewings * 5)::int AS activity, count(*)::int AS listings
        FROM pstats GROUP BY 1 ORDER BY 2 DESC LIMIT 6) x), '[]'::jsonb),
    'top_types', COALESCE((
      SELECT jsonb_agg(x) FROM (
        SELECT property_type AS name, count(*)::int AS listings, sum(views)::int AS views, sum(leads)::int AS leads
        FROM pstats GROUP BY 1 ORDER BY sum(leads) DESC, sum(views) DESC LIMIT 6) x), '[]'::jsonb),
    'agents', COALESCE((
      SELECT jsonb_agg(x) FROM (
        SELECT ag.id, pr.full_name AS name, ag.leads_handled, ag.viewings_completed, ag.deals_completed,
          CASE WHEN ag.leads_handled > 0 THEN round((ag.deals_completed::numeric / ag.leads_handled) * 100) ELSE 0 END AS conversion
        FROM agents ag LEFT JOIN profiles pr ON pr.id = ag.id
        ORDER BY ag.deals_completed DESC, ag.leads_handled DESC LIMIT 8) x), '[]'::jsonb),
    'owners', COALESCE((
      SELECT jsonb_agg(x) FROM (
        SELECT ow.id, pr.full_name AS name, ow.active_listings, ow.views, ow.leads, ow.viewings, ow.completed_deals
        FROM owners ow LEFT JOIN profiles pr ON pr.id = ow.id
        ORDER BY ow.views DESC, ow.leads DESC LIMIT 8) x), '[]'::jsonb)
  )
  INTO v_result
  FROM kpi k, prev pv, funnel f, attention a, revenue rv;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION private.analytics_report(timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.analytics_report(timestamptz, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_analytics(_from timestamptz, _to timestamptz)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, private
AS $$
  SELECT private.analytics_report(_from, _to);
$$;

REVOKE ALL ON FUNCTION public.admin_analytics(timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_analytics(timestamptz, timestamptz) TO authenticated;