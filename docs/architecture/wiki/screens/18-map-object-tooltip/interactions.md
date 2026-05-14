# Screen 18: Map Object Tooltip
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Companion Docs
- [`ui-state-contract.md` § Tooltip Lifecycle](../../../ui-state-contract.md#tooltip-lifecycle) — per-tick re-resolution, auto-dismiss invariants, `ruleset.ui.timing` constants.
- [`screen-command-coverage.json`](../../../screen-command-coverage.json) — every token below is local-ui via the `OPEN_` / `PIN_` / `CLOSE_` prefix list.

### Purpose
Right-click informational tooltip for adventure map objects (heroes, towns, mines, resources, neutral stacks, treasures). Presentation-only.

### Actions
All tokens are local-ui; none enter the engine command log. Animation/audio for every row follows § Animation & Audio below.

| UI Element | Action ID | Type | Next Screen | Token | Data Updated |
| --- | --- | --- | --- | --- | --- |
| Right-click object | `tooltip.open` | local-ui | Current screen | `OPEN_OBJECT_TOOLTIP` | Sets `state.ui.adventure.hoverObjectId` and the tooltip UI draft. |
| Pin tooltip | `tooltip.pin` | local-ui | Current screen | `PIN_OBJECT_TOOLTIP` | Writes `state.ui.tooltips.pinnedObjectId`; tooltip persists while the pointer moves. |
| Open details | `tooltip.details` | navigation | `09-map-object-dialog` or `50-creature-info` | `OPEN_TOOLTIP_DETAIL` | Routes to the detailed viewer the underlying object owns. The route exit is local-ui; gameplay commands fire from the destination screen, not here. |
| Close | `tooltip.close` | local-ui | Current screen | `CLOSE_OBJECT_TOOLTIP` | Clears `state.ui.tooltips.pinnedObjectId` and the UI draft. |

### Animation & Audio
- Fade-in after `ruleset.ui.timing.tooltipHoldDelayMs` (default 350 ms) of pointer dwell; fade-in duration `tooltipFadeInMs` (default 120 ms).
- Anchor tracks the object hex while visible; pinning shows a brass-tack indicator.
- Fade-out duration `tooltipFadeOutMs` (default 80 ms) on close, route, or invalidate.
- No hard-coded delays in screen code; all values resolve through `ruleset.ui.timing` per [`ui-state-contract.md § Tooltip Lifecycle`](../../../ui-state-contract.md#tooltip-lifecycle).
- Audio: `audio.ui.hover` on initial open, `audio.ui.click` on pin or route, none on auto-invalidate.
- Reduced-motion mode replaces fades with instant transitions; state bindings are unchanged.

### State Changes
- `state.ui.adventure.hoverObjectId` refreshes `hoverObject` on hover/select transitions.
- `selectors.mapObjects.publicTooltipInfo` refreshes `publicInfo` every reducer tick; a `null` result auto-dismisses the tooltip with a `feedback.tooltip.invalidate` animation and clears `pinnedObjectId` per [`ui-state-contract.md § Per-tick Re-resolution`](../../../ui-state-contract.md#per-tick-re-resolution).
- `selectors.scouting.hiddenTooltipFields` refreshes `hiddenGuard` on visibility changes; ownership change re-renders the body against the new scope.
- `state.ui.tooltips.pinnedObjectId` is the only persisted-shape slot; UI-draft and hover slots are excluded from saves and replays per [`determinism.md` § UI Draft Slice](../../../determinism.md#ui-draft-slice).
- `state.ui.pointer.anchorRect` carries screen-space placement only.

### Navigation Outcomes
- `tooltip.details` routes to `09-map-object-dialog` (towns, mines, generic interactables) or `50-creature-info` (neutral stacks, hero army units) after the fade-out completes. The destination screen runs its own guards; this screen has none.

### Disabled And Error Cases
- This screen has no enable/disable gating: the tooltip is presentation-only and renders whatever the visibility-filtered selectors return.
- On `selectors.mapObjects.publicTooltipInfo === null`, auto-dismiss (no localized error; the change is passive per [`ui-state-contract.md § Tooltip Lifecycle`](../../../ui-state-contract.md#tooltip-lifecycle)).
- Missing presentation assets may use the resolver fallback. Missing gameplay records or unresolved content IDs fail loudly upstream (in the selectors), before any tooltip renders.
- If a route from `tooltip.details` is rejected at the destination, this screen plays the fade-out anyway; rejection text comes from the destination via `formatUserError(err, locale)` per [`error-formatter.md`](../../../error-formatter.md). Never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.

---

## 🔍 Sync Check

- **UI: ✔** — Action IDs (`tooltip.open|pin|details|close`) and tokens (`OPEN_OBJECT_TOOLTIP`, `PIN_OBJECT_TOOLTIP`, `OPEN_TOOLTIP_DETAIL`, `CLOSE_OBJECT_TOOLTIP`) match sibling `data-contracts.md` and the prefix-match rules in [`screen-command-coverage.json`](../../../screen-command-coverage.json). State bindings match sibling `spec.md` § State Bindings.
- **Schema: ✔** — `ruleset.ui.timing.tooltipHoldDelayMs | tooltipFadeInMs | tooltipFadeOutMs` defined in [`ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) (lines 111–113). All four tokens are local-ui by prefix match, so none must appear in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json).
- **Tasks: ✔** — Owning runtime task `mvp.05-adventure-map.09-map-object-dialogs` consumes this file (its Read First lists it). Lifecycle/constants owner `mvp.07-ui-shell.17-tooltip-lifecycle` ships the `ui.timing` block these durations reference.

## ⚠ Issues

_None._
