# Screen 45: Combat Tactics Phase

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Pre-combat tactics deployment phase with legal placement zones, draggable friendly stacks, locked enemy side, remaining placement moves, and start battle action.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-2`.
- The battlefield appears before initiative starts with shaded deployment columns, movable friendly stack markers, locked enemy stacks, and a tactics command strip.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- TacticsPhaseScreen
  - DeploymentZone
  - FriendlyStacks
  - EnemyPreview
  - MoveBudgetPlaque
  - StartBattleButton
  - IllegalPlacementFeedback

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| tacticsAvailable | state.battle.tactics.enabled | Whether phase is active. |
| deploymentZone | state.battle.tactics.legalHexes | Allowed placement hexes. |
| friendlyStacks | state.battle.armies.attacker.stacks | Movable stack positions. |
| enemyPreview | state.battle.armies.defender.stacks | Locked enemy placement. |
| remainingMoves | state.battle.tactics.remainingMoves | Tactics move budget. |

### Mechanics Mapping
- Allows stack repositioning only within legal tactics rows/columns before initiative begins; starting battle freezes deployment and enters combat phase.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Legal deployment cells glow, stack drag ghost snaps to allowed hex, illegal placement flashes red, start battle wipes away zone overlays.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `tactics-phase`; system group: `battle`; curation marker: `curated-pass-2`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
