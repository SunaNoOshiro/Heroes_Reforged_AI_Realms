# Screen 27: Thieves Guild

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Information ranking screen showing opponents, towns, heroes, resources, artifacts, army strength, and intelligence columns allowed by guild access.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-2`.
- A wide ranking parchment with player banners down the left and intelligence columns across the top, with covered cells for unavailable information.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- ThievesGuildDialog
  - PlayerBannerRows
  - IntelligenceColumns
  - CoveredCells
  - RankSortHeader
  - CloseButton

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| players | state.players.all | Player order and colors. |
| intelligenceLevel | state.townServices.thievesGuildLevel | Controls visible columns. |
| rankings | state.intelligence.rankings | Computed ranking rows. |
| selectedPlayer | state.ui.thievesGuild.selectedPlayerId | Local selected row. |

### Mechanics Mapping
- Visible columns depend on thieves guild access and scenario visibility rules; the screen reads intelligence state and does not mutate gameplay.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Columns reveal left-to-right based on intelligence level, selected player row glows, unavailable cells stay covered.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `thieves-guild`; system group: `town`; curation marker: `curated-pass-2`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
