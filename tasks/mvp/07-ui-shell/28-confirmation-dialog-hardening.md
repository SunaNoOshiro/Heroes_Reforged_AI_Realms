# Confirmation Dialog Hardening

Module: [UI Shell](../07-ui-shell.md)

Description:
Promote `severity` on screen
[`60-confirmation-dialog`](../../../docs/architecture/wiki/screens/60-confirmation-dialog/)
from styling-only to a load-bearing input gate. Add the
`confirmDelayMs` and `requireType` payload fields, the per-severity
defaults, and the `RequireTypeChallenge` component. Wire the
`ConfirmEnabled` predicate so the `Confirm` button stays disabled
until the pop-in animation completes, the delay elapses, and the
optional type challenge passes.

Plan 23 / Critical Fix 1.

Read First:
- `docs/architecture/wiki/screens/60-confirmation-dialog/spec.md`
- `docs/architecture/wiki/screens/60-confirmation-dialog/interactions.md`
- `docs/architecture/wiki/screens/60-confirmation-dialog/data-contracts.md`
- `docs/architecture/wiki/screens/60-confirmation-dialog/architecture.md`
- `docs/architecture/wiki/screens/60-confirmation-dialog/mockup.html`

Inputs:
- Per-severity defaults: `info → 0`, `warning → 750`, `critical → 1500`.
- `requireType` is opt-in for `severity: critical` only.

Outputs:
- `src/ui/confirmation/confirmation-dialog.tsx` (extend existing).
- `src/ui/confirmation/builder.ts` — single dispatch site for
  `REQUEST_CONFIRMATION` that applies the per-severity defaults.
- `src/ui/confirmation/__tests__/confirmation-dialog.test.tsx`.

Owned Paths:
- `src/ui/confirmation/`

Dependencies:
- mvp.07-ui-shell.06-command-hook-ui-dispatch-re-render
- mvp.07-ui-shell.14-modal-stack

Acceptance Criteria:
- Layout matches `docs/architecture/wiki/screens/60-confirmation-dialog/mockup.html`.
- Every action in `docs/architecture/wiki/screens/60-confirmation-dialog/interactions.md` has a handler.
- `state.ui.confirmation` carries `severity`, `openedAt`,
  `confirmDelayMs`, `requireType`, `typedConfirmText`,
  `popInComplete` per the data-contracts file.
- `Confirm` is disabled while `now() - openedAt < confirmDelayMs`,
  `popInComplete === false`, or
  `(requireType != null && typedConfirmText !== requireType)`.
- The builder applies the per-severity defaults when the caller omits
  `confirmDelayMs`.
- A `severity: critical` payload without `confirmDelayMs` inherits
  `1500`.
- Esc on the modal always routes to `CANCEL_PENDING_CONFIRMATION`,
  regardless of the predicate's state.

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
