# Screen 20: Mine Visit Dialog
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, animation manifests. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |
| `ruleset.schema.json` | Deterministic constants, formulas, and guard rules consumed by commands. | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |
| `adventure-building.schema.json` | Mine identity, ownership state, visit rules, and map-facing economy bindings. | [`content-schema/schemas/adventure-building.schema.json`](../../../../../content-schema/schemas/adventure-building.schema.json) |
| `map-object.schema.json` | Map-object `category`, `interactionModel`, placement rules, and visit outcomes. | [`content-schema/schemas/map-object.schema.json`](../../../../../content-schema/schemas/map-object.schema.json) |
| `resource-id.schema.json` | Canonical resource IDs used by daily income, costs, rewards, and affordability checks. | [`content-schema/schemas/resource-id.schema.json`](../../../../../content-schema/schemas/resource-id.schema.json) |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched by this screen (`CAPTURE_MINE`) or its routed destination (`INITIATE_BATTLE`). | [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json) |

### Runtime State Selectors
| UI Element | Selector / Slice | Notes |
| --- | --- | --- |
| `mineId` | `state.ui.adventure.pendingMineVisit.mineId` | Visited mine. Transient UI slice; not persisted. |
| `mineRecord` | `state.mapObjects.byId[mineId]` | Resource type, owner, guard state, base income. |
| `activePlayer` | `state.turn.activePlayerId` | Player color used for the flag-unfurl animation. |
| `dailyIncome` | `selectors.economy.mineIncomePreview` | Income delta added on claim. |
| `guardState` | `selectors.mapObjects.mineGuardState` | One of `unfought` / `defeated` / `none`. |

### Commands And Local-UI Events
| Token | Class | Origin | Effect |
| --- | --- | --- | --- |
| `CAPTURE_MINE` | schema command (alias `CLAIM_MINE`) | `mine.claim` | Reducer transfers `mineRecord.ownerId` to the active player and adds the daily yield to player income. Payload `{ mineId, heroId, playerId }` per [`command-schema.md` § CAPTURE_MINE](../../../command-schema.md#capture_mine). |
| `INITIATE_BATTLE` | schema command (alias `START_MINE_GUARD_BATTLE`) | `mine.fightGuard` → `40-pre-battle-dialog` | Routed to the pre-battle dialog, which dispatches `INITIATE_BATTLE` on confirmation. See [`command-schema.md` § INITIATE_BATTLE](../../../command-schema.md#initiate_battle). |
| `CLOSE_MINE_DIALOG` | local-ui (`CLOSE_` prefix) | `mine.leave` | Clears `state.ui.adventure.pendingMineVisit`; no engine mutation. |
| `OPEN_RESOURCE_TOOLTIP` | local-ui (`OPEN_` prefix) | `mine.resourceInfo` | Opens `18-map-object-tooltip` over the current dialog. |

Aliases `CLAIM_MINE` and `START_MINE_GUARD_BATTLE` are registered in
[`screen-command-coverage.json`](../../../screen-command-coverage.json);
prefix recognition for `CLOSE_*` / `OPEN_*` tokens is enforced there
and by `npm run validate:commands`.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.mine-visit-dialog.title`
- `ui.mine-visit-dialog.actions.*` (`claim`, `fightGuard`, `leave`)
- `ui.mine-visit-dialog.status.*` (`owner`, `dailyIncome`, `guard`)
- `ui.mine-visit-dialog.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`
- `error.dispatcher.rejected.body` (inline tooltip on a rejected
  `CAPTURE_MINE`; see sibling `interactions.md` § Error surfaces)

### Asset, Sound, And VFX IDs
- `ui.mine-visit-dialog.background`
- `ui.mine-visit-dialog.frame`
- `ui.mine-visit-dialog.icons.*` (resource glyph, owner banner)
- `audio.ui.hover`, `audio.ui.click`, `audio.adventure.*` (flag
  unfurl, recolor sting)
- `vfx.mine-visit-dialog.*` (flag pulse, resource sparkle, income
  tick)

### Save And Replay Fields
- Persist only reducer-approved gameplay state, setup records,
  content hashes, command inputs, and explicit draft records named
  by the owning system.
- Do **not** persist hover, focus, tooltip, scroll, drag ghost,
  cursor blink, animation frame, the pending-mine UI draft, or any
  other transient visual effects.
- Replays use stable IDs and scalar command inputs — never raw
  paths, localized labels, rendered positions, or wall-clock
  timestamps.

### Validation And Fallback
- Claim resolution reads the mine record, guard state, hero position,
  and active-player ownership **before** dispatching `CAPTURE_MINE`.
  Live guards route the claim to `40-pre-battle-dialog` instead of
  dispatching.
- Missing presentation may fall back through the asset resolver.
- Missing gameplay records, invalid commands, and unresolved content
  IDs fail loudly per [`fail-loud.md`](../../../fail-loud.md) before
  controls become enabled.

---

## 🔍 Sync Check

- **UI: ✔** — Token / origin / effect rows match the Actions table
  in sibling `interactions.md`; bindings match sibling `spec.md`
  § State Bindings (`mineId`, `mineRecord`, `activePlayer`,
  `dailyIncome`, `guardState`).
- **Schema: ✔** — Every schema row resolves under
  [`content-schema/schemas/`](../../../../../content-schema/schemas/);
  `CAPTURE_MINE` and `INITIATE_BATTLE` are closed-enum kinds in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json);
  `adventure-building.schema.json` and `map-object.schema.json` are
  registered in
  [`schema-matrix.md`](../../../schema-matrix.md).
- **Tasks: ✔** — Owning task
  [`mvp.05-adventure-map.09-map-object-dialogs`](../../../../../tasks/mvp/05-adventure-map/09-map-object-dialogs.md)
  references this file; reducer task
  [`mvp.05-adventure-map.21-map-object-visit-and-battle-initiation-commands`](../../../../../tasks/mvp/05-adventure-map/21-map-object-visit-and-battle-initiation-commands.md)
  owns both `CAPTURE_MINE` and `INITIATE_BATTLE` and reads sibling
  `interactions.md`.

## ⚠ Issues

_None._
