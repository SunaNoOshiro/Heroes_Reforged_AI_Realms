# Screen 63: Hotseat Turn Handoff
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Privacy handoff screen between hotseat players, hiding the map until the next player confirms readiness.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Begin turn | `hotseat.begin` | navigation | `07-adventure-map` or pending popup | `BEGIN_HOTSEAT_TURN` | Clears privacy cover and shows next player state. | Previous map shutters closed, next color banner unfurls, shield pulses, and Begin opens shutters to adventure map. |
| Open options | `hotseat.options` | navigation | `56-options` | `OPEN_OPTIONS_FROM_HANDOFF` | Allows presentation settings before reveal. | Previous map shutters closed, next color banner unfurls, shield pulses, and Begin opens shutters to adventure map. |

### State Changes
- `state.turn.activePlayerId` refreshes `nextPlayer` after the owning reducer or local UI draft changes.
- `state.calendar.currentDate` refreshes `calendar` after the owning reducer or local UI draft changes.
- `state.ui.hotseat.coverActive` refreshes `privacyCover` after the owning reducer or local UI draft changes.
- `state.players.byId[next].displayName` refreshes `playerName` after the owning reducer or local UI draft changes.
- `selectors.turn.pendingStartOfTurnAnnouncements` refreshes `pendingAnnouncements` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Begin turn can route to `07-adventure-map` or pending popup after guard approval and exit animation.
- Open options can route to `56-options` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.
- Errors are produced by `formatUserError(err, locale)` declared in [`docs/architecture/error-formatter.md`](../../../error-formatter.md); never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
