# Screen 40: Pre-Battle Dialog

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Encounter confirmation dialog comparing attacker and defender heroes/armies, terrain context, tactics availability, and fight/retreat/auto-resolve choices.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-2`.
- Two opposing hero/army panels face each other over a battlefield preview, with terrain/siege information between them and action buttons along the bottom.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- PreBattleDialog
  - AttackerPanel
  - DefenderPanel
  - TerrainPreview
  - ArmyComparison
  - TacticsIndicator
  - FightRetreatButtons

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| attacker | state.pendingBattle.attacker | Attacking hero/army. |
| defender | state.pendingBattle.defender | Defending hero/army or neutral stack. |
| terrain | state.pendingBattle.terrainId | Battlefield terrain context. |
| tacticsAvailable | state.pendingBattle.tacticsAvailable | Whether tactics phase can start. |
| retreatAllowed | state.pendingBattle.retreatAllowed | Retreat button guard. |

### Mechanics Mapping
- Initializes tactical combat only after guard checks for encounter legality, army state, terrain, siege context, and optional tactics phase.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Army strength bars fill, crossed-swords emblem pulses, fight route fades into battlefield, retreat disabled state shakes when illegal.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `pre-battle-dialog`; system group: `battle`; curation marker: `curated-pass-2`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
