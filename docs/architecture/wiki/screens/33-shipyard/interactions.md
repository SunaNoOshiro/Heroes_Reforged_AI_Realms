# Screen 33: Shipyard
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Town or adventure shipyard service for purchasing a boat at an adjacent valid water tile.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select water tile | `shipyard.selectTile` | local-ui | Current screen | `SELECT_BOAT_SPAWN_TILE` | Updates spawn preview. | Dock crane swings, boat hull fades into the water tile, wood/ore/gold counters tick down, and the adventure map spawn tile ripples. |
| Build boat | `shipyard.build` | command | `24-town-screen` or `07-adventure-map` | `BUILD_BOAT` | Spends resources and creates boat entity at selected tile. | Dock crane swings, boat hull fades into the water tile, wood/ore/gold counters tick down, and the adventure map spawn tile ripples. |
| Close | `shipyard.close` | navigation | `24-town-screen` or `07-adventure-map` | `CLOSE_SHIPYARD` | Returns to caller. | Dock crane swings, boat hull fades into the water tile, wood/ore/gold counters tick down, and the adventure map spawn tile ripples. |

### State Changes
- `state.ui.shipyard.sourceId` refreshes `shipyardId` after the owning reducer or local UI draft changes.
- `selectors.towns.shipyardBoatSpawnTiles` refreshes `spawnTiles` after the owning reducer or local UI draft changes.
- `state.ui.shipyard.selectedSpawnTile` refreshes `selectedTile` after the owning reducer or local UI draft changes.
- `selectors.economy.shipyardBoatCost` refreshes `cost` after the owning reducer or local UI draft changes.
- `state.players.active.resources` refreshes `resources` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Build boat can route to `24-town-screen` or `07-adventure-map` after guard approval and exit animation.
- Close can route to `24-town-screen` or `07-adventure-map` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
