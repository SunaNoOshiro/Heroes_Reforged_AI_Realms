# Screen 49: Hero Meeting
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
| `unit.schema.json` | Unit stats, stacks, recruitment options, combat previews, upgrades, and army transfers. | `content-schema/schemas/unit.schema.json` |
| `artifact.schema.json` | Artifact inventory, equipment slots, rewards, merchants, combinations, and tooltip effects. | `content-schema/schemas/artifact.schema.json` |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched or previewed by this screen. | `content-schema/schemas/command.schema.json` |
| Screen-specific registries | Heroes, towns, spells, artifacts, armies, map objects, battles, saves, or shell state as listed below. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `leftHero` | `state.ui.heroMeeting.leftHeroId` | First friendly hero. |
| `rightHero` | `state.ui.heroMeeting.rightHeroId` | Second friendly hero. |
| `leftArmy` | `state.heroes.byId[left].army` | Left hero stacks. |
| `rightArmy` | `state.heroes.byId[right].army` | Right hero stacks. |
| `dragDraft` | `state.ui.heroMeeting.dragDraft` | Local transfer draft. |

### Commands And Events
- `START_HERO_MEETING_DRAG` from `heroMeeting.dragStack`: Creates local drag draft.
- `TRANSFER_HERO_ARMY_STACK` from `heroMeeting.dropStack`: Moves, merges, swaps, or rejects stacks.
- `TRANSFER_HERO_ARTIFACT` from `heroMeeting.moveArtifact`: Moves artifact if slot/backpack rules allow.
- `CLOSE_HERO_MEETING` from `heroMeeting.close`: Returns to adventure map.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.hero-meeting.title`
- `ui.hero-meeting.actions.*`
- `ui.hero-meeting.status.*`
- `ui.hero-meeting.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`, `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.hero-meeting.background`
- `ui.hero-meeting.frame`
- `ui.hero-meeting.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.hero.*`
- `vfx.hero-meeting.*`

### Save And Replay Fields
- Persist reducer-approved gameplay state, setup records, content hashes, command inputs, and explicit draft records only when named by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs, never raw paths, localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Transfers validate ownership, hero lock state, artifact equip legality, army capacity, one-creature constraints, and meeting tile adjacency before commands commit.
- Missing presentation may fall back through asset resolver.
- Missing gameplay records, invalid commands, and unresolved content IDs fail loudly before controls become enabled.
