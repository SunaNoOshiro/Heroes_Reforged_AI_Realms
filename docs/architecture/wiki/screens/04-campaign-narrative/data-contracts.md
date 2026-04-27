# Screen 04: Campaign Inter-Mission Narrative
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
| `scenario.schema.json` | Scenario setup, starting state, victory/loss conditions, and save/load metadata. | `content-schema/schemas/scenario.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `campaignNode` | `state.campaign.currentNodeId` | Current campaign mission node. |
| `storyText` | `localization.campaign[node].briefing` | Localized briefing/intermission text. |
| `objectives` | `registries.scenarios.byId[mission].objectives` | Victory and loss objective records. |
| `bonusChoices` | `state.ui.campaignNarrative.selectedBonus` | Local starting bonus choice. |
| `carryover` | `selectors.campaigns.currentCarryover` | Heroes/artifacts/resources carried into mission. |

### Commands And Events
- `SELECT_CAMPAIGN_BONUS` from `narrative.selectBonus`: Updates local bonus draft.
- `START_CAMPAIGN_MISSION` from `narrative.start`: Creates mission setup from campaign node.
- `CLOSE_CAMPAIGN_BRIEFING` from `narrative.back`: Returns before mission creation.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.campaign-narrative.title`
- `ui.campaign-narrative.actions.*`
- `ui.campaign-narrative.status.*`
- `ui.campaign-narrative.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.campaign-narrative.background`
- `ui.campaign-narrative.frame`
- `ui.campaign-narrative.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.menus.*`
- `vfx.campaign-narrative.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Loads campaign node data, localized narrative, objective records, bonus choices, carryover state, and selected difficulty before mission initialization.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
