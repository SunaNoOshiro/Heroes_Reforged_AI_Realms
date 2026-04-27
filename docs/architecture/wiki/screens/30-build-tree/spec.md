# Screen 30: Town Hall / Build Tree

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Town construction graph with built, available, locked, and selected building nodes, prerequisite links, resource cost, and one-build-per-day guard.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-2`.
- A branching construction diagram fills the panel: built nodes are lit, available nodes glow, locked nodes are dark, and selected building details sit to the right.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- BuildTreeDialog
  - BuildingGraph
  - PrerequisiteLinks
  - SelectedBuildingDetails
  - CostPanel
  - BuiltTodayPlaque
  - BuildCloseButtons

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| town.buildings | state.towns.byId[selected].buildings | Built nodes. |
| availableBuildings | state.towns.byId[selected].availableBuilds | Available nodes from prerequisite graph. |
| selectedBuilding | state.ui.buildTree.selectedBuildingId | Local selected node. |
| player.resources | state.players.active.resources | Cost availability. |
| builtToday | state.towns.byId[selected].builtToday | Daily build guard. |

### Mechanics Mapping
- Build validates ownership, prerequisites, resources, town hall/castle rules, and daily build flag before committing construction.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Available node pulses, prerequisite path lights, resource cost flashes, newly built structure brightens into town panorama.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `build-tree`; system group: `town`; curation marker: `curated-pass-2`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
