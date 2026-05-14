# Screen 30: Town Hall / Build Tree
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `building.schema.json` | Building definitions: `requires`, `cost`, `effects`, presentation hooks. | [`content-schema/schemas/building.schema.json`](../../../../../content-schema/schemas/building.schema.json) |
| `town-presentation.schema.json` | Town layout, building slots, panorama overlays for the post-build refresh. | [`content-schema/schemas/town-presentation.schema.json`](../../../../../content-schema/schemas/town-presentation.schema.json) |
| `resource-id.schema.json` | Canonical resource IDs used by `cost`, affordability checks, and the CostPanel. | [`content-schema/schemas/resource-id.schema.json`](../../../../../content-schema/schemas/resource-id.schema.json) |
| `command.schema.json` | Reducer-backed command payload for `BUILD_BUILDING`. | [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json) |
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, animation manifests. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | UI labels, status text, disabled reasons, error bodies. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |
| `ruleset.schema.json` | Deterministic constants and guard rules consumed by the BUILD reducer. | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |

Schema-matrix rows for `Building`, `TownPresentation`, and
`AssetIndex` are registered in
[`schema-matrix.md`](../../../schema-matrix.md).

### Runtime State Selectors
| Binding | Selector | Notes |
| --- | --- | --- |
| `town.buildings` | `state.towns.byId[selected].buildings` | Built nodes. |
| `availableBuildings` | `state.towns.byId[selected].availableBuilds` | Available nodes from the prerequisite graph. |
| `selectedBuilding` | `state.ui.buildTree.selectedBuildingId` | Local selection (UI-only). |
| `player.resources` | `state.players.active.resources` | Cost availability. |
| `builtToday` | `state.towns.byId[selected].builtToday` | Daily build guard; cleared at `END_DAY`. |

`selected` is the active `townId` from the town-screen context.

### Commands And Events
| Token | Origin (`data-action`) | Kind | Effect |
| --- | --- | --- | --- |
| `SELECT_BUILDING_NODE` | implicit on node click | local-ui | Updates `state.ui.buildTree.selectedBuildingId`; refreshes detail and cost panel. |
| `BUILD_BUILDING` | `buildTree.build` | command | Reducer spends resources, marks building built, sets `builtToday`. |
| `CLOSE_BUILD_TREE` | `buildTree.close` | local-ui (navigation) | Returns to `24-town-screen`. |

Only `BUILD_BUILDING` enters the deterministic command log; its
payload (`{ kind: "BUILD_BUILDING", townId, buildingId }`) is
defined in
[`command-schema.md` § BUILD_BUILDING](../../../command-schema.md#build_building).
`SELECT_*` and `CLOSE_*` are covered by `localUiPrefixes` in
[`screen-command-coverage.json`](../../../screen-command-coverage.json).

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.build-tree.title`
- `ui.build-tree.actions.*`
- `ui.build-tree.status.*`
- `ui.build-tree.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`
- `error.dispatcher.rejected.body` (per sibling `interactions.md` § Error surfaces)

### Asset, Sound, And VFX IDs
- `ui.build-tree.background`
- `ui.build-tree.frame`
- `ui.build-tree.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.town.*`
- `vfx.build-tree.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content
  hashes, command inputs, and explicit draft records only when
  named by the owning engine task.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor
  blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs
  (`townId`, `buildingId`), never raw paths, localized labels,
  rendered positions, or wall-clock timestamps.

### Validation And Fallback
- The BUILD reducer validates town ownership, prerequisites,
  resources, town-hall / castle rules, and the daily-build flag
  before committing construction.
- Missing presentation assets may fall back through the asset
  resolver per [`fail-loud.md`](../../../fail-loud.md).
- Missing gameplay records, invalid commands, and unresolved
  content IDs fail loudly before controls become enabled.

---

## 🔍 Sync Check

- **UI: ✔** — Action IDs `buildTree.build` and `buildTree.close`
  match the `data-action` attrs in `mockup.html`; the implicit
  node-click selection is documented in sibling `interactions.md`
  § Actions.
- **Schema: ✔** — `BUILD_BUILDING` payload (`townId`,
  `buildingId`) matches
  [`command-schema.md` § BUILD_BUILDING](../../../command-schema.md#build_building).
  `Building`, `TownPresentation`, and `AssetIndex` rows present in
  [`schema-matrix.md`](../../../schema-matrix.md). `SELECT_*` /
  `CLOSE_*` covered by `localUiPrefixes` in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json).
- **Tasks: ✔** — Owning task
  [`30-build-tree-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/30-build-tree-screen.md)
  references every selector and command listed here in its
  Acceptance Criteria.

## ⚠ Issues

- **`state.towns.byId[*].builtToday`, `buildings`, `availableBuilds`
  and `state.ui.buildTree.selectedBuildingId` missing from
  `data-inventory.md`.** All four selectors listed above are
  unregistered; only `state.ui.options` covers part of the `ui`
  slice. Per CLAUDE.md root contract, the engine task that owns
  the town reducer
  ([`mvp.05-adventure-map.05-town-visit-recruit-build-mage-guild`](../../../../../tasks/mvp/05-adventure-map/05-town-visit-recruit-build-mage-guild.md))
  must add the gameplay rows
  (domain=`towns`, persistence=`indexeddb`, retention=`scenario`);
  the UI-shell task that owns the build-tree draft must add the
  UI row (domain=`ui`, persistence=`session`, retention=`screen`).
  Not closed here per Hard Prohibition D — see sibling
  `spec.md` § ⚠ Issues.
