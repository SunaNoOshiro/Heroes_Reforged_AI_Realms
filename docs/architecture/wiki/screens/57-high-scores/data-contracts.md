# Screen 57: High Scores
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
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `scoreRecords` | `state.profile.highScores` | Completed game score records. |
| `filter` | `state.ui.highScores.filter` | Scenario, campaign, difficulty, or all. |
| `selectedRecord` | `state.ui.highScores.selectedRecordId` | Local selected row. |
| `sortOrder` | `selectors.profile.sortedHighScores` | Deterministic ranking order. |
| `newRecordId` | `state.ui.highScores.newRecordId` | Optional highlight after victory. |

### Commands And Events
- `SELECT_HIGH_SCORE_ROW` from `scores.selectRow`: Updates details panel.
- `SET_HIGH_SCORE_FILTER` from `scores.filter`: Filters ranking table.
- `CLOSE_HIGH_SCORES` from `scores.back`: Returns to caller.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.high-scores.title`
- `ui.high-scores.actions.*`
- `ui.high-scores.status.*`
- `ui.high-scores.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.high-scores.background`
- `ui.high-scores.frame`
- `ui.high-scores.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.system.*`
- `vfx.high-scores.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Reads profile score records and sorts deterministically by score/date tie-breakers. It is read-only except clearing/importing through confirmed profile actions.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
