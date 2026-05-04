# Screen 24: Town Screen
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Town management panorama with clickable building hotspots, town/visiting hero armies, construction state, recruit/service entry points, resources, and exit back to adventure.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select building | `town.selectBuilding` | local-ui | Current screen | `SELECT_TOWN_BUILDING` | Highlights hotspot and updates status line. | Building hotspots glow on hover, newly built structures brighten in the panorama, recruit counts tick, army drag ghosts snap between legal slots. |
| Open build tree | `town.openBuildTree` | navigation | `30-build-tree` | `OPEN_BUILD_TREE` | Routes with selected town context. | Building hotspots glow on hover, newly built structures brighten in the panorama, recruit counts tick, army drag ghosts snap between legal slots. |
| Recruit creatures | `town.recruit` | navigation | `25-building-recruitment-dialog` | `OPEN_RECRUITMENT_DIALOG` | Opens dwelling/town recruit contract. | Building hotspots glow on hover, newly built structures brighten in the panorama, recruit counts tick, army drag ghosts snap between legal slots. |
| Open mage guild | `town.mageGuild` | navigation | `29-mage-guild` | `OPEN_MAGE_GUILD` | Uses visiting hero eligibility if present. | Building hotspots glow on hover, newly built structures brighten in the panorama, recruit counts tick, army drag ghosts snap between legal slots. |
| Transfer army | `town.transferArmy` | command | Current screen | `TRANSFER_TOWN_ARMY_STACK` | Moves stack after ownership/capacity checks. | Building hotspots glow on hover, newly built structures brighten in the panorama, recruit counts tick, army drag ghosts snap between legal slots. |
| Exit town | `town.exit` | navigation | `07-adventure-map` | `CLOSE_TOWN_SCREEN` | Returns to adventure map focus. | Building hotspots glow on hover, newly built structures brighten in the panorama, recruit counts tick, army drag ghosts snap between legal slots. |

### State Changes
- `state.towns.selectedTownId` refreshes `town.id` after the owning reducer or local UI draft changes.
- `state.towns.byId[selected].buildings` refreshes `town.buildings` after the owning reducer or local UI draft changes.
- `state.towns.byId[selected].builtToday` refreshes `dailyBuild` after the owning reducer or local UI draft changes.
- `state.towns.byId[selected].garrison` refreshes `garrison` after the owning reducer or local UI draft changes.
- `state.adventure.visitingHeroId` refreshes `visitingHero` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Open build tree can route to `30-build-tree` after guard approval and exit animation.
- Recruit creatures can route to `25-building-recruitment-dialog` after guard approval and exit animation.
- Open mage guild can route to `29-mage-guild` after guard approval and exit animation.
- Exit town can route to `07-adventure-map` after guard approval and exit animation.

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
| Transfer army (`TRANSFER_TOWN_ARMY_STACK`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
