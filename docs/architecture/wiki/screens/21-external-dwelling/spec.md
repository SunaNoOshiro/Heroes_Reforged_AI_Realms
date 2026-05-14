# Screen 21: External Dwelling

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Adventure-map dialog for recruiting creatures from a dwelling that
sits outside any town. Opens when the active hero visits the
dwelling; closes back to `07-adventure-map`.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

### Visual Contract
- Curation status: `curated-pass-3`.
- Modal panel over the adventure-map shell: dwelling title bar,
  creature portrait, weekly stock readout, quantity stepper with
  `MAX`, cost preview, hero army destination row, and a bottom
  `RECRUIT` / `CLOSE` button pair.
- Dense classic fantasy strategy UI: fixed 800×600 layout, ornate
  gold frame, red/brown/stone panels, compact icon slots, right-click
  detail affordances, and bottom status/resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and
  implementation notes live in the Markdown sibling files.

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
| costPreview | selectors.economy.externalDwellingCost | Cost and affordability for `selectedQuantity`. |

### Mechanics Mapping
- Recruit validates dwelling ownership/visit state, weekly stock,
  resource cost, hero army capacity, and creature merge legality
  before any state mutates.
- Quantity, `MAX`, and close stay local until the reducer or a route
  guard accepts them.
- Costs, units, buildings, stacks, heroes, and map objects resolve
  through registries / content schemas, never via hardcoded view
  logic.

### Animation Contract
- Portrait breathes, stock counter ticks down, the recruited stack
  slides into the destination slot, and an exhausted dwelling greys
  out.
- Animation consumes reducer or route results; it never decides
  gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static
  highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this
  screen's internal visual direction.
- Spec lists every visible region and its authoritative state
  binding.
- `interactions.md` covers every primary control, next screen, state
  update, animation, disabled case, and error path.
- `architecture.md` carries screen-specific diagrams, not copied
  archetype boilerplate.
- `data-contracts.md` identifies the schema, config, localization,
  asset, sound, VFX, save, and replay fields required to implement
  the screen.

### AI Implementation Notes
- Screen slug: `external-dwelling`; system group: `adventure`;
  curation marker: `curated-pass-3`.
- Build runtime components from this package, never from third-party
  captures or external product pixels.
- Resolve presentation through asset IDs / manifests; deterministic
  gameplay commands use stable IDs and scalar values only.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree, bindings, and curation marker match `mockup.html` and the sibling `interactions.md` / `architecture.md` (see sibling `architecture.md` § Visual Composition — aligned, with the `ExternalDwellingDialog` root made explicit).
- **Schema: ✔** — Every state path here is also listed in `data-contracts.md` § Runtime State Selectors; the only schema-backed command, `RECRUIT_EXTERNAL_DWELLING_UNITS`, is defined in [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json).
- **Tasks: ✔** — Owning UI task `phase-2.07-ui-screen-backlog.21-external-dwelling-screen` lists this file under Read First; engine command task `mvp.05-adventure-map.13-recruit-external-dwelling-command` references the screen folder.

## ⚠ Issues

_None._
