-- 1. Payments: users may only insert non-final, self-owned payment rows.
DROP POLICY IF EXISTS "user creates own payment" ON public.payments;
CREATE POLICY "user creates own payment"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND subscription_id IS NULL
  AND paid_at IS NULL
  AND refunded_at IS NULL
);

-- 2. Subscriptions: self-service updates limited to cancellation flag only.
REVOKE UPDATE ON public.subscriptions FROM authenticated;
GRANT UPDATE (cancel_at_period_end, updated_at) ON public.subscriptions TO authenticated;

DROP POLICY IF EXISTS "cancel own subscription" ON public.subscriptions;
CREATE POLICY "cancel own subscription"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. SECURITY DEFINER trigger helpers must not be callable from the API.
REVOKE ALL ON FUNCTION public.tg_property_submit_guard() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_property_resubmitted_notify() FROM PUBLIC, anon, authenticated;
