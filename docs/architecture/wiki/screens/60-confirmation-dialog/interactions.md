# Screen 60: Confirmation Dialog
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Reusable confirmation dialog for destructive, irreversible, or route-changing actions.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Confirm | `confirm.accept` | command | Pending destination | `CONFIRM_PENDING_ACTION` | Dispatches caller-provided command/event. Disabled until the [`ConfirmEnabled` predicate](#confirmenabled-predicate) is true. | Modal pops in, warning icon pulses, Confirm button depresses, and accepted action plays caller-provided transition animation. |
| Cancel | `confirm.cancel` | navigation | Caller screen | `CANCEL_PENDING_CONFIRMATION` | Clears pending action without mutation. | Modal pops in, warning icon pulses, Confirm button depresses, and accepted action plays caller-provided transition animation. |
| Type challenge | `confirm.typeChallenge` | local-ui | Current screen | `SET_CONFIRM_TYPED_TEXT` | Updates `state.ui.confirmation.typedConfirmText` from the `RequireTypeChallenge` field. Mounted only when `requireType != null`. | Inline echo on the input. |

### State Changes
- `state.ui.confirmation.pendingAction` refreshes `pendingAction` after the owning reducer or local UI draft changes.
- `state.ui.confirmation.promptKey` refreshes `promptKey` after the owning reducer or local UI draft changes.
- `state.ui.confirmation.callerRoute` refreshes `callerRoute` after the owning reducer or local UI draft changes.
- `state.ui.confirmation.payload` refreshes `confirmPayload` after the owning reducer or local UI draft changes.
- `state.ui.confirmation.severity` refreshes `severity` after the owning reducer or local UI draft changes.
- `state.ui.confirmation.openedAt` is written once at modal mount (`REQUEST_CONFIRMATION`) and is read-only thereafter.
- `state.ui.confirmation.confirmDelayMs` is set from the caller payload or, when omitted, from the per-severity default in [`spec.md` § Click-Through Resistance](./spec.md#click-through-resistance).
- `state.ui.confirmation.requireType` is set from the caller payload (optional). When set, `RequireTypeChallenge` mounts.
- `state.ui.confirmation.typedConfirmText` refreshes after every keystroke in `RequireTypeChallenge`; cleared on close.
- `state.ui.confirmation.popInComplete` flips to `true` on the pop-in animation end-frame and is cleared on close.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### `ConfirmEnabled` Predicate
The closed predicate driving the `Confirm` button's `disabled` attribute:

```text
ConfirmEnabled =
     pendingAction != null
  && now() - openedAt >= confirmDelayMs
  && popInComplete === true
  && (requireType == null || typedConfirmText === requireType)
```

While the predicate is `false`, the button stays `disabled`, the cursor
shows its disabled affordance, and `audio.ui.click` is suppressed on the
button hitbox. The same gate also blocks `Enter` / `Space` keyboard
activation per [`ui-hotkeys.md`](../../../ui-hotkeys.md). Esc on the
modal always routes to `CANCEL_PENDING_CONFIRMATION`, regardless of the
predicate's state.

### Navigation Outcomes
- Confirm can route to Pending destination after guard approval and exit animation.
- Cancel can route to Caller screen after guard approval and exit animation.

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
| Confirm (`CONFIRM_PENDING_ACTION`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
