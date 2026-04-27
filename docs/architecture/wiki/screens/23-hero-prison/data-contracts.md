# Screen 23: Hero Prison
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
| `map-object.schema.json` | Map object categories, interaction prompts, rewards, placement rules, and visit outcomes. | `content-schema/schemas/map-object.schema.json` |
| `resource-id.schema.json` | Canonical resource IDs used by costs, rewards, income, trade rates, and affordability checks. | `content-schema/schemas/resource-id.schema.json` |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `prisonId` | `state.ui.adventure.pendingPrisonId` | Visited prison object. |
| `imprisonedHero` | `state.mapObjects.byId[prisonId].heroId` | Hero record locked inside prison. |
| `rosterSlots` | `selectors.heroes.availableRosterSlots` | Player hero capacity and free slots. |
| `releaseGuard` | `selectors.heroes.prisonReleaseGuard` | Eligibility and disabled reason. |
| `spawnTile` | `selectors.mapObjects.prisonReleaseTile` | Tile where the released hero appears. |

### Commands And Events
- `RELEASE_PRISON_HERO` from `prison.release`: Adds hero to roster, marks prison visited, spawns hero at valid tile.
- `OPEN_IMPRISONED_HERO_PREVIEW` from `prison.inspectHero`: Shows read-only hero sheet preview.
- `CLOSE_HERO_PRISON` from `prison.leave`: Leaves prison unresolved.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.hero-prison.title`
- `ui.hero-prison.actions.*`
- `ui.hero-prison.status.*`
- `ui.hero-prison.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.hero-prison.background`
- `ui.hero-prison.frame`
- `ui.hero-prison.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.adventure.*`
- `vfx.hero-prison.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Release validates prison object state, active player roster capacity, hero record availability, and scenario rules before creating the hero on the map.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
