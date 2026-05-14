# Screen 06: Random Map Generator Settings — Spec

## Companion Files
- [`mockup.html`](./mockup.html) — visual reference.
- [`interactions.md`](./interactions.md) — per-control behavior, timing, error paths.
- [`data-contracts.md`](./data-contracts.md) — schemas, config, localization, assets.
- [`architecture.md`](./architecture.md) — screen diagrams.

## 1. Description
Random map generator setup for template, size, player / team matrix,
water, monster strength, seed, and victory options. The screen builds a
**local RMG draft only**; no deterministic gameplay state is created
here. The draft routes into [`59-loading-screen`](../59-loading-screen/)
when the player confirms via `GENERATE_RANDOM_MAP`.

## 2. Visual Direction
Original internal UI contract. Do not use third-party captures, copied
franchise art, or external product pixels as implementation input.

## 3. Visual Contract
- Curation status: `curated-pass-6`.
- Generator console with a templates list, a settings panel (size,
  players, teams, water, monsters), a zone-preview pane, a seed field,
  and Generate / Back buttons.
- Dense classic-fantasy strategy UI: fixed `800 × 600` viewport, ornate
  gold frame, red / brown / stone panels, compact icon slots,
  right-click detail affordances, bottom status / resource feedback.
- [`mockup.html`](./mockup.html) contains **visible UI only**. Logic,
  transitions, and implementation notes live in the markdown package.

## 4. Component Tree
- `RandomMapSetup`
  - `TemplateList`
  - `SizeDifficultyControls`
  - `PlayerTeamMatrix`
  - `SeedField`
  - `ZonePreview`
  - `GenerateBackButtons`

## 5. State Bindings

All five bindings are **runtime-only drafts** (not persisted); the
authoritative selector drives the bound handle. No row is required in
[`data-inventory.md`](../../../data-inventory.md).

| Binding handle | Selector | Notes |
| --- | --- | --- |
| `templateId` | `state.ui.rmg.templateId` | Selected random map template. |
| `mapSize` | `state.ui.rmg.mapSize` | Small / medium / large / extra large dimensions. |
| `players` | `state.ui.rmg.players` | Player count, AI / human flags, team assignments. |
| `seed` | `state.ui.rmg.seed` | Explicit deterministic seed draft. |
| `zonePreview` | `selectors.rmg.templateZonePreview` | Preview graph for the active template and options. |

UI-only hover, focus, selected row, open tab, target cursor, drag
ghost, and animation frame stay outside deterministic gameplay state.

## 6. Mechanics Mapping
- The screen produces an **RMG draft only**. `GENERATE_RANDOM_MAP`
  validates template compatibility, player slots, content packs,
  deterministic seed, and ruleset before building scenario data —
  owned by the dispatcher and scenario loader, not by this view.
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
- [`interactions.md`](./interactions.md) covers every primary control,
  next screen, state update, animation, disabled case, and error path.
- [`architecture.md`](./architecture.md) contains screen-specific
  diagrams — not copied archetype diagrams.
- [`data-contracts.md`](./data-contracts.md) identifies every
  schema / config / localization / asset / audio / VFX / save / replay
  field required to implement the screen.

## 9. AI Implementation Notes
- Screen slug `random-map-setup`; system group `menus`; curation marker
  `curated-pass-6`; visual archetype `curated-rmg-setup`.
- Build runtime components from this package contract, not from
  third-party captures or external product pixels.
- Runtime code resolves presentation through asset IDs / manifests;
  deterministic gameplay commands use stable IDs and scalar values.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree (`TemplateList`, `SizeDifficultyControls`, `PlayerTeamMatrix`, `SeedField`, `ZonePreview`, `GenerateBackButtons`) matches the visible regions in [`mockup.html`](./mockup.html) (`data-screen="06-random-map-setup"`, `data-archetype="curated-rmg-setup"`, `data-curation="curated-pass-6"`; templates list with rows `Balanced / Ring / Islands / Jebus / Custom`, settings rows `Size XL / Players 8 / Teams 2 / Water Normal / Monsters Strong`, zone-preview pane, seed `HR-0428`, Generate + Back buttons) and sibling [`architecture.md` § 3 Visual Composition](./architecture.md#3-visual-composition).
- **Schema: ✔** — State paths (`state.ui.rmg.*`, `selectors.rmg.templateZonePreview`) are runtime drafts (not persisted), so no row is required in [`data-inventory.md`](../../../data-inventory.md) — matches the same exemption used in sibling screen [`02-new-game-setup/spec.md` § State Bindings](../02-new-game-setup/spec.md#state-bindings).
- **Tasks: ✔** — Owning task [`phase-2.07-ui-screen-backlog.06-random-map-setup-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/06-random-map-setup-screen.md) reads this file and its siblings; acceptance criteria require the rendered tokens to dispatch live when their engine task is `done` and to render disabled with a localized reason otherwise.

## ⚠ Issues

- **Mockup lacks affordances for the listed local-ui commands.** Sibling [`interactions.md` § 2 Actions](./interactions.md#2-actions) enumerates `rmg.selectTemplate` and `rmg.rollSeed`, and the settings rows (`Size XL`, `Players 8`, `Teams 2`, `Water Normal`, `Monsters Strong`) are drawn as static SVG slots; only `data-action="rmg.generate"` and `data-action="rmg.back"` exist in [`mockup.html`](./mockup.html). Per [`.agents/rules/ui.md`](../../../../../.agents/rules/ui.md) (`mockup.html` is the visual reference), the mockup should expose `data-action` hooks for the per-row template clicks, the per-row settings cycles, and the seed-roll button before owning task [`phase-2.07-ui-screen-backlog.06-random-map-setup-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/06-random-map-setup-screen.md) reaches `in-progress`. Suggested values: `data-action="rmg.selectTemplate"` per template row, `data-action="rmg.setSize" | "rmg.setPlayers" | "rmg.setTeams" | "rmg.setWater" | "rmg.setMonsters"` per settings row, and a visible seed-roll affordance with `data-action="rmg.rollSeed"`. Skill did not edit the mockup (Hard Prohibition D — never edit cross-checked files).
