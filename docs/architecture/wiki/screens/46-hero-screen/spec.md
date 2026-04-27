# Screen 46: Hero Screen

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Hero management sheet with portrait, primary stats, specialty, experience, secondary skills, equipment paper doll, backpack, army, minimap/sidebar context, and dismiss/quest/spell routes.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `anchor-v1`.
- A large parchment/stone hero sheet overlays the adventure sidebar style: stats and skills on the left, paper doll and artifacts in the center, army row along the bottom, map/sidebar context on the right.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- HeroScreen
  - HeroPortrait
  - PrimaryStats
  - SpecialtyPanel
  - SecondarySkills
  - PaperDoll
  - ArtifactSlots
  - Backpack
  - HeroArmyRow
  - SidebarContext

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| hero.id | state.heroes.selectedHeroId | Current hero context. |
| hero.primaryStats | state.heroes.byId[selected].stats | Attack, defense, power, knowledge. |
| hero.skills | state.heroes.byId[selected].secondarySkills | Skill grid and tooltips. |
| hero.equipment | state.heroes.byId[selected].equipment | Paper doll slots. |
| hero.backpack | state.heroes.byId[selected].backpack | Backpack inventory. |
| hero.army | state.heroes.byId[selected].army | Army row and stack operations. |

### Mechanics Mapping
- Artifact equip/unequip, backpack drag/drop, army stack movement, hero dismissal guard, quest log, spellbook access, and right-click detail consume hero selectors and validated commands.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Artifact drag ghosts follow cursor, legal equipment slots glow, accepted artifacts snap into place, skill and stat tooltips fade in.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `hero-screen`; system group: `hero`; curation marker: `anchor-v1`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
