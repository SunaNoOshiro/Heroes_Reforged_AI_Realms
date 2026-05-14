# Screen 06: Random Map Generator Settings — Data Contracts

## Companion Files
- [`mockup.html`](./mockup.html) — visual reference.
- [`spec.md`](./spec.md) — components, bindings.
- [`interactions.md`](./interactions.md) — per-control behavior.
- [`architecture.md`](./architecture.md) — screen diagrams.

## 1. Content Schemas & Registries

| Schema / Registry | Used for | Canonical source |
| --- | --- | --- |
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, animation manifests. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |
| `ruleset.schema.json` | Deterministic constants, formulas, and guard rules consumed by `GENERATE_RANDOM_MAP`. | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |
| `scenario.schema.json` | Scenario record produced by `GENERATE_RANDOM_MAP`: starting state, victory / loss conditions, save / load metadata. | [`content-schema/schemas/scenario.schema.json`](../../../../../content-schema/schemas/scenario.schema.json) |
| `world.schema.json` | World terrain, biome, underground, generator, and map setup records. | [`content-schema/schemas/world.schema.json`](../../../../../content-schema/schemas/world.schema.json) |
| `faction.schema.json` | Faction identity, town roster, hero / unit references, and player-facing faction metadata. | [`content-schema/schemas/faction.schema.json`](../../../../../content-schema/schemas/faction.schema.json) |
| `random-map-template.schema.json` | RMG template records (zone graph, connections, terrain, start-position pools, object pools) consumed by `SELECT_RMG_TEMPLATE` and `GENERATE_RANDOM_MAP`. | `content-schema/schemas/random-map-template.schema.json` (planned — see ⚠ Issues below) |
| `command.schema.json` | Closed kind vocabulary for `ROLL_RMG_SEED` and `GENERATE_RANDOM_MAP`. | [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json) |

## 2. Runtime State Selectors

| UI element | Selector | Notes |
| --- | --- | --- |
| `templateId` | `state.ui.rmg.templateId` | Selected random map template (local draft). |
| `mapSize` | `state.ui.rmg.mapSize` | Small / medium / large / extra large dimensions (local draft). |
| `players` | `state.ui.rmg.players` | Player count, AI / human flags, team assignments (local draft). |
| `seed` | `state.ui.rmg.seed` | Deterministic seed draft. |
| `zonePreview` | `selectors.rmg.templateZonePreview` | Derived preview graph for the active template + options. |

