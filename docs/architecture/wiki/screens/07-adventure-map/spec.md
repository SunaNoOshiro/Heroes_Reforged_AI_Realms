# Screen 07: Adventure Map

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Primary strategic map with terrain viewport, fog of war, object interaction, hero path preview, minimap, army/hero sidebars, resources, and date.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `anchor-v1`.
- Large map viewport dominates the screen, with a narrow right command/minimap panel and a thin resource/date strip along the bottom.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- AdventureMapScreen
  - MapViewport
  - FogMask
  - PathPreview
  - ObjectLayer
  - RightCommandPanel
  - MiniMap
  - HeroArmyPanel
  - ResourceDateBar
  - StatusLine

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| map.tiles | state.adventure.visibleTiles | Rendered from scenario map plus fog visibility. |
| selectedHero | state.adventure.selectedHeroId | Controls portrait, movement points, army, and path preview. |
| pathPreview | state.ui.adventure.pathPreview | UI draft until confirmed movement command. |
| resources | state.players.active.resources | Authoritative player resources. |
| date | state.calendar.currentDate | Month/week/day text and end-turn state. |

### Mechanics Mapping
- Hero selection, path preview, tile movement, object visits, fog reveal, town/hero focus, spell targeting, and end-turn all dispatch deterministic commands.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Dotted path marches, hero steps tile-by-tile after reducer acceptance, fog peels from revealed tiles, minimap box tracks viewport, status messages scroll.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `adventure-map`; system group: `adventure`; curation marker: `anchor-v1`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
