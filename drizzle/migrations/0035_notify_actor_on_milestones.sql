-- Actors normally don't get a notification for their own action, except for
-- milestone records everyone should keep (completion).
CREATE OR REPLACE FUNCTION private.notify(_user uuid, _kind text, _title text, _body text, _deal uuid, _dedupe text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _user IS NULL THEN RETURN; END IF;
  IF _user = auth.uid() AND _kind NOT IN ('deal_completed') THEN RETURN; END IF;
  INSERT INTO public.notifications(user_id, kind, title, body, link, data, dedupe_key)
  VALUES (_user, _kind, _title, _body, '/deals?deal=' || _deal, jsonb_build_object('deal_id', _deal), _dedupe)
  ON CONFLICT DO NOTHING;
END $$;