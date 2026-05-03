# Screen 63: Hotseat Turn Handoff

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Privacy handoff screen between hotseat players, hiding the map until the next player confirms readiness.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-6`.
- Z-Layer: 1000 per [`docs/architecture/ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract).
- Full-screen player color banner and shield over a covered map, with next player name, turn date, privacy warning, and Begin Turn button.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- HotseatTurnHandoff
  - PrivacyCover
  - PlayerColorBanner
  - TurnDatePlaque
  - BeginTurnButton

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| nextPlayer | state.turn.activePlayerId | Player whose turn is about to be shown. |
| calendar | state.calendar.currentDate | Current turn date. |
| privacyCover | state.ui.hotseat.coverActive | Map hidden state. |
| playerName | state.players.byId[next].displayName | Localized/player-entered name. |
| pendingAnnouncements | selectors.turn.pendingStartOfTurnAnnouncements | Week/month or event popups after begin. |

### Mechanics Mapping
- Appears only after turn transition commits. Begin reveals the next player view; no game commands are allowed while covered.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Previous map shutters closed, next color banner unfurls, shield pulses, and Begin opens shutters to adventure map.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `hotseat-turn-handoff`; system group: `multiplayer`; curation marker: `curated-pass-6`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
