# URL Routing Contract

Status: planned

Module: [UI Shell](../07-ui-shell.md)

Description:
Implement the deep-link contract declared in
[`docs/architecture/url-routing.md`](../../../docs/architecture/url-routing.md):
parse only the closed list of query params, validate the shape, and
route through
[`60-confirmation-dialog`](../../../docs/architecture/wiki/screens/60-confirmation-dialog/)
before any state-changing command fires. Honors the fragment
discipline pinned by
[`62-multiplayer-setup/spec.md`](../../../docs/architecture/wiki/screens/62-multiplayer-setup/spec.md).

Plan 23 / Q443.

Read First:
- [`docs/architecture/url-routing.md`](../../../docs/architecture/url-routing.md)
- `docs/architecture/wiki/screens/60-confirmation-dialog/spec.md`
- `docs/architecture/wiki/screens/60-confirmation-dialog/interactions.md`
- `docs/architecture/wiki/screens/62-multiplayer-setup/spec.md`
- [`docs/architecture/lobby-identifiers.md`](../../../docs/architecture/lobby-identifiers.md)

Inputs:
- Closed param list: `?lobby=`, `?campaign=`, `?packId=`, `?import=`.
- Fragment helper from
  [`docs/architecture/multiplayer-security.md`](../../../docs/architecture/multiplayer-security.md).

Outputs:
- `src/ui/routing/url-handler.ts`
- `src/ui/routing/__tests__/url-handler.test.ts`

Owned Paths:
- `src/ui/routing/`

Dependencies:
- mvp.07-ui-shell.11-screen-router-fsm
- mvp.07-ui-shell.28-confirmation-dialog-hardening

Acceptance Criteria:
- The screen-router FSM's URL-handler module is the only dispatch
  site for the closed param list per
  `docs/architecture/wiki/screens/60-confirmation-dialog/interactions.md`.
- `?lobby=` dispatches `REQUEST_CONFIRMATION` with
  `severity: 'warning'`, `pendingAction: 'JOIN_MULTIPLAYER_SESSION'`.
- `?packId=` dispatches `severity: 'critical'`,
  `requireType: 'INSTALL'`.
- `?import=` dispatches `severity: 'critical'`,
  `requireType: 'IMPORT'`.
- Unknown params are dropped silently with one console warning per
  session.
- `registerProtocolHandler` calls remain banned.
- Underlying commands never fire from URL parse alone — the
  confirmation dialog is the single dispatch boundary.

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
