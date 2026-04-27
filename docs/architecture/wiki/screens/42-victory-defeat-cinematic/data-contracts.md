# Screen 42: Victory / Defeat Cinematic
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
| `faction.schema.json` | Faction identity, town roster, hero/unit references, and player-facing faction metadata. | `content-schema/schemas/faction.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `outcome` | `state.scenario.outcome` | Victory/defeat/campaign outcome. |
| `score` | `state.scenario.finalScore` | Score breakdown. |
| `carryover` | `state.campaign.carryoverDraft` | Campaign hero/artifact carryover summary. |
| `nextRoute` | `state.scenario.outcomeRoute` | High scores, next mission, or main menu. |

### Commands And Events
- `CONTINUE_FROM_OUTCOME` from `outcome.continue`: Routes according to finalized outcome.
- `SKIP_OUTCOME_NARRATION` from `outcome.skip`: Completes text and pan animation.
- `REQUEST_BATTLE_REPLAY_VIEW` from `outcome.replay`: Opens replay presentation when available.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.victory-defeat-cinematic.title`
- `ui.victory-defeat-cinematic.actions.*`
- `ui.victory-defeat-cinematic.status.*`
- `ui.victory-defeat-cinematic.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.victory-defeat-cinematic.background`
- `ui.victory-defeat-cinematic.frame`
- `ui.victory-defeat-cinematic.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.battle.*`
- `vfx.victory-defeat-cinematic.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Displays already-finalized outcome state and routes to high scores, campaign next mission, main menu, or replay without changing battle results.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
