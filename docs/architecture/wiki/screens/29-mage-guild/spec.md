# Screen 29: Mage Guild

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Mage guild spell learning screen with spell shelves by level, hero wisdom/magic-school eligibility, known spell state, and learn feedback.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-2`.
- Five vertical shelves hold spell icons by level; the visiting hero context and mana/wisdom summary sit in a side plaque.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- MageGuildDialog
  - SpellLevelShelves
  - SpellIconGrid
  - HeroEligibilityPlaque
  - KnownSpellMarkers
  - LearnCloseButtons

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| town.mageGuildLevel | state.towns.byId[selected].mageGuildLevel | Available spell shelf levels. |
| guildSpells | state.towns.byId[selected].mageGuildSpells | Spell IDs offered by level. |
| visitingHero | state.adventure.visitingHeroId | Hero that can learn spells. |
| hero.knownSpells | state.heroes.byId[visiting].knownSpells | Known spell markers. |
| hero.wisdom | state.heroes.byId[visiting].skills.wisdom | Eligibility for higher spell levels. |

### Mechanics Mapping
- Learning validates town mage guild level, hero presence, wisdom requirements, known spell duplication, and spell registry scope.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Eligible spell icons glow, learned spells stamp into the hero spell list, locked shelves remain dark.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `mage-guild`; system group: `town`; curation marker: `curated-pass-2`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
