# Screen 03: Campaign Selection
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
| `world.schema.json` | World terrain, biome, underground, generator, and map setup records. | `content-schema/schemas/world.schema.json` |
| `faction.schema.json` | Faction identity, town roster, hero/unit references, and player-facing faction metadata. | `content-schema/schemas/faction.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `campaigns` | `selectors.campaigns.availableCampaigns` | Campaign records visible under installed packs. |
| `selectedCampaign` | `state.ui.campaign.selectedCampaignId` | Local selection. |
| `unlockState` | `state.profile.campaignUnlocks` | Locked/unlocked/completed medals. |
| `difficulty` | `state.ui.campaign.difficulty` | Campaign difficulty draft. |
| `carryoverPreview` | `selectors.campaigns.carryoverPreview` | Hero/artifact/resource carryover preview. |

### Commands And Events
- `SELECT_CAMPAIGN` from `campaign.select`: Updates map, medals, and briefing preview.
- `SET_CAMPAIGN_DIFFICULTY` from `campaign.difficulty`: Updates campaign setup draft.
- `OPEN_CAMPAIGN_BRIEFING` from `campaign.begin`: Creates campaign run draft and opens briefing.
- `CLOSE_CAMPAIGN_SELECTION` from `campaign.back`: Returns to setup.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.campaign-selection.title`
- `ui.campaign-selection.actions.*`
- `ui.campaign-selection.status.*`
- `ui.campaign-selection.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.campaign-selection.background`
- `ui.campaign-selection.frame`
- `ui.campaign-selection.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.menus.*`
- `vfx.campaign-selection.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Reads campaign definitions, unlocked campaign state, previous progress, selected difficulty, and carryover rules before opening the first briefing.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
