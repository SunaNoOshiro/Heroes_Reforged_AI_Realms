# Screen 14: War Machine Factory

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Adventure shop for buying ballista, ammo cart, first aid tent, or catapult-related war machine services where rules allow.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation input.

### Visual Contract
- Curation status: `curated-pass-3`.
- Workshop storefront panel with machine bays, price tags, hero equipment rack, and stock/ownership markers.
- Use dense classic fantasy strategy UI: fixed 800x600 layout, ornate gold frame, red/brown/stone panels, compact icon slots, right-click detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and implementation notes live in Markdown package files.

### Component Tree
- WarMachineFactory
  - MachineBayGrid
  - HeroMachineRack
  - PriceLedger
  - BuyButton
  - CloseButton

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| shopStock | state.mapObjects.byId[factoryId].warMachineStock | Available machines and restock flags. |
| heroMachines | state.heroes.byId[selected].warMachines | Hero-owned machine slots. |
| selectedMachine | state.ui.warMachineFactory.selectedMachineId | Local selected machine. |
| price | selectors.economy.selectedWarMachinePrice | Gold cost and affordability. |
| resources | state.players.active.resources.gold | Gold available for purchase guard. |

### Mechanics Mapping
- Purchases validate hero ownership, machine slot availability, shop stock, resource cost, and existing machine state before committing.
- UI previews stay local until a listed command or route guard accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and objects resolve through registries/content schemas, not hardcoded view logic.

### Animation Contract
- Machine bay lights on hover, purchase stamps SOLD, gold count ticks down, and the acquired machine slides into the hero rack.
- Animation consumes reducer or route results; it never decides gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied archetype diagrams.
- Data contracts identify schema/config/localization/asset/sound/VFX/save/replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `war-machine-factory`; system group: `adventure`; curation marker: `curated-pass-3`.
- Build runtime components from the package contract, not from third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs/manifests; deterministic gameplay commands use stable IDs and scalar values.
