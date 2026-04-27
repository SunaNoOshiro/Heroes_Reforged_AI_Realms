# Screen 62: Multiplayer Setup

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Multiplayer setup for hotseat, LAN/online lobby, player colors, teams, timers, map/scenario, and deterministic content lock.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-6`.
- Blue-stone lobby setup table with player color banners, connection type tabs, map preview, timer options, and Host/Join/Back buttons.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- MultiplayerSetup
  - ConnectionTypeTabs
  - PlayerSlotTable
  - MapPreview
  - TimerOptions
  - ContentHashLock
  - HostJoinButtons

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| connectionType | state.ui.multiplayer.connectionType | Hotseat, LAN, online, or direct. |
| playerSlots | state.ui.multiplayer.playerSlots | Player colors, teams, control type, ready flags. |
| selectedScenario | state.ui.multiplayer.scenarioId | Scenario/map draft. |
| timerConfig | state.ui.multiplayer.timer | Turn timer draft. |
| contentHash | selectors.multiplayer.contentCompatibilityHash | Pack/ruleset compatibility hash. |

### Mechanics Mapping
- Creates a multiplayer setup draft, validates identical content hashes/ruleset, assigns player slots, and routes to hotseat handoff or network lobby.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Player banners flip, ready seals stamp, content hash lock glows, and Host/Join opens the correct lobby route.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `multiplayer-setup`; system group: `multiplayer`; curation marker: `curated-pass-6`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
