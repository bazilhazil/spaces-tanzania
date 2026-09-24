# Real-time Notifications + Performance

## What exists today (reused, not rebuilt)
- One `notifications` table (already in the realtime feed), owner-only access rules, index on user + date.
- Database triggers already create notifications for: new viewing request, viewing status, new lead/inquiry, deal created/stage, property submitted/decided/verified, reports, verification requests, support tickets.
- Email already configured (sender `notify.spacestz.com`) with templates for new lead, viewing request/update, deal update, property approved/changes.
- Gaps found: **no notification for new messages**, **no duplicate protection** (14 duplicate groups in the last 30 days), no live bell count or toast outside the Notifications page, no "you have N new" on login, preferences only stored on the device, the Notifications page still mixes an older demo store, several independent realtime channels per page.

## Part A — Notifications (database)
1. Add `dedupe_key` column + unique index on (user_id, dedupe_key). A shared `notify_user(...)` helper inserts with `ON CONFLICT DO NOTHING`; key = event + source record id + recipient.
2. Update existing triggers to use the helper and attach stable references (`booking_id`, `property_id`, `conversation_id`, `lead_id`, `deal_id`, `report_id`) plus a direct `link`.
3. New trigger: message inserted → notify the other participant (one unread "new message" per conversation is refreshed instead of stacking per message, so 2 messages = count stays correct and grouped). Cover: viewing accepted/declined/rescheduled/cancelled to the right party, agent-assigned lead, admin moderation events.
4. Add `notification_preferences` (in-app on/off, email on/off per user) — security/system kinds always delivered.
5. Clean existing duplicates by keeping the earliest row (no other data touched).

## Part B — Live delivery (app)
1. One `NotificationsProvider` mounted once for signed-in users: single realtime channel per user, cleanup on sign-out, auto-reconnect that refetches missed items.
2. Bell in site header and dashboard shell with live unread count (hidden number when 0).
3. Small auto-dismissing toast with a **View** button on new inserts; on login, one summary toast "You have N new notifications".
4. Notification center: All / Unread tabs, icon, title, text, time ago, unread dot; opening marks read; "Mark all as read"; click goes to the linked page. Remove the old demo store usage.
5. Email: server-side send for eligible events using the existing email setup, respecting the user's email preference; no fake delivery.

## Part C — Performance
- Property cards request small resized WebP thumbnails (storage image transformation) with `srcset`; full size only in gallery; `loading="lazy"` below the fold, hero eager.
- Selective columns + limits/pagination for listings, notifications, messages, leads, deals; add missing indexes found via slow-query check.
- Dashboards render the shell immediately; each widget loads independently with skeletons.
- Lazy-load maps, charts, reviews, galleries; route-level code splitting for admin/management.
- Debounced location search (~250ms); cache static lookups (locations, options) via query cache.
- Shared action-button pattern: Normal → Loading → Success/Error with a 20s timeout and Try again, applied to the listed actions; slow-network "Taking longer than usual" hint.
- Login navigates after session + profile only; secondary data loads afterward.

## Testing
Live two-account tests (buyer + owner) for tests 1–8 and 11, throttled mobile network + mobile width for 9–10, build/typecheck for 12, with before/after load timings measured on home, listings and dashboard.

## Technical notes
- Migrations are additive; existing status values unchanged.
- Realtime subscription filtered by `user_id`; existing page-specific channels stay but the bell uses only the shared provider.
- A second test account (buyer) will be created through normal sign-up for the live tests.

## Limits to know up front
This is a large change; it will be delivered in stages (notifications first, then performance), each verified before moving on. If storage image resizing is unavailable on this plan, thumbnails will be generated at upload time instead, and existing photos keep full size until re-processed.
