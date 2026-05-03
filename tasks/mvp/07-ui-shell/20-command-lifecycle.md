# Command Lifecycle + In-Flight UI Contract

Status: planned

Module: [UI Shell (M1)](../07-ui-shell.md)

Description:
Land the four-phase command-lifecycle contract in
[`docs/architecture/ui-state-contract.md` § Command Lifecycle](../../../docs/architecture/ui-state-contract.md#command-lifecycle):
**Drafting** (UI-only `state.ui.<screen>.draft.*`), **Pending
confirmation** (`state.ui.confirmation.pendingAction`), **Applied**
(reducer state final), and **Animating**
(`state.ui.animations.activeTimelineId`). Today the synchronous
reducer plus per-domain pending slots (`state.pendingBattle`,
`state.ui.adventure.pathPreview`, `state.ui.targeting.draft`) leave
no canonical "command in-flight" indicator, so end-turn animations
play while the next AI turn has already mutated state and players
double-clicking attack buttons dispatch two commands with different
animation timelines. The animation gate consumed by
[`15-input-arbitration.md`](./15-input-arbitration.md) reads from
the slot defined here.

Source audit:
[`docs/readiness-audit/03-ui-state-and-interactions.md`](../../../docs/readiness-audit/03-ui-state-and-interactions.md)
(Q55, Issue 3.A-11).

Read First:
- [`docs/implementation-plans/03-ui-state-and-interactions-plan.md`](../../../docs/implementation-plans/03-ui-state-and-interactions-plan.md)
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)
- [`docs/architecture/ui-state-contract.md`](../../../docs/architecture/ui-state-contract.md)
- [`docs/architecture/ui-input-arbitration.md`](../../../docs/architecture/ui-input-arbitration.md)
- `docs/architecture/wiki/screens/07-adventure-map/spec.md`
- `docs/architecture/wiki/screens/38-combat-screen/spec.md`
- `docs/architecture/wiki/screens/60-confirmation-dialog/spec.md`

Inputs:
- Audit Q55 in
  [`docs/readiness-audit/03-ui-state-and-interactions.md`](../../../docs/readiness-audit/03-ui-state-and-interactions.md)
- The Command Lifecycle section anchor in
  [`docs/architecture/ui-state-contract.md`](../../../docs/architecture/ui-state-contract.md)
- The animation gate consumer in
  [`docs/architecture/ui-input-arbitration.md`](../../../docs/architecture/ui-input-arbitration.md)

Outputs:
- Additions to
  [`docs/architecture/ui-state-contract.md` § Command Lifecycle](../../../docs/architecture/ui-state-contract.md#command-lifecycle)
- A cross-reference in
  [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)

Owned Paths (shared):
- `docs/architecture/ui-state-contract.md`
- `docs/architecture/state-flow.md`

Dependencies:
- mvp.07-ui-shell.12-component-state-matrix
- mvp.07-ui-shell.15-input-arbitration

Acceptance Criteria:
- This task is additive: the Command Lifecycle section is added
  alongside the existing Component State Matrix, Selector Purity,
  and Tooltip Lifecycle sections in the host doc. The host doc is
  primarily owned by
  [`12-component-state-matrix.md`](./12-component-state-matrix.md);
  this task must not rewrite earlier sections or repurpose
  unrelated rules.
- The four phases are enumerated explicitly: Drafting, Pending
  confirmation, Applied, Animating.
- `state.ui.animations.activeTimelineId: string | null` is added
  to the state-slot inventory and pinned as the gate consumed by
  [`15-input-arbitration.md`](./15-input-arbitration.md).
- The state slot inventory lists `state.ui.<screen>.draft.*`,
  `state.ui.confirmation.pendingAction`, `state.ui.modalStack`,
  `state.ui.animations.activeTimelineId`,
  `state.ui.input.activeModality`, and `state.ui.loading.errors`.
- The single-emit guarantee references
  [`docs/architecture/ui-input-arbitration.md` § Single-emit Rule](../../../docs/architecture/ui-input-arbitration.md#single-emit-rule)
  for the canonical debounce rule.
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)
  cross-references the lifecycle from its turn-loop section.

Verify:
- npm run validate:links
- npm run validate:tasks
- npm run validate

Estimated Time:
- 3 hours
