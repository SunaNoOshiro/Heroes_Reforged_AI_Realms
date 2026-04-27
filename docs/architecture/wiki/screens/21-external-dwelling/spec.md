# Screen 21: External Dwelling

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Adventure creature dwelling recruitment window for map dwellings outside towns.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-3`.
- Dwelling facade panel with creature portrait, weekly stock, quantity stepper, cost preview, and hero army destination row.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- ExternalDwellingDialog
  - DwellingPortrait
  - CreatureOffer
  - QuantityStepper
  - CostPreview
  - DestinationArmyRow

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| dwellingId | state.ui.adventure.pendingDwellingId | Visited external dwelling. |
| dwellingStock | state.mapObjects.byId[dwellingId].stock | Weekly available creature count. |
| selectedQuantity | state.ui.externalDwelling.quantity | Local recruit draft. |
| destinationArmy | state.heroes.byId[selected].army | Hero army receiving recruits. |
| costPreview | selectors.economy.externalDwellingCost | Cost and affordability for quantity. |

### Mechanics Mapping
- Recruitment validates dwelling ownership/visit state, weekly stock, resource cost, hero army capacity, and creature merge legality.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Creature portrait breathes, stock counter ticks down, recruited stack slides into destination slot, and empty dwelling greys out.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `external-dwelling`; system group: `adventure`; curation marker: `curated-pass-3`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
