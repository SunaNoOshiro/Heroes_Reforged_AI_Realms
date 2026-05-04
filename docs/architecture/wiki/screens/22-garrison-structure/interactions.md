# Screen 22: Garrison Structure
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Adventure garrison transfer screen for moving stacks between visiting hero and standalone garrison structure.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Drag stack | `garrison.dragStack` | local-ui | Current screen | `START_GARRISON_STACK_DRAG` | Creates drag draft only. | Dragged stack ghost follows the cursor, legal slots glow, swaps crossfade, and rejected drops snap back with a dull thud. |
| Drop stack | `garrison.dropStack` | command | Current screen | `TRANSFER_GARRISON_STACK` | Moves, merges, swaps, or rejects stack transfer. | Dragged stack ghost follows the cursor, legal slots glow, swaps crossfade, and rejected drops snap back with a dull thud. |
| Split stack | `garrison.splitStack` | navigation | `51-split-stack-dialog` | `OPEN_SPLIT_STACK_DIALOG` | Creates split quantity draft. | Dragged stack ghost follows the cursor, legal slots glow, swaps crossfade, and rejected drops snap back with a dull thud. |
| Close | `garrison.close` | navigation | `07-adventure-map` | `CLOSE_GARRISON_STRUCTURE` | Returns to visited map tile. | Dragged stack ghost follows the cursor, legal slots glow, swaps crossfade, and rejected drops snap back with a dull thud. |

### State Changes
- `state.heroes.byId[selected].army` refreshes `heroArmy` after the owning reducer or local UI draft changes.
- `state.mapObjects.byId[garrisonId].army` refreshes `garrisonArmy` after the owning reducer or local UI draft changes.
- `state.ui.garrisonTransfer.selectedStackRef` refreshes `selectedStack` after the owning reducer or local UI draft changes.
- `selectors.armies.garrisonTransferRules` refreshes `transferRules` after the owning reducer or local UI draft changes.
- `state.ui.garrisonTransfer.splitQuantity` refreshes `splitDraft` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Split stack can route to `51-split-stack-dialog` after guard approval and exit animation.
- Close can route to `07-adventure-map` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.
- Errors are produced by `formatUserError(err, locale)` declared in [`docs/architecture/error-formatter.md`](../../../error-formatter.md); never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.

## Error surfaces

Per [`error-ux.md`](../../../error-ux.md) § 5, this screen inherits
the default code → surface mapping from § 2. The table below
maps each action whose `Type` column is `command` to its default
surface for this screen's dominant error domain. A row whose Notes
column reads `override` replaces the § 2 default for that action;
otherwise the default applies. Specific error codes (e.g.
`DISPATCHER_<token>`, `STORAGE_<token>`) land alongside the engine
reducer that owns each command and trigger the gate in
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing for them.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Drop stack (`TRANSFER_GARRISON_STACK`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
