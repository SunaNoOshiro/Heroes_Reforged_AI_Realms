# Screen 33: Shipyard

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Town or adventure shipyard service for purchasing a boat at an adjacent valid water tile.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-4`.
- Harbor panel overlays the coast-facing town panorama, with dock water preview, boat silhouette, resource cost, blocked-tile warning, and Build/Close buttons.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- ShipyardDialog
  - DockPreview
  - BoatSpawnTile
  - CostLedger
  - BlockedTileWarning
  - BuildBoatButton

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| shipyardId | state.ui.shipyard.sourceId | Town building or adventure shipyard object. |
| spawnTiles | selectors.towns.shipyardBoatSpawnTiles | Legal adjacent water tiles. |
| selectedTile | state.ui.shipyard.selectedSpawnTile | Local chosen spawn tile. |
| cost | selectors.economy.shipyardBoatCost | Wood/ore/gold requirement and affordability. |
| resources | state.players.active.resources | Resource guard for build command. |

### Mechanics Mapping
- Boat construction validates shipyard building/object, available water spawn tile, existing boat occupancy, resources, and one-boat-per-tile rules.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Dock crane swings, boat hull fades into the water tile, wood/ore/gold counters tick down, and the adventure map spawn tile ripples.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `shipyard`; system group: `town`; curation marker: `curated-pass-4`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
