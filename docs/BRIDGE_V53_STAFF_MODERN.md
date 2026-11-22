# Bridge Wonder V53 — Clean & Young Staff Refresh
Date: 2026-11-22

## Why
The previous V52 beaver illustration and excessively playful microcopy made internal work screens feel childish. This release removes the mascot and gives the **staff workspace itself** a fresh, crisp, usable visual system.

## Changes
- Remove beaver art from staff login, dashboard hero, and six standalone editors; delete unused WebP asset.
- Add one shared, lightweight CSS `assets/css/staff-modern-v53.css` loaded after V52 layers. Existing production CSS remains compatible.
- Clear mint, soft blue, dark-green text, better field contrast, card rhythm and keyboard focus.
- Replace unnecessary playful wording with concise, friendly Korean: login, dashboard, saved item list, editor, status and search.
- Avoid network-heavy visual dependencies; no fonts, external JS, animation libraries or third-party imagery.
- Keep parent website, public pages, branding logo, staff login IDs, business workflows and Google Apps Script intact.

## Important
This is **only a UI & copy release**, not a spreadsheet rollout. V51 bidirectional Sheets saving still requires the separate authorized Apps Script installation; don't present the UI as proof of operational saving.
Existing V49 finance, V50 URLs, staff authorization and document generation logic were not changed.
The browser cache for V53 CSS is invalidated using `?v=53.0.0`.

## Verification
Run `npm run check`, `npm test` or `npm run test:visual`.
The V52 visual test has been updated to require mascot removal, and V53 checks verify unchanged entry/login/editor contracts.
