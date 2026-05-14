# Screen 16: View World
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
| `world.schema.json` | Surface / underground terrain and biome data rendered into `WorldMapCanvas`. | [`content-schema/schemas/world.schema.json`](../../../../../content-schema/schemas/world.schema.json) |
| `map-object.schema.json` | Per-pin metadata: category, ownership color, visit prompt, placement coordinate. | [`content-schema/schemas/map-object.schema.json`](../../../../../content-schema/schemas/map-object.schema.json) |
| `adventure-building.schema.json` | Town, mine, and dwelling ownership state surfaced by the ownership pins. | [`content-schema/schemas/adventure-building.schema.json`](../../../../../content-schema/schemas/adventure-building.schema.json) |
| `scenario.schema.json` | `state.scenario.layers.underground.enabled` flag that gates the `Under` layer tab. | [`content-schema/schemas/scenario.schema.json`](../../../../../content-schema/schemas/scenario.schema.json) |
| `ruleset.schema.json` | Deterministic mana-cost formula consumed by `selectors.spells.viewWorldManaCost`. | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |
| `asset-index.schema.json` | Modal frame, parchment backdrop, fog overlay, pin sprites, button chrome, cursor sprites, animation manifests. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | Title plaque, layer-tab labels, status text, disabled reasons, error keys. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |

No row in
[`command.schema.json`](../../../../../content-schema/schemas/command.schema.json):
this screen dispatches no schema-backed commands. See **Commands
And Tokens** below.

### Runtime State Selectors
| UI Element | Selector / State path | Notes |
| --- | --- | --- |
| `spellContext` | `state.ui.viewWorld.spellContext` | View Air, View Earth, or strategic-overview source; set when the modal opens and cleared on exit. Transient, never persisted. |
| `visibleWorld` | `selectors.spells.viewWorldVisibleObjects` | Objects revealed under the active spell's reveal rules combined with the caster's scouting and fog state; canonical visibility projection cited by [`security-model.md`](../../../security-model.md). |
| `selectedFocus` | `state.ui.viewWorld.selectedObjectId` | Local selected pin; updated by `viewWorld.selectPin` and cleared on exit. |
| `activeLayer` | `state.adventure.activeLayer` | View-layer enum (`surface` \| `underground`); render context only, not gameplay state. Shared with sibling [`15-underground-toggle`](../15-underground-toggle/data-contracts.md). |
| `manaPreview` | `selectors.spells.viewWorldManaCost` | Mana cost already paid or still pending by caller context; derived from the spell's `ruleset.schema.json` cost formula. |
| `hasUnderground` | `state.scenario.layers.underground.enabled` | Read-only scenario flag; gates the `Under` layer tab. Sourced from `scenario.schema.json` at load. |

### Commands And Tokens
| Token | Action ID | Coverage classification |
| --- | --- | --- |
| `SELECT_VIEW_WORLD_PIN` | `viewWorld.selectPin` | UI-local (prefix `SELECT_`). Writes `state.ui.viewWorld.selectedObjectId`; updates the `FocusPlaque`. |
| `SET_VIEW_WORLD_LAYER` | `viewWorld.changeLayer` | UI-local (prefix `SET_`). Switches the layer projection feeding `WorldMapCanvas` and `ObjectPins`; preserves `state.adventure.camera`. |
| `FOCUS_VIEW_WORLD_TARGET` | `viewWorld.focusSelected` | UI-local (prefix `FOCUS_`). Hands the adventure-map shell a `cameraTarget = selectedObjectId`, closes the modal, and clears `state.ui.viewWorld.spellContext` / `selectedObjectId`. |
| `CLOSE_VIEW_WORLD` | `viewWorld.close` | UI-local (prefix `CLOSE_`). Closes the modal back to the caller (adventure map or spell book); clears `state.ui.viewWorld.spellContext` / `selectedObjectId`. |

All four tokens do not enter the deterministic command log; they
clear via the `localUiPrefixes` policy in
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
- `ui.view-world.title`
- `ui.view-world.actions.focus`,
  `ui.view-world.actions.close`,
  `ui.view-world.actions.layer.surface`,
  `ui.view-world.actions.layer.underground`,
  `ui.view-world.actions.layer.view-air`
- `ui.view-world.status.selected`,
  `ui.view-world.status.legal-focus`,
  `ui.view-world.status.mana-preview`
