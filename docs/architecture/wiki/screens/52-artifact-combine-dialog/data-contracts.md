# Screen 52: Artifact Combine Dialog
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
| `artifact.schema.json` | Artifact inventory, equipment slots, rewards, merchants, combinations, and tooltip effects. | `content-schema/schemas/artifact.schema.json` |
| `effect.schema.json` | Closed effect records embedded by spells, artifacts, abilities, skills, and buildings. | `content-schema/schemas/effect.schema.json` |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `recipeId` | `state.ui.artifactCombine.recipeId` | Combination recipe being evaluated. |
| `components` | `selectors.artifacts.combineComponents` | Required pieces and ownership state. |
| `resultArtifact` | `registries.artifacts.byId[resultId]` | Result artifact record. |
| `destination` | `selectors.artifacts.combineDestination` | Equip slot or backpack target. |
| `combineGuard` | `selectors.artifacts.combineGuard` | Eligibility and disabled reason. |

### Commands And Events
- `SELECT_COMBINE_COMPONENT` from `artifactCombine.inspectComponent`: Updates component detail focus.
- `COMBINE_ARTIFACTS` from `artifactCombine.confirm`: Removes components and adds/equips result artifact.
- `CANCEL_ARTIFACT_COMBINE` from `artifactCombine.cancel`: Leaves artifacts unchanged.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.artifact-combine-dialog.title`
- `ui.artifact-combine-dialog.actions.*`
- `ui.artifact-combine-dialog.status.*`
- `ui.artifact-combine-dialog.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.artifact-combine-dialog.background`
- `ui.artifact-combine-dialog.frame`
- `ui.artifact-combine-dialog.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.hero.*`
- `vfx.artifact-combine-dialog.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Combine validates all required component artifact IDs, ownership, locked/equipped state, destination slot legality, backpack space, and combination recipe rules.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
