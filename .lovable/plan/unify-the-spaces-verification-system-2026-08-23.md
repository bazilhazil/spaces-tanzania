# Unify the SPACES verification system

## Root cause
The user submission flow already writes real rows to `verification_requests`, and the live database contains Hazel Bird's pending User and Agent submissions. The admin `/admin/verification` panel is disconnected: it renders `VERIFICATION_QUEUE` from `admin-mock.ts`, so it never queries those rows.

## Implementation
1. Replace the admin verification panel's demo queue with the existing real `VerificationReviewQueue`, backed by `verification_requests` and `verification_events`.
2. Expand the real admin queue to show database-derived type filters and counts, newest pending submissions first, applicant/contact/association details, submitted documents, history, and real approve/reject actions.
3. Add realtime refresh for user and admin verification views and a database-derived pending counter in the admin navigation.
4. Keep the existing database statuses (`pending`, `under_review`, `more_info`, `approved`, `rejected`) and normalize `pending` as “Pending Review” in the UI rather than introducing a conflicting status.
5. Harden verification RLS so applicants can read/create their own requests but cannot approve or otherwise alter protected review fields; only admins/super admins can review. Preserve private document access for the uploader and admins.
6. Remove the duplicate user “Verification Hub” navigation item and redirect the legacy `/verification-hub` route to `/verification`.
7. Verify live database records, role policies, actual document URL access, admin updates/badge triggers, user-side status refresh, and responsive rendering without changing unrelated pages.

## Technical details
- Reuse `verification_requests`, `verification_events`, `verification-documents`, badge triggers, `VerificationCenter`, and `VerificationReviewQueue`; create no new verification table or workflow.
- Keep the existing authenticated admin route guard and enforce data authorization through RLS.
- Remove only the production import/use of `VERIFICATION_QUEUE`; unrelated admin mock panels remain unchanged.
