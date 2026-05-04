# Screen 19: Status Bar
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Adventure status line and message history strip showing hover descriptions, command feedback, resource changes, and disabled reasons.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Expand drawer | `status.expand` | local-ui | Current screen | `EXPAND_STATUS_HISTORY` | Shows recent UI feedback. | New messages slide in from the left, resource deltas glow, pinned messages receive a wax seal, and drawer expansion pushes no gameplay layout. |
| Pin message | `status.pinMessage` | local-ui | Current screen | `PIN_STATUS_MESSAGE` | Pins selected visible message locally. | New messages slide in from the left, resource deltas glow, pinned messages receive a wax seal, and drawer expansion pushes no gameplay layout. |
| Clear local history | `status.clear` | local-ui | Current screen | `CLEAR_STATUS_HISTORY` | Clears client-only history, not gameplay records. | New messages slide in from the left, resource deltas glow, pinned messages receive a wax seal, and drawer expansion pushes no gameplay layout. |
| Collapse drawer | `status.collapse` | local-ui | Current screen | `COLLAPSE_STATUS_HISTORY` | Returns to single-line status strip. | New messages slide in from the left, resource deltas glow, pinned messages receive a wax seal, and drawer expansion pushes no gameplay layout. |

### State Changes
- `state.ui.adventure.hoverContext` refreshes `hoverContext` after the owning reducer or local UI draft changes.
- `state.ui.messages.latest` refreshes `latestMessage` after the owning reducer or local UI draft changes.
- `state.ui.messages.history` refreshes `messageHistory` after the owning reducer or local UI draft changes.
- `selectors.economy.lastVisibleDeltas` refreshes `resourceDeltas` after the owning reducer or local UI draft changes.
- `state.ui.statusBar.drawerOpen` refreshes `drawerOpen` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes


### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.
- Errors are produced by `formatUserError(err, locale)` declared in [`docs/architecture/error-formatter.md`](../../../error-formatter.md); never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
