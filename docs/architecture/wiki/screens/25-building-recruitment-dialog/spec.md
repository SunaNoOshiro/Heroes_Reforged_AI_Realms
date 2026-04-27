# Screen 25: Building / Recruitment Dialog

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Town dwelling recruitment dialog with creature portrait, dwelling selection, available growth, quantity controls, total cost, and destination stack preview.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-2`.
- Town panorama is dimmed behind a red-and-bronze service panel: dwelling list left, creature art and stats center, quantity/cost/army destination on the right.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- RecruitmentDialog
  - DwellingList
  - CreaturePortrait
  - CreatureStats
  - QuantityStepper
  - CostPanel
  - DestinationArmyPreview
  - ConfirmCancelButtons

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| town.id | state.towns.selectedTownId | Town providing dwelling stock. |
| dwelling.stock | state.towns.byId[selected].dwellingStock | Available creatures by dwelling. |
| selectedDwelling | state.ui.town.selectedDwellingId | Local recruitment selection. |
| recruitQuantity | state.ui.town.recruitQuantity | Local draft until confirmed. |
| destinationArmy | state.townRecruit.destinationArmy | Hero or garrison target slots. |

### Mechanics Mapping
- Recruit validates town ownership, built dwelling, available stock, resource cost, and army capacity before creating or merging a stack.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Dwelling row highlights, quantity counter ticks, max button fills the slider, accepted recruits slide toward the destination army slot.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `building-recruitment-dialog`; system group: `town`; curation marker: `curated-pass-2`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
