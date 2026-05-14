# Screen 15: Underground Layer Toggle
## Data Contracts

### Source Files
- [`mockup.html`](./mockup.html) — visual reference.
- [`spec.md`](./spec.md) — components and state bindings.
- [`interactions.md`](./interactions.md) — per-control behavior, timing, error paths.
- [`architecture.md`](./architecture.md) — screen diagrams.

### Content Schemas And Registries
Only schemas this screen actually reads at render or dispatch time.

| Schema | Used For | Canonical Source |
| --- | --- | --- |
| `scenario.schema.json` | `state.scenario.layers.underground.enabled` flag that gates the `UNDER` button. | [`content-schema/schemas/scenario.schema.json`](../../../../../content-schema/schemas/scenario.schema.json) |
| `world.schema.json` | Surface / underground terrain, subterranean-gate map-object capability, and two-way link metadata read by `selectors.adventure.knownSubterraneanGates`. | [`content-schema/schemas/world.schema.json`](../../../../../content-schema/schemas/world.schema.json) |
| `asset-index.schema.json` | Modal frame, layer preview backgrounds, gate marker sprites, lever sprite, button chrome, cursor sprites, animation manifests. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | Title plaque, button labels, disabled reasons, error keys. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |

No row in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json):
this screen dispatches no schema-backed commands. See **Commands
And Tokens** below.

### Runtime State Selectors
| UI Element | Selector / State path | Notes |
| --- | --- | --- |
| `activeLayer` | `state.adventure.activeLayer` | View-layer enum (`surface` \| `underground`); render context, not gameplay state. Shared with screen [`16-view-world`](../16-view-world/data-contracts.md). |
| `hasUnderground` | `state.scenario.layers.underground.enabled` | Read-only scenario flag; sourced from `scenario.schema.json` at load. |
| `knownGates` | `selectors.adventure.knownSubterraneanGates` | Visible gates and two-way links per active player; derived from per-player fog and gate-discovery state owned by [`mvp.03-map-system.10-underground-layer-support`](../../../../../tasks/mvp/03-map-system/10-underground-layer-support.md). |
| `selectedGate` | `state.ui.layerToggle.selectedGateId` | Local selected gate marker; transient, never persisted. |
| `cameraFocus` | `state.adventure.camera` | Camera target; rewritten by layer switch and `layer.focusGate`. |

### Commands And Tokens
| Token | Action ID | Coverage classification |
| --- | --- | --- |
| `SET_ADVENTURE_LAYER` (`layer.surface`) | `layer.surface` | UI-local (prefix `SET_`). Writes `state.adventure.activeLayer = "surface"`; recenters `state.adventure.camera`. |
| `SET_ADVENTURE_LAYER` (`layer.underground`) | `layer.underground` | UI-local (prefix `SET_`). Writes `state.adventure.activeLayer = "underground"` when `hasUnderground` is `true`; recenters `state.adventure.camera`. |
| `FOCUS_SUBTERRANEAN_GATE` | `layer.focusGate` | UI-local (prefix `FOCUS_`). Writes `state.ui.layerToggle.selectedGateId`; recenters `state.adventure.camera` on the selected gate. |
| `CLOSE_LAYER_TOGGLE` | `layer.close` | UI-local (prefix `CLOSE_`). Clears `state.ui.layerToggle.selectedGateId`; leaves `state.adventure.activeLayer` unchanged. |

All four tokens do not enter the deterministic command log; they
are gated by the `localUiPrefixes` policy in
[`screen-command-coverage.json`](../../../screen-command-coverage.json)
(checked by `npm run validate:commands`) and therefore do not
require a row in
[`command.schema.json`](../../../../../content-schema/schemas/command.schema.json).

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.underground-toggle.title`
- `ui.underground-toggle.actions.surface`,
  `ui.underground-toggle.actions.underground`,
  `ui.underground-toggle.actions.focus-gate`,
  `ui.underground-toggle.actions.close`
- `ui.underground-toggle.status.*`
- `ui.underground-toggle.errors.no-underground`,
  `ui.underground-toggle.errors.no-known-gates`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`,
  `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.underground-toggle.background`,
  `ui.underground-toggle.frame`
- `ui.underground-toggle.icons.surface-preview`,
  `ui.underground-toggle.icons.underground-preview`,
  `ui.underground-toggle.icons.gate-marker`,
  `ui.underground-toggle.icons.lever`
- `audio.ui.hover`, `audio.ui.click`,
  `audio.adventure.layer-wipe`
- `vfx.underground-toggle.layer-wipe`,
  `vfx.underground-toggle.gate-pulse`,
  `vfx.underground-toggle.lever-glow`

### Save And Replay Fields
- Persist only reducer-approved gameplay state. Nothing this screen
  binds is persisted: `state.adventure.activeLayer`,
  `state.ui.layerToggle.selectedGateId`, and `state.adventure.camera`
  are all transient view-state.
  `state.scenario.layers.underground.enabled` rides the scenario
  payload owned by `mvp.08-persistence.*` via `scenario.schema.json`.
- Do **not** persist hover, focus, tooltip, scroll, drag ghost,
  cursor blink, animation frame, or any transient visual effect.
- Replays carry no commands from this screen — the four UI-local
  tokens never enter the command log.

### Validation And Fallback
- Layer switch changes camera and render context only. It does
  **not** move heroes; cross-layer travel still requires walking
  into a valid subterranean gate or monolith (engine owner:
  [`mvp.03-map-system.10-underground-layer-support`](../../../../../tasks/mvp/03-map-system/10-underground-layer-support.md)).
- `UNDER` is disabled when `hasUnderground` is `false`; gate markers
  are disabled when `knownGates` is empty for the player on the
  inactive layer.
- Missing presentation assets may fall back through the asset
  resolver.
- Missing gameplay records (unknown gate ID, malformed scenario
  layer config), invalid commands, and unresolved content IDs fail
  loudly before controls become enabled, per
  [`fail-loud.md`](../../../fail-loud.md).

---

## 🔍 Sync Check

- **UI: ✔** — Asset, localization, and VFX IDs cover every visible
  region in [`mockup.html`](./mockup.html) (modal frame, surface /
  underground preview plates, central lever, gate markers, three
  buttons). Sibling [`spec.md`](./spec.md) state bindings match this
  table row-for-row.
- **Schema: ✔** — `hasUnderground` is sourced from
  [`scenario.schema.json`](../../../../../content-schema/schemas/scenario.schema.json);
  subterranean-gate map objects are typed by
  [`world.schema.json`](../../../../../content-schema/schemas/world.schema.json).
  All four control tokens clear via the `SET_` / `FOCUS_` / `CLOSE_`
  UI-local prefix policy in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json),
  so none requires a row in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json).
- **Tasks: ✔** — Owning UI task
  [`phase-2.07-ui-screen-backlog.15-underground-toggle-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/15-underground-toggle-screen.md)
  reads this file first and lists
  [`mvp.03-map-system.10-underground-layer-support`](../../../../../tasks/mvp/03-map-system/10-underground-layer-support.md)
  as a Dependency; that engine task reads sibling
  [`interactions.md`](./interactions.md) first.

## ⚠ Issues

- **Transient UI slices not in `data-inventory.md`.**
  `state.adventure.activeLayer`, `state.ui.layerToggle.selectedGateId`,
  and `state.adventure.camera` are not persisted, so the
  [`data-inventory.md`](../../../data-inventory.md) contract
  ("every persisted field is registered") does not require a row.
  Already flagged from sibling [`spec.md`](./spec.md). Skill did
  not edit `data-inventory.md` (Hard Prohibition D).
