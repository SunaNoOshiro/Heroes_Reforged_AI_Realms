# Screen 51: Split Stack Dialog

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Army stack split dialog used by the hero screen, town garrison, hero
meeting, and garrison structures. Opens over the caller, splits a
selected stack into a destination slot, and routes back to the caller
after the reducer or guard resolves.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

### Visual Contract
- Curation status: `curated-pass-5`.
- Z-Layer: 1000 per
  [`docs/architecture/ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract).
- Modal id: `51-split-stack-dialog`; registered in
  [`modal-entry.schema.json` §`modalId`](../../../../../content-schema/schemas/modal-entry.schema.json).
  The frame on `state.ui.modalStack` carries `callerRoute`,
  `previousFocusElementId`, severity `info`, and the per-screen draft
  in `params` per
  [`ui-routing.md` § Modal Stack](../../../ui-routing.md#modal-stack).
- Small brass quantity modal over the owning army screen with source
  stack portrait, numeric amount, slider, ONE / MAX buttons, and
  OK / CANCEL.
- Use dense classic fantasy strategy UI: fixed 800×600 layout, ornate
  gold frame, red / brown / stone panels, compact icon slots,
  right-click detail affordances, and bottom status / resource feedback.
- `mockup.html` contains visible UI only. Logic, transitions, and
  implementation notes live in the Markdown package files.

### Component Tree
- SplitStackDialog
  - SourceStackPreview
  - QuantitySlider
  - AmountStepper (ONE / MAX)
  - DestinationPreview
  - ConfirmCancelButtons (OK / CANCEL)

### State Bindings
| Element | Bound To | Notes |
| --- | --- | --- |
| `sourceStack` | `state.ui.splitStack.sourceStackRef` | Caller-provided stack reference. |
| `destinationSlot` | `state.ui.splitStack.destinationSlotRef` | Caller-provided target slot. |
| `quantity` | `state.ui.splitStack.quantity` | Local split amount; integer `1..source.count - 1`. |
| `splitGuard` | `selectors.armies.splitStackGuard` | Count, ownership, capacity, and merge legality. |
| `caller` | `state.ui.splitStack.returnScreen` | Screen route to refresh after split. Mirrors `modalStack[top].callerRoute`. |

### Mechanics Mapping
- Split validates source count, destination slot availability, merge
  legality (same creature ID or empty slot), minimum one creature in
  source where required, and caller ownership rules.
- UI previews stay local until a listed command or route guard accepts
  them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and
  objects resolve through registries / content schemas, never via
  hardcoded view logic.
- The reducer that mutates army slots is
  [`SPLIT_ARMY_STACK`](../../../../../content-schema/schemas/command.schema.json);
  see sibling `interactions.md` for the full action table.

### Animation Contract
- Slider knob ticks live; source and destination counts preview in
  real time as `quantity` changes.
- OK splits the stack into two sliding badges; CANCEL snaps preview
  back to the pre-open values.
- Animation consumes reducer or route results; it never decides
  gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static
  highlights and localized feedback.

### Acceptance Criteria
- Mockup is visually distinct from other screens and follows this
  screen's internal visual direction.
- Spec lists all visible regions and authoritative state bindings.
- Interactions file covers every primary control, next screen, state
  update, animation, disabled case, and error path.
- Architecture file contains screen-specific diagrams, not copied
  archetype diagrams.
- Data contracts identify schema / config / localization / asset /
  sound / VFX / save / replay fields required to implement the screen.

### AI Implementation Notes
- Screen slug: `split-stack-dialog`; system group: `hero`; curation
  marker: `curated-pass-5`.
- Build runtime components from the package contract, not from
  third-party captures or external product pixels.
- Runtime code should resolve presentation through asset IDs /
  manifests; deterministic gameplay commands use stable IDs and
  scalar values.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree, state bindings, and visual contract
  match `mockup.html` (4 buttons: ONE / MAX / OK / CANCEL), sibling
  `interactions.md`, and sibling `data-contracts.md`.
- **Schema: ✔** — Modal id `51-split-stack-dialog` is present in
  [`modal-entry.schema.json` §`modalId`](../../../../../content-schema/schemas/modal-entry.schema.json);
  `SPLIT_ARMY_STACK` payload pinned in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json)
  (`armyId`, `sourceSlot`, `targetSlot`, `quantity ≥ 1`, `metadata`).
- **Tasks: ✔** — Owning UI task
  [`phase-2.07-ui-screen-backlog.51-split-stack-dialog-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/51-split-stack-dialog-screen.md)
  lists this file in Read First; reducer task
  [`mvp.05-adventure-map.17-split-army-stack-command`](../../../../../tasks/mvp/05-adventure-map/17-split-army-stack-command.md)
  reciprocates by Reading First sibling `interactions.md`.

## ⚠ Issues

_None._
