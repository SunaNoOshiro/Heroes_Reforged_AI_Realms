# Screen 22: Garrison Structure

## Screen Package

- Mockup: [`mockup.html`](./mockup.html)
- Spec: this file
- Interactions: [`interactions.md`](./interactions.md)
- Data Contracts: [`data-contracts.md`](./data-contracts.md)
- Architecture Diagrams: [`architecture.md`](./architecture.md)

## Description

Adventure-map garrison transfer modal. Moves stacks between a
visiting hero and a **standalone garrison structure** (an
adventure-map object, not a town). Hero ↔ town garrison transfers
live in [`24-town-screen`](../24-town-screen/).

## Visual Direction

Original internal UI contract. Do not use third-party captures,
copied franchise art, or external product pixels as implementation
input.

## Visual Contract

- Curation status: `curated-pass-3`.
- Two horizontal army rows face each other inside a stone-gate
  modal: hero army on top, garrison army below, with SPLIT and
  CLOSE controls between them.
- Dense classic fantasy strategy UI: fixed 800×600 layout, ornate
  gold frame, red/brown/stone panels, compact icon slots,
  right-click detail affordances, bottom status/resource feedback.
- [`mockup.html`](./mockup.html) contains visible UI only. Logic,
  transitions, and implementation notes live in the package
  Markdown files.

## Component Tree

- `GarrisonStructureScreen`
  - `HeroArmyRow`
  - `GarrisonArmyRow`
  - `StackDragLayer`
  - `TransferControls`
  - `CloseButton`

## State Bindings

| Element | Bound To | Notes |
| --- | --- | --- |
| `heroArmy` | `state.heroes.byId[selected].army` | Visiting hero stack row. |
| `garrisonArmy` | `state.mapObjects.byId[garrisonId].army` | Structure stack row. |
| `selectedStack` | `state.ui.garrisonTransfer.selectedStackRef` | Local drag/click selection (in-memory). |
| `transferRules` | `selectors.armies.garrisonTransferRules` | Ownership, lock, capacity, and merge legality. |
| `splitDraft` | `state.ui.garrisonTransfer.splitQuantity` | Local split quantity before command (in-memory). |

## Mechanics Mapping

- Transfers validate ownership, locked-garrison flag, stack
  compatibility, one-creature-left rules where applicable, and
  per-army capacity (max 7 stacks) before the reducer updates both
  armies atomically.
- UI previews stay local until `TRANSFER_GARRISON_STACK` or a route
  guard accepts them.
- Costs, units, heroes, and map objects resolve through registries
  and content schemas, never through hardcoded view logic.

## Animation Contract

- Dragged stack ghost follows the cursor; legal slots glow; swaps
  crossfade; rejected drops snap back with a dull thud.
- Animation consumes reducer or route results; it never decides
  gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static
  highlights and localized feedback.

## Acceptance Criteria

- Mockup is visually distinct from other screens and follows this
  screen's internal visual direction.
- This spec lists all visible regions and authoritative state
  bindings.
- [`interactions.md`](./interactions.md) covers every primary
  control, next screen, state update, animation, disabled case, and
  error path.
- [`architecture.md`](./architecture.md) contains screen-specific
  diagrams, not copied archetype diagrams.
- [`data-contracts.md`](./data-contracts.md) identifies every
  schema, config, localization, asset, sound, VFX, save, and replay
  field required to implement the screen.

## AI Implementation Notes

- Screen slug: `garrison-structure`; system group: `adventure`;
  curation marker: `curated-pass-3`.
- Build runtime components from the package contract, not from
  third-party captures or external product pixels.
- Runtime code resolves presentation through asset IDs and
  manifests; deterministic gameplay commands use stable IDs and
  scalar values.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree and state bindings match [`mockup.html`](./mockup.html) (two army rows, SPLIT and CLOSE controls). Aligned with sibling [`architecture.md` § 1 Visual Composition](./architecture.md#1-visual-composition) and [`interactions.md` § 1 Actions](./interactions.md#1-actions).
- **Schema: ✔** — Selectors are read-only views; `TRANSFER_GARRISON_STACK` payload defined in [`command.schema.json` `TRANSFER_GARRISON_STACK`](../../../../../content-schema/schemas/command.schema.json). Hero / garrison / stack records covered by `hero.schema.json`, `adventure-building.schema.json`, and `unit.schema.json` per [`data-contracts.md`](./data-contracts.md#content-schemas-and-registries).
- **Tasks: ✔** — Owning UI task [`tasks/phase-2/07-ui-screen-backlog/22-garrison-structure-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/22-garrison-structure-screen.md) names this file in Read First; owning reducer task [`tasks/mvp/05-adventure-map/18-transfer-stack-commands.md`](../../../../../tasks/mvp/05-adventure-map/18-transfer-stack-commands.md) reads `interactions.md`.

## ⚠ Issues

- **Removed three out-of-scope state bindings (`garrisonHeroId`, `visitingHeroId`, `swapEnabled`).** The prior revision included the two-hero-per-town protocol rows owned by [`24-town-screen/spec.md`](../24-town-screen/spec.md) and the `SWAP_TOWN_HEROES` reducer in [`tasks/mvp/05-adventure-map/18-transfer-stack-commands.md`](../../../../../tasks/mvp/05-adventure-map/18-transfer-stack-commands.md). This screen targets a **standalone garrison structure** (a map object, not a town), and neither sibling `architecture.md` § 6 State Inputs nor `data-contracts.md` § Runtime State Selectors references those slices. Reconciled by dropping the rows (interpretation most consistent with the rest of the package per doc-audit § 9.A). Suggested follow-up: keep the two-hero protocol bindings authoritative only on `24-town-screen/spec.md`.
