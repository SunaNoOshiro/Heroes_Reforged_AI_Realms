# Erasure Receipt Modal

Module: [UI Shell (M0)](../07-ui-shell.md)

Description:
Add the `ErasureReceiptModal` to screen
[`54-system-menu`](../../../docs/architecture/wiki/screens/54-system-menu/)
and bind the new `REQUEST_ERASURE_RECEIPT` command. The modal renders
the receipt JSON
([`erasure-receipt.schema.json`](../../../content-schema/schemas/erasure-receipt.schema.json))
and offers "Copy to clipboard." When the user is in an active
multiplayer session, the modal also offers "Request server-side
erasure" that envelopes the receipt for the local outbound
`erasure-queue`. Cross-link
[`docs/legal/erasure-process.md`](../../../docs/legal/erasure-process.md)
for the manual fallback.

Plan 22 § 3 — Erasure-receipt UX on system menu.

Read First:
- [`docs/implementation-plans/22-privacy-retention-and-error-leaks-plan.md`](../../../docs/implementation-plans/22-privacy-retention-and-error-leaks-plan.md)
- [`docs/architecture/privacy.md`](../../../docs/architecture/privacy.md)
- [`docs/architecture/wiki/screens/54-system-menu/`](../../../docs/architecture/wiki/screens/54-system-menu/)
- [`docs/legal/erasure-process.md`](../../../docs/legal/erasure-process.md)

Inputs:
- `REQUEST_ERASURE_RECEIPT` command tokens.
- The four schemas authored by `mvp.02-content-schemas.41-error-and-audit-schemas`.
- Plan 21's `WIPE_LOCAL_DATA` handler.

Outputs:
- Updates to the screen-54 package: `spec.md`, `interactions.md`,
  `data-contracts.md`, `mockup.html` (receipt modal frame).
- New `ErasureReceiptModal` UI-component-registry row.

Owned Paths:
- _(additive screen edits + UI-component-registry row only)_

Owned Paths (shared):
- `docs/architecture/wiki/screens/54-system-menu/` is the **primary
  package** of `mvp.07-ui-shell` (Plan 21 added the "Forget me"
  entry); this task adds the receipt modal **additively** and does
  not rewrite Plan 21's "Forget me" row.
- `docs/architecture/command-schema.md` is the **primary contract**
  of the dispatcher task family; this task adds the
  `REQUEST_ERASURE_RECEIPT` row **additively**.

Dependencies:
- mvp.02-content-schemas.40-privacy-and-legal-docs
- mvp.02-content-schemas.41-error-and-audit-schemas
- mvp.08-persistence.14-wipe-local-data-handler

Acceptance Criteria:
- The screen-54 `data-contracts.md` references both
  `audit-log-entry.schema.json` and `erasure-receipt.schema.json`.
- `interactions.md` adds an "Erasure receipt" row binding
  `REQUEST_ERASURE_RECEIPT`.
- The receipt modal carries `signalingSessionId` only when the user
  is in an active multiplayer session.
- `npm run validate:ui-components` and `npm run validate:commands`
  pass.

Owned Paths (shared) acceptance:
- `docs/architecture/wiki/screens/54-system-menu/` is **owned by**
  the screen-package-contract-sweep task family under
  `mvp.07-ui-shell` (the primary owner of the system-menu package).
  This task is **additive**: one new modal
  (`ErasureReceiptModal`) is added plus an "Erasure receipt" action
  row, an "Account & Data" footer link group, and two new schema
  references; Plan 21's "Forget me" entry, the Save / Load /
  Options / Resume / Manage packs / Safe mode rows, and the
  caller-route logic must not rewrite anything else.
- `docs/architecture/command-schema.md` is **owned by** the
  dispatcher task family (the primary contract). This task is
  **additive**: it adds the `REQUEST_ERASURE_RECEIPT` row under
  § UGC, Privacy & Content-Report Commands; existing command
  rows must not rewrite anything else.

Verify:
- npm run validate

Estimated Time:
- 4 hours
