# Screen 47: Spell Book

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Open spellbook view with school tabs, two-page spell grid, known/disabled spell states, mastery-derived details, mana cost, and cast/close controls.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `anchor-v1`.
- Open parchment book centered on a darkened backdrop, with side tabs for spell schools, left/right pages, icon slots, selected spell details, and brass cast/close buttons.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- SpellBookScreen
  - BookBackdrop
  - SchoolTabs
  - LeftPageSpellGrid
  - RightPageSpellGrid
  - SelectedSpellDetails
  - ManaFooter
  - CastCloseButtons

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| hero.spells | state.heroes.byId[selected].knownSpells | Known spell IDs. |
| spellbook.school | state.ui.spellbook.selectedSchool | Local school filter. |
| selectedSpell | state.ui.spellbook.selectedSpellId | Local selected spell. |
| mana | state.heroes.byId[selected].mana | Current and max spell points. |
| castContext | state.ui.spellbook.castContext | Adventure or combat scope controls enabled spells. |

### Mechanics Mapping
- Known spell list, school filters, wisdom/mastery gating, adventure/combat scope, mana cost, and target mode determine whether Cast routes to targeting or remains disabled.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Book opens with page lift, school tabs flip pages, selected spell glows, disabled spell icons desaturate, Cast transitions into targeting overlay.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `spell-book`; system group: `hero`; curation marker: `anchor-v1`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
