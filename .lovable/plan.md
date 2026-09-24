# SPACES — Non-competing Role & Access System (extension only)

## What stays exactly as it is
Sign-in, Sakura OTP, listings, search, leads, viewings, deals, verification, messaging, Agent/Dalali workspace, Property Management screens, My Tenancy, payments/Selcom, admin, public homepage menu. No data is deleted, no accounts are duplicated.

## What users will see
- **Buyers/renters:** no change. No management menus.
- **Owners:** everything as today, plus a "Management" card on their own property page showing the current Property Manager with Assign / Change / Remove.
- **Property Managers:** a new "My Management" area (reusing the existing Property Management screen) that lists every property they have been accepted to manage, across different owners.
- **Invitations:** manager sees "You have been invited to manage [property] — Owner: [name] — Permissions: …" with Accept / Decline (in notifications and at the top of My Management).
- **Role switcher:** a small "Owner / Property Manager / Agent" dropdown in the dashboard menu, shown only when a person really has more than one of these. Picking one filters the menu to that context. Single-role users see no switcher.
- **Tenants:** My Tenancy unchanged, still only their own tenancy.
- **Property page buttons:** "Manage Property" for the owner and an accepted manager; "Manage Listing" for an assigned agent; nothing for anyone else.
- All new labels in English and Kiswahili.

## Technical details
Database (one additive migration):
- Add `property_manager` to the existing `app_role` enum (no new role table). Users cannot self-activate it from Settings → My Mode. It is granted only when (1) the user accepts an owner's management invitation, or (2) the user submits a controlled Property Manager onboarding request that an admin approves (reusing the existing verification request workflow). No empty Property Manager role is created by selecting a mode.
- New table `property_managers`: property_id, owner_id, manager_id, permission (`view` | `manage`), scopes jsonb (tenants, leases, rent, maintenance, documents, reports), status (`invited` | `active` | `declined` | `ended`), invited_at, accepted_at, ended_at, ended_by, end_reason. Unique partial index: one `active`/`invited` manager per property. Rows are never deleted — changing a manager sets the old row to `ended` and inserts a new invite, so history and audit remain.
- GRANTs + RLS: owner of the property (and admins) insert/update; manager reads own rows and may only flip their own `invited` → `active`/`declined`; triggers guard every other transition.
- Extend existing `can_manage_property()` to also return true for an `active` manager with `manage` permission (view-only managers get read policies only). All existing management tables' RLS already uses this helper, so tenants/leases/rent/maintenance/documents instantly respect assignments and ending an assignment instantly removes access. Ownership (`properties.owner_id`) is never touched.
- RPCs: `search_property_managers(q)`, `invite_property_manager`, `respond_management_invite`, `end_property_manager` — security definer, caller verified.
- Audit: triggers write to existing `admin_actions`-style log (manager invited/accepted/declined/changed/removed/permission changed); existing tenant/lease/rent/maintenance updated_at + rent trigger stay.
- Notifications: one per invite and per response, via existing `notifications` table.

Frontend:
- `src/lib/property-managers.ts` (data helpers), `ManagerAssignmentCard` on `dashboard.properties.$id.manage.tsx`, invite banner in `management-center.tsx`, `fetchManagedProperties` extended to include active assignments (property names grouped by owner).
- `use-mode.tsx` gains `manager` mode; `dashboard-shell.tsx` shows the switcher only when 2+ contexts apply and filters nav per context.
- `use-auth.tsx` AppRole type gains `property_manager`; admin role pages unchanged.

## Testing
Run the 12 acceptance scenarios using real accounts via simulated database sessions (rolled back where they would create records), plus Playwright on public pages, mobile width, English/Kiswahili. Agent and tenant flows that need a real account will be reported honestly if none exists.
