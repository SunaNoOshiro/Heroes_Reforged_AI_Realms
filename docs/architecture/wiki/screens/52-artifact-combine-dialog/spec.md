# Screen 52: Artifact Combine Dialog

## Screen Package

- Mockup: [`mockup.html`](./mockup.html)
- Spec: this file
- Interactions: [`interactions.md`](./interactions.md)
- Data Contracts: [`data-contracts.md`](./data-contracts.md)
- Architecture Diagrams: [`architecture.md`](./architecture.md)

## Description

Confirmation modal for creating a combination artifact: shows the
owned component pieces, the resulting artifact, missing pieces and
blocked slots, and the equip-or-backpack destination before the
player commits.

## Visual Direction

Original internal UI contract. Do not use third-party captures,
copied franchise art, or external product pixels as implementation
input.

## Visual Contract

- Curation status: `curated-pass-5`.
- Z-Layer: `1000` per
  [`ui-technology-choice.md` § Z-Stack Contract](../../../ui-technology-choice.md#z-stack-contract).
- Forge-style modal: component artifacts orbit a central result-card
  ring, missing pieces stay dark, the destination slot is previewed
  below the ring, and `COMBINE` / `CANCEL` controls sit bottom-right.
- Dense classic fantasy strategy UI: fixed 800×600 layout, ornate
  gold frame, red/brown/stone panels, compact icon slots, right-click
  detail affordances, bottom status / resource feedback.
- [`mockup.html`](./mockup.html) contains visible UI only. Logic,
  transitions, and implementation notes live in the package Markdown
  files.

## Component Tree

- `ArtifactCombineDialog`
  - `ComponentArtifactRing`
  - `ResultArtifactCard`
  - `MissingPieceList`
  - `DestinationSlotPreview`
  - `CombineButtons`

## State Bindings

| Element | Bound To | Notes |
| --- | --- | --- |
| `recipeId` | `state.ui.artifactCombine.recipeId` | Combination recipe being evaluated. |
| `components` | `selectors.artifacts.combineComponents` | Required pieces and ownership state. |
| `resultArtifact` | `registries.artifacts.byId[resultId]` | Result artifact record. |
| `destination` | `selectors.artifacts.combineDestination` | Equip slot or backpack target. |
| `combineGuard` | `selectors.artifacts.combineGuard` | Eligibility and disabled reason. |

## Mechanics Mapping

- `COMBINE_ARTIFACTS` validates hero ownership, every component
  artifact ID, locked / equipped state, unique component IDs,
  combination-recipe eligibility, destination-slot legality, and
  backpack space before the reducer removes the components and
  creates the result artifact.
- UI previews stay local until `COMBINE_ARTIFACTS` is accepted or
  `artifactCombine.cancel` routes away.
- Heroes, artifacts, recipes, slots, and ownership resolve through
  registries and content schemas, never through hardcoded view
  logic.

## Animation Contract

- Owned pieces orbit and fuse, missing pieces remain dark, the
  resulting artifact flares, and components vanish only after the
  reducer accepts `COMBINE_ARTIFACTS`.
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
- [`data-contracts.md`](./data-contracts.md) identifies every schema,
  config, localization, asset, sound, VFX, save, and replay field
  required to implement the screen.

## AI Implementation Notes

- Screen slug: `artifact-combine-dialog`; system group: `hero`;
  curation marker: `curated-pass-5`.
- Build runtime components from the package contract, not from
  third-party captures or external product pixels.
- Runtime code resolves presentation through asset IDs and
  manifests; deterministic gameplay commands use stable IDs and
  scalar values.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree and state bindings match the modal regions in [`mockup.html`](./mockup.html) (central result ring, four component slots, missing-piece indicators, COMBINE + CANCEL buttons). Aligned with sibling [`architecture.md` § 1 Visual Composition](./architecture.md#1-visual-composition) and [`interactions.md` § 1 Actions](./interactions.md#1-actions).
- **Schema: ✔** — Selectors are read-only views; the single write command `COMBINE_ARTIFACTS` is defined in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) (line 1639). Artifact records, recipes, equip slots, and backpack rules are covered by [`artifact.schema.json`](../../../../../content-schema/schemas/artifact.schema.json) and [`hero.schema.json`](../../../../../content-schema/schemas/hero.schema.json) per [`data-contracts.md`](./data-contracts.md#content-schemas-and-registries).
- **Tasks: ✔** — Owning UI task [`phase-2.07-ui-screen-backlog.52-artifact-combine-dialog-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/52-artifact-combine-dialog-screen.md) names this file in Read First; reducer-owning task [`phase-2.01-spells-artifacts.15-combine-artifacts-command`](../../../../../tasks/phase-2/01-spells-artifacts/15-combine-artifacts-command.md) names `COMBINE_ARTIFACTS` in Outputs.

## ⚠ Issues

_None._
