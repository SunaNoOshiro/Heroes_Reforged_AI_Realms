# Screen 38: Combat Screen

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Tactical combat board with hex grid, stack placement, active unit, hero portraits, action bar, target highlights, damage feedback, and combat log.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `anchor-v1`.
- Battlefield art covers most of the screen with translucent hexes; army stacks sit on battlefield sides, hero portraits frame the top, and a command/log bar anchors the bottom.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- CombatScreen
  - Battlefield
  - HexOverlay
  - ArmyStacks
  - ActiveStackHalo
  - TargetPreview
  - HeroPortraits
  - ActionBar
  - CombatLog

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| battle.phase | state.battle.phase | Tactics, active turn, animation lock, or result phase. |
| activeStack | state.battle.activeStackId | Current initiative actor. |
| legalHexes | state.battle.legalTargets | Reducer/combat rules output. |
| combatLog | state.battle.log | Localized event log from deterministic outcomes. |
| pendingAnimation | state.ui.battle.pendingAnimation | Presentation-only timeline from reducer result. |

### Mechanics Mapping
- Initiative order, movement, melee/ranged attack, wait, defend, spell casting, morale/luck, death, surrender, retreat, and victory checks are deterministic reducer commands.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Active stack halo pulses, legal movement hexes glow, attack lunge/recoil and projectile arcs play after command acceptance, damage floats from reducer result.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `combat-screen`; system group: `battle`; curation marker: `anchor-v1`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
