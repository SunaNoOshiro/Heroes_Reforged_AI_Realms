# Screen 44: Combat Spell Targeting

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Combat spell targeting overlay with selected spell, mana cost, area-of-effect shape, legal hexes, immune targets, and cancel/confirm controls.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-2`.
- The active battlefield is darkened under luminous target hexes; a spell card at the top shows spell school, mana, mastery, and valid target instructions.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- CombatSpellTargeting
  - BattlefieldDimmer
  - SpellCard
  - AreaOverlay
  - ImmuneMarkers
  - ManaCost
  - ConfirmCancelButtons

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| selectedSpell | state.ui.battle.selectedSpellId | Spell chosen from spellbook. |
| casterHero | state.battle.activeHeroId | Hero casting context. |
| mana | state.heroes.byId[caster].mana | Mana affordability. |
| legalTargets | state.battle.spellTargeting.legalTargets | Rules output for spell target shape. |
| immuneTargets | state.battle.spellTargeting.immuneTargets | Stacks that reject this spell. |

### Mechanics Mapping
- Validates combat spell scope, hero turn, mana, mastery, target shape, immunity, and friendly/enemy restrictions before casting.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Valid hexes pulse, selected area locks, spell glyph flares, rejected immune targets flash red with status text.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `combat-spell-targeting`; system group: `battle`; curation marker: `curated-pass-2`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
