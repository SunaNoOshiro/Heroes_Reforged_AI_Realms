# Screen 16: View World

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Full-world overview for View Air/View Earth style spells and strategic map scanning.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-3`.
- Almost full-screen parchment world map with colored ownership pins, fog masks, layer tabs, and a small focus/detail plaque.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- ViewWorldScreen
  - WorldMapCanvas
  - FogMaskLegend
  - LayerTabs
  - ObjectPins
  - FocusPlaque

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| spellContext | state.ui.viewWorld.spellContext | View Air, View Earth, or strategic overview source. |
| visibleWorld | selectors.spells.viewWorldVisibleObjects | Objects revealed under spell and scouting rules. |
| selectedFocus | state.ui.viewWorld.selectedObjectId | Local selected map pin. |
| activeLayer | state.adventure.activeLayer | Surface/underground tab. |
| manaPreview | selectors.spells.viewWorldManaCost | Mana cost already paid or pending by caller context. |

### Mechanics Mapping
- Visible world data respects spell type, fog of war, scouting rules, and layer. Selection can focus an allowed object or return to the caster context.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Cloud/fog masks part over legal regions, ownership pins twinkle, selected focus ring expands, and return zooms back to adventure camera.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `view-world`; system group: `adventure`; curation marker: `curated-pass-3`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
