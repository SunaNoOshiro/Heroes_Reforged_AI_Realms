# Screen 10: Puzzle Map
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
| `map-object.schema.json` | Map object categories, interaction prompts, rewards, placement rules, and visit outcomes. | `content-schema/schemas/map-object.schema.json` |
| `artifact.schema.json` | Artifact inventory, equipment slots, rewards, merchants, combinations, and tooltip effects. | `content-schema/schemas/artifact.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `obeliskProgress` | `state.players.active.obelisksVisited` | Visited count and total obelisks. |
| `fragmentGrid` | `selectors.grail.revealedPuzzleFragments` | Visible fragment mask from deterministic scenario data. |
| `selectedFragment` | `state.ui.puzzleMap.selectedFragment` | Local selected clue tile. |
| `grailRegionHint` | `selectors.grail.visibleRegionHint` | Text/region hint allowed by current reveal progress. |
| `mapJumpTarget` | `selectors.grail.selectedFragmentMapFocus` | Optional camera focus for revealed clue. |

### Commands And Events
- `SELECT_PUZZLE_FRAGMENT` from `puzzle.selectFragment`: Updates local clue focus.
- `FOCUS_GRAIL_HINT_REGION` from `puzzle.jumpToMap`: Centers adventure camera on the revealed region only.
- `CLOSE_PUZZLE_MAP` from `puzzle.close`: Returns to previous adventure context.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.puzzle-map.title`
- `ui.puzzle-map.actions.*`
- `ui.puzzle-map.status.*`
- `ui.puzzle-map.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.puzzle-map.background`
- `ui.puzzle-map.frame`
- `ui.puzzle-map.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.adventure.*`
- `vfx.puzzle-map.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Revealed tiles are derived from visited obelisk count and scenario grail metadata. Clicking a revealed tile only changes local focus unless a map jump is explicitly requested.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
