# Screen 06: Random Map Generator Settings
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Random map generator setup for size, template, players, zones, water, monsters, teams, seed, and victory options.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select template | `rmg.selectTemplate` | local-ui | Current screen | `SELECT_RMG_TEMPLATE` | Updates zone preview. | Sliders notch, template preview redraws, seed dice rolls, zone graph pulses, and Generate routes to loading/progress. |
| Roll seed | `rmg.rollSeed` | local-ui | Current screen | `ROLL_RMG_SEED` | Creates local deterministic seed draft. | Sliders notch, template preview redraws, seed dice rolls, zone graph pulses, and Generate routes to loading/progress. |
| Generate | `rmg.generate` | navigation | `59-loading-screen` | `GENERATE_RANDOM_MAP` | Builds scenario data from validated draft. | Sliders notch, template preview redraws, seed dice rolls, zone graph pulses, and Generate routes to loading/progress. |
| Back | `rmg.back` | navigation | `02-new-game-setup` | `CLOSE_RANDOM_MAP_SETUP` | Discards RMG draft. | Sliders notch, template preview redraws, seed dice rolls, zone graph pulses, and Generate routes to loading/progress. |

### State Changes
- `state.ui.rmg.templateId` refreshes `templateId` after the owning reducer or local UI draft changes.
- `state.ui.rmg.mapSize` refreshes `mapSize` after the owning reducer or local UI draft changes.
- `state.ui.rmg.players` refreshes `players` after the owning reducer or local UI draft changes.
- `state.ui.rmg.seed` refreshes `seed` after the owning reducer or local UI draft changes.
- `selectors.rmg.templateZonePreview` refreshes `zonePreview` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Generate can route to `59-loading-screen` after guard approval and exit animation.
- Back can route to `02-new-game-setup` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.
- Errors are produced by `formatUserError(err, locale)` declared in [`docs/architecture/error-formatter.md`](../../../error-formatter.md); never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
