# Screen 31: Grail Building
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Town grail construction ceremony after a hero brings the grail to a valid town.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Build grail | `grail.build` | command | `24-town-screen` | `BUILD_GRAIL_STRUCTURE` | Consumes grail delivery, adds grail building, applies bonuses. | Relic rises from the hero slot, town wonder beam flashes over the panorama, bonus plaques illuminate, and the built hotspot remains glowing afterward. |
| Inspect bonuses | `grail.inspect` | local-ui | Current screen | `SELECT_GRAIL_BONUS` | Changes local bonus plaque focus. | Relic rises from the hero slot, town wonder beam flashes over the panorama, bonus plaques illuminate, and the built hotspot remains glowing afterward. |
| Cancel | `grail.cancel` | navigation | `24-town-screen` | `CLOSE_GRAIL_BUILDING_DIALOG` | Leaves grail delivery unresolved. | Relic rises from the hero slot, town wonder beam flashes over the panorama, bonus plaques illuminate, and the built hotspot remains glowing afterward. |

### State Changes
- `state.towns.selectedTownId` refreshes `townId` after the owning reducer or local UI draft changes.
- `state.adventure.visitingHeroId` refreshes `deliveringHero` after the owning reducer or local UI draft changes.
- `state.scenario.grail` refreshes `grailRecord` after the owning reducer or local UI draft changes.
- `selectors.towns.factionGrailBuilding` refreshes `wonderDefinition` after the owning reducer or local UI draft changes.
- `selectors.towns.grailBonusPreview` refreshes `bonusPreview` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Build grail can route to `24-town-screen` after guard approval and exit animation.
- Cancel can route to `24-town-screen` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.

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
| Build grail (`BUILD_GRAIL_STRUCTURE`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
