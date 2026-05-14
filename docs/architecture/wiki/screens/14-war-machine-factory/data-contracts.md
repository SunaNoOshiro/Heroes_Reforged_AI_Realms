# Screen 14: War Machine Factory
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
| `command.schema.json` | `BUY_WAR_MACHINE` payload shape and envelope (`$defs.buyWarMachine`). | [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json) |
| `adventure-building.schema.json` | War-machine-factory map-object capability — which machines this factory offers and at what stock. | [`content-schema/schemas/adventure-building.schema.json`](../../../../../content-schema/schemas/adventure-building.schema.json) |
| `artifact.schema.json` | War-machine equipment records (the equipment/loadout registry shared with hero artifacts, per the owning command task). | [`content-schema/schemas/artifact.schema.json`](../../../../../content-schema/schemas/artifact.schema.json) |
| `resource-id.schema.json` | Resource IDs used by `price` and the affordability guard (`gold` only at v1). | [`content-schema/schemas/resource-id.schema.json`](../../../../../content-schema/schemas/resource-id.schema.json) |
| `ruleset.schema.json` | Machine prices, slot rules, and capability formulas consumed by the reducer. | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |
| `asset-index.schema.json` | Modal frame, machine bay icons, hero-rack slot icons, button chrome, cursor sprites, animation manifests. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | Title plaque, status strip, button labels, disabled reasons, error keys. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |

### Runtime State Selectors
| UI Element | Selector / State path | Notes |
| --- | --- | --- |
| `shopStock` | `state.mapObjects.byId[factoryId].warMachineStock` | Per-factory available machines and restock flags. |
| `heroMachines` | `state.heroes.byId[selected].warMachines` | Visiting hero's machine rack slots. Mutated by the purchase reducer. |
| `selectedMachine` | `state.ui.warMachineFactory.selectedMachineId` | Local selected machine ID; transient, never persisted. |
| `price` | `selectors.economy.selectedWarMachinePrice` | Gold cost and affordability for `selectedMachine`. |
| `resources` | `state.players.active.resources.gold` | Gold available for affordability checks. `active` is shorthand for `state.players[state.currentPlayerId]`. |

### Commands And Events
| Token | Action ID | Coverage classification |
| --- | --- | --- |
| `BUY_WAR_MACHINE` | `warFactory.buy` | Schema-backed command. Reducer owned by [`phase-2.01-spells-artifacts.11-buy-war-machine-command`](../../../../../tasks/phase-2/01-spells-artifacts/11-buy-war-machine-command.md); validates factory availability, hero ownership, slot compatibility, and resource cost; spends gold, writes the bought machine into the hero rack slot, and decrements factory stock when limited. |
| `SELECT_WAR_MACHINE` | `warFactory.selectMachine` | UI-local (prefix `SELECT_`). Writes `state.ui.warMachineFactory.selectedMachineId`; refreshes `price` via selector. |
| `CLOSE_WAR_MACHINE_FACTORY` | `warFactory.close` | UI-local (prefix `CLOSE_`). Returns to the visited factory tile in `07-adventure-map`. |

The two UI-local tokens do not enter the deterministic command log;
they are gated by the `localUiPrefixes` policy in
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
- `ui.war-machine-factory.title`
- `ui.war-machine-factory.subtitle`
- `ui.war-machine-factory.actions.buy`,
  `ui.war-machine-factory.actions.close`
- `ui.war-machine-factory.status.selected`,
  `ui.war-machine-factory.status.price`,
  `ui.war-machine-factory.status.slot`
- `ui.war-machine-factory.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`,
  `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.war-machine-factory.background`,
  `ui.war-machine-factory.frame`
- `ui.war-machine-factory.icons.*` (machine bay portraits, hero-rack
  slot portraits)
- `audio.ui.hover`, `audio.ui.click`, `audio.adventure.*`
- `vfx.war-machine-factory.bay-glow`,
  `vfx.war-machine-factory.sold-stamp`,
  `vfx.war-machine-factory.machine-slide`

### Save And Replay Fields
- Persist only reducer-approved gameplay state.
  `state.mapObjects.byId[factoryId].warMachineStock` and
  `state.heroes.byId[selected].warMachines` are part of
  `AdventureState` and therefore included in the save payload owned
  by `mvp.08-persistence.*`.
- Do **not** persist `state.ui.warMachineFactory.selectedMachineId`,
  hover, focus, tooltip, scroll, animation frame, or any transient
  visual effect.
- Replays use stable IDs and scalar command inputs (`heroId`,
  `factoryId`, `warMachineId`); never raw paths, localized labels,
  rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Each purchase clears Gate 2 of
  [`command-schema.md`](../../../command-schema.md): factory has
  stock for the selected machine, hero owns the visit, hero's
  matching rack slot is free (exclusive slots), and resources cover
  `price`.
- Missing presentation assets may fall back through the asset
  resolver.
- Missing gameplay records (unknown `warMachineId`, unresolved
  factory capability), invalid commands, and unresolved content IDs
  fail loudly before controls become enabled, per
  [`fail-loud.md`](../../../fail-loud.md).

---

## 🔍 Sync Check

- **UI: ✔** — Asset, localization, and VFX IDs cover every visible
  region in `mockup.html` (modal frame, workshop bay grid, hero
  rack, status strip, two buttons). Sibling [`spec.md`](./spec.md)
  state bindings match this table row-for-row.
- **Schema: ✔** — `BUY_WAR_MACHINE` is present in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json)
  (`$defs.buyWarMachine`, required: `heroId`, `factoryId`,
  `warMachineId`, `metadata`); the two UI-local tokens clear via
  prefix in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json).
- **Tasks: ✔** — Owning UI task
  [`phase-2.07-ui-screen-backlog.14-war-machine-factory-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/14-war-machine-factory-screen.md)
  reads this file first and lists
  [`phase-2.01-spells-artifacts.11-buy-war-machine-command`](../../../../../tasks/phase-2/01-spells-artifacts/11-buy-war-machine-command.md)
  as a Dependency; that engine task reads sibling
  [`interactions.md`](./interactions.md) first.

## ⚠ Issues

- **`state.ui.warMachineFactory.selectedMachineId` not registered
  in `data-inventory.md`.** Transient UI slice, not persisted, so
  the [`data-inventory.md`](../../../data-inventory.md) contract
  ("every persisted field is registered") does not require a row.
  Already flagged from sibling [`spec.md`](./spec.md). Skill did
  not edit `data-inventory.md` (Hard Prohibition D).
- **No dedicated `war-machine.schema.json`.** War-machine records
  ride the artifact/equipment registry per the owning command task
  [`phase-2.01-spells-artifacts.11-buy-war-machine-command`](../../../../../tasks/phase-2/01-spells-artifacts/11-buy-war-machine-command.md)
  ("Artifact/equipment content registry"). If a standalone schema
  is ever introduced, that task must also update this table.
  Non-blocking; documented for future drift.
