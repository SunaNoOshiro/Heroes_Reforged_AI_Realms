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
| `hero.schema.json` | Hero identity, stats, army, skills, spellbook, equipment, and ownership. | `content-schema/schemas/hero.schema.json` |
| `map-object.schema.json` | Map object categories, interaction prompts, placement rules, and visit outcomes. | `content-schema/schemas/map-object.schema.json` |
| `resource-id.schema.json` | Canonical resource IDs (used by any future release-cost rule). | `content-schema/schemas/resource-id.schema.json` |
| `command.schema.json` | Reducer-backed gameplay command payloads dispatched by this screen. | `content-schema/schemas/command.schema.json` |
| Runtime heroes / map-objects registries | Resolves the imprisoned hero record and prison object instance. | Loaded content/runtime registries. |

### Runtime State Selectors
| UI Element | Selector | Notes |
| --- | --- | --- |
| `prisonId` | `state.ui.adventure.pendingPrisonId` | UI-local route state; identifies the visited prison object. |
| `imprisonedHero` | `state.mapObjects.byId[prisonId].heroId` | Hero record locked inside the prison. |
| `rosterSlots` | `selectors.heroes.availableRosterSlots` | Active player hero capacity and free slots. |
| `releaseGuard` | `selectors.heroes.prisonReleaseGuard` | Eligibility verdict + disabled reason. |
| `spawnTile` | `selectors.mapObjects.prisonReleaseTile` | Tile where the released hero appears. |

### Commands And Events
| Action ID | Command | Kind | Owner |
| --- | --- | --- | --- |
| `prison.release` | `RELEASE_PRISON_HERO` | reducer-backed | [`mvp.05-adventure-map.12-release-prison-hero-command`](../../../../../tasks/mvp/05-adventure-map/12-release-prison-hero-command.md); adds hero to roster, marks prison visited, spawns hero. |
| `prison.inspectHero` | `OPEN_IMPRISONED_HERO_PREVIEW` | navigation (likely `local-ui`) | Opens read-only hero sheet preview — not yet registered in [`command-schema.md`](../../../command-schema.md); see Issues. |
| `prison.leave` | `CLOSE_HERO_PRISON` | navigation (likely `local-ui`) | Closes dialog without mutation — not yet registered in [`command-schema.md`](../../../command-schema.md); see Issues. |

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
- Persist reducer-approved gameplay state, setup records, content
  hashes, command inputs, and explicit draft records only when named
  by the owning system.
- Do not persist hover, focus, tooltip, scroll, drag ghost, cursor
  blink, animation frame, or transient visual effects.
- Replays carry stable IDs and scalar command inputs — never raw
  paths, localized labels, rendered positions, or wall-clock
  timestamps.

### Validation And Fallback
- Release validates prison object state, active player roster
  capacity, hero record availability, and scenario rules before
  creating the hero on the map.
- Missing presentation may fall back through the asset resolver.
- Missing gameplay records, invalid commands, and unresolved content
  IDs fail loudly per
  [`fail-loud.md`](../../../fail-loud.md) before controls become
  enabled.

---

## 🔍 Sync Check

- **UI: ✔** — Selectors and state bindings match
  [`spec.md`](./spec.md) and the controls actually rendered in
  [`mockup.html`](./mockup.html).
- **Schema: ⚠** — All seven referenced schemas exist in
  `content-schema/schemas/`. `RELEASE_PRISON_HERO` is owned by the
  reducer task per [`command-schema.md`](../../../command-schema.md)
  ("prison rescue"); `OPEN_IMPRISONED_HERO_PREVIEW` and
  `CLOSE_HERO_PRISON` are not defined there. Flagged in Issues.
- **Tasks: ✔** — Selectors and commands map to
  [`phase-2.07-ui-screen-backlog.23-hero-prison-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/23-hero-prison-screen.md)
  (UI surface) and
  [`mvp.05-adventure-map.12-release-prison-hero-command`](../../../../../tasks/mvp/05-adventure-map/12-release-prison-hero-command.md)
  (reducer).

## ⚠ Issues

- **`OPEN_IMPRISONED_HERO_PREVIEW` and `CLOSE_HERO_PRISON` not
  registered in `command-schema.md`.** Sibling
  [`interactions.md`](./interactions.md) dispatches both. If they
  are UI-local navigation they should be marked `local-ui` in
  [`command-schema.md`](../../../command-schema.md) and in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  so the coverage gate classifies them correctly; otherwise they
  need full schema entries. Reconciler:
  [`phase-2.07-ui-screen-backlog.23-hero-prison-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/23-hero-prison-screen.md).
  Suggested kind: `local-ui` for both (no deterministic state
  change).
- **`state.ui.adventure.pendingPrisonId` not listed in
  `data-inventory.md`.** The path lives under `state.ui.*` and is
  presumed UI-local / non-persisted, which is exempt from inventory
  per
  [`persistence.md`](../../../persistence.md). If a future task
  persists the slice (e.g. resume-into-prison-dialog after reload),
  the screen task must add a row to
  [`data-inventory.md`](../../../data-inventory.md). Non-blocking
  today.
