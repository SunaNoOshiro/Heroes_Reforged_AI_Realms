# Screen 17: Adventure Spell Targeting

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Adventure map targeting overlay for map spells such as Town Portal, Dimension Door, Fly, Water Walk, View Air, and View Earth.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-3`.
- Adventure map darkens under a spell banner; legal target tiles glow blue/gold, illegal targets mark red, and the cursor/status line changes to targeting mode.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- AdventureSpellTargeting
  - SpellBanner
  - LegalTargetOverlay
  - InvalidTargetMarkers
  - ManaCostPanel
  - CancelButton

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| selectedSpell | state.ui.spellTargeting.spellId | Spell chosen from spell book or command panel. |
| casterHero | state.adventure.selectedHeroId | Hero paying mana and receiving outcome. |
| legalTargets | selectors.spells.adventureLegalTargets | Tiles/objects/towns legal for this spell. |
| mana | state.heroes.byId[caster].mana | Current mana and cost guard. |
| targetDraft | state.ui.spellTargeting.hoverTarget | Local hover/selected target. |

### Mechanics Mapping
- Target legality checks spell scope, terrain, hero skills, mana, daily cast limits, town ownership, object blocks, and movement rules before command dispatch.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Legal tiles pulse, cursor rune rotates, invalid target flashes red, accepted cast draws a magic trail and then resolves camera/hero movement.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `adventure-spell-targeting`; system group: `adventure`; curation marker: `curated-pass-3`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
