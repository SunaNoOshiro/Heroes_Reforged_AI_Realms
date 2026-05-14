# Screen 07: Adventure Map — Spec

## Companion Files
- [`mockup.html`](./mockup.html) — visual reference.
- [`interactions.md`](./interactions.md) — per-control behavior, timing, error paths.
- [`data-contracts.md`](./data-contracts.md) — schemas, config, localization, assets.
- [`architecture.md`](./architecture.md) — screen diagrams.

## 1. Description
Primary strategic map. Hosts the tile viewport, fog of war, hero
path preview, object interaction, minimap, hero / army sidebar,
resource bar, and date strip. All gameplay mutations leave the
screen as schema-backed `Command` kinds (see
[`data-contracts.md` § 3](./data-contracts.md#3-commands--events));
all previews and selections stay local under `state.ui.adventure.*`.

## 2. Visual Direction
Original internal UI contract. Do not use third-party captures,
copied franchise art, or external product pixels as implementation
input.

## 3. Visual Contract
- Curation status: `anchor-v1`.
- Large map viewport dominates the screen, narrow right
  command / minimap / hero panel, thin resource + date strip along
  the bottom.
- Dense classic-fantasy strategy UI: fixed `800 × 600` viewport,
  ornate gold frame, red / brown / stone panels, compact icon
  slots, right-click detail affordances, bottom status / resource
  feedback.
- [`mockup.html`](./mockup.html) contains **visible UI only**.
  Logic, transitions, and implementation notes live in the markdown
  package.

## 4. Component Tree
- `AdventureMapScreen`
  - `MapViewport`
  - `FogMask`
  - `PathPreview`
  - `ObjectLayer`
  - `RightCommandPanel`
  - `MiniMap`
  - `HeroArmyPanel`
  - `ResourceDateBar`
  - `StatusLine`

## 5. State Bindings

| Element | Bound to | Notes |
| --- | --- | --- |
| `map.tiles` | `state.adventure.visibleTiles` | Rendered from scenario map plus fog visibility. |
| `selectedHero` | `state.adventure.selectedHeroId` | Drives portrait, movement points, army, and path preview. |
| `pathPreview` | `state.ui.adventure.pathPreview` | UI draft; cleared when `MOVE_HERO` resolves or is rejected (see [`ui-frame-lag-contract.md` § 2](../../../ui-frame-lag-contract.md#2-optimistic-ui)). |
| `resources` | `state.players.active.resources` | Authoritative active-player resources. |
| `date` | `state.calendar.currentDate` | Month / week / day text and end-turn state. |

UI-only hover, focus, selected row, open tab, target cursor, drag
ghost, and animation frame stay outside deterministic gameplay
state.

## 6. Mechanics Mapping
- Hero selection, path preview, tile movement, object visits, fog
  reveal, town / hero focus, spell targeting, and end-turn all
  dispatch deterministic commands.
- UI previews stay **local** until a listed command or route guard
  accepts them.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and
  objects resolve through registries / content schemas — never
  hardcoded view logic.

## 7. Animation Contract
- Behavior, timing, and command routing are owned by
  [`interactions.md` § 3 Animation](./interactions.md#3-animation).
- Animation **consumes** reducer or route results; it never decides
  gameplay outcomes.
- Under `config.ui.reducedMotion === true`, motion is replaced by
  static highlights; visible state changes are preserved with
  localized feedback.

## 8. Acceptance Criteria
- [`mockup.html`](./mockup.html) is visually distinct from other
  screens and follows the visual direction above.
- This spec lists every visible region and authoritative state
  binding.
- [`interactions.md`](./interactions.md) covers every primary
  control, next screen, state update, animation, disabled case,
  and error path.
- [`architecture.md`](./architecture.md) contains
  screen-specific diagrams — not copied archetype diagrams.
- [`data-contracts.md`](./data-contracts.md) identifies every
  schema / config / localization / asset / audio / VFX / save /
  replay field required to implement the screen.

## 9. AI Implementation Notes
- Screen slug `adventure-map`; system group `adventure`; curation
  marker `anchor-v1`; visual archetype `curated-adventure-map`.
- Build runtime components from this package contract, not from
  third-party captures or external product pixels.
- Runtime code resolves presentation through asset IDs / manifests;
  deterministic gameplay commands use stable IDs and scalar values.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree matches the visible regions in [`mockup.html`](./mockup.html) (`data-screen="07-adventure-map"`, `data-archetype="curated-adventure-map"`, `data-curation="anchor-v1"`; `data-component` attributes for `MapViewport`, `FogMask`, `ObjectLayer`, `RightCommandPanel`, `ResourceDateBar`, plus an inline `CommandButtons` SVG group inside `RightCommandPanel`). `MiniMap`, `PathPreview`, `HeroArmyPanel`, and `StatusLine` are visible regions in the SVG but lack their own `data-component` markers; called out in `## ⚠ Issues`.
- **Schema: ✔** — Bound paths are gameplay slices owned by [`mvp.05-adventure-map.01-strategic-game-state-model`](../../../../../tasks/mvp/05-adventure-map/01-strategic-game-state-model.md) (`state.adventure.*`, `state.players.*`, `state.calendar.*`); the only UI-draft slice (`state.ui.adventure.pathPreview`) is non-persisted and non-hashed per [`ui-frame-lag-contract.md` § 2](../../../ui-frame-lag-contract.md#2-optimistic-ui).
- **Tasks: ✔** — Owning UI shell tasks ([`mvp.07-ui-shell.01-react-18-app-shell-with-canvas-overlay`](../../../../../tasks/mvp/07-ui-shell/01-react-18-app-shell-with-canvas-overlay.md), `02-zustand-store`, `03-hud-resource-bar-end-turn-button-mini-map-stub`, `06-command-hook-ui-dispatch-re-render`) read this file via the screen-package block in their `Read First`; runtime ownership for the gameplay slices stays with `mvp.05-adventure-map.01-strategic-game-state-model` and dependent commands.

## ⚠ Issues

- **Four components in this tree lack `data-component` markers in the mockup.** The component tree lists `MiniMap`, `PathPreview`, `HeroArmyPanel`, and `StatusLine`, but [`mockup.html`](./mockup.html) only attaches `data-component` to `MapViewport`, `FogMask`, `ObjectLayer`, `RightCommandPanel`, and `ResourceDateBar` (the minimap rectangle is the inner `(624, 36)` block, the path is rendered inside the `ObjectLayer` group, the hero panel is the `(624, 330)` block, and the status strip is the `(18, 546)` band). Per [`.agents/rules/ui.md`](../../../../../.agents/rules/ui.md) (the mockup is the visual reference for the screen package), the owning UI task should add `data-component="MiniMap" | "PathPreview" | "HeroArmyPanel" | "StatusLine"` markers so the component tree survives the screen-component coverage check. Skill did not edit the mockup (Hard Prohibition D — never edit cross-checked files).
- **Mockup carries three command buttons absent from `interactions.md`.** [`mockup.html`](./mockup.html) wires `data-action="adventure.kingdom"`, `data-action="adventure.questLog"`, and `data-action="adventure.sleep"`, but sibling [`interactions.md` § 2 Actions](./interactions.md#2-actions) only enumerates Town / Spell / End-turn. Two of the three navigate to Phase-2 screens ([`08-kingdom-overview`](../08-kingdom-overview/), [`11-quest-log`](../11-quest-log/)); `adventure.sleep` is a local-ui hero-asleep toggle (under the `SET_` prefix in [`screen-command-coverage.json#localUiPrefixes`](../../../screen-command-coverage.json)). Per [`.agents/rules/ui.md`](../../../../../.agents/rules/ui.md) (each screen package's four `.md` files are the contract for its mockup), the next audit pass on `interactions.md` should add these three rows with `Type=navigation` / `local-ui` and "render disabled with a localized reason citing the owning Phase-2 screen" per the owning UI tasks' acceptance criteria. Cross-flagged with [`interactions.md ## ⚠ Issues`](./interactions.md#-issues).
