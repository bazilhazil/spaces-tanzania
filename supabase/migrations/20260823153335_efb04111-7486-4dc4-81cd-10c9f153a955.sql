REVOKE EXECUTE ON FUNCTION public.tg_lead_ensure_deal() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.tg_lead_status_to_deal() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.tg_conversation_ensure_lead() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.tg_message_advance_status() FROM anon, authenticated, public;