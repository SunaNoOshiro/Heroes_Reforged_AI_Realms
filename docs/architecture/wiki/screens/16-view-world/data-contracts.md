# Screen 16: View World
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
| `map-object.schema.json` | Map object categories, interaction prompts, rewards, placement rules, and visit outcomes. | `content-schema/schemas/map-object.schema.json` |
| `adventure-building.schema.json` | Adventure-map structures, visit rules, ownership state, and map-facing economy bindings. | `content-schema/schemas/adventure-building.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `spellContext` | `state.ui.viewWorld.spellContext` | View Air, View Earth, or strategic overview source. |
| `visibleWorld` | `selectors.spells.viewWorldVisibleObjects` | Objects revealed under spell and scouting rules. |
| `selectedFocus` | `state.ui.viewWorld.selectedObjectId` | Local selected map pin. |
| `activeLayer` | `state.adventure.activeLayer` | Surface/underground tab. |
| `manaPreview` | `selectors.spells.viewWorldManaCost` | Mana cost already paid or pending by caller context. |

### Commands And Events
- `SELECT_VIEW_WORLD_PIN` from `viewWorld.selectPin`: Updates detail plaque.
- `SET_VIEW_WORLD_LAYER` from `viewWorld.changeLayer`: Changes overview layer without moving adventure camera.
- `FOCUS_VIEW_WORLD_TARGET` from `viewWorld.focusSelected`: Centers map on legal selected target.
- `CLOSE_VIEW_WORLD` from `viewWorld.close`: Returns to spell/adventure caller.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.view-world.title`
- `ui.view-world.actions.*`
- `ui.view-world.status.*`
- `ui.view-world.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.view-world.background`
- `ui.view-world.frame`
- `ui.view-world.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.adventure.*`
- `vfx.view-world.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Visible world data respects spell type, fog of war, scouting rules, and layer. Selection can focus an allowed object or return to the caster context.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
