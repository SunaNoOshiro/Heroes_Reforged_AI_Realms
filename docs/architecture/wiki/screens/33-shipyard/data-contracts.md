# Screen 33: Shipyard
## Data Contracts

### Source Files

- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries

| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, animation manifests. | `content-schema/schemas/asset-index.schema.json` |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | `content-schema/schemas/localization.schema.json` |
| `ruleset.schema.json` | Deterministic constants, formulas, and guard rules consumed by commands. | `content-schema/schemas/ruleset.schema.json` |
| `building.schema.json` | Town buildings, construction requirements, dwellings, mage guilds, forts, shipyards, and grail structures. | `content-schema/schemas/building.schema.json` |
| `world.schema.json` | World terrain, biome, underground, generator, and map setup records. | `content-schema/schemas/world.schema.json` |
| `resource-id.schema.json` | Canonical resource IDs used by costs, rewards, income, trade rates, and affordability checks. | `content-schema/schemas/resource-id.schema.json` |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. `BUILD_BOAT` is declared in `$defs/buildBoat` with fields `townId`, `shipyardId`, `spawnTile`, `metadata`. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors

| UI Element | Selector | Notes |
| --- | --- | --- |
| `shipyardId` | `state.ui.shipyard.sourceId` | Town building or adventure shipyard object. |
| `spawnTiles` | `selectors.towns.shipyardBoatSpawnTiles` | Legal adjacent water tiles. |
| `selectedTile` | `state.ui.shipyard.selectedSpawnTile` | Local chosen spawn tile. |
| `cost` | `selectors.economy.shipyardBoatCost` | Wood/ore/gold requirement and affordability. |
| `resources` | `state.players.active.resources` | Resource guard for build command. |

### Commands And Events

| Token | Action ID | Class | Coverage |
| --- | --- | --- | --- |
| `SELECT_BOAT_SPAWN_TILE` | `shipyard.selectTile` | local-ui (matches `SELECT_` prefix in [`screen-command-coverage.json`](../../../screen-command-coverage.json)) | Updates spawn preview; never enters the command log. |
| `BUILD_BOAT` | `shipyard.build` | schema command (`command.schema.json#/$defs/buildBoat`) | Spends resources and creates a boat entity at the selected tile. |
| `CLOSE_SHIPYARD` | `shipyard.close` | local-ui (matches `CLOSE_` prefix in [`screen-command-coverage.json`](../../../screen-command-coverage.json)) | Returns to the caller (`24-town-screen` or `07-adventure-map`). |

### Config Keys

- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys

- `ui.shipyard.title`
- `ui.shipyard.actions.*`
- `ui.shipyard.status.*`
- `ui.shipyard.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs

- `ui.shipyard.background`
- `ui.shipyard.frame`
- `ui.shipyard.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.town.*`
- `vfx.shipyard.*`

### Save And Replay Fields

- Persist reducer-approved gameplay state, setup records, content
  hashes, command inputs, and explicit draft records only when named
  by the owning system. `BUILD_BOAT` serializes `townId`, `shipyardId`,
  `spawnTile`, and `metadata` per the schema.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor
  blink, animation frame, or transient visual effects.
- `state.ui.shipyard.sourceId` and `state.ui.shipyard.selectedSpawnTile`
  are local UI draft; not persisted and therefore not registered in
  [`data-inventory.md`](../../../data-inventory.md).
- Replays use stable IDs and scalar command inputs, never raw paths,
  localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback

- Boat construction validates shipyard building/object, available water
  spawn tile, existing boat occupancy, resources, and one-boat-per-tile
  rules.
- Missing presentation may fall back through the asset resolver.
- Missing gameplay records, invalid commands, and unresolved content
  IDs fail loudly before controls become enabled per
  [`fail-loud.md`](../../../fail-loud.md).

---

## 🔍 Sync Check

- **UI: ✔** — State selectors, action IDs, and locale/asset prefixes match sibling `spec.md` and `interactions.md`.
- **Schema: ✔** — `BUILD_BOAT` resolves to [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json) `$defs/buildBoat`; `SELECT_BOAT_SPAWN_TILE` and `CLOSE_SHIPYARD` are covered by the `SELECT_` / `CLOSE_` local-UI prefixes in [`screen-command-coverage.json`](../../../screen-command-coverage.json).
- **Tasks: ✔** — UI owner [`phase-2.07-ui-screen-backlog.33-shipyard-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/33-shipyard-screen.md) and engine owner [`phase-2.05-mod-system.06-build-boat-command-and-shipyard`](../../../../../tasks/phase-2/05-mod-system/06-build-boat-command-and-shipyard.md) both reference this package.

## ⚠ Issues

- **`command-schema.md` has no `BUILD_BOAT` entry.** The closed schema in [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json) defines `buildBoat`, but [`docs/architecture/command-schema.md`](../../../command-schema.md) lacks a `### BUILD_BOAT` section under Adventure Map Commands. Per CLAUDE.md (`src/contracts/` is generated from schemas), the schema is canonical, so this is a documentation gap; owning task `phase-2.05-mod-system.06-build-boat-command-and-shipyard` should add the prose entry. Skill did not edit `command-schema.md` (Hard Prohibition D).
