# Screen 33: Shipyard

### Screen Package

- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description

Town-building or adventure-map shipyard service for spending resources
to spawn a boat on an adjacent legal water tile.

### Visual Direction

- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

### Visual Contract

- Curation status: `curated-pass-4`.
- Harbor panel overlays the coast-facing town panorama, with dock
  water preview, boat silhouette, resource cost, blocked-tile warning,
  and Build/Close buttons.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate
  gold frame, red/brown/stone panels, compact icon slots, right-click
  detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and
  implementation notes live in Markdown package files.

### Component Tree

- `ShipyardDialog`
  - `DockPreview`
  - `BoatSpawnTile`
  - `CostLedger`
  - `BlockedTileWarning`
  - `BuildBoatButton`

### State Bindings

| Element | Bound To | Notes |
| --- | --- | --- |
| `shipyardId` | `state.ui.shipyard.sourceId` | Town building or adventure shipyard object. |
| `spawnTiles` | `selectors.towns.shipyardBoatSpawnTiles` | Legal adjacent water tiles. |
| `selectedTile` | `state.ui.shipyard.selectedSpawnTile` | Local chosen spawn tile. |
| `cost` | `selectors.economy.shipyardBoatCost` | Wood/ore/gold requirement and affordability. |
| `resources` | `state.players.active.resources` | Resource guard for build command. |

### Mechanics Mapping

- Boat construction validates shipyard building/object, available water
  spawn tile, existing boat occupancy, resources, and one-boat-per-tile
  rules.
- UI previews stay local until a listed command or route guard accepts
  them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and
  objects resolve through registries/content schemas, not hardcoded
  view logic.

### Animation Contract

- Dock crane swings, boat hull fades into the water tile, wood/ore/gold
  counters tick down, and the adventure map spawn tile ripples.
- Animation consumes reducer or route results; it never decides
  gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static
  highlights and localized feedback.

### Acceptance Criteria

- Mockup is visually distinct from other screens and follows this
  screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state
  update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied
  archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/
  save/replay fields required to implement the screen.

### AI Implementation Notes

- Screen slug: `shipyard`; system group: `town`; curation marker:
  `curated-pass-4`.
- Build runtime components from the package contract, not from
  third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs and
  manifests; deterministic gameplay commands use stable IDs and scalar
  values.

---

## 🔍 Sync Check

- **UI: ✔** — State bindings and component tree align with sibling `interactions.md § State Changes` and `data-contracts.md § Runtime State Selectors`; mockup data hooks (`data-action="shipyard.build"`, `data-action="shipyard.close"`) match.
- **Schema: ✔** — `selectors.towns.shipyardBoatSpawnTiles`, `selectors.economy.shipyardBoatCost`, and `BUILD_BOAT` (declared in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) `$defs/buildBoat`) are all consistent across the package.
- **Tasks: ✔** — Owning UI task [`phase-2.07-ui-screen-backlog.33-shipyard-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/33-shipyard-screen.md) lists this file in Read First; engine task [`phase-2.05-mod-system.06-build-boat-command-and-shipyard`](../../../../../tasks/phase-2/05-mod-system/06-build-boat-command-and-shipyard.md) references the sibling `interactions.md`.

## ⚠ Issues

- **Component Tree omits a `CloseButton`.** `mockup.html` renders a `CLOSE` button (`data-action="shipyard.close"`) and sibling `interactions.md` lists the `shipyard.close` navigation action, but this Component Tree lists only `BuildBoatButton`. The sibling `architecture.md § Visual Composition` has the same omission. Per [`.agents/rules/ui.md`](../../../../../.agents/rules/ui.md), the screen-package files cross-check each other. Suggested follow-up: add `CloseButton` as a sibling of `BuildBoatButton` in this Component Tree and in `architecture.md`'s `Visual Composition` diagram. Not auto-applied — Hard Prohibition B (never invent features beyond the original).
