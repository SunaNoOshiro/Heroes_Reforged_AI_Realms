# Screen 15: Underground Layer Toggle
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
| `world.schema.json` | World terrain, biome, underground, generator, and map setup records. | `content-schema/schemas/world.schema.json` |
| `scenario.schema.json` | Scenario setup, starting state, victory/loss conditions, and save/load metadata. | `content-schema/schemas/scenario.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `activeLayer` | `state.adventure.activeLayer` | Surface or underground render context. |
| `hasUnderground` | `state.scenario.layers.underground.enabled` | Controls underground button availability. |
| `knownGates` | `selectors.adventure.knownSubterraneanGates` | Visible gates and two-way links. |
| `selectedGate` | `state.ui.layerToggle.selectedGateId` | Local selected gate marker. |
| `cameraFocus` | `state.adventure.camera` | Camera target updated by focus actions. |

### Commands And Events
- `SET_ADVENTURE_LAYER` from `layer.surface`: Sets active layer to surface and refreshes camera.
- `SET_ADVENTURE_LAYER` from `layer.underground`: Sets active layer to underground if scenario supports it.
- `FOCUS_SUBTERRANEAN_GATE` from `layer.focusGate`: Centers camera on selected known gate.
- `CLOSE_LAYER_TOGGLE` from `layer.close`: Keeps current layer unchanged.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.underground-toggle.title`
- `ui.underground-toggle.actions.*`
- `ui.underground-toggle.status.*`
- `ui.underground-toggle.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.underground-toggle.background`
- `ui.underground-toggle.frame`
- `ui.underground-toggle.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.adventure.*`
- `vfx.underground-toggle.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Layer switch changes camera/render context and selected layer. It does not move heroes unless a valid subterranean gate or monolith transition is explicitly used.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
