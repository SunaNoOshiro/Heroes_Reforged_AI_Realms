# Component-State Matrix + Cross-Screen UI Contract

Module: [UI Shell (M1)](../07-ui-shell.md)

Description:
Land [`docs/architecture/ui-state-contract.md`](../../../docs/architecture/ui-state-contract.md)
as the host doc for the cross-screen UI rules: the seven normative
component states (`idle`, `hover`, `pressed`, `disabled`, `focused`,
`error`, `loading`), their precedence and composition layers, the
selector purity contract, the tooltip lifecycle, the command
lifecycle, and the editor undo/redo contract. Without this doc, two
AI agents implementing different screens diverge on `disabled +
hover`, focus rings disappear under `disabled`, and `error` overlays
flicker against `loading`. This task is the primary owner of the
host doc; sibling tasks land their sections under
`Owned Paths (shared)`. The seven-state sweep across the existing
65 screen packages is owned by
[`13-screen-package-contract-sweep.md`](./13-screen-package-contract-sweep.md).

Source audit:
[`docs/readiness-audit/03-ui-state-and-interactions.md`](../../../docs/readiness-audit/03-ui-state-and-interactions.md)
(Q52, Q53, Issue 3.A-3, Missing Logic bullet 2).

Read First:
- [`docs/implementation-plans/03-ui-state-and-interactions-plan.md`](../../../docs/implementation-plans/03-ui-state-and-interactions-plan.md)
- [`docs/architecture/overview.md`](../../../docs/architecture/overview.md)
- [`docs/architecture/wiki/README.md`](../../../docs/architecture/wiki/README.md)
- [`docs/architecture/wiki/missing-states.md`](../../../docs/architecture/wiki/missing-states.md)
- `docs/architecture/wiki/screens/07-adventure-map/spec.md`
- `docs/architecture/wiki/screens/24-town-screen/spec.md`
- `docs/architecture/wiki/screens/38-combat-screen/spec.md`
- `docs/architecture/wiki/screens/46-hero-screen/spec.md`

Inputs:
- Audit Q52, Q53 in
  [`docs/readiness-audit/03-ui-state-and-interactions.md`](../../../docs/readiness-audit/03-ui-state-and-interactions.md)
- Existing per-screen `spec.md` Animation Contract sections under
  [`docs/architecture/wiki/screens/`](../../../docs/architecture/wiki/screens/)

Outputs:
- `docs/architecture/ui-state-contract.md` (host doc — Component
  State Matrix, Selector Purity, Tooltip Lifecycle, Command
  Lifecycle, Error State, Undo / Redo sections)
- `docs/architecture/wiki/_templates/animation-states.md` — sweep
  template applied per screen by
  [`13-screen-package-contract-sweep.md`](./13-screen-package-contract-sweep.md)

Owned Paths:
- `docs/architecture/ui-state-contract.md`
- `docs/architecture/wiki/_templates/animation-states.md`

Dependencies:
- None

Acceptance Criteria:
- The host doc enumerates the seven normative states and the
  precedence rules: `disabled` suppresses `hover`/`pressed` but not
  `focused`; `error` overlays every state except `loading`;
  `loading` overlays `idle` only; `focused` is always rendered when
  present.
- A Mermaid composition diagram shows the layer order
  `[base | idle | hover/pressed | disabled | loading | focused ring
  | error overlay]`.
- The Selector Purity section bans `Math.random()`, `Date.now()`,
  `performance.now()`, `crypto.randomUUID()`, and `await` inside
  `src/**/selectors/**`. It points at
  [`10-selector-purity-lint.md`](./10-selector-purity-lint.md) for
  the lint and sentinel test.
- The Tooltip Lifecycle, Command Lifecycle, Error State, and
  Undo/Redo sections exist as section anchors that sibling tasks
  ([`17-tooltip-lifecycle.md`](./17-tooltip-lifecycle.md),
  [`20-command-lifecycle.md`](./20-command-lifecycle.md),
  Issue 3.B-1, [`../../phase-2/08-meta-systems/09-map-editor-undo-redo.md`](../../phase-2/08-meta-systems/09-map-editor-undo-redo.md))
  extend additively.
- [`docs/architecture/overview.md`](../../../docs/architecture/overview.md)
  and [`docs/architecture/wiki/README.md`](../../../docs/architecture/wiki/README.md)
  link the host doc.
- The sweep template enumerates the seven states with one-line
  waiver guidance and references this host doc.

Verify:
- npm run validate:links
- npm run validate:tasks
- npm run validate

Estimated Time:
- 5 hours
