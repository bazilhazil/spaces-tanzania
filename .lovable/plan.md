# Complete dark-mode visibility and contrast

## Goal
Keep SPACES visually unchanged in light mode while making dark mode consistently readable and usable across the existing website. No layout, navigation, role, permission, data, or business-logic changes.

## Implementation

### 1. Strengthen the shared theme
- Expand the existing semantic color system for elevated surfaces, modal surfaces, input states, text tiers, icons, dividers, overlays, and shadows.
- Tune only dark-theme values so cards, menus, sidebars, tables, tabs, and dialogs separate clearly from the page background.
- Keep existing SPACES blue, gold, typography, spacing, and light-theme values intact.
- Add global selection, focus, scrollbar, disabled, autofill, and placeholder treatment using semantic tokens.

### 2. Fix native controls globally
- Apply theme-aware `color-scheme` and consistent text, surface, border, hover, focus, disabled, and placeholder states to inputs, textareas, native selects, options, checkboxes, radios, ranges, search controls, and number controls.
- Make date/time picker indicators visible in dark mode while preserving native picker behavior and the full clickable calendar area.
- Style native select arrows for reliable dark-mode contrast.
- Give file inputs a readable SPACES-styled file button, file-name text, focus state, and disabled state without replacing upload behavior.
- Cover both shared form components and unavoidable raw native controls so future screens inherit the same treatment.

### 3. Upgrade reusable UI primitives
- Update shared Input, Textarea, Select, Button, Dialog, Alert Dialog, Sheet, Drawer, Tabs, Table, Menu/Popover, Checkbox, Radio, Switch, Card, and Toast styling to use the semantic theme roles.
- Ensure close, chevron, status, action, and navigation icons inherit readable semantic colors.
- Improve focus rings and active/hover/selected states without changing component dimensions or structure.
- Make status badges and dashboard icon treatments theme-aware rather than relying on light-only palette shades.

### 4. Remove remaining theme-breaking presentation styles
- Audit application components for hardcoded black, white, gray, transparent, and low-opacity colors that become unreadable in dark mode.
- Preserve intentional photographic overlays, the dedicated dark sign-in presentation, image viewers, and third-party brand marks.
- Replace only inappropriate application UI colors with semantic classes/tokens, prioritizing shared wrappers and repeated patterns over page-specific patches.
- Correct Property Management forms, Create Lease, Upload Document, viewing/date forms, workspace selector, admin filters, profile/settings, and other native-control call sites that bypass shared primitives.

## Verification
- Use the existing design-system screen to compare shared controls and states in light and dark themes.
- Test authenticated representative pages: Dashboard, My Properties, Upload Property, Property Management and all eight tabs, Inquiries, Viewings, Messages, Notifications, Profile, Settings and its subsections, admin screens available to the test account, and marketplace pages.
- Open representative dialogs for dates, selects, file uploads, forms, confirmations, and close buttons; check hover, focus, disabled, selected, error, and success states where safely reachable.
- Test at desktop, tablet, and mobile widths, including horizontally scrolling management tabs and modal fit.
- Compare screenshots in both themes and verify computed contrast for core text, muted text, inputs, borders, cards, and focus rings.
- Do not create or alter production records while testing. Clearly report any role/data-specific screens that cannot be exercised live.

## Technical scope
- Primary changes: `src/styles.css` semantic tokens and global native-control rules.
- Shared component changes: existing files under `src/components/ui/` and the existing SPACES design-system components under `src/components/ds/`.
- Targeted presentation-only cleanup in existing feature components where raw controls or hardcoded UI colors bypass the shared system.
- No database migrations, new roles, new accounts, new routes, duplicate components, or architecture changes.
