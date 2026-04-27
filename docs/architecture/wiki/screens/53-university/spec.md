# Screen 53: University

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
University skill-learning service where a visiting hero can buy offered secondary skills if legal.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-5`.
- Stone academy panel with four professor/skill cards, hero skill row, price plaque, Wisdom-style eligibility warnings, and Learn/Close buttons.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- UniversityDialog
  - SkillOfferCards
  - HeroSkillRow
  - PricePlaque
  - LearnButton
  - CloseButton

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| universityId | state.ui.university.sourceId | Visited town or adventure university. |
| offeredSkills | state.mapObjects.byId[universityId].offeredSkills | Skill offer IDs. |
| heroSkills | state.heroes.byId[selected].skills | Current secondary skill set. |
| selectedSkill | state.ui.university.selectedSkillId | Local selected offer. |
| learnGuard | selectors.heroes.universityLearnGuard | Skill legality and affordability. |

### Mechanics Mapping
- Learning validates hero ownership, open/upgradeable skill slots, offered skill records, max skill count, current mastery, price, and player gold.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Professor cards glow, selected skill book opens, gold ticks down, and learned skill slides into the hero skill row.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `university`; system group: `hero`; curation marker: `curated-pass-5`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
