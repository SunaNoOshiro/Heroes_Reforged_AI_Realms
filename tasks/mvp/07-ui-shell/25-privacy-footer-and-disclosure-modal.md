# Privacy Footer and Disclosure Modal

Module: [UI Shell (M0)](../07-ui-shell.md)

Description:
Add the privacy footer link to screen
[`01-main-menu`](../../../docs/architecture/wiki/screens/01-main-menu/)
that opens an in-app modal rendering
[`docs/architecture/privacy.md`](../../../docs/architecture/privacy.md)
via the `OPEN_PRIVACY_POLICY` command. Add the
`PrivacyDisclosureModal` to screen
[`56-options`](../../../docs/architecture/wiki/screens/56-options/)
that opens automatically when
`state.privacy.disclosureSeenVersion < state.privacy.currentDisclosureVersion`.
Wire the load-gate so no analytics SDK loads while
`state.privacy.options.analyticsOptIn === false`.

Plan 22 § 3 — Privacy footer link + Privacy disclosure modal.

Read First:
- [`docs/implementation-plans/22-privacy-retention-and-error-leaks-plan.md`](../../../docs/implementation-plans/22-privacy-retention-and-error-leaks-plan.md)
- [`docs/architecture/privacy.md`](../../../docs/architecture/privacy.md)
- [`docs/architecture/wiki/screens/56-options/`](../../../docs/architecture/wiki/screens/56-options/)
- [`docs/architecture/data-inventory.md`](../../../docs/architecture/data-inventory.md)

Inputs:
- `OPEN_PRIVACY_POLICY` and `ACKNOWLEDGE_PRIVACY_DISCLOSURE` tokens.
- The `PrivacyDisclosureModal` and `PrivacyFooter` UI components
  registered in
  [`ui-component-registry.example.json`](../../../content-schema/examples/ui-component-registry.example.json).

Outputs:
- Mockup edits on screen 01 (footer row).
- `mockup.html` / `spec.md` / `interactions.md` / `data-contracts.md`
  updates on screen 56 declaring the disclosure modal and the
  acknowledge command.

Owned Paths:
- `docs/architecture/wiki/screens/01-main-menu/` (additive footer row).

Owned Paths (shared):
- `docs/architecture/wiki/screens/56-options/` is the **primary
  package** of `mvp.07-ui-shell.22-privacy-pane-in-options` (Plan 21);
  this task adds the disclosure modal **additively** and does not
  rewrite the privacy pane.
- `docs/architecture/command-schema.md` is the **primary contract**
  of the dispatcher task family; this task adds the
  `OPEN_PRIVACY_POLICY` and `ACKNOWLEDGE_PRIVACY_DISCLOSURE` rows
  **additively**.

Dependencies:
- mvp.02-content-schemas.40-privacy-and-legal-docs
- mvp.07-ui-shell.22-privacy-pane-in-options

Acceptance Criteria:
- Screen 01 mockup renders a footer row with `Privacy · Credits ·
  Version` and binds `OPEN_PRIVACY_POLICY` to the privacy entry.
- Screen 56 declares `state.privacy.disclosureSeenVersion` and
  `state.privacy.currentDisclosureVersion` in
  `data-contracts.md`.
- The disclosure modal renders every row of `data-inventory.md`
  with retention TTL.
- `npm run validate:ui-components` and `npm run validate:commands`
  pass.

Owned Paths (shared) acceptance:
- `docs/architecture/wiki/screens/56-options/` is **owned by**
  `mvp.07-ui-shell.22-privacy-pane-in-options` (the primary owner
  of the Privacy pane and its toggle commands). This task is
  **additive**: one new modal (`PrivacyDisclosureModal`) is added
  plus two acknowledgement state bindings; the existing toggle
  rows, the salt-fingerprint readout, and the "Forget me" entry
  must not rewrite anything else.
- `docs/architecture/command-schema.md` is **owned by** the
  dispatcher task family (the primary contract). This task is
  **additive**: it adds the `OPEN_PRIVACY_POLICY` and
  `ACKNOWLEDGE_PRIVACY_DISCLOSURE` rows under
  § UGC, Privacy & Content-Report Commands; existing command
  rows must not rewrite anything else.

Verify:
- npm run validate

Estimated Time:
- 4 hours
