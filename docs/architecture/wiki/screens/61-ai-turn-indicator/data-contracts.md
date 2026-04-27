# Screen 61: AI Turn Indicator
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
| `hero.schema.json` | Hero identity, stats, army, skills, spellbook, equipment, and ownership selectors. | `content-schema/schemas/hero.schema.json` |
| `faction.schema.json` | Faction identity, town roster, hero/unit references, and player-facing faction metadata. | `content-schema/schemas/faction.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `aiPlayer` | `state.turn.activePlayerId` | AI player currently acting. |
| `aiPhase` | `state.ai.currentPhase` | Planning, moving, combat, town, or done. |
| `commandBatch` | `state.ai.visibleCommandBatch` | Commands currently being replayed. |
| `speed` | `config.ui.aiTurnSpeed` | Presentation speed only. |
| `interruptGuard` | `selectors.ai.canFastForwardOrPause` | Pause/fast-forward availability. |

### Commands And Events
- `SET_AI_TURN_SPEED` from `aiTurn.speed`: Changes presentation speed.
- `FAST_FORWARD_AI_TURN_PRESENTATION` from `aiTurn.fastForward`: Skips nonessential animation only.
- `COMPLETE_AI_TURN_PRESENTATION` from `aiTurn.complete`: Returns to active human player.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.ai-turn-indicator.title`
- `ui.ai-turn-indicator.actions.*`
- `ui.ai-turn-indicator.status.*`
- `ui.ai-turn-indicator.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.ai-turn-indicator.background`
- `ui.ai-turn-indicator.frame`
- `ui.ai-turn-indicator.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.system.*`
- `vfx.ai-turn-indicator.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- The overlay observes AI command generation and replay application. It never makes decisions; deterministic AI commands are applied through the same command bus.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
