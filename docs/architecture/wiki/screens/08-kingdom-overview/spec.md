# Screen 08: Kingdom Overview — Spec

## Companion Files
- [`mockup.html`](./mockup.html) — visual reference.
- [`interactions.md`](./interactions.md) — per-control behavior, timing, error paths.
- [`data-contracts.md`](./data-contracts.md) — schemas, config, localization, assets.
- [`architecture.md`](./architecture.md) — screen diagrams.

## 1. Description
Adventure-layer kingdom ledger summarizing owned towns, heroes,
daily income, garrison pressure, movement readiness, and strategic
warnings. Rendered as a modal over a dimmed
[`07-adventure-map`](../07-adventure-map/). Selecting a row sets
local focus; every action is a **UI-local route**, never a
deterministic gameplay command (see
[`data-contracts.md` § 3 Commands & Events](./data-contracts.md#3-commands--events)).

## 2. Visual Direction
Original internal UI contract. Do not use third-party captures,
copied franchise art, or external product pixels as implementation
input.

## 3. Visual Contract
- Curation status: `curated-pass-3`.
- A parchment ledger overlays the dimmed adventure map: town rows
  on the left, hero rows on the right, daily-income strip below,
  and small brass row selectors.
- Dense classic-fantasy strategy UI: fixed `800 × 600` layout,
  ornate gold frame, red / brown / stone panels, compact icon
  slots, right-click detail affordances, bottom status / resource
  feedback.
- [`mockup.html`](./mockup.html) contains **visible UI only**.
  Logic, transitions, and implementation notes live in the markdown
  package.

## 4. Component Tree
- `KingdomOverview`
  - `TownLedger`
  - `HeroLedger`
  - `DailyIncomeStrip`
  - `StrategicWarnings`
  - `FocusButton`
  - `CloseButton`

## 5. State Bindings

| Element | Bound to | Notes |
| --- | --- | --- |
| `townRows` | `state.players.active.townIds` | Owned towns with build, income, and garrison summary. |
| `heroRows` | `state.players.active.heroIds` | Owned heroes with movement, mana, army strength, and location. |
| `incomeTotals` | `selectors.economy.dailyIncomeByResource` | Daily income preview from town and mine ownership. |
| `selectedRow` | `state.ui.kingdomOverview.selectedRowId` | Local focus row for keyboard / pointer navigation. **UI-only; not persisted, not replayed.** |
| `warnings` | `selectors.adventure.kingdomWarnings` | Threats, idle heroes, empty towns, blocked build state. |

UI-only hover, focus, selected row, open tab, target cursor, drag
ghost, and animation frame stay outside deterministic gameplay
state.

## 6. Mechanics Mapping
- Summarizes owned towns, heroes, income, garrison pressure, and
  movement readiness. Selecting a row focuses a town or hero; **no
  gameplay command is committed** until a route opens another
  screen.
- UI previews stay local until a listed command or route guard
  accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and
  objects resolve through registries / content schemas — never
  hardcoded view logic.

## 7. Animation Contract
- Behavior and timing are owned by
  [`interactions.md` § 3 Animation](./interactions.md#3-animation).
- Animation **consumes** route or reducer results; it never decides
  gameplay outcomes.
- Under `config.ui.reducedMotion === true`, motion is replaced by
  static highlights; visible state changes are preserved with
  localized feedback.

## 8. Acceptance Criteria
- Mockup is visually distinct from sibling screens and follows this
  screen's internal visual direction.
- Spec lists every visible region and authoritative state binding.
- Interactions cover every primary control, next screen, state
  update, animation, disabled case, and error path.
- Architecture diagrams are screen-specific, not copied archetype
  diagrams.
- Data contracts identify the schema / config / localization /
  asset / sound / VFX / save / replay fields required to implement
  the screen.

## 9. AI Implementation Notes
- Screen slug: `kingdom-overview`; system group: `adventure`;
  curation marker: `curated-pass-3`.
- Build runtime components from the package contract, not from
  third-party captures or external product pixels.
- Runtime code resolves presentation through asset IDs / manifests;
  deterministic gameplay commands use stable IDs and scalar values.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree, bindings, and action surface match [`mockup.html`](./mockup.html). `FocusButton` is now listed alongside `CloseButton` to align with the `FOCUS` button (`data-action="kingdom.focusMap"`) and the four routes in [`interactions.md` § 2](./interactions.md#2-actions) and [`architecture.md` § 7](./architecture.md#7-outgoing-transitions).
- **Schema: ✔** — Selectors and state slices mirror [`data-contracts.md` § 2 Runtime State Selectors](./data-contracts.md#2-runtime-state-selectors); cited schemas all exist under [`content-schema/schemas/`](../../../../../content-schema/schemas/).
- **Tasks: ✔** — Bindings match the Inputs of owning task [`tasks/phase-2/07-ui-screen-backlog/08-kingdom-overview-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/08-kingdom-overview-screen.md); UI-local `selectedRow` correctly excluded from [`data-inventory.md`](../../../data-inventory.md).

## ⚠ Issues

- **Component tree gained `FocusButton`.** The original tree listed only `CloseButton`, but [`mockup.html`](./mockup.html) renders both `FOCUS` (`data-action="kingdom.focusMap"`) and `CLOSE` (`data-action="kingdom.close"`) buttons, and sibling [`interactions.md` § 2](./interactions.md#2-actions) and [`architecture.md` § 7](./architecture.md#7-outgoing-transitions) already documented `kingdom.focusMap` as a navigation route. Reconciled in this audit pass — the route always existed, only this file's Component Tree was incomplete. No feature invented.
