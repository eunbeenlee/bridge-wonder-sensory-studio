# Bridge Wonder V52 — Warm Studio Interface (2026)

## Scope
This release is **front-end only**. The six V51 independent editors and the central `/staff/` sign-in/dashboard receive a coordinated visual refresh. No changes to Google Apps Script, Google Sheets, server authentication, staff roles, original fee records or document-generation behavior. The public studio site is untouched.

## Visual direction
A calm four-color system (forest #355546, muted mint #c8dfd0, warm ivory #fffdf7, subdued coral #cf8064). Original illustrated beaver asset optimized to **~36 KB WebP** with transparency. Friendly, naturally-written Korean labels. Soft tactile cards, dashboard bento-grid, uncluttered filters, consistent forms and mobile-friendly navigation. No external UI or animation packages.

## Updated routes
`/staff/` — revised login copy, illustrated greeting and dashboard banner. Existing menus and server calls remain.
`/staff/curriculum/`, `/staff/materials/`, `/staff/costs/`, `/staff/settings/`, `/staff/content/`, `/staff/templates/` — each retains V51 editor wiring with new shared styling and more natural static copy.

## Performance and safety
- Shared ~10 KB and ~13 KB CSS assets, one ~36 KB local WebP asset, no additional remote font or scripts.
- Illustration uses the same file across pages, benefiting from browser cache. Dashboard image has `loading=lazy`, all decorative visuals use CSS only.
- No new browser storage, network requests, third-party libraries or credential handling.
- `prefers-reduced-motion` suppresses visual animation; inputs keep visible focus indicators and sufficient touch targets.
- Actual server speed depends on existing Apps Script, which has not been modified.

## Google deployment
**None now.** V51's bidirectional editing requires its own Apps Script update in a future session. This visual release does not unlock remote data writes by itself.

## Verification
`node tests/staff-design-v52.test.cjs` plus existing repository checks. Compare login at desktop/mobile sizes and verify original account access for owner, director, teacher and frontdesk in the live environment.
