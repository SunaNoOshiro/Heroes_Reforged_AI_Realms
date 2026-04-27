# Screen 06: Random Map Generator Settings

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Random map generator setup for size, template, players, zones, water, monsters, teams, seed, and victory options.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-6`.
- Generator console with segmented controls, sliders, template list, seed field, player/team matrix, and Generate/Back buttons.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- RandomMapSetup
  - TemplateList
  - SizeDifficultyControls
  - PlayerTeamMatrix
  - SeedField
  - ZonePreview
  - GenerateBackButtons

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| templateId | state.ui.rmg.templateId | Selected random map template. |
| mapSize | state.ui.rmg.mapSize | Small/medium/large/extra large dimensions. |
| players | state.ui.rmg.players | Player count, AI/human flags, teams. |
| seed | state.ui.rmg.seed | Explicit deterministic seed. |
| zonePreview | selectors.rmg.templateZonePreview | Preview graph for template and options. |

### Mechanics Mapping
- Edits an RMG draft only. Generate validates template compatibility, player slots, content packs, deterministic seed, and ruleset before building scenario data.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Sliders notch, template preview redraws, seed dice rolls, zone graph pulses, and Generate routes to loading/progress.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `random-map-setup`; system group: `menus`; curation marker: `curated-pass-6`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
