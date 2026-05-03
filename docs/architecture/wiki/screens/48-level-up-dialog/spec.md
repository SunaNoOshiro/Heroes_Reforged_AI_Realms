# Screen 48: Level Up Dialog

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Hero level-up choice dialog showing primary stat gain, two secondary skill choices, class weighting, and acceptance result.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-5`.
- Z-Layer: 1000 per [`docs/architecture/ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract).
- Hero sheet is dimmed behind a parchment modal with portrait, stat gain gem, two skill cards, XP progress, and OK/choice buttons.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- LevelUpDialog
  - HeroPortrait
  - PrimaryStatGain
  - SkillChoiceCards
  - ExperienceBar
  - ConfirmButton

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| heroId | state.ui.levelUp.heroId | Hero receiving the level. |
| primaryGain | state.ui.levelUp.primaryStatGain | Resolved deterministic stat gain. |
| skillChoices | state.ui.levelUp.skillChoices | Two legal secondary skill options. |
| selectedChoice | state.ui.levelUp.selectedChoiceId | Local choice before confirmation. |
| experience | state.heroes.byId[heroId].experience | XP bar and next-level threshold. |

### Mechanics Mapping
- Level-up choices are produced deterministically from hero class, existing skills, ruleset weights, seed state, and max skill constraints. Selecting a skill commits exactly one level result.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- XP bar fills, primary stat gem flashes, skill cards slide in from left/right, and selected card stamps into the hero sheet.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `level-up-dialog`; system group: `hero`; curation marker: `curated-pass-5`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
