# Simplify Property Search

## Goal
Make the homepage search feel simple while preserving the working location flow and every existing filter underneath.

## Changes
- Keep the current Rent, Buy, and Commercial tabs.
- Reduce the homepage search row to four primary controls:
  - Location: “City, area or street...”
  - Property type: “Property type”
  - Price: “Any price”
  - Search
- Remove the separate City control. Selecting an area will continue to set its city, district, and area automatically through the existing location component.
- Replace separate Min and Max controls with one Price control. It will show “Any price” by default and reveal the existing minimum and maximum price inputs when opened.
- Add a Filters control that opens the existing advanced options without placing them all in the main search row.
- Keep bedrooms, bathrooms, furnished, parking, size, verified-only, and amenities available as advanced filters.
- Do not show a Property condition control because the current listings do not store that value; showing it would be non-functional and would violate the request not to add new search logic.
- Keep the results-page filter system and URL parameters intact so homepage selections carry through and remain editable.
- Add matching English and Kiswahili labels.

## Technical Details
- Reuse `LocationSearchInput` unchanged; do not alter autocomplete, selection, display, persistence, or clear behavior.
- Reuse the existing `minPrice`, `maxPrice`, category, bedroom, bathroom, size, furnished, parking, verified, and amenities parameters.
- Extract or share only presentation controls where needed; do not create a second location system or modify the data source.
- Use the existing popover/sheet and button components for desktop and mobile controls.
- Keep mobile controls at comfortable tap sizes and constrain advanced panels so they do not create an unnecessarily long homepage.

## Verification
- Confirm the production build succeeds.
- Test desktop and 390px mobile layouts.
- Test location: focus shows no suggestions; type Sinza; select; selected location stays visible; Search preserves filtering and display; refresh preserves it; × clears it.
- Test property type and price values pass to results.
- Test Filters opens advanced options and applies them through the existing search parameters.
- Test English and Kiswahili labels.
