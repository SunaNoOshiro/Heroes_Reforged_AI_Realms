# Gesture Taxonomy Contract

Module: [UI Shell (M1)](../07-ui-shell.md)

Description:
Land [`docs/architecture/ui-gestures.md`](../../../docs/architecture/ui-gestures.md)
defining the canonical gesture names, detection thresholds, and
event sequences every screen package may bind: `click`,
`double-click`, `right-click`/`context`, `long-press`, and `drag`
plus the drop-acceptance contract. Today only right-click and
tooltip hold-delay are formalized; drag-and-drop, double-click, and
long-press have no canonical names. Numeric thresholds
(`doubleClickWindowMs`, `longPressMs`, `dragThresholdPx`) are
content-driven and live in the ruleset.

Source audit:
[`docs/readiness-audit/03-ui-state-and-interactions.md`](../../../docs/readiness-audit/03-ui-state-and-interactions.md)
(Q58, Issue 3.A-7, Missing Logic bullet 8).

Read First:
- [`docs/implementation-plans/03-ui-state-and-interactions-plan.md`](../../../docs/implementation-plans/03-ui-state-and-interactions-plan.md)
- [`docs/architecture/ui-input-arbitration.md`](../../../docs/architecture/ui-input-arbitration.md)
- [`docs/architecture/ui-renderer-seam.md`](../../../docs/architecture/ui-renderer-seam.md)
- `docs/architecture/wiki/screens/46-hero-screen/spec.md`
- `docs/architecture/wiki/screens/51-split-stack-dialog/spec.md`
- `docs/architecture/wiki/screens/52-artifact-combine-dialog/spec.md`
- `docs/architecture/wiki/screens/26-marketplace/spec.md`

Inputs:
- Audit Q58 in
  [`docs/readiness-audit/03-ui-state-and-interactions.md`](../../../docs/readiness-audit/03-ui-state-and-interactions.md)
- Existing tooltip and drag references in screen packages
- The `ruleset.ui.timing` block in
  [`content-schema/schemas/ruleset.schema.json`](../../../content-schema/schemas/ruleset.schema.json)

Outputs:
- `docs/architecture/ui-gestures.md`

Owned Paths:
- `docs/architecture/ui-gestures.md`

Dependencies:
- mvp.07-ui-shell.15-input-arbitration

Acceptance Criteria:
- The taxonomy enumerates `click`, `double-click`, `right-click` /
  `context`, `long-press`, `drag` (with `dragstart`, `dragmove`,
  `dragend`), and pinch / pan / wheel as viewport-only.
- `state.ui.drag.{sourceId, sourceKind, ghostPosition,
  acceptedTargetIds}` is documented as UI-only and excluded from
  saves and replays.
- Drop targets declare an `accepts: DragKind[]` array; legal
  targets highlight while a drag is in flight.
- Cancellation defers to the Esc ladder in
  [`ui-input-arbitration.md`](../../../docs/architecture/ui-input-arbitration.md);
  releasing over a non-accepting target is a cancel.
- A Mermaid state diagram shows the gesture FSM (idle → pressed →
  click / double-click / long-press / drag → drop / cancel).
- Numeric thresholds (300 / 400 ms double-click window, 600 ms
  long-press, 8 px drag threshold) reference
  `ruleset.ui.timing.*` so they remain tunable as content.
- [`docs/architecture/wiki/README.md`](../../../docs/architecture/wiki/README.md)
  requires `interactions.md` to use canonical gesture names from
  this doc.

Verify:
- npm run validate:links
- npm run validate:tasks
- npm run validate

Estimated Time:
- 4 hours
