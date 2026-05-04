# Screen 18: Map Object Tooltip
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Right-click informational tooltip for adventure map objects, heroes, towns, resources, and guarded encounters.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Right-click object | `tooltip.open` | local-ui | Current screen | `OPEN_OBJECT_TOOLTIP` | Sets tooltip hover/pin draft. | Tooltip fades in after hold delay, tracks the object anchor, pins with a brass tack, and fades out without changing gameplay state. |
| Pin tooltip | `tooltip.pin` | local-ui | Current screen | `PIN_OBJECT_TOOLTIP` | Keeps tooltip visible while pointer moves. | Tooltip fades in after hold delay, tracks the object anchor, pins with a brass tack, and fades out without changing gameplay state. |
| Open details | `tooltip.details` | navigation | `09-map-object-dialog` or `50-creature-info` | `OPEN_TOOLTIP_DETAIL` | Routes when the object has a detailed viewer. | Tooltip fades in after hold delay, tracks the object anchor, pins with a brass tack, and fades out without changing gameplay state. |
| Close | `tooltip.close` | local-ui | Current screen | `CLOSE_OBJECT_TOOLTIP` | Clears tooltip UI draft only. | Tooltip fades in after hold delay, tracks the object anchor, pins with a brass tack, and fades out without changing gameplay state. |

### State Changes
- `state.ui.adventure.hoverObjectId` refreshes `hoverObject` after the owning reducer or local UI draft changes.
- `selectors.mapObjects.publicTooltipInfo` refreshes `publicInfo` after the owning reducer or local UI draft changes.
- `selectors.scouting.hiddenTooltipFields` refreshes `hiddenGuard` after the owning reducer or local UI draft changes.
- `state.ui.tooltips.pinnedObjectId` refreshes `pinState` after the owning reducer or local UI draft changes.
- `state.ui.pointer.anchorRect` refreshes `anchorPosition` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Open details can route to `09-map-object-dialog` or `50-creature-info` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.
- Errors are produced by `formatUserError(err, locale)` declared in [`docs/architecture/error-formatter.md`](../../../error-formatter.md); never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
