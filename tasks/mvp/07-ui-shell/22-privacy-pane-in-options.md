# Privacy Pane In Options Screen

Module: [UI Shell](../07-ui-shell.md)

Description:
Add a "Privacy" tab to [`56-options`](../../../docs/architecture/wiki/screens/56-options/)
covering display-name mode, analytics opt-in, mature-content gate,
"Forget me" entry, and a salt-fingerprint read-out. Wires the
`TOGGLE_HASHED_DISPLAY_NAME`, `TOGGLE_ANALYTICS_OPT_IN`,
`TOGGLE_MATURE_CONTENT_GATE`, `RESET_ANALYTICS_ID`, and
`WIPE_LOCAL_DATA` commands.

Read First:
- [`docs/architecture/wiki/screens/56-options/spec.md`](../../../docs/architecture/wiki/screens/56-options/spec.md)
- [`docs/architecture/wiki/screens/56-options/interactions.md`](../../../docs/architecture/wiki/screens/56-options/interactions.md)
- [`docs/architecture/data-inventory.md`](../../../docs/architecture/data-inventory.md)
- [`docs/architecture/persistence.md`](../../../docs/architecture/persistence.md)

Inputs:
- `privacy-options.schema.json`
- Localization keys under `ui.privacy.*` per
  [`ugc-safety.md` § Localization Keys](../../../docs/architecture/ugc-safety.md#7-localization-keys).

Outputs:
- `src/ui/options/privacy-pane.tsx`
- `src/ui/options/__tests__/privacy-pane.test.tsx`

Owned Paths:
- `src/ui/options/privacy-pane.tsx`
- `src/ui/options/__tests__/privacy-pane.test.tsx`

Owned Paths (shared):
- `src/ui/options/options-screen.tsx` (extends with the Privacy tab)

Dependencies:
- mvp.02-content-schemas.35-privacy-options-schema
- mvp.08-persistence.13-display-name-hash-and-salt
- mvp.08-persistence.14-wipe-local-data-handler

Acceptance Criteria:
- Privacy tab in `docs/architecture/wiki/screens/56-options/`
  renders the display-name mode toggle, analytics opt-in toggle,
  mature-content gate toggle, "Reset analytics ID" button,
  "Forget me on this device" entry, and a read-only salt
  fingerprint.
- Each toggle dispatches its declared command and persists to
  IndexedDB `hr-profile.privacy`.
- "Forget me" routes through `docs/architecture/wiki/screens/60-confirmation-dialog/`
  before dispatching `WIPE_LOCAL_DATA scope=all confirmed=true`.

Owned Paths (shared) acceptance:
- `docs/architecture/wiki/screens/56-options/` is **owned by** the
  screen-package-contract-sweep tasks; this task is additive (one
  new tab, new state bindings, new localization keys under
  `ui.privacy.*`) and must not rewrite the existing tabs.

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
