# Screen 31: Grail Building
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md` (components, state bindings, animation contract)
- Interactions: `interactions.md` (controls, commands, errors)
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
| Schema / Registry | Used For | Canonical Source |
| --- | --- | --- |
| `asset-index.schema.json` | Backgrounds, frames, icons, animation manifests. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | UI labels, status text, disabled reasons, error messages. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |
| `ruleset.schema.json` | Deterministic constants and guard rules consumed by the build command. | [`content-schema/schemas/ruleset.schema.json`](../../../../../content-schema/schemas/ruleset.schema.json) |
| `building.schema.json` | Faction-specific grail building record (effect declarations + bonus values). | [`content-schema/schemas/building.schema.json`](../../../../../content-schema/schemas/building.schema.json) |
| `adventure-building.schema.json` | Adventure-map structures and ownership state used to validate town eligibility. | [`content-schema/schemas/adventure-building.schema.json`](../../../../../content-schema/schemas/adventure-building.schema.json) |
| `resource-id.schema.json` | Canonical resource IDs surfaced in `TownBonusList` (gold, growth, mana modifiers). | [`content-schema/schemas/resource-id.schema.json`](../../../../../content-schema/schemas/resource-id.schema.json) |
| `command.schema.json` | `BUILD_GRAIL_STRUCTURE` payload (`kind`, `townId`, `grailArtifactId`, `metadata`). | [`content-schema/schemas/command.schema.json` `$defs.buildGrailStructure`](../../../../../content-schema/schemas/command.schema.json) |
| `scenario.schema.json` | Optional `grail` block (`coordinate`, `fragmentCount`) read as `state.scenario.grail`. | [`content-schema/schemas/scenario.schema.json`](../../../../../content-schema/schemas/scenario.schema.json) (block added by `mvp.05-adventure-map.22-obelisk-visits-and-grail-state`) |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `townId` | `state.towns.selectedTownId` | Town receiving the grail. |
| `deliveringHero` | `state.adventure.visitingHeroId` | Hero carrying the grail artifact. |
| `grailRecord` | `state.scenario.grail` | Scenario grail block; `null` until the obelisk task populates it. |
| `wonderDefinition` | `selectors.towns.factionGrailBuilding` | Faction-specific grail building and its bonus declarations. |
| `bonusPreview` | `selectors.towns.grailBonusPreview` | Income, growth, spell, or faction-specific bonus summary. |

### Commands (schema-backed)
| Action ID | Command kind | Payload |
| --- | --- | --- |
| `grail.build` | `BUILD_GRAIL_STRUCTURE` | `{ kind, townId, grailArtifactId, metadata }` per [`command.schema.json` `$defs.buildGrailStructure`](../../../../../content-schema/schemas/command.schema.json). Reducer consumes the grail delivery, adds the grail building, and applies bonuses. Owner: [`phase-2.05-mod-system.07-build-grail-structure-command`](../../../../../tasks/phase-2/05-mod-system/07-build-grail-structure-command.md). |

### Local-UI Events (not in command schema)
Per [`screen-command-coverage.json` `localUiPrefixes`](../../../screen-command-coverage.json),
tokens beginning with `SELECT_` or `CLOSE_` are UI-routing events
that never enter the deterministic command log:

- `SELECT_GRAIL_BONUS` (action `grail.inspect`) — changes the
  focused bonus plaque in `TownBonusList`. Local-UI only.
- `CLOSE_GRAIL_BUILDING_DIALOG` (action `grail.cancel`) — dismisses
  the dialog and routes back to `24-town-screen`. Local-UI only.

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.grail-building.title`
- `ui.grail-building.actions.*`
- `ui.grail-building.status.*`
- `ui.grail-building.errors.*`
- `error.dispatcher.rejected.body` (per `interactions.md` § Error
  surfaces)
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`,
  `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.grail-building.background`
- `ui.grail-building.frame`
- `ui.grail-building.icons.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.town.*`
- `vfx.grail-building.*` (driven by `CeremonyVfx` per
  `spec.md` § Animation Contract)

### Save And Replay Fields
- Persist only reducer-approved gameplay state (the new town
  building entry, applied bonus deltas) plus the
  `BUILD_GRAIL_STRUCTURE` command record on the deterministic
  command log.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor
  blink, animation frame, or transient visual effects.
- Replays use stable IDs and scalar command inputs; never raw
  paths, localized labels, rendered positions, or wall-clock
  timestamps.

### Validation And Fallback
- The reducer validates artifact ownership, town ownership, town
  prerequisites, and one-per-town grail uniqueness (per the
  acceptance criteria of
  [`phase-2.05-mod-system.07-build-grail-structure-command`](../../../../../tasks/phase-2/05-mod-system/07-build-grail-structure-command.md)).
- Missing presentation may fall back through the asset resolver per
  [`asset-policy.md`](../../../asset-policy.md).
- Missing gameplay records, invalid commands, and unresolved content
  IDs fail loudly per [`fail-loud.md`](../../../fail-loud.md) before
  controls become enabled.

---

## 🔍 Sync Check

- **UI: ✔** — Selectors and component bindings match sibling
  `spec.md` § State Bindings; commands match sibling
  `interactions.md` § Actions. The local-UI tokens are now
  classified separately rather than mixed with schema-backed
  commands.
- **Schema: ✔** — `BUILD_GRAIL_STRUCTURE` is defined at
  [`command.schema.json` `$defs.buildGrailStructure`](../../../../../content-schema/schemas/command.schema.json)
  (line 1312); `BUILD_GRAIL_STRUCTURE` is registered in
  [`enums.snapshot.json`](../../../../../content-schema/enums.snapshot.json)
  (line 235). `SELECT_GRAIL_BONUS` / `CLOSE_GRAIL_BUILDING_DIALOG`
  intentionally have no schema entry — their `SELECT_` / `CLOSE_`
  prefixes are listed in
  [`screen-command-coverage.json` `localUiPrefixes`](../../../screen-command-coverage.json).
- **Tasks: ⚠** — Owning UI task
  [`phase-2.07-ui-screen-backlog.31-grail-building-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/31-grail-building-screen.md)
  Reads-First this file; engine task
  [`phase-2.05-mod-system.07-build-grail-structure-command`](../../../../../tasks/phase-2/05-mod-system/07-build-grail-structure-command.md)
  owns `BUILD_GRAIL_STRUCTURE`. Data-inventory gap detailed below.

