# Screen 35: Town Flyby
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Optional cinematic town entry/faction panorama flyby before the interactive town screen appears.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Skip | `townFlyby.skip` | navigation | `24-town-screen` | `SKIP_TOWN_FLYBY` | Completes presentation transition only. | Camera eases across the skyline, parallax layers drift, faction crest fades in, and skip accelerates to the town screen without gameplay mutation. |
| Flyby complete | `townFlyby.complete` | navigation | `24-town-screen` | `COMPLETE_TOWN_FLYBY` | Routes after assets are ready. | Camera eases across the skyline, parallax layers drift, faction crest fades in, and skip accelerates to the town screen without gameplay mutation. |
| Cancel load error | `townFlyby.errorBack` | navigation | `07-adventure-map` | `CANCEL_TOWN_ENTRY_AFTER_PRESENTATION_ERROR` | Returns if required town data cannot load. | Camera eases across the skyline, parallax layers drift, faction crest fades in, and skip accelerates to the town screen without gameplay mutation. |

### State Changes
- `state.towns.selectedTownId` refreshes `townId` after the owning reducer or local UI draft changes.
- `state.towns.byId[selected].factionId` refreshes `factionId` after the owning reducer or local UI draft changes.
- `state.ui.assetWarmup.townScreen` refreshes `assetWarmup` after the owning reducer or local UI draft changes.
- `selectors.presentation.townFlybyPath` refreshes `cameraPath` after the owning reducer or local UI draft changes.
- `config.ui.allowSkipCinematics` refreshes `skipAvailable` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Skip can route to `24-town-screen` after guard approval and exit animation.
- Flyby complete can route to `24-town-screen` after guard approval and exit animation.
- Cancel load error can route to `07-adventure-map` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.
- Errors are produced by `formatUserError(err, locale)` declared in [`docs/architecture/error-formatter.md`](../../../error-formatter.md); never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
