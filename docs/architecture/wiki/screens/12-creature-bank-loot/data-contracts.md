# Screen 12: Creature Bank Loot
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used for | Canonical source |
| --- | --- | --- |
| `asset-index.schema.json` | Backgrounds, frames, icons, cursor sprites, animation manifests. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |
| `ruleset.schema.json` | Deterministic constants and guard rules consumed by `COLLECT_CREATURE_BANK_REWARD`. | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |
| `neutral-stack-template.schema.json` | Bank defenders, reward bundle composition, and attitude rolls. | [`content-schema/schemas/neutral-stack-template.schema.json`](../../../../../content-schema/schemas/neutral-stack-template.schema.json) |
| `unit.schema.json` | Unit stats for the Guards column and any creature reward stacks added to the army. | [`content-schema/schemas/unit.schema.json`](../../../../../content-schema/schemas/unit.schema.json) |
| `artifact.schema.json` | Reward artifact icon, slot, and tooltip effects. | [`content-schema/schemas/artifact.schema.json`](../../../../../content-schema/schemas/artifact.schema.json) |
| `resource-id.schema.json` | Canonical resource IDs used by Gold / resource rewards. | [`content-schema/schemas/resource-id.schema.json`](../../../../../content-schema/schemas/resource-id.schema.json) |
| `command.schema.json` (`$defs.collectCreatureBankReward`) | Schema for the single deterministic command this screen emits. | [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json) |
| Screen-specific registries | Hero, town, army, map-object, battle, save, or shell state listed in the runtime-state table below. | Loaded content / runtime registries. |

### Runtime State Selectors
| UI element | Selector | Notes |
| --- | --- | --- |
| `bankId` | `state.ui.adventure.pendingBankReward.bankId` | Cleared bank object id. |
| `combatResult` | `state.combat.lastResult` | Victory record + casualties from the battle reducer. |
| `rewardBundle` | `selectors.creatureBanks.rewardBundle` | Gold, resources, artifacts, and creatures to collect. |
| `visitedFlag` | `state.mapObjects.byId[bankId].visitedBy` | Truthy after `COLLECT_CREATURE_BANK_REWARD` resolves. |
| `heroArmy` | `state.heroes.byId[selected].army` | Post-combat army summary. |

### Commands And Events
- **Schema-backed** — exactly one. `COLLECT_CREATURE_BANK_REWARD`
  emitted by `bankLoot.collect`; defined in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json)
  `$defs.collectCreatureBankReward` with required fields `kind`,
  `heroId`, `bankId`, `rewardId`, `metadata`. The reducer marks the
  bank visited, applies the reward bundle via the effect registry,
  and is idempotent.
- **UI-local** — `OPEN_REWARD_DETAILS` (`bankLoot.inspectReward`) and
  `CLOSE_BANK_REWARD` (`bankLoot.close`). Both match the
  `localUiPrefixes` list in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  (`OPEN_`, `CLOSE_`); they do not enter the deterministic command
  log and are not registered in `command.schema.json`.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.creature-bank-loot.title` — modal title bar (`Creature Bank
  Cleared`).
- `ui.creature-bank-loot.subtitle` — line under title (`Victory
  reward is ready to collect`).
- `ui.creature-bank-loot.actions.*` — button labels (`collect`,
  `close`, `inspect`).
- `ui.creature-bank-loot.status.*` — `visited`, `pending`, casualty
  lines.
- `ui.creature-bank-loot.errors.*` — disabled-reason strings shown
  via `formatUserError` (see
  [`error-formatter.md`](../../../error-formatter.md)).
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`,
  `ui.common.close` — shared shell strings.

### Asset, Sound, And VFX IDs
- `ui.creature-bank-loot.background` — vault-panel art.
- `ui.creature-bank-loot.frame` — ornate gold border.
- `ui.creature-bank-loot.icons.*` — chest, coin, artifact, creature
  slot icons.
- `audio.ui.hover`, `audio.ui.click` — shared UI sounds.
- `audio.adventure.*` — collection sting on `COLLECT`.
- `vfx.creature-bank-loot.*` — chest opening, coin sparkle, artifact
  glow, float-up reward number.

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content
  hashes, command inputs, and explicit draft records only when named
  by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor
  blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs only — never raw
  paths, localized labels, rendered positions, or wall-clock
  timestamps. `COLLECT_CREATURE_BANK_REWARD` replays via the
  reducer's named RNG sub-stream (see reducer task
  `mvp.05-adventure-map.14`).

### Validation And Fallback
- Rewards are granted only after the linked combat reducer returns
  victory. Collection marks the bank visited, applies reward records,
  and returns to the adventure map.
- Missing presentation may fall back through the asset resolver per
  [`fail-loud.md`](../../../fail-loud.md).
- Missing gameplay records, invalid commands, and unresolved content
  IDs fail loudly before controls become enabled.

---

## 🔍 Sync Check

- **UI: ✔** — Selector list matches sibling
  [`spec.md`](./spec.md) § State Bindings and
  [`interactions.md`](./interactions.md) § State Changes.
- **Schema: ✔** — Every referenced schema exists under
  `content-schema/schemas/`; `COLLECT_CREATURE_BANK_REWARD` resolves
  to `$defs.collectCreatureBankReward` in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json).
  `OPEN_REWARD_DETAILS` and `CLOSE_BANK_REWARD` are correctly classed
  UI-local per
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  `localUiPrefixes`.
- **Tasks: ✔** — Screen owned by
  `phase-2.07-ui-screen-backlog.12-creature-bank-loot-screen`;
  reducer owned by
  `mvp.05-adventure-map.14-collect-creature-bank-reward-command`.

## ⚠ Issues

- **Missing `command-schema.md` section for `COLLECT_CREATURE_BANK_REWARD`.**
  See sibling [`spec.md`](./spec.md) § Issues — aligned. Reducer task
  `mvp.05-adventure-map.14-collect-creature-bank-reward-command` is
  the suggested owner.
