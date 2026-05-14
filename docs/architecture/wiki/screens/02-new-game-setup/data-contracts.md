# Screen 02: New Game Setup — Data Contracts

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
| `ruleset.schema.json` | Deterministic constants, formulas, and guard rules consumed by commands. | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |
| `scenario.schema.json` | Scenario setup, starting state, victory / loss conditions, and save / load metadata. | [`content-schema/schemas/scenario.schema.json`](../../../../../content-schema/schemas/scenario.schema.json) |
| `world.schema.json` | World terrain, biome, underground, generator, and map setup records. | [`content-schema/schemas/world.schema.json`](../../../../../content-schema/schemas/world.schema.json) |
| `faction.schema.json` | Faction identity, town roster, hero / unit references, and player-facing faction metadata. | [`content-schema/schemas/faction.schema.json`](../../../../../content-schema/schemas/faction.schema.json) |
| `hero.schema.json` | Hero identity, stats, army, skills, spellbook, equipment, and ownership selectors. | [`content-schema/schemas/hero.schema.json`](../../../../../content-schema/schemas/hero.schema.json) |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state. | Loaded content / runtime registries. |

## 2. Runtime State Selectors

All five slices are **runtime-only drafts** (not persisted). Local
hover, focus, drag ghost, and animation frame stay outside
deterministic state.

| Binding handle | Selector | Notes |
| --- | --- | --- |
| `setupMode` | `state.ui.newGame.mode` | Single, campaign, random, multiplayer, or tutorial draft. |
| `scenarioList` | `selectors.scenarios.availableScenarios` | Compatible scenario records from installed packs. |
| `selectedScenario` | `state.ui.newGame.selectedScenarioId` | Local selected scenario. |
| `playerSlots` | `state.ui.newGame.playerSlots` | Human / AI / open / closed player slot draft. |
| `difficulty` | `state.ui.newGame.difficulty` | Ruleset difficulty draft. |

## 3. Commands & Events

Three tokens are local-ui routing / draft updates (prefixes `SET_`,
`SELECT_`, `CANCEL_` in
[`screen-command-coverage.json#localUiPrefixes`](../../../screen-command-coverage.json))
and **do not enter the deterministic command log**.
`CREATE_GAME_FROM_SETUP` is aliased to the canonical
[`SCENARIO_LOAD`](../../../command-schema.md#scenario_load) command
via `commandAliases` in the same coverage file and **is** logged.

| Trigger | Token | Effect |
| --- | --- | --- |
| `newGame.selectMode` | `SET_NEW_GAME_MODE` | Updates setup draft and visible fields. |
| `newGame.selectScenario` | `SELECT_SCENARIO` | Updates preview and player slots. |
| `newGame.start` | `CREATE_GAME_FROM_SETUP` → `SCENARIO_LOAD` | Validates setup and emits the deterministic initial game request with a scalar seed. |
| `newGame.back` | `CANCEL_NEW_GAME_SETUP` | Discards setup draft and routes to `01-main-menu`. |

## 4. Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

## 5. Localization Keys
- `ui.new-game-setup.title`
- `ui.new-game-setup.actions.*`
- `ui.new-game-setup.status.*`
- `ui.new-game-setup.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

## 6. Asset, Audio & VFX IDs
- `ui.new-game-setup.background`
- `ui.new-game-setup.frame`
- `ui.new-game-setup.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.menus.*`
- `vfx.new-game-setup.*`

## 7. Save & Replay Fields
- Persist only reducer-approved gameplay state, setup records,
  content hashes, scalar command inputs, and explicit draft records
  named by the owning system.
- **Never persist**: hover, focus, tooltip, scroll, drag ghost,
  cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs — never raw paths,
  localized labels, rendered positions, or wall-clock timestamps.

## 8. Validation & Fallback
- The screen creates a **setup draft only**. Starting the game
  validates the selected scenario or generator config, pack
  compatibility, player slots, victory / loss conditions, and the
  deterministic seed.
- **Presentation** may fall back through the asset resolver.
- **Gameplay records, invalid commands, and unresolved content IDs
  fail loudly before controls become enabled**, per
  [`fail-loud.md`](../../../fail-loud.md).

---

## 🔍 Sync Check

- **UI: ✔** — Token list, state selectors, and command-row effects match sibling [`interactions.md` § Actions](./interactions.md#actions) and [`spec.md` § State Bindings](./spec.md#state-bindings); mockup data-actions (`newGame.start`, `newGame.back`) match.
- **Schema: ✔** — All seven schemas exist under [`content-schema/schemas/`](../../../../../content-schema/schemas/) and are registered in [`schema-matrix.md`](../../../schema-matrix.md). `SET_NEW_GAME_MODE`, `SELECT_SCENARIO`, and `CANCEL_NEW_GAME_SETUP` are local-ui per `localUiPrefixes`; `CREATE_GAME_FROM_SETUP` aliases [`SCENARIO_LOAD`](../../../command-schema.md#scenario_load) per `commandAliases`. No enum drift.
- **Tasks: ✔** — Owning task [`mvp.07-ui-shell.08-new-game-setup-screen`](../../../../../tasks/mvp/07-ui-shell/08-new-game-setup-screen.md) declares this file in its Read First; depends on [`mvp.08-persistence.04-scenario-loader`](../../../../../tasks/mvp/08-persistence/04-scenario-loader.md) for the `SCENARIO_LOAD` consumer side.

## ⚠ Issues

_None._