All five paths are **runtime-only drafts** (not persisted); no row is
required in [`data-inventory.md`](../../../data-inventory.md). The
pre-load `ROLL_RMG_SEED` result is pinned into the command log by the
dispatcher per
[`command-schema.md` § Seed Source Precedence](../../../command-schema.md#seed-source-precedence).

## 3. Commands & Events

| Action ID | Token | Routing | Source of truth |
| --- | --- | --- | --- |
| `rmg.selectTemplate` | `SELECT_RMG_TEMPLATE` | local-ui (`SELECT_` prefix) | [`screen-command-coverage.json#localUiPrefixes`](../../../screen-command-coverage.json) |
| `rmg.rollSeed` | `ROLL_RMG_SEED` | schema-backed command | [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json); referenced in [`command-schema.md` § Seed Source Precedence](../../../command-schema.md#seed-source-precedence) |
| `rmg.generate` | `GENERATE_RANDOM_MAP` | schema-backed command | [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json); reserved in [`command-schema.md` § Future Commands](../../../command-schema.md#future-commands-phase-2) |
| `rmg.back` | `CLOSE_RANDOM_MAP_SETUP` | local-ui (`CLOSE_` prefix) | [`screen-command-coverage.json#localUiPrefixes`](../../../screen-command-coverage.json) |

Per-action effects:
- `SELECT_RMG_TEMPLATE` — updates `state.ui.rmg.templateId` and
  recomputes `selectors.rmg.templateZonePreview`.
- `ROLL_RMG_SEED` — produces a deterministic integer seed; pinned into
  the command log so the subsequent `SCENARIO_LOAD` consumes the same
  value per the seed-source rule above.
- `GENERATE_RANDOM_MAP` — validates template compatibility, player
  slots, content packs, deterministic seed, and ruleset; builds the
  scenario record routed into [`59-loading-screen`](../59-loading-screen/).
- `CLOSE_RANDOM_MAP_SETUP` — discards the local RMG draft and routes
  back to [`02-new-game-setup`](../02-new-game-setup/).

## 4. Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

## 5. Localization Keys
- `ui.random-map-setup.title`
- `ui.random-map-setup.actions.*`
- `ui.random-map-setup.status.*`
- `ui.random-map-setup.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

## 6. Asset, Sound, and VFX IDs
- `ui.random-map-setup.background`
- `ui.random-map-setup.frame`
- `ui.random-map-setup.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.menus.*`
- `vfx.random-map-setup.*`

## 7. Save & Replay Fields
- Persist reducer-approved gameplay state, the scenario record produced
  by `GENERATE_RANDOM_MAP`, content hashes, command inputs
  (`ROLL_RMG_SEED`, `GENERATE_RANDOM_MAP`), and explicit draft records
  only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor
  blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs — never raw paths,
  localized labels, rendered positions, or wall-clock timestamps.

## 8. Validation & Fallback
- The screen edits an **RMG draft only**. `GENERATE_RANDOM_MAP`
  validates template compatibility, player slots, content packs,
  deterministic seed, and ruleset before building scenario data.
- Missing presentation assets may use resolver fallback.
- Missing gameplay records, invalid commands, and unresolved content
  IDs **fail loudly** per [`fail-loud.md`](../../../fail-loud.md)
  before controls become enabled.

---

## 🔍 Sync Check

- **UI: ✔** — Selector rows match sibling [`spec.md` § 5 State Bindings](./spec.md#5-state-bindings) and the bound regions in [`mockup.html`](./mockup.html). Action / token rows match [`interactions.md` § 2 Actions](./interactions.md#2-actions).
- **Schema: ⚠** — `random-map-template.schema.json` was added inline based on the dependent runtime task [`mvp.03-map-system.08-random-map-generator-template-format`](../../../../../tasks/mvp/03-map-system/08-random-map-generator-template-format.md) (Inputs explicitly cite that schema) and the screen package's `mvp.02-content-schemas.18-random-map-template-schema` dependency. The previous version of this file omitted that schema. `ROLL_RMG_SEED` and `GENERATE_RANDOM_MAP` resolve in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) (`const: "ROLL_RMG_SEED"` line 1346; `const: "GENERATE_RANDOM_MAP"` line 1371). No `state.ui.rmg.*` row in [`data-inventory.md`](../../../data-inventory.md) is required — the slices are runtime drafts (same exemption as sibling screen [`02-new-game-setup`](../02-new-game-setup/data-contracts.md)).
- **Tasks: ✔** — Owning UI task [`phase-2.07-ui-screen-backlog.06-random-map-setup-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/06-random-map-setup-screen.md) reads this file; runtime task [`mvp.03-map-system.09-random-map-generator-deterministic-runner`](../../../../../tasks/mvp/03-map-system/) is the dispatch owner for `ROLL_RMG_SEED` / `GENERATE_RANDOM_MAP`.

## ⚠ Issues

- **`GENERATE_RANDOM_MAP` lacks a dedicated section in `command-schema.md`.** Mirrored from [`interactions.md` § Issues](./interactions.md#-issues) — the kind is defined in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) but [`command-schema.md`](../../../command-schema.md) only lists it indirectly under [§ Future Commands](../../../command-schema.md#future-commands-phase-2). Per the project root contract, `mvp.03-map-system.09-random-map-generator-deterministic-runner` should add a per-command section with validation + effects when it lands. Non-blocking for this screen package. Skill did not edit `command-schema.md` (Hard Prohibition D — never edit cross-checked files).
