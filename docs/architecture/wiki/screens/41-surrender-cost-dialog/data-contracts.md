# Screen 41: Surrender Cost Dialog
## Data Contracts

### Source Files
- Mockup: [`mockup.html`](./mockup.html)
- Spec: [`spec.md`](./spec.md)
- Interactions: [`interactions.md`](./interactions.md)
- Architecture Diagrams: [`architecture.md`](./architecture.md)

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, animation manifests. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |
| `ruleset.schema.json` | Deterministic constants and formulas (surrender-cost formula, return-to-tavern policy). | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |
| `hero.schema.json` | Hero identity, post-surrender survival routing, and ownership selectors. | [`content-schema/schemas/hero.schema.json`](../../../../../content-schema/schemas/hero.schema.json) |
| `unit.schema.json` | Surviving-army stacks used to compute army value. | [`content-schema/schemas/unit.schema.json`](../../../../../content-schema/schemas/unit.schema.json) |
| `resource-id.schema.json` | Canonical resource IDs for the gold cost and affordability check. | [`content-schema/schemas/resource-id.schema.json`](../../../../../content-schema/schemas/resource-id.schema.json) |
| `command.schema.json` | Reducer-backed command payloads dispatched by this screen. | [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json) |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `survivingArmyValue` | `state.battle.surrender.armyValue` | Cost basis. |
| `surrenderCost` | `state.battle.surrender.cost` | Computed ransom (gold). |
| `availableGold` | `state.players.active.resources.gold` | Affordability guard. |
| `heroOutcome` | `state.battle.surrender.heroOutcome` | Hero survival and return route. |

### Commands And Events
| Token | Trigger | Kind | Effect |
| --- | --- | --- | --- |
| `ACCEPT_BATTLE_SURRENDER` | `surrender.accept` | schema-backed command ([`command.schema.json`](../../../../../content-schema/schemas/command.schema.json), [`command-schema.md`](../../../command-schema.md)) | Spends `surrenderCost` gold and resolves the battle as a surrender with the declared hero outcome. Reducer owned by [`mvp.09-tactical-combat.13-retreat-and-surrender-commands`](../../../../../tasks/mvp/09-tactical-combat/13-retreat-and-surrender-commands.md). |
| `CLOSE_SURRENDER_DIALOG` | `surrender.decline` | local-ui, route-only | Closes the dialog and returns to `38-combat-screen`. No engine state change. |

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.surrender-cost-dialog.title`
- `ui.surrender-cost-dialog.actions.*`
- `ui.surrender-cost-dialog.status.*`
- `ui.surrender-cost-dialog.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`,
  `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.surrender-cost-dialog.background`
- `ui.surrender-cost-dialog.frame`
- `ui.surrender-cost-dialog.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.battle.*`
- `vfx.surrender-cost-dialog.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content
  hashes, command inputs, and explicit draft records only when
  named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor
  blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs — never raw
  paths, localized labels, rendered positions, or wall-clock
  timestamps.

### Validation And Fallback
- `surrenderCost` is derived from `survivingArmyValue` and ruleset
  constants. Accept spends `surrenderCost` gold and resolves the
  battle with the declared hero outcome.
- Missing presentation may fall back through the asset resolver.
- Missing gameplay records, invalid commands, and unresolved
  content IDs fail loudly before controls become enabled.

---

## 🔍 Sync Check
- **UI: ✔** — Selectors and command tokens match sibling
  [`spec.md`](./spec.md) and [`interactions.md`](./interactions.md);
  `mockup.html` `data-action` tokens (`surrender.accept`,
  `surrender.decline`) match the table above.
- **Schema: ⚠** — `ACCEPT_BATTLE_SURRENDER` is defined in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json)
  and [`command-schema.md`](../../../command-schema.md);
  `CLOSE_SURRENDER_DIALOG` is local-ui and has no schema entry by
  design. State slices `state.battle.surrender.*` are not yet in
  [`data-inventory.md`](../../../data-inventory.md). See Issues.
- **Tasks: ✔** — The reducer flow is owned by
  [`mvp.09-tactical-combat.13-retreat-and-surrender-commands`](../../../../../tasks/mvp/09-tactical-combat/13-retreat-and-surrender-commands.md);
  the UI screen task
  [`phase-2/07-ui-screen-backlog/41-surrender-cost-dialog-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/41-surrender-cost-dialog-screen.md)
  reciprocally references this file.

## ⚠ Issues
- **Missing `data-inventory.md` rows for `state.battle.surrender.*`.**
  This file maps `state.battle.surrender.armyValue` /
  `.cost` / `.heroOutcome` to runtime UI elements, but no rows exist
  in [`data-inventory.md`](../../../data-inventory.md). Per
  CLAUDE.md root contract, the reducer owner
  [`mvp.09-tactical-combat.13-retreat-and-surrender-commands`](../../../../../tasks/mvp/09-tactical-combat/13-retreat-and-surrender-commands.md)
  must add the rows. Suggested values: domain=`battle`,
  owner=`mvp.09-tactical-combat.13`, persistence=`indexeddb`,
  retention=`battle-scope`.
