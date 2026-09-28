# SPACES Sprint 3 — Launch-Ready Marketplace (extend only)

Nothing gets rebuilt. The Phase 2 deal engine, Sprint 1 payments and Sprint 2 property management stay as they are. Selcom stays NOT CONNECTED, and no prices change.

## Already built, only checked and polished
Search/filters (Buy/Rent, location, type, price, beds, baths, furnished, parking, verified), property detail page, saved properties, saved searches, share dialog, public Dalali profiles, agencies, plans and billing, the notification system, lead/deal records, and admin monetization settings.

## New or completed pieces

1. **Smarter search:** "House in Masaki" gets split into a property type ("house") and a place ("Masaki"). Place words are matched against region, district, ward and title, with a fallback that returns close matches instead of nothing. Everything runs on the property fields that already exist.
2. **Property cards:** add a small Owner/Dalali label and an availability badge (Available / Reserved / Sold / Rented), with View, Save and Share. The cards don't get any heavier.
3. **Property detail page:** a clear "what do I do next" box with MAKE OFFER (sale), MAKE RENTAL OFFER (rent) and CONTACT / ASK. Reserved, sold or rented properties show their status and the offer button is turned off; the existing offer engine still blocks invalid offers. The page gets share buttons for WhatsApp, Facebook, X and Copy link.
4. **Saved-search alerts:** a database trigger runs when a listing goes live. It checks the listing against saved searches using the existing matching function and sends one in-app notification per match through the existing notification system, with no duplicates.
5. **Recommended for You:** a simple rule-based score (saved searches, saved properties, budget, location, type) showing about 6 properties on the dashboard and the search page.
6. **Owner onboarding:** a progress bar on the existing upload wizard (Photos → Price → Location → Details → Submit → Verification → Published), plus a "first listing" welcome card.
7. **Dalali onboarding:** a new step-by-step page with personal info, areas, experience, services and an optional referral code, plus short explainers on leads, deals, commission and commission protection. It sends the existing agent application; admin approval still decides.
8. **Dalali profile:** add areas served, property types, live listings and verified status. No phone or email is shown until the visitor makes contact.
9. **Referrals (new):** a referrals table (referrer, referred user, code, source/campaign, date, status) with security rules. Each Dalali/owner gets a personal code, the code is captured at signup (`?ref=`), and an Admin → Referrals list is added. No multi-level commissions.
10. **Agency:** a public agency profile (name, logo, location, description, agents, listings), and dashboard tiles for listings, leads, viewings, deals and commission using the existing agency access rules.
11. **Plans and Boost:** a clearer "Current plan / used / remaining / Upgrade" card using the admin-set prices. Listings are labelled Featured, Boosted or Standard. The Boost button shows "Payment integration coming soon." and never marks anything paid.
12. **Owner inquiry stages:** New, Contacted, Viewing, Offer, Negotiating, Completed and Lost tabs, built from the existing lead and deal stages.
13. **Admin:** a Marketplace overview with Today / 7 days / 30 days / All time filters, property monitoring filters (status, location, type, owner, Dalali, verified, boosted), and a user overview (role, status, plan, listings, deals, joined date) that shows no private contact details.
14. **Verification labels:** Pending Verification, Verified, Rejected and Needs Changes, shown to owners and Dalalis and mapped from the existing statuses.
15. **Homepage:** the headline "SPACES — Find. List. Deal. Manage.", six short "For…" tiles, FIND A PROPERTY / LIST YOUR PROPERTY / BECOME A DALALI buttons, and a trust strip that makes no "guaranteed" claims.
16. **Search engines and sharing:** page titles, descriptions and share previews on the public pages; property share previews reuse the existing property image link.
17. **Kiswahili** for every new label, through the existing translation files.

## Final launch test
I'll create temporary accounts and one property, then run the Buyer, Owner, Dalali, Property Manager, Agency and Admin journeys in the browser. This includes 390px phone width, dark mode, Kiswahili, and a check that an unassigned Dalali is blocked. I'll fix only real failures, delete all test data, and report with the requested PASS/FAIL format.

## Technical notes
- One migration adds the `referrals` table (grants + RLS), a `ref_code` on profiles, the listing-live saved-search trigger calling `private.notify` with a dedupe key, and admin overview RPCs with time windows (admin-checked via `has_role`).
- Search parsing lives in `src/lib/search-parse.ts` and matching in `src/lib/recommend.ts`; both are client-side and use the existing queries.
- New routes: `/become-dalali` (public) and `/agency/$id` (public).
- No changes to the offer, payment, fee, commission or property-management triggers.
