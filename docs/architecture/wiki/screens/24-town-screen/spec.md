# Screen 24: Town Screen

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Town management panorama with clickable building hotspots, town/visiting hero armies, construction state, recruit/service entry points, resources, and exit back to adventure.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `anchor-v1`.
- Faction panorama fills the upper screen; bottom red-brown management strip contains town portrait, garrison rows, visiting hero rows, service icons, and resource strip.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- TownScreen
  - TownPanorama
  - BuildingHotspots
  - TownHeader
  - TownGarrisonRow
  - VisitingHeroRow
  - ServiceButtons
  - BuildStatePlaque
  - ResourceDateBar

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| town.id | state.towns.selectedTownId | Current town context. |
| town.buildings | state.towns.byId[selected].buildings | Controls hotspots, built state, and availability. |
| dailyBuild | state.towns.byId[selected].builtToday | Disables construction after one build. |
| garrison | state.towns.byId[selected].garrison | Town army row. |
| visitingHero | state.adventure.visitingHeroId | Visiting hero army row and hero portrait. |

### Mechanics Mapping
- Building inspection, one-build-per-day construction, recruitment, mage guild/tavern/market routing, garrison transfer, visiting hero context, and exit use town selectors and commands.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Building hotspots glow on hover, newly built structures brighten in the panorama, recruit counts tick, army drag ghosts snap between legal slots.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `town-screen`; system group: `town`; curation marker: `anchor-v1`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
