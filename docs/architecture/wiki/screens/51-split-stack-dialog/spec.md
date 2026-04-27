# Screen 51: Split Stack Dialog

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Army stack split dialog used by hero screen, town garrison, hero meeting, and garrison structures.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-5`.
- Small brass quantity modal over the owning army screen with source stack portrait, numeric amount, slider, one/max buttons, and OK/Cancel.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- SplitStackDialog
  - SourceStackPreview
  - QuantitySlider
  - AmountStepper
  - DestinationPreview
  - ConfirmCancelButtons

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| sourceStack | state.ui.splitStack.sourceStackRef | Caller-provided stack reference. |
| destinationSlot | state.ui.splitStack.destinationSlotRef | Caller-provided target slot. |
| quantity | state.ui.splitStack.quantity | Local split amount. |
| splitGuard | selectors.armies.splitStackGuard | Count, ownership, capacity, and merge legality. |
| caller | state.ui.splitStack.returnScreen | Screen to refresh after split. |

### Mechanics Mapping
- Split validates source count, destination slot availability, merge legality, minimum one creature in source where required, and caller ownership rules.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Slider knob ticks, source and destination counts preview live, OK splits the stack into two sliding badges, and Cancel snaps preview back.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `split-stack-dialog`; system group: `hero`; curation marker: `curated-pass-5`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
