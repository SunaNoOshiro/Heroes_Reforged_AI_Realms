# Screen 02: New Game Setup — Spec

## Companion Files
- [`mockup.html`](./mockup.html) — visual reference.
- [`interactions.md`](./interactions.md) — per-control behavior, timing, error paths.
- [`data-contracts.md`](./data-contracts.md) — schemas, config, localization, assets.
- [`architecture.md`](./architecture.md) — screen diagrams.

## Description
Scenario setup shell for single scenario, campaign, random map,
multiplayer, difficulty, player color, and starting options. The
screen builds a **local setup draft only**; no deterministic gameplay
state is created here. The draft routes into
[`59-loading-screen`](../59-loading-screen/) when the player confirms.

## Visual Direction
Original internal UI contract. Do not use third-party captures,
copied franchise art, or external product pixels as implementation
input.

## Visual Contract
- Curation status: `curated-pass-6`.
- Stone-framed setup panel with mode tabs, scenario list, scenario
  preview map, player slots, difficulty shields, and Start / Back
  buttons.
- Dense classic-fantasy strategy UI: fixed `800 × 600` viewport,
  ornate gold frame, red / brown / stone panels, compact icon slots,
  right-click detail affordances, and bottom status / resource feedback.
- [`mockup.html`](./mockup.html) contains **visible UI only**. Logic,
  transitions, and implementation notes live in the markdown package.

## Component Tree
- `NewGameSetup`
  - `ModeTabs`
  - `ScenarioList`
  - `ScenarioPreview`
  - `PlayerSlotTable`
  - `DifficultySelector`
  - `StartBackButtons`

## State Bindings

All five bindings are **runtime-only drafts** (not persisted); the
authoritative selector drives the bound handle. No row is required in
[`data-inventory.md`](../../../data-inventory.md).

| Binding handle | Selector | Notes |
| --- | --- | --- |
| `setupMode` | `state.ui.newGame.mode` | Single, campaign, random, multiplayer, or tutorial draft. |
| `scenarioList` | `selectors.scenarios.availableScenarios` | Compatible scenario records from installed packs. |
| `selectedScenario` | `state.ui.newGame.selectedScenarioId` | Local selected scenario. |
| `playerSlots` | `state.ui.newGame.playerSlots` | Human / AI / open / closed player slot draft. |
| `difficulty` | `state.ui.newGame.difficulty` | Ruleset difficulty draft. |

UI-only hover, focus, selected row, open tab, target cursor, drag
ghost, and animation frame stay outside deterministic gameplay state.

## Mechanics Mapping
- The screen produces a **setup draft only**. Starting the game
  validates the selected scenario or generator config, pack
  compatibility, player slots, victory / loss conditions, and the
  deterministic seed — owned by the dispatcher and scenario loader,
  not by this view.
- UI previews stay **local** until a listed command or route guard
  accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and
  objects resolve through registries / content schemas — never
  hardcoded view logic.

## Animation Contract
- Behavior, timing, and command routing are owned by
  [`interactions.md` § Animation](./interactions.md#animation).
- Animation **consumes** reducer or route results; it never decides
  gameplay outcomes.
- Under `config.ui.reducedMotion === true`, motion is replaced by
  static highlights; visible state changes are preserved with
  localized feedback.

## Acceptance Criteria
- [`mockup.html`](./mockup.html) is visually distinct from other
  screens and follows the visual direction above.
- This spec lists every visible region and authoritative state
  binding.
- [`interactions.md`](./interactions.md) covers every primary
  control, next screen, state update, animation, disabled case, and
  error path.
- [`architecture.md`](./architecture.md) contains screen-specific
  diagrams — not copied archetype diagrams.
- [`data-contracts.md`](./data-contracts.md) identifies every
  schema / config / localization / asset / audio / VFX / save / replay
  field required to implement the screen.

## AI Implementation Notes
- Screen slug `new-game-setup`; system group `menus`; curation marker
  `curated-pass-6`.
- Build runtime components from this package contract, not from
  third-party captures or external product pixels.
- Runtime code resolves presentation through asset IDs / manifests;
  deterministic gameplay commands use stable IDs and scalar values.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree, mode list, and binding names match sibling [`architecture.md` § Visual Composition](./architecture.md#visual-composition), [`interactions.md` § State Changes](./interactions.md#state-changes), and the visible regions in [`mockup.html`](./mockup.html) (`data-screen="02-new-game-setup"`, mode panel rows `Scenario / Campaign / Random Map / Multiplayer`, Start + Back buttons).
- **Schema: ✔** — No schema enums declared inline. State paths (`state.ui.newGame.*`, `selectors.scenarios.availableScenarios`) are runtime drafts (not persisted), so no row required in [`data-inventory.md`](../../../data-inventory.md).
- **Tasks: ✔** — Owning task [`mvp.07-ui-shell.08-new-game-setup-screen`](../../../../../tasks/mvp/07-ui-shell/08-new-game-setup-screen.md) reads this spec and its three siblings; acceptance criteria explicitly bind the layout, bindings, and commands to this package.

## ⚠ Issues

_None._
