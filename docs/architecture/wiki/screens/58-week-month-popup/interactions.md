# Screen 58: Week / Month Popup
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Start-of-week/month announcement popup for growth changes, plague, month creature, resource events, and calendar transition.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| OK | `calendarPopup.ok` | navigation | `07-adventure-map` | `ACKNOWLEDGE_CALENDAR_ANNOUNCEMENT` | Clears pending UI announcement only. | Proclamation unfurls, event icon bounces, growth numbers sparkle, and OK folds the parchment back to adventure map. |
| Inspect creature | `calendarPopup.inspectCreature` | navigation | `50-creature-info` | `OPEN_CALENDAR_CREATURE_INFO` | Shows creature info for month/week creature. | Proclamation unfurls, event icon bounces, growth numbers sparkle, and OK folds the parchment back to adventure map. |

### State Changes
- `state.calendar.currentDate` refreshes `calendar` after the owning reducer or local UI draft changes.
- `state.calendar.pendingAnnouncement` refreshes `eventRecord` after the owning reducer or local UI draft changes.
- `selectors.calendar.visibleGrowthEffects` refreshes `growthEffects` after the owning reducer or local UI draft changes.
- `selectors.calendar.visibleResourceEffects` refreshes `resourceEffects` after the owning reducer or local UI draft changes.
- `state.ui.calendarAnnouncement.acknowledged` refreshes `acknowledged` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- OK can route to `07-adventure-map` after guard approval and exit animation.
- Inspect creature can route to `50-creature-info` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.
- Errors are produced by `formatUserError(err, locale)` declared in [`docs/architecture/error-formatter.md`](../../../error-formatter.md); never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
