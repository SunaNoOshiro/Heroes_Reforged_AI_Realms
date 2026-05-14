# Screen 07: Adventure Map — Data Contracts

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
| `hero.schema.json` | Hero identity, stats, army, skills, spellbook, equipment, and ownership selectors. | [`content-schema/schemas/hero.schema.json`](../../../../../content-schema/schemas/hero.schema.json) |
| `unit.schema.json` | Unit stats, stacks, recruitment options, combat previews, upgrades, and army transfers. | [`content-schema/schemas/unit.schema.json`](../../../../../content-schema/schemas/unit.schema.json) |
| `map-object.schema.json` | Map object categories, interaction prompts, rewards, placement rules, and visit outcomes. | [`content-schema/schemas/map-object.schema.json`](../../../../../content-schema/schemas/map-object.schema.json) |
| `adventure-building.schema.json` | Adventure-map structures, visit rules, ownership state, and map-facing economy bindings. | [`content-schema/schemas/adventure-building.schema.json`](../../../../../content-schema/schemas/adventure-building.schema.json) |
| `neutral-stack-template.schema.json` | Neutral stack composition, guard encounters, creature-bank defenders, rewards, and attitude. | [`content-schema/schemas/neutral-stack-template.schema.json`](../../../../../content-schema/schemas/neutral-stack-template.schema.json) |
| `resource-id.schema.json` | Canonical resource IDs used by costs, rewards, income, trade rates, and affordability checks. | [`content-schema/schemas/resource-id.schema.json`](../../../../../content-schema/schemas/resource-id.schema.json) |
| `world.schema.json` | World terrain, biome, underground, generator, and map-setup records. | [`content-schema/schemas/world.schema.json`](../../../../../content-schema/schemas/world.schema.json) |
| `command.schema.json` | Closed kind vocabulary for `MOVE_HERO`, `END_HERO_TURN`, `END_DAY`, and any other reducer-backed commands dispatched from this screen. | [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json) |

## 2. Runtime State Selectors

