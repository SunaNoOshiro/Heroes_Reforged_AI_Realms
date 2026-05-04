# Screen 30: Town Hall / Build Tree
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Town construction graph with built, available, locked, and selected building nodes, prerequisite links, resource cost, and one-build-per-day guard.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select building | `buildTree.selectBuilding` | local-ui | Current screen | `SELECT_BUILDING_NODE` | Updates detail and cost panel. | Available node pulses, prerequisite path lights, resource cost flashes, newly built structure brightens into town panorama. |
| Build | `buildTree.build` | command | Current screen | `BUILD_BUILDING` | Spends resources and marks building built. | Available node pulses, prerequisite path lights, resource cost flashes, newly built structure brightens into town panorama. |
| Close | `buildTree.close` | navigation | `24-town-screen` | `CLOSE_BUILD_TREE` | Returns to town. | Available node pulses, prerequisite path lights, resource cost flashes, newly built structure brightens into town panorama. |

### State Changes
- `state.towns.byId[selected].buildings` refreshes `town.buildings` after the owning reducer or local UI draft changes.
- `state.towns.byId[selected].availableBuilds` refreshes `availableBuildings` after the owning reducer or local UI draft changes.
- `state.ui.buildTree.selectedBuildingId` refreshes `selectedBuilding` after the owning reducer or local UI draft changes.
- `state.players.active.resources` refreshes `player.resources` after the owning reducer or local UI draft changes.
- `state.towns.byId[selected].builtToday` refreshes `builtToday` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Close can route to `24-town-screen` after guard approval and exit animation.

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
| Build (`BUILD_BUILDING`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
