# Screen 15: Underground Layer Toggle

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Adventure map layer switcher for surface and underground views, including gate focus and known subterranean entrance state.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-3`.
- Split map overlay shows surface in warm greens above and underground in cold stone below, with a central brass lever and gate markers.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- UndergroundToggle
  - SurfacePreview
  - UndergroundPreview
  - GateMarkerList
  - LayerLever
  - CloseButton

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| activeLayer | state.adventure.activeLayer | Surface or underground render context. |
| hasUnderground | state.scenario.layers.underground.enabled | Controls underground button availability. |
| knownGates | selectors.adventure.knownSubterraneanGates | Visible gates and two-way links. |
| selectedGate | state.ui.layerToggle.selectedGateId | Local selected gate marker. |
| cameraFocus | state.adventure.camera | Camera target updated by focus actions. |

### Mechanics Mapping
- Layer switch changes camera/render context and selected layer. It does not move heroes unless a valid subterranean gate or monolith transition is explicitly used.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Screen wipes vertically between layers, minimap palette swaps, known gates pulse, and unavailable layer buttons clank with disabled feedback.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `underground-toggle`; system group: `adventure`; curation marker: `curated-pass-3`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
