# Screen 51: Split Stack Dialog
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Army stack split dialog used by hero screen, town garrison, hero meeting, and garrison structures.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Change quantity | `splitStack.changeQuantity` | local-ui | Current screen | `SET_SPLIT_STACK_QUANTITY` | Updates preview only. | Slider knob ticks, source and destination counts preview live, OK splits the stack into two sliding badges, and Cancel snaps preview back. |
| Set one | `splitStack.one` | local-ui | Current screen | `SET_SPLIT_STACK_ONE` | Sets quantity to one if legal. | Slider knob ticks, source and destination counts preview live, OK splits the stack into two sliding badges, and Cancel snaps preview back. |
| Set max | `splitStack.max` | local-ui | Current screen | `SET_SPLIT_STACK_MAX` | Sets max legal split. | Slider knob ticks, source and destination counts preview live, OK splits the stack into two sliding badges, and Cancel snaps preview back. |
| Confirm | `splitStack.confirm` | command | Previous screen | `SPLIT_ARMY_STACK` | Updates source and destination army slots. | Slider knob ticks, source and destination counts preview live, OK splits the stack into two sliding badges, and Cancel snaps preview back. |
| Cancel | `splitStack.cancel` | navigation | Previous screen | `CANCEL_SPLIT_STACK` | Discards split draft. | Slider knob ticks, source and destination counts preview live, OK splits the stack into two sliding badges, and Cancel snaps preview back. |

### State Changes
- `state.ui.splitStack.sourceStackRef` refreshes `sourceStack` after the owning reducer or local UI draft changes.
- `state.ui.splitStack.destinationSlotRef` refreshes `destinationSlot` after the owning reducer or local UI draft changes.
- `state.ui.splitStack.quantity` refreshes `quantity` after the owning reducer or local UI draft changes.
- `selectors.armies.splitStackGuard` refreshes `splitGuard` after the owning reducer or local UI draft changes.
- `state.ui.splitStack.returnScreen` refreshes `caller` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Confirm can route to Previous screen after guard approval and exit animation.
- Cancel can route to Previous screen after guard approval and exit animation.

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
| Confirm (`SPLIT_ARMY_STACK`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
