# Screen 13: Hill Fort
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
Only schemas this screen actually reads at render or dispatch time.

| Schema | Used For | Canonical Source |
| --- | --- | --- |
| `command.schema.json` | `UPGRADE_ARMY_STACK` and `UPGRADE_ALL_ELIGIBLE_STACKS` payload shape and envelope. | [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json) |
| `unit.schema.json` | Creature stats, stack identity, upgrade-path records. | [`content-schema/schemas/unit.schema.json`](../../../../../content-schema/schemas/unit.schema.json) |
| `adventure-building.schema.json` | Hill-fort map-object capability — which upgrade paths this fort exposes. | [`content-schema/schemas/adventure-building.schema.json`](../../../../../content-schema/schemas/adventure-building.schema.json) |
| `resource-id.schema.json` | Resource IDs used by `costPreview` and the affordability guard. | [`content-schema/schemas/resource-id.schema.json`](../../../../../content-schema/schemas/resource-id.schema.json) |
| `ruleset.schema.json` | Upgrade cost formula and capability rules consumed by the reducer. | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |
| `asset-index.schema.json` | Modal frame, slot icons, button chrome, cursor sprites, animation manifests. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | Title plaque, status strip, button labels, disabled reasons, error keys. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |

### Runtime State Selectors
| UI Element | Selector / State path | Notes |
| --- | --- | --- |
| `heroArmy` | `state.heroes.byId[selected].army` | Visiting hero's army slots. |
| `upgradeTargets` | `selectors.creatures.availableHillFortUpgrades` | Per-stack upgrade-path records produced by [`mvp.05-adventure-map.20-upgrade-army-stack-command`](../../../../../tasks/mvp/05-adventure-map/20-upgrade-army-stack-command.md). |
| `selectedStack` | `state.ui.hillFort.selectedStackIndex` | Local selected stack index; transient, never persisted. |
| `costPreview` | `selectors.economy.upgradeCostPreview` | Resource cost for the selected upgrade quantity. |
| `resources` | `state.players.active.resources` | Available resources for affordability checks. `active` is shorthand for `state.players[state.currentPlayerId]`. |

### Commands And Events
| Token | Action ID | Coverage classification |
| --- | --- | --- |
| `UPGRADE_ARMY_STACK` | `hillFort.upgradeSelected` | Schema-backed command. Reducer owned by [`mvp.05-adventure-map.20-upgrade-army-stack-command`](../../../../../tasks/mvp/05-adventure-map/20-upgrade-army-stack-command.md); validates ownership, upgrade-path legality, affordability, capacity; spends resources and replaces the stack's creature ID while preserving count. |
| `UPGRADE_ALL_ELIGIBLE_STACKS` | `hillFort.upgradeAll` | Schema-backed command. Same owner; applies every legal upgrade in stable slot order with summed cost atomically. |
| `SELECT_HILL_FORT_STACK` | `hillFort.selectStack` | UI-local (prefix `SELECT_`). Writes `state.ui.hillFort.selectedStackIndex`. |
| `CLOSE_HILL_FORT` | `hillFort.close` | UI-local (prefix `CLOSE_`). Returns to the visited fort tile in `07-adventure-map`. |

The two UI-local tokens do not enter the deterministic command log;
they are gated by the `localUiPrefixes` policy in
[`screen-command-coverage.json`](../../../screen-command-coverage.json)
(checked by `npm run validate:commands`) and therefore do not require
a row in
[`command.schema.json`](../../../../../content-schema/schemas/command.schema.json).

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.hill-fort.title`
- `ui.hill-fort.actions.upgrade`, `ui.hill-fort.actions.all`,
  `ui.hill-fort.actions.close`
- `ui.hill-fort.status.selected`, `ui.hill-fort.status.cost`
- `ui.hill-fort.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.hill-fort.background`, `ui.hill-fort.frame`
- `ui.hill-fort.icons.*` (stack portraits, upgrade-target portraits,
  arrows)
- `audio.ui.hover`, `audio.ui.click`, `audio.adventure.*`
- `vfx.hill-fort.slot-glow`, `vfx.hill-fort.arrow-pulse`,
  `vfx.hill-fort.upgrade-flash`

### Save And Replay Fields
- Persist only reducer-approved gameplay state. `heroArmy` and
  `resources` are part of `AdventureState` and therefore included in
  the save payload owned by `mvp.08-persistence.*`.
- Do **not** persist `state.ui.hillFort.selectedStackIndex`, hover,
  focus, tooltip, scroll, animation frame, or any transient visual
  effect.
- Replays use stable IDs and scalar command inputs (`heroId`,
  `stackId`, `targetUnitId`, `quantity`); never raw paths, localized
  labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Each stack upgrade clears Gate 2 of
  [`command-schema.md`](../../../command-schema.md): creature upgrade
  path exists, town/faction rules allow it at this fort, hero owns
  the stack, resources cover the cost, and the destination army has
  capacity. `UPGRADE_ALL_ELIGIBLE_STACKS` re-checks per slot in
  stable order and stops on the first validator failure.
- Missing presentation assets may fall back through the asset
  resolver.
- Missing gameplay records (unknown creature ID, missing upgrade
  path, unresolved fort capability), invalid commands, and
  unresolved content IDs fail loudly before controls become enabled,
  per [`fail-loud.md`](../../../fail-loud.md).

---

## 🔍 Sync Check

- **UI: ✔** — Asset, localization, and VFX IDs cover every visible
  region in `mockup.html` (modal frame, current / target columns,
  arrows, status strip, three buttons). Sibling [`spec.md`](./spec.md)
  state bindings match this table row-for-row.
- **Schema: ✔** — `UPGRADE_ARMY_STACK` and
  `UPGRADE_ALL_ELIGIBLE_STACKS` are present in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json);
  the two UI-local tokens clear via prefix in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json).
- **Tasks: ✔** — Owning UI task
  [`phase-2.07-ui-screen-backlog.13-hill-fort-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/13-hill-fort-screen.md)
  reads this file first; engine task
  [`mvp.05-adventure-map.20-upgrade-army-stack-command`](../../../../../tasks/mvp/05-adventure-map/20-upgrade-army-stack-command.md)
  reads sibling [`interactions.md`](./interactions.md) first.

## ⚠ Issues

- **`state.ui.hillFort.selectedStackIndex` not registered in
  `data-inventory.md`.** Transient UI slice, not persisted, so the
  [`data-inventory.md`](../../../data-inventory.md) contract ("every
  persisted field is registered") does not require a row. Already
  flagged from sibling [`spec.md`](./spec.md) — see that file's
  `## ⚠ Issues`. No new action; if the slice ever becomes
  session-persistent, the owning task
  [`phase-2.07-ui-screen-backlog.13-hill-fort-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/13-hill-fort-screen.md)
  must add the row. Skill did not edit `data-inventory.md` (Hard
  Prohibition D).
