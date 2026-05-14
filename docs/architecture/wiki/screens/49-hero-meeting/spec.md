# Screen 49: Hero Meeting

## Screen Package

- Mockup: [`mockup.html`](./mockup.html)
- Spec: this file
- Interactions: [`interactions.md`](./interactions.md)
- Data Contracts: [`data-contracts.md`](./data-contracts.md)
- Architecture Diagrams: [`architecture.md`](./architecture.md)

## Description

Adventure-map meeting modal between two friendly heroes on the same
or adjacent tile. Used to exchange army stacks and artifacts.

## Visual Direction

Original internal UI contract. Do not use third-party captures,
copied franchise art, or external product pixels as implementation
input.

## Visual Contract

- Curation status: `curated-pass-5`.
- Two facing hero panels (portrait, name, move points, primary stat
  slots), one army row per hero, a center exchange arrow, and a
  close button.
- Dense classic fantasy strategy UI: fixed 800×600 layout, ornate
  gold frame, red/brown/stone panels, compact icon slots, right-click
  detail affordances, bottom status/resource feedback.
- [`mockup.html`](./mockup.html) contains visible UI only. Logic,
  transitions, and implementation notes live in the package Markdown
  files.

## Component Tree

- `HeroMeetingScreen`
  - `LeftHeroPanel`
  - `RightHeroPanel`
  - `ArmyTransferRows`
  - `ArtifactTransferStrips`
  - `DragLayer`
  - `CloseButton`

## State Bindings

| Element | Bound To | Notes |
| --- | --- | --- |
| `leftHero` | `state.ui.heroMeeting.leftHeroId` | First friendly hero. |
| `rightHero` | `state.ui.heroMeeting.rightHeroId` | Second friendly hero. |
| `leftArmy` | `state.heroes.byId[left].army` | Left hero stacks. |
| `rightArmy` | `state.heroes.byId[right].army` | Right hero stacks. |
| `dragDraft` | `state.ui.heroMeeting.dragDraft` | Local transfer draft (in-memory). |

## Mechanics Mapping

- Stack and artifact transfers validate ownership, hero lock state,
  artifact equip legality, army capacity, one-creature-left rules,
  and meeting-tile adjacency before the reducer updates both heroes
  atomically.
- UI previews stay local until `TRANSFER_HERO_ARMY_STACK`,
  `TRANSFER_HERO_ARTIFACT`, or a route guard accepts them.
- Heroes, stacks, artifacts, and ownership resolve through registries
  and content schemas, never through hardcoded view logic.

## Animation Contract

- Stack and artifact drag ghosts travel between panels; legal targets
  glow; accepted swaps crossfade; rejected drops snap back.
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

- Screen slug: `hero-meeting`; system group: `hero`; curation marker:
  `curated-pass-5`.
- Build runtime components from the package contract, not from
  third-party captures or external product pixels.
- Runtime code resolves presentation through asset IDs and manifests;
  deterministic gameplay commands use stable IDs and scalar values.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree and state bindings match the modal regions in [`mockup.html`](./mockup.html) (two hero panels, two army rows, close button, exchange arrow). Aligned with sibling [`architecture.md` § 1 Visual Composition](./architecture.md#1-visual-composition) and [`interactions.md` § 1 Actions](./interactions.md#1-actions).
- **Schema: ✔** — Selectors are read-only views; the two write commands (`TRANSFER_HERO_ARMY_STACK`, `TRANSFER_HERO_ARTIFACT`) are defined in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) (lines 1516, 1611). Hero, stack, and artifact records covered by `hero.schema.json`, `unit.schema.json`, and `artifact.schema.json` per [`data-contracts.md`](./data-contracts.md#content-schemas-and-registries).
- **Tasks: ✔** — Owning UI task [`phase-2.07-ui-screen-backlog.49-hero-meeting-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/49-hero-meeting-screen.md) names this file in Read First; reducer-owning tasks [`mvp.05-adventure-map.18-transfer-stack-commands`](../../../../../tasks/mvp/05-adventure-map/18-transfer-stack-commands.md) and [`phase-2.01-spells-artifacts.05b-transfer-hero-artifact-command`](../../../../../tasks/phase-2/01-spells-artifacts/05b-transfer-hero-artifact-command.md) name `TRANSFER_HERO_ARMY_STACK` / `TRANSFER_HERO_ARTIFACT` in their Outputs.

## ⚠ Issues

- **Dropped "split/swap controls in the center" from the Visual Contract.** The prior revision listed split / swap controls as a center-panel affordance, but [`interactions.md` § 1 Actions](./interactions.md#1-actions) defines no `splitStack` / `swapHeroes` action and [`mockup.html`](./mockup.html) shows only the exchange arrow plus `CLOSE`. `SPLIT_ARMY_STACK` exists in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) (line 1576) but is not referenced by this screen; swap behavior is folded into `TRANSFER_HERO_ARMY_STACK`'s move / merge / swap reducer per [`mvp.05-adventure-map.18-transfer-stack-commands`](../../../../../tasks/mvp/05-adventure-map/18-transfer-stack-commands.md). Reconciled by aligning the Visual Contract to mockup + interactions (doc-audit § 9.A — pick the interpretation most consistent with the cross-checked files). Suggested follow-up: if split is desired here, the owning UI task must add a `heroMeeting.splitStack` action and route it to [`51-split-stack-dialog`](../51-split-stack-dialog/), not invent it in this spec.
