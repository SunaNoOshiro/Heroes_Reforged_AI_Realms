# Screen 61: AI Turn Indicator

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
AI turn overlay showing active AI color, visible thinking/progress state, optional fast-forward, and turn-result messages.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-6`.
- Z-Layer: 400 per [`docs/architecture/ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract).
- Adventure map is dimmed behind a compact banner with player color crest, progress beads, current AI activity text, and speed/skip controls.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- AiTurnIndicator
  - DimmedAdventureMap
  - PlayerCrest
  - ProgressBeads
  - ActivityText
  - SpeedControls

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| aiPlayer | state.turn.activePlayerId | AI player currently acting. |
| aiPhase | state.ai.currentPhase | Planning, moving, combat, town, or done. |
| commandBatch | state.ai.visibleCommandBatch | Commands currently being replayed. |
| speed | config.ui.aiTurnSpeed | Presentation speed only. |
| interruptGuard | selectors.ai.canFastForwardOrPause | Pause/fast-forward availability. |

### Mechanics Mapping
- The overlay observes AI command generation and replay application. It never makes decisions; deterministic AI commands are applied through the same command bus.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Player crest rotates, progress beads advance per command batch, camera pans to visible AI actions, and turn end fades back to player control.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `ai-turn-indicator`; system group: `system`; curation marker: `curated-pass-6`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
