# Screen 51: Split Stack Dialog
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Army stack split dialog used by the hero screen, town garrison, hero
meeting, and garrison structures. Confirm dispatches the
`SPLIT_ARMY_STACK` reducer; Cancel discards the draft and returns to
the caller route stored on the modal frame.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Drag slider / type amount | `splitStack.changeQuantity` | local-ui | Current screen | `SET_SPLIT_STACK_QUANTITY` | `state.ui.splitStack.quantity`; preview only. | Slider knob ticks; source and destination counts preview live as the value changes. |
| ONE button | `splitStack.one` | local-ui | Current screen | `SET_SPLIT_STACK_ONE` | Sets `quantity = 1` if legal. | Slider knob snaps to the leftmost legal stop; counts update. |
| MAX button | `splitStack.max` | local-ui | Current screen | `SET_SPLIT_STACK_MAX` | Sets `quantity = source.count - 1` (or capped by `splitGuard`). | Slider knob snaps to the rightmost legal stop; counts update. |
| OK button | `splitStack.confirm` | command | Caller route (`state.ui.splitStack.returnScreen`) | `SPLIT_ARMY_STACK` | Updates source and destination army slots after reducer success. | OK splits the stack into two sliding badges; modal closes on reducer success. |
| CANCEL button | `splitStack.cancel` | navigation | Caller route (`state.ui.splitStack.returnScreen`) | `CANCEL_SPLIT_STACK` | Discards split draft; pops the modal frame. | Cancel snaps preview back to the pre-open values; modal closes. |

`SET_SPLIT_STACK_*` and `CANCEL_SPLIT_STACK` are local-ui tokens
covered by the `SET_` / `CANCEL_` prefixes in
[`screen-command-coverage.json`](../../../screen-command-coverage.json);
they do not enter the deterministic command log. Only
`SPLIT_ARMY_STACK` is reducer-backed and registered in
[`command.schema.json`](../../../../../content-schema/schemas/command.schema.json).

### State Changes
- `state.ui.splitStack.sourceStackRef`, `state.ui.splitStack.destinationSlotRef`, and `state.ui.splitStack.returnScreen` are seeded when the caller opens the modal; they do not change while the modal is open.
- `state.ui.splitStack.quantity` updates on every `SET_SPLIT_STACK_*` token.
- `selectors.armies.splitStackGuard` is derived; it recomputes when `quantity`, source army, or destination slot changes.
- After `SPLIT_ARMY_STACK` is accepted, the engine mutates the owning army records; the modal pops and the caller route refreshes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- OK pops this modal after reducer approval and exit animation, then
  refocuses the previous element on the caller route (per
  [`ui-routing.md` § Modal Stack](../../../ui-routing.md#modal-stack)).
- CANCEL pops this modal without a reducer dispatch; the same caller
  route and focus restoration apply.

### Disabled And Error Cases
- Disable OK when `splitGuard` reports any of: source count too low,
  destination slot incompatible (different creature ID and not empty),
  destination capacity exceeded, ownership mismatch, or invalid phase.
- Missing presentation assets may use resolver fallback. Missing
  gameplay records, invalid content IDs, or rejected commands fail
  loudly per
  [`fail-loud.md`](../../../fail-loud.md).
- On rejection, keep the dialog open, preserve the local draft, show
  localized error text, and play failure feedback.
- Errors are produced by `formatUserError(err, locale)` declared in
  [`docs/architecture/error-formatter.md`](../../../error-formatter.md);
  never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather
  than inventing new behavior.

## Error surfaces

Per [`error-ux.md`](../../../error-ux.md) § 5, this screen inherits
the default code → surface mapping from § 2. The table below maps
each action whose `Type` column is `command` to its default surface
for this screen's dominant error domain. A row whose Notes column
reads `override` replaces the § 2 default for that action; otherwise
the default applies. Specific error codes (e.g. `DISPATCHER_<token>`,
`STORAGE_<token>`) land alongside the engine reducer that owns each
command and trigger the gate in
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing for them.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Confirm (`SPLIT_ARMY_STACK`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 `DISPATCHER_*`; disabled OK + tooltip on rejection. |

---

## 🔍 Sync Check

- **UI: ✔** — Action IDs (`splitStack.changeQuantity`,
  `splitStack.one`, `splitStack.max`, `splitStack.confirm`,
  `splitStack.cancel`) and button labels (ONE, MAX, OK, CANCEL) match
  `mockup.html` `data-action` attributes; state bindings agree with
  sibling `spec.md` § State Bindings.
- **Schema: ✔** — `SPLIT_ARMY_STACK` is defined in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json)
  (`armyId`, `sourceSlot`, `targetSlot`, `quantity ≥ 1`, `metadata`).
  `SET_SPLIT_STACK_*` and `CANCEL_SPLIT_STACK` resolve through the
  `SET_` / `CANCEL_` prefixes in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  as local-ui tokens (not reducer-backed). Modal id registered in
  [`modal-entry.schema.json` §`modalId`](../../../../../content-schema/schemas/modal-entry.schema.json).
- **Tasks: ✔** — Reducer owner
  [`mvp.05-adventure-map.17-split-army-stack-command`](../../../../../tasks/mvp/05-adventure-map/17-split-army-stack-command.md)
  Reads First this file; UI owner
  [`phase-2.07-ui-screen-backlog.51-split-stack-dialog-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/51-split-stack-dialog-screen.md)
  lists every action ID and selector through
  [`screen-command-coverage.json`](../../../screen-command-coverage.json).

## ⚠ Issues

_None._
