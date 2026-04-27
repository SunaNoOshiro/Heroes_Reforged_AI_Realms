# Screen 12: Creature Bank Loot
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
| `neutral-stack-template.schema.json` | Neutral stack composition, guard encounters, creature bank defenders, rewards, and attitude. | `content-schema/schemas/neutral-stack-template.schema.json` |
| `unit.schema.json` | Unit stats, stacks, recruitment options, combat previews, upgrades, and army transfers. | `content-schema/schemas/unit.schema.json` |
| `artifact.schema.json` | Artifact inventory, equipment slots, rewards, merchants, combinations, and tooltip effects. | `content-schema/schemas/artifact.schema.json` |
| `resource-id.schema.json` | Canonical resource IDs used by costs, rewards, income, trade rates, and affordability checks. | `content-schema/schemas/resource-id.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `bankId` | `state.ui.adventure.pendingBankReward.bankId` | Cleared bank object. |
| `combatResult` | `state.combat.lastResult` | Victory result and casualties from battle reducer. |
| `rewardBundle` | `selectors.creatureBanks.rewardBundle` | Gold, resources, artifacts, and creatures to collect. |
| `visitedFlag` | `state.mapObjects.byId[bankId].visitedBy` | Determines if reward was already claimed. |
| `heroArmy` | `state.heroes.byId[selected].army` | Post-combat army summary. |

### Commands And Events
- `COLLECT_CREATURE_BANK_REWARD` from `bankLoot.collect`: Applies rewards and visited flag once.
- `OPEN_REWARD_DETAILS` from `bankLoot.inspectReward`: Shows creature/artifact/resource detail.
- `CLOSE_BANK_REWARD` from `bankLoot.close`: Returns after reward state is resolved.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.creature-bank-loot.title`
- `ui.creature-bank-loot.actions.*`
- `ui.creature-bank-loot.status.*`
- `ui.creature-bank-loot.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.creature-bank-loot.background`
- `ui.creature-bank-loot.frame`
- `ui.creature-bank-loot.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.adventure.*`
- `vfx.creature-bank-loot.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Rewards are granted only after the linked combat reducer returns victory. Collection marks the bank visited, applies reward records, and returns to adventure.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