## ⚠ Issues

- **Prior revision misclassified two local-UI tokens as commands.**
  The previous "Commands And Events" list named `SELECT_GRAIL_BONUS`
  and `CLOSE_GRAIL_BUILDING_DIALOG` as commands. Per
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  (`localUiPrefixes` includes `SELECT_` and `CLOSE_`), these tokens
  do not enter the command log. This rewrite splits them out under
  "Local-UI Events" without changing meaning. No schema or runtime
  contract changes.
- **`state.scenario.grail` not registered in data-inventory.** This
  screen reads the optional `scenario.grail` block populated by
  [`mvp.05-adventure-map.22-obelisk-visits-and-grail-state`](../../../../../tasks/mvp/05-adventure-map/22-obelisk-visits-and-grail-state.md);
  grep of [`data-inventory.md`](../../../data-inventory.md) finds
  no row mentioning `grail`. Per CLAUDE.md root contract ("every
  persisted field is registered in data-inventory.md"), the obelisk
  task must add the row. Suggested values: domain=`scenario`,
  owner=`mvp.05-adventure-map.22-obelisk-visits-and-grail-state`,
  persistence=`indexeddb` (within the scenario save), retention=
  `session`. Skill did not edit
  [`data-inventory.md`](../../../data-inventory.md) (Hard
  Prohibition D).
- **Sibling `mockup.html` lacks an interactive bonus plaque.**
  `grail.inspect` / `SELECT_GRAIL_BONUS` are listed here as a real
  local-UI event, but the mockup renders `TownBonusList` as static
  text. See sibling `spec.md` `## ⚠ Issues` — owner is the same UI
  task.
