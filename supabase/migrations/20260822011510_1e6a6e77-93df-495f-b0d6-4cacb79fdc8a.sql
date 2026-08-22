
REVOKE ALL ON FUNCTION public.set_lead_status(uuid, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_booking_sync_lead() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_lead_created_notify() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_deal_created_link() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_deal_outcome_sync() FROM PUBLIC, anon, authenticated;
