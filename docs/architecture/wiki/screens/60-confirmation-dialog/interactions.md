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
| Confirm | `confirm.accept` | command | Pending destination | `CONFIRM_PENDING_ACTION` | Dispatches caller-provided command/event. | Modal pops in, warning icon pulses, Confirm button depresses, and accepted action plays caller-provided transition animation. |
| Cancel | `confirm.cancel` | navigation | Caller screen | `CANCEL_PENDING_CONFIRMATION` | Clears pending action without mutation. | Modal pops in, warning icon pulses, Confirm button depresses, and accepted action plays caller-provided transition animation. |

### State Changes
- `state.ui.confirmation.pendingAction` refreshes `pendingAction` after the owning reducer or local UI draft changes.
- `state.ui.confirmation.promptKey` refreshes `promptKey` after the owning reducer or local UI draft changes.
- `state.ui.confirmation.callerRoute` refreshes `callerRoute` after the owning reducer or local UI draft changes.
- `state.ui.confirmation.payload` refreshes `confirmPayload` after the owning reducer or local UI draft changes.
- `state.ui.confirmation.severity` refreshes `severity` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Confirm can route to Pending destination after guard approval and exit animation.
- Cancel can route to Caller screen after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
