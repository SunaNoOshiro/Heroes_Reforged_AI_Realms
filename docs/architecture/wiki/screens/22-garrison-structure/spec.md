# Screen 22: Garrison Structure

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Adventure garrison transfer screen for moving stacks between visiting hero and standalone garrison structure.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-3`.
- Two horizontal army rows face each other inside a stone gate frame, with hero portrait left, garrison banner right, and split/swap controls between them.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- GarrisonStructureScreen
  - HeroArmyRow
  - GarrisonArmyRow
  - StackDragLayer
  - TransferControls
  - CloseButton

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| heroArmy | state.heroes.byId[selected].army | Visiting hero stack row. |
| garrisonArmy | state.mapObjects.byId[garrisonId].army | Structure stack row. |
| selectedStack | state.ui.garrisonTransfer.selectedStackRef | Local drag/click selection. |
| transferRules | selectors.armies.garrisonTransferRules | Ownership, lock, capacity, and merge legality. |
| splitDraft | state.ui.garrisonTransfer.splitQuantity | Local split quantity before command. |

### Mechanics Mapping
- Transfers validate ownership, locked garrison flags, stack compatibility, one-creature-left rules where applicable, and capacity before reducer updates both armies.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Dragged stack ghost follows the cursor, legal slots glow, swaps crossfade, and rejected drops snap back with a dull thud.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `garrison-structure`; system group: `adventure`; curation marker: `curated-pass-3`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
