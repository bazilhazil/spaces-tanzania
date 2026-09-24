# SPACES — Monetization, Offers & Deals, Property Management upgrade

This builds on what already exists. Nothing is rebuilt and nothing is deleted. The request is large, so the work is split into 5 phases. Each phase ships working, tested features before the next one starts.

## What already exists and will be reused
- **Plans and billing:** plans, subscriptions, payments, promotion products, property boosts, a listing-limit check, plan usage, and the Selcom connection (blocked until real credentials are added)
- **Deals:** deals with stages, activity history, documents, links to inquiries and viewings, and automatic stage changes from messages and viewings
- **Property Management:** units, tenants, leases, rent charges and payments, maintenance, contractors, documents
- **Admin:** settings, action audit log, revenue page, notifications with email

## Phase 1 — Admin pricing and plan limits
- **Admin → Monetization & Deals** gets a new area with these tabs: Products & Plans, Boosts, Transaction Fees, Rental Fees, Commission Rules, Taxes & Discounts, Payment Methods, Change Log.
- Existing plans and boost products gain: billing frequency, applicable roles, limits (listings, units, team members), tax setting, effective date, and active/inactive.
- Starting plans (admin can change every price and limit):
  - Owner Free
  - Dalali Free: 5 listings
  - Dalali Pro: 30 listings
  - Dalali Business: 100+ listings
  - Agency
  - Property Manager, priced by number of units
  - Developer Project package
- Every price or rule change is saved to the change log with the old value, the new value, who made it, and when.
- The Dalali "My Plan" card shows: current plan, listings used and remaining, leads, deals, commission, an Upgrade button, and billing history.
- Upgrading uses the existing checkout. No payment is marked successful unless Selcom confirms it.

## Phase 2 — Offers and the automatic deal engine
- A **Make Offer** button on property pages collects: amount, deposit, completion date, conditions, financing status, notes, and optional documents.
- The seller or Dalali can **Accept**, **Counter** or **Decline**. Every round is kept as a full negotiation timeline.
- New deal stages are added: Contacted, Offer Submitted, Negotiation, Offer Accepted, Verification, Agreement, Payment. Existing deals keep their current stage.
- Stages move automatically:
  - reply → Contacted
  - viewing → Viewing
  - offer → Offer Submitted
  - counter-offer → Negotiation
  - accept → Offer Accepted
  - required documents complete → Verification, then Agreement
  - payment milestones → Payment
  - both sides confirm → Completed
- Notifications are sent for: offer received, counter-offer, offer accepted, offer declined, verification required.

## Phase 3 — Commission protection and deal economics
- A **Deal Participants** panel lists: Owner, Buyer, Dalali, Agency, SPACES.
- An agreed commission record shows the amount, percentage, status (Protected / Pending / Paid) and the condition for completion.
- The transaction fee is calculated automatically once an offer is accepted, using the admin rules: buyer, seller or agent side, percentage or fixed amount, minimum and maximum, tax, discounts, and transaction type. The starting example is 0.50%.
- The deal shows a summary: property value, commission, SPACES fee, other charges, total. Completed deals show the full breakdown.

## Phase 4 — Property Management and developer projects
- New Property Management records: buildings (grouping existing properties), expenses, utilities, inspections, notices, and invoices/receipts.
- Rent charges are created automatically each month from active leases. Tenants get reminders before the due date and when rent is overdue.
- The dashboard adds: occupancy %, urgent issues, and leases that are upcoming or expiring soon.
- Usage bars show units used against the plan limit, plus tenants, leases, maintenance requests and team members.
- **Developer Projects:** project details, photos, floor plans, amenities, and a unit list (Available / Reserved / Sold / Hold) with leads and assigned sales agents.
- A new **Developer** role is granted through admin approval, the same way Agent approval already works.

## Phase 5 — Revenue dashboard, analytics, billing history, simpler home page
- **Admin revenue:** subscription, transaction, boost, developer, property management and advertising revenue; total, MRR and ARR estimate; breakdowns by product, user type, region and month.
- **Analytics:** GMV, offers, accepted offers, completed deals, conversion rate, average deal time, paid Dalalis and agencies, managed units, rent collected.
- **Billing:** invoices and receipts, failed payments, refunds, discounts and admin adjustments, all logged.
- **Home page:** four simple entry points (BUY / RENT, SELL / RENT OUT, MANAGE PROPERTY, FIND A DALALI). The current design stays the same.

## Applies to every phase
- **Mobile:** card layouts on mobile instead of dense tables.
- **Dark mode:** new screens use the existing theme colours, with high-visibility calendar and status badges.
- **Language:** English and Kiswahili text.
- **Access:** access rules are enforced by the database for every new record. Financial records are visible only to the people involved in the deal and to admins.
- **Testing:** each phase is tested live (buyer, owner, Dalali, offer/counter-offer, fee calculation, plan limits, property management, mobile, dark mode) before it is reported as done.

## Technical details
- Changes only add to the database. New deal_stage enum values are appended and old values are kept.
- New tables:
  - `pricing_rules` (fee and commission rules, with type, basis, percentage, fixed amount, cap/floor, tax, discount, effective dates)
  - `pricing_change_log`
  - `offers` and `offer_events`
  - `deal_participants`, `deal_commissions`, `deal_fees`
  - `invoices`
  - `pm_buildings`, `pm_expenses`, `pm_utilities`, `pm_inspections`, `pm_notices`
  - `developer_projects`, `developer_units`
- `billing_plans` and `promotion_products` get new columns (roles, limits, tax_rate, effective_from, frequency). `tg_enforce_listing_limit` is extended to read plan limits.
- Stage automation uses SECURITY DEFINER triggers on offers, offer_events, deal_documents and payments. Every financial table has audit triggers that write to `admin_actions`.
- Fee calculation runs in one database function, `calc_deal_fees(deal_id)`, so the number shown on screen and the stored number always match.
- Monthly rent creation and reminders are a server route called on a schedule, secured with a shared secret.
- The `developer` role value is added to `app_role`.

## Scope for this turn
Only **Phase 1** is built now: admin pricing, the change log, plan limits and the Dalali plan card. Phases 2–5 follow one per turn so each can be verified properly.