| UI element | Selector | Notes |
| --- | --- | --- |
| `map.tiles` | `state.adventure.visibleTiles` | Rendered from scenario map plus fog visibility. |
| `selectedHero` | `state.adventure.selectedHeroId` | Drives portrait, movement points, army, and path preview. |
| `pathPreview` | `state.ui.adventure.pathPreview` | UI draft only; non-persisted and non-hashed per [`ui-frame-lag-contract.md` § 2](../../../ui-frame-lag-contract.md#2-optimistic-ui). Clears when `MOVE_HERO` resolves. |
| `resources` | `state.players.active.resources` | Authoritative active-player resources. |
| `date` | `state.calendar.currentDate` | Month / week / day text and end-turn state. |

`state.adventure.*`, `state.players.*`, and `state.calendar.*` are
gameplay slices owned by
[`mvp.05-adventure-map.01-strategic-game-state-model`](../../../../../tasks/mvp/05-adventure-map/01-strategic-game-state-model.md);
their persistence rows live next to that engine task, not in this
screen package.

## 3. Commands & Events

| Action ID | Token | Routing | Source of truth |
| --- | --- | --- | --- |
| `adventure.selectHero` | `SELECT_ADVENTURE_HERO` | local-ui (`SELECT_` prefix) | [`screen-command-coverage.json#localUiPrefixes`](../../../screen-command-coverage.json) |
| `adventure.previewPath` | `PREVIEW_HERO_PATH` | local-ui (`PREVIEW_` prefix) | [`screen-command-coverage.json#localUiPrefixes`](../../../screen-command-coverage.json) |
| `adventure.moveHero` | `MOVE_HERO_ALONG_PATH` → `MOVE_HERO` | schema-backed command (alias) | [`screen-command-coverage.json#commandAliases`](../../../screen-command-coverage.json); [`command-schema.md` § `MOVE_HERO`](../../../command-schema.md#move_hero) |
| `adventure.openTown` | `OPEN_TOWN_SCREEN` | local-ui (`OPEN_` prefix; route) | [`screen-command-coverage.json#localUiPrefixes`](../../../screen-command-coverage.json) |
| `adventure.castSpell` | `OPEN_ADVENTURE_SPELL_TARGETING` | local-ui (`OPEN_` prefix; route) | [`screen-command-coverage.json#localUiPrefixes`](../../../screen-command-coverage.json) |
| `adventure.endTurn` | `END_PLAYER_TURN` → `END_DAY` | schema-backed command (alias; single-flight) | [`screen-command-coverage.json#commandAliases`](../../../screen-command-coverage.json); [`command-schema.md` § `END_DAY`](../../../command-schema.md#end_day); [`command-schema.md` § Single-flight commands](../../../command-schema.md#single-flight-commands) |

Per-action effects:
- `SELECT_ADVENTURE_HERO` — updates `state.adventure.selectedHeroId`
  and the right-panel portrait highlight.
- `PREVIEW_HERO_PATH` — recomputes `state.ui.adventure.pathPreview`
  without spending movement points.
- `MOVE_HERO` — consumes movement points along the validated path,
  updates the hero position, reveals fog, and may chain into
  `CAPTURE_MINE`, `INITIATE_BATTLE`, or town entry per
  [`command-schema.md` § `MOVE_HERO`](../../../command-schema.md#move_hero).
- `OPEN_TOWN_SCREEN` — routes the player to
  [`24-town-screen`](../24-town-screen/) when the selected town is
  owned and visible.
- `OPEN_ADVENTURE_SPELL_TARGETING` — routes to
  [`17-adventure-spell-targeting`](../17-adventure-spell-targeting/)
  and seeds the targeting draft.
- `END_DAY` — commits the turn transition, advances the calendar,
  and triggers the `DAY_END` / `WEEK_START` event sequence per
  [`mvp.05-adventure-map.02-turn-structure`](../../../../../tasks/mvp/05-adventure-map/02-turn-structure.md).

## 4. Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

## 5. Localization Keys
- `ui.adventure-map.title`
- `ui.adventure-map.actions.*`
- `ui.adventure-map.status.*`
- `ui.adventure-map.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

## 6. Asset, Sound, and VFX IDs
- `ui.adventure-map.background`
- `ui.adventure-map.frame`
- `ui.adventure-map.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.adventure.*`
- `vfx.adventure-map.*`

## 7. Save & Replay Fields
- Persist reducer-approved gameplay state, setup records, content
  hashes, command inputs, and explicit draft records only when
  named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor
  blink, animation frame, or transient visual effects.
- `state.ui.adventure.pathPreview` is **session-only**: non-replayed
  and non-hashed per
  [`ui-frame-lag-contract.md` § 2](../../../ui-frame-lag-contract.md#2-optimistic-ui).
- Replays use stable IDs and scalar command inputs — never raw
  paths, localized labels, rendered positions, or wall-clock
  timestamps.

## 8. Validation & Fallback
- Hero selection, path preview, tile movement, object visits, fog
  reveal, town / hero focus, spell targeting, and end-turn all
  dispatch deterministic commands.
- Missing presentation assets may use resolver fallback.
- Missing gameplay records, invalid commands, and unresolved
  content IDs **fail loudly** per
  [`fail-loud.md`](../../../fail-loud.md) before controls become
  enabled.

---

## 🔍 Sync Check

- **UI: ✔** — § 2 Runtime State Selectors mirrors sibling [`spec.md` § 5 State Bindings](./spec.md#5-state-bindings); § 3 Commands & Events mirrors [`interactions.md` § 2 Actions](./interactions.md#2-actions) including the alias chain `MOVE_HERO_ALONG_PATH` → `MOVE_HERO` and `END_PLAYER_TURN` → `END_DAY`.
- **Schema: ✔** — All 11 schemas listed in § 1 resolve under [`content-schema/schemas/`](../../../../../content-schema/schemas/) and match the auto-derived `screenSchemaPaths` block for `07-adventure-map` in [`task-registry.json`](../../../../../tasks/task-registry.json). `MOVE_HERO` and `END_DAY` are defined in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) and have dedicated sections in [`command-schema.md`](../../../command-schema.md). No `state.adventure.*` / `state.calendar.*` / `state.players.active.*` row in [`data-inventory.md`](../../../data-inventory.md) is claimed by this screen package — those rows live with the owning engine task `mvp.05-adventure-map.01-strategic-game-state-model`; see `## ⚠ Issues`.
- **Tasks: ✔** — Owning UI tasks (`mvp.07-ui-shell.01` / `02` / `03` / `06`) read this file via the screen-package block in their `Read First`. Runtime owners: [`mvp.05-adventure-map.03-hero-movement`](../../../../../tasks/mvp/05-adventure-map/03-hero-movement.md) for `MOVE_HERO`; [`mvp.05-adventure-map.02-turn-structure`](../../../../../tasks/mvp/05-adventure-map/02-turn-structure.md) for `END_HERO_TURN` / `END_DAY`.

## ⚠ Issues

- **Strategic-state slices unregistered in `data-inventory.md`.** [`data-inventory.md`](../../../data-inventory.md) currently registers only `state.players.byId.*.displayName` under the strategic state surface — `state.adventure.visibleTiles`, `state.adventure.selectedHeroId`, `state.players.active.resources`, and `state.calendar.currentDate` are bound by this screen but have no row. Per the project root contract in [`CLAUDE.md`](../../../../../CLAUDE.md) ("every persisted field is registered in `data-inventory.md`"), the runtime owner [`mvp.05-adventure-map.01-strategic-game-state-model`](../../../../../tasks/mvp/05-adventure-map/01-strategic-game-state-model.md) must add rows for the persisted slices it owns. Suggested values: domain=`adventure` / `calendar` / `player`, persistence=`indexeddb` (saves), retention=`scenario`. `state.ui.adventure.pathPreview` is exempt (UI draft per [`ui-frame-lag-contract.md` § 2](../../../ui-frame-lag-contract.md#2-optimistic-ui)). Skill did not add the rows itself (Hard Prohibition D — never edit cross-checked files).
