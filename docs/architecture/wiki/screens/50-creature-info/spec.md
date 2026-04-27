# Screen 50: Creature Info

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Detailed creature information panel for army stacks, dwellings, combat stacks, rewards, and tooltip drill-down.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-5`.
- Bestiary parchment with creature portrait, primary combat stats, ability list, upgrade path, morale/luck modifiers, and close button.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- CreatureInfoPanel
  - CreaturePortrait
  - StatGrid
  - AbilityList
  - ModifierBreakdown
  - UpgradePathPreview

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| creatureId | state.ui.creatureInfo.creatureId | Creature record to display. |
| stackContext | state.ui.creatureInfo.stackContext | Hero/combat/dwelling/reward source. |
| baseStats | registries.creatures.byId[creatureId].stats | Base attack, defense, damage, health, speed, shots. |
| modifiers | selectors.creatures.stackStatModifiers | Hero, spell, artifact, terrain, and ruleset modifiers. |
| abilities | registries.creatures.byId[creatureId].abilities | Ability IDs and localized text. |

### Mechanics Mapping
- Info is read-only. Values resolve from creature records plus current stack modifiers, hero skills, artifacts, terrain, spells, and ruleset formulas.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Creature portrait idles, ability icons glow on hover, modified stats pulse when sourced from buffs, and the panel fades back to caller.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `creature-info`; system group: `hero`; curation marker: `curated-pass-5`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
