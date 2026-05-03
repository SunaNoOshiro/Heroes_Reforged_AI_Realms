# Screen 56: Options
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
| `optionsDraft` | `state.ui.options.draft` | Local editable settings copy. |
| `audioConfig` | `config.audio` | Music/SFX/voice values. |
| `uiConfig` | `config.ui` | Locale, animation speed, reduced motion, scale. |
| `gameplayLocks` | `selectors.options.gameplayConfigLocks` | Settings locked during active game. |
| `dirty` | `selectors.options.hasUnsavedChanges` | Apply enabled state. |

### Commands And Events
- `SET_OPTIONS_TAB` from `options.tab`: Changes visible category.
- `SET_OPTIONS_DRAFT_VALUE` from `options.slider`: Updates draft value.
- `APPLY_OPTIONS` from `options.apply`: Persists allowed settings.
- `CANCEL_OPTIONS` from `options.cancel`: Discards draft.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`
- `config.dev.placeholderSprites` — boolean, default `false`. When
  `true`, the renderer substitutes the magenta-checker placeholder
  for any sprite-sheet that fails to decode. Production builds force
  `false` regardless of user value. See
  [`pack-contract.md` § Asset Fallback And Placeholders](../../../pack-contract.md#asset-fallback-and-placeholders).
- `config.dev.enableDebugOverlay` — boolean, default `false`. Gates
  the screens 66 (debug overlay) and 67 (animation debug overlay).
  Production builds tree-shake those screens; this flag is the
  runtime safeguard for dev builds.

### Localization Keys
- `ui.options.title`
- `ui.options.actions.*`
- `ui.options.status.*`
- `ui.options.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.options.background`
- `ui.options.frame`
- `ui.options.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.system.*`
- `vfx.options.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Edits a settings draft. Apply validates config values, persists presentation settings, and only changes gameplay-affecting options at allowed setup boundaries.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
