# Screen 43: Siege Combat Variant

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Siege battlefield variant with walls, gate, towers, moat, catapult target preview, breaching state, and defender/attacker stack placement.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-2`.
- The battlefield is split by a large castle wall: defender stacks occupy battlements/right side, attackers approach from the left, and wall/gate targets are highlighted.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- SiegeCombatScreen
  - Battlefield
  - CastleWalls
  - GateAndMoat
  - TowerNodes
  - CatapultTargetPreview
  - ArmyStacks
  - ActionBar

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| wallState | state.battle.siege.wallSegments | HP/breach state by segment. |
| gateState | state.battle.siege.gate | Gate open/broken/blocked state. |
| towerState | state.battle.siege.towers | Tower ammo and targeting. |
| catapultTarget | state.ui.battle.catapultTarget | Local selected siege target. |
| activeStack | state.battle.activeStackId | Current combat actor. |

### Mechanics Mapping
- Extends combat with wall segments, gate blocking, tower shots, moat penalties, catapult targeting, and breach state in deterministic battle commands.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Catapult arcs toward selected wall, impact dust plays after reducer result, breached wall segment darkens, tower shot flashes from battlement.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `siege-combat`; system group: `battle`; curation marker: `curated-pass-2`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
