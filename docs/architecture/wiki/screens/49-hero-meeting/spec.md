# Screen 49: Hero Meeting

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Two friendly heroes meeting on the adventure map to exchange troops, artifacts, and war machines.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-5`.
- Dual hero panels face each other with portraits, army rows, backpack strips, trade arrow, and split/swap controls in the center.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- HeroMeetingScreen
  - LeftHeroPanel
  - RightHeroPanel
  - ArmyTransferRows
  - ArtifactTransferStrips
  - DragLayer
  - CloseButton

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| leftHero | state.ui.heroMeeting.leftHeroId | First friendly hero. |
| rightHero | state.ui.heroMeeting.rightHeroId | Second friendly hero. |
| leftArmy | state.heroes.byId[left].army | Left hero stacks. |
| rightArmy | state.heroes.byId[right].army | Right hero stacks. |
| dragDraft | state.ui.heroMeeting.dragDraft | Local transfer draft. |

### Mechanics Mapping
- Transfers validate ownership, hero lock state, artifact equip legality, army capacity, one-creature constraints, and meeting tile adjacency before commands commit.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Stack and artifact drag ghosts travel between panels, legal targets glow, swaps crossfade, and rejected drops snap back.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `hero-meeting`; system group: `hero`; curation marker: `curated-pass-5`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
