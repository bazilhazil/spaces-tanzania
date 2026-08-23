REVOKE ALL ON FUNCTION public.tg_review_submit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_review_after_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_review_status_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_booking_review_invite() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_deal_review_invite() FROM PUBLIC, anon, authenticated;