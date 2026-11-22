# Bridge Wonder V51 — Staff content editor

## New lightweight, fully separate URLs
- /staff/curriculum/ — structured lesson drafts
- /staff/materials/ — materials and costs per unit
- /staff/costs/ — owner-only planning costs
- /staff/settings/ — studio settings repository
- /staff/content/ — editable internal copy
- /staff/templates/ — private document wording

All use the existing staff session, role permissions, and Google-only Apps Script transport. These pages load three small scripts and one stylesheet, rather than the entire existing dashboard.

## Required Apps Script deployment
**GitHub Pages does not deploy Apps Script.** Copy `StudioContentV51.gs` into the existing private Staff project, then update `StaffBridge.gs` to add three allowlisted methods (`staff51ListContent`, `staff51SaveContent`, `staff51ArchiveContent`). In Apps Script, edit the existing staff Web App deployment and select **New version**. Do not create a second deployment or edit the public enrollment project.

Run optional `setupBridgeWonderContentV51()` to create six additive BW51 tabs. First authorized save can also initialize an absent tab.

Sheet edits are read on page load and 45-second foreground polling. The server hashes the actual displayed rows, so manual edits are detected without installing edit triggers. Concurrent saves reject stale etags. Only one section loads per request.

## Compatibility/safety
This is an independent operational-content layer, **not** a mutation of the current tuition contracts, public site, finance ledger, payroll, existing lesson-plan files, or generated PDFs. No child, guardian or medical PII should be entered. The user session never appears in URLs. Server permission gates are mandatory on every request.

## Installation package
`Bridge_Wonder_V51_Staff_Bidirectional_Sheets_Update.zip` (separately supplied) has the two required GAS files, 6 web entry pages, shared JS/CSS, and a Node mock-Sheets regression test.
