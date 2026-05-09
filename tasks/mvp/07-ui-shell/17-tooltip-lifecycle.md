# Tooltip Lifecycle + Numeric Timing Constants

Module: [UI Shell (M1)](../07-ui-shell.md)

Description:
Land the tooltip lifecycle contract — per-tick re-resolution against
`selectors.mapObjects.publicTooltipInfo` and
`selectors.scouting.hiddenTooltipFields`, auto-dismiss on stale
anchor, ownership-change re-render — plus the numeric `ruleset.ui`
block that pins tooltip, gesture, and animation thresholds. Today
the tooltip flow is well-specified at open/pin/close but does not
say what happens when the underlying object dies, gets fogged, or
changes ownership. The hold-delay duration is also unstated; two
screens use 200 ms vs. 800 ms today, feeling like bugs to
playtesters. Constants live in the ruleset so QA can tune them
without code changes.

Read First:
- [`docs/architecture/ui-state-contract.md`](../../../docs/architecture/ui-state-contract.md)
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)
- `docs/architecture/wiki/screens/18-map-object-tooltip/spec.md`
- `docs/architecture/wiki/screens/18-map-object-tooltip/interactions.md`
- `docs/architecture/wiki/screens/50-creature-info/spec.md`
- `docs/architecture/wiki/screens/19-status-bar/spec.md`

Inputs:
- The Tooltip Lifecycle section anchor in
  [`docs/architecture/ui-state-contract.md`](../../../docs/architecture/ui-state-contract.md)
- The existing `ruleset.schema.json` shape under
  [`content-schema/schemas/ruleset.schema.json`](../../../content-schema/schemas/ruleset.schema.json)

Outputs:
- Additions to
  [`docs/architecture/ui-state-contract.md` § Tooltip Lifecycle](../../../docs/architecture/ui-state-contract.md#tooltip-lifecycle)
- The `ui.timing` and `ui.editor` blocks in
  [`content-schema/schemas/ruleset.schema.json`](../../../content-schema/schemas/ruleset.schema.json)
- Updated canonical example
  [`content-schema/examples/records/rulesets/baseline.ruleset.json`](../../../content-schema/examples/records/rulesets/baseline.ruleset.json)
  with the new block

Owned Paths (shared):
- `docs/architecture/ui-state-contract.md`
- `content-schema/schemas/ruleset.schema.json`
- `content-schema/examples/records/rulesets/baseline.ruleset.json`

Dependencies:
- mvp.07-ui-shell.12-component-state-matrix
- mvp.02-content-schemas.06-ruleset-schema

Acceptance Criteria:
- This task is additive: the tooltip-lifecycle text only adds
  sections to the host doc primarily owned by
  [`12-component-state-matrix.md`](./12-component-state-matrix.md);
  the ruleset edits add an optional `ui` block without changing the
  existing `constants` or `formulas` shape, so they cannot rewrite
  the schema primarily owned by
  [`../02-content-schemas/06-ruleset-schema.md`](../02-content-schemas/06-ruleset-schema.md).
  This task must not rewrite combat-math constants or formula
  definitions, which remain owned by their original tasks.
- The tooltip controller re-resolves the pinned tooltip body every
  tick. A `null` result auto-dismisses the tooltip with a
  `feedback.tooltip.invalidate` animation; the pin clears; no
  localized error is shown.
- Ownership change re-renders the tooltip body against the new
  visibility scope; multiplayer captures cannot leak fogged
  information through stale tooltips.
- The `ui.timing` block declares `tooltipHoldDelayMs` (default
  `350`), `tooltipFadeInMs` (default `120`), `tooltipFadeOutMs`
  (default `80`), `doubleClickWindowMs` (default `400`),
  `longPressMs` (default `600`), `dragThresholdPx` (default `8`),
  `inputDebounceMs` (default `50`), and `endTurnAnimationMaxMs`
  (default `4000`). All values are integers ≥ 0; the schema uses
  `additionalProperties: false`.
- The `ui.editor` block declares `maxHistory` (default `200`).
- The canonical example
  [`content-schema/examples/records/rulesets/baseline.ruleset.json`](../../../content-schema/examples/records/rulesets/baseline.ruleset.json)
  validates against the extended schema and includes the new
  block.
- The tooltip screens
  ([`18-map-object-tooltip`](../../../docs/architecture/wiki/screens/18-map-object-tooltip/),
  [`50-creature-info`](../../../docs/architecture/wiki/screens/50-creature-info/))
  consume the timing constants — no hard-coded delays remain in
  their `interactions.md` or `data-contracts.md`. The per-screen
  edits land via
  [`13-screen-package-contract-sweep.md`](./13-screen-package-contract-sweep.md);
  the constant-drift CI check passes.

Verify:
- npm run validate:contracts
- npm run validate:tasks
- npm run validate
- npm test

Estimated Time:
- 4 hours