- `ui.view-world.errors.no-legal-target`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`,
  `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.view-world.background`,
  `ui.view-world.frame`,
  `ui.view-world.parchment`
- `ui.view-world.icons.fog-mask`,
  `ui.view-world.icons.pin-town`,
  `ui.view-world.icons.pin-hero`,
  `ui.view-world.icons.pin-mine`,
  `ui.view-world.icons.pin-gate`,
  `ui.view-world.icons.pin-monster`,
  `ui.view-world.icons.focus-ring`
- `audio.ui.hover`, `audio.ui.click`,
  `audio.adventure.zoom`
- `vfx.view-world.fog-part`,
  `vfx.view-world.pin-twinkle`,
  `vfx.view-world.focus-ring`,
  `vfx.view-world.camera-zoom`

### Save And Replay Fields
- Persist only reducer-approved gameplay state. Nothing this screen
  binds is persisted: `state.ui.viewWorld.spellContext`,
  `state.ui.viewWorld.selectedObjectId`, and
  `state.adventure.activeLayer` are all transient view-state.
  `state.scenario.layers.underground.enabled` rides the scenario
  payload owned by `mvp.08-persistence.*` via `scenario.schema.json`.
- Do **not** persist hover, focus, tooltip, scroll, drag ghost,
  cursor blink, animation frame, or any transient visual effect.
- Replays carry no commands from this screen — the four UI-local
  tokens never enter the command log.

### Validation And Fallback
- Visible world data respects spell type, fog-of-war, scouting
  rules, and the current view layer. Selection can either focus an
  allowed object or return to the caster context without moving
  anything.
- `FOCUS` is disabled when `state.ui.viewWorld.selectedObjectId` is
  unset or the pin is not in `selectors.spells.viewWorldVisibleObjects`
  for the current turn.
- `Under` layer tab is disabled when
  `state.scenario.layers.underground.enabled` is `false`.
- Missing presentation assets may fall back through the asset
  resolver.
- Missing gameplay records (unknown object ID, malformed spell
  context, unresolved content IDs) and invalid commands fail loudly
  before controls become enabled, per
  [`fail-loud.md`](../../../fail-loud.md).

---

## 🔍 Sync Check

- **UI: ✔** — Asset, localization, and VFX IDs cover every visible
  region in [`mockup.html`](./mockup.html) (parchment world panel,
  fog overlay, pin sprites, focus ring, layer tabs, selected
  plaque, `FOCUS` / `CLOSE` buttons). Sibling [`spec.md`](./spec.md)
  state bindings match this table row-for-row; sibling
  [`interactions.md`](./interactions.md) Actions table consumes the
  same selectors and tokens.
- **Schema: ✔** — `hasUnderground` is sourced from
  [`scenario.schema.json`](../../../../../content-schema/schemas/scenario.schema.json);
  pin metadata is typed by
  [`map-object.schema.json`](../../../../../content-schema/schemas/map-object.schema.json);
  town / mine ownership is typed by
  [`adventure-building.schema.json`](../../../../../content-schema/schemas/adventure-building.schema.json);
  terrain by
  [`world.schema.json`](../../../../../content-schema/schemas/world.schema.json);
  mana cost by
  [`ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json).
  All four control tokens clear via the `SELECT_` / `SET_` /
  `FOCUS_` / `CLOSE_` UI-local prefix policy in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json),
  so none requires a row in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json).
- **Tasks: ✔** — Owning UI task
  [`phase-2.07-ui-screen-backlog.16-view-world-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/16-view-world-screen.md)
  reads this file first and lists
  [`mvp.03-map-system.05-fog-of-war`](../../../../../tasks/mvp/03-map-system/05-fog-of-war.md),
  [`mvp.03-map-system.10-underground-layer-support`](../../../../../tasks/mvp/03-map-system/10-underground-layer-support.md),
  and
  [`mvp.05-adventure-map.09-map-object-dialogs`](../../../../../tasks/mvp/05-adventure-map/09-map-object-dialogs.md)
  as Dependencies; the engine task `10-underground-layer-support`
  reads sibling [`interactions.md`](./interactions.md) first.

## ⚠ Issues

- **Schema list pruned to actually-used schemas.** Previous revision
  carried an undifferentiated row "Screen-specific registries"
  pointing at "loaded content/runtime registries", which leaks the
  responsibility decision into implementation rather than naming the
  schemas this screen reads. Rewrote the table to list only
  `world`, `map-object`, `adventure-building`, `scenario`,
  `ruleset`, `asset-index`, and `localization`. Meaning preserved:
  every removed mention referred to a registry already named under
  one of the seven retained schemas. No code change implied.
- **Transient UI slices not in `data-inventory.md`.**
  `state.ui.viewWorld.spellContext`,
  `state.ui.viewWorld.selectedObjectId`, and
  `state.adventure.activeLayer` are not persisted, so the
  [`data-inventory.md`](../../../data-inventory.md) contract
  ("every persisted field is registered") does not require a row.
  Already flagged from sibling [`spec.md`](./spec.md). Skill did
  not edit `data-inventory.md` (Hard Prohibition D).
- **Layer-toggle token diverges from sibling 15.** Sibling
  [`15-underground-toggle`](../15-underground-toggle/data-contracts.md)
  uses canonical `SET_ADVENTURE_LAYER` for the same
  `state.adventure.activeLayer` write surface; this screen carries
  its own `SET_VIEW_WORLD_LAYER`. Already flagged from sibling
  [`spec.md`](./spec.md). No code change implied here.
