# Screen 11: Quest Log
## Data Contracts

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Architecture Diagrams: `architecture.md`

### Content Schemas And Registries
Only schemas this screen actually reads at render time.

| Schema | Used For | Canonical Source |
| --- | --- | --- |
| `asset-index.schema.json` | Book frame, quest row slots, reward icons, buttons, cursors, animation manifests. | [`content-schema/schemas/asset-index.schema.json`](../../../../../content-schema/schemas/asset-index.schema.json) |
| `localization.schema.json` | Title, tab labels, status text, disabled reasons, error messages. | [`content-schema/schemas/localization.schema.json`](../../../../../content-schema/schemas/localization.schema.json) |
| `scenario.schema.json` | Scenario quest records that seed the quest registry on load. | [`content-schema/schemas/scenario.schema.json`](../../../../../content-schema/schemas/scenario.schema.json) |
| `map-object.schema.json` | Quest source objects (e.g. Seer's Hut) used by `questLog.showSource` for camera focus. | [`content-schema/schemas/map-object.schema.json`](../../../../../content-schema/schemas/map-object.schema.json) |
| `artifact.schema.json` | Artifact requirements (e.g. "Return Angel Wings") and artifact rewards in `rewardPreview`. | [`content-schema/schemas/artifact.schema.json`](../../../../../content-schema/schemas/artifact.schema.json) |
| `resource-id.schema.json` | Canonical resource IDs used by gold / resource rewards in `rewardPreview`. | [`content-schema/schemas/resource-id.schema.json`](../../../../../content-schema/schemas/resource-id.schema.json) |
| `quest.schema.json` (planned) | Stable quest IDs, declarative objectives, completion checks, and reward records. Owned by [`mvp.02-content-schemas.16-quest-schema`](../../../../../tasks/mvp/02-content-schemas/16-quest-schema.md) (status `planned`); not yet present in `content-schema/schemas/`. | _scheduled_ |

`ruleset.schema.json` is not read by this screen.

### Runtime State Selectors
| UI Element | Selector / State path | Notes |
| --- | --- | --- |
| `questFilter` | `state.ui.questLog.filter` | Local tab: `active`, `completed`, `failed`, or `all`. Transient. |
| `questRows` | `selectors.quests.visibleQuestRows` | Quest rows visible to the active player, filtered by `questFilter`. |
| `selectedQuest` | `state.ui.questLog.selectedQuestId` | Local selected quest. Transient. |
| `requirements` | `selectors.quests.selectedQuestRequirements` | Artifacts, creatures, resources, hero level, or deadline gating completion. |
| `rewardPreview` | `selectors.quests.selectedQuestRewards` | Reward slots derived from the quest registry. |

The three `selectors.quests.*` paths are produced by
[`phase-2.08-meta-systems.04-quest-log-engine`](../../../../../tasks/phase-2/08-meta-systems/04-quest-log-engine.md).

### Commands And Events
| Token | Action ID | Coverage classification |
| --- | --- | --- |
| `SELECT_QUEST_LOG_ENTRY` | `questLog.selectQuest` | UI-local (prefix `SELECT_`). Writes `state.ui.questLog.selectedQuestId`. |
| `SET_QUEST_LOG_FILTER` | `questLog.changeTab` | UI-local (prefix `SET_`). Writes `state.ui.questLog.filter`. |
| `FOCUS_QUEST_SOURCE` | `questLog.showSource` | UI-local (prefix `FOCUS_`). Routes to `07-adventure-map` and pans camera to the quest source map object. |
| `CLOSE_QUEST_LOG` | `questLog.close` | UI-local (prefix `CLOSE_`). Returns to caller; clears local draft. |

None of these tokens enter the deterministic command log. They are
gated by the `localUiPrefixes` policy in
[`screen-command-coverage.json`](../../../screen-command-coverage.json)
(checked by `npm run validate:commands`) and therefore do not
require a row in
[`command.schema.json`](../../../../../content-schema/schemas/command.schema.json).

### Config Keys
- `config.ui.locale`
- `config.ui.reducedMotion`
- `config.ui.animationSpeed`
- `config.audio.enabled`
- `config.audio.uiVolume`
- `config.render.pixelSnap`

### Localization Keys
- `ui.quest-log.title`
- `ui.quest-log.tabs.active`, `ui.quest-log.tabs.completed`,
  `ui.quest-log.tabs.failed`, `ui.quest-log.tabs.all`
- `ui.quest-log.actions.source`, `ui.quest-log.actions.close`
- `ui.quest-log.status.empty.*`, `ui.quest-log.status.deadline.*`
- `ui.quest-log.errors.*`
- `ui.common.ok`, `ui.common.cancel`, `ui.common.back`,
  `ui.common.close`

### Asset, Sound, And VFX IDs
- `ui.quest-log.background`, `ui.quest-log.frame`
- `ui.quest-log.icons.quest.active`,
  `ui.quest-log.icons.quest.completed`,
  `ui.quest-log.icons.quest.failed`,
  `ui.quest-log.icons.reward.*`
- `audio.ui.hover`, `audio.ui.click`, `audio.adventure.*`
- `vfx.quest-log.book-open`, `vfx.quest-log.page-flip`,
  `vfx.quest-log.seal-stamp`, `vfx.quest-log.objective-underline`,
  `vfx.quest-log.map-fade`

### Save And Replay Fields
- Persist only reducer-approved gameplay state. Per-player quest
  progress lives in the quest engine's reducer state (owner:
  [`phase-2.08-meta-systems.04-quest-log-engine`](../../../../../tasks/phase-2/08-meta-systems/04-quest-log-engine.md))
  and serializes with stable quest and source IDs only.
- Do **not** persist `state.ui.questLog.filter`,
  `state.ui.questLog.selectedQuestId`, hover, focus, tooltip,
  scroll, drag ghost, cursor blink, animation frame, or any
  transient visual effect.
- Replays use stable IDs and scalar inputs; never raw paths,
  localized labels, rendered positions, or wall-clock timestamps.

### Validation And Fallback
- Quest state is read from scenario quest records and per-player
  progress through `selectors.quests.*`. The log can focus a source
  object or reveal completion requirements; it does not grant
  rewards.
- Missing presentation assets may fall back through the asset
  resolver.
- Missing gameplay records (quest registry not loaded, unresolved
  quest source ID, malformed reward record), invalid commands, and
  unresolved content IDs fail loudly before controls become enabled,
  per [`fail-loud.md`](../../../fail-loud.md).

---

## 🔍 Sync Check

- **UI: ✔** — Asset, localization, and VFX IDs cover every visible
  region in [`mockup.html`](./mockup.html) (book modal, quest list,
  details panel, reward slot strip, `SOURCE` / `CLOSE` buttons).
  Sibling [`spec.md`](./spec.md) state bindings match this table
  row-for-row.
- **Schema: ⚠** — `quest.schema.json` is the canonical source for
  the quest records and reward records this screen renders, but it
  is not yet present in `content-schema/schemas/`. Owning task
  [`mvp.02-content-schemas.16-quest-schema`](../../../../../tasks/mvp/02-content-schemas/16-quest-schema.md)
  is `planned` per
  [`tasks/task-status.json`](../../../../../tasks/task-status.json).
  Not CI-blocking — the doc correctly documents what the screen will
  consume; flagged so the implementer knows the schema cross-ref
  resolves only after task 16 lands.
- **Tasks: ✔** — Tokens cleared via UI-local prefix coverage in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json);
  owning UI task
  [`phase-2.07-ui-screen-backlog.11-quest-log-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/11-quest-log-screen.md)
  reads this file first and lists upstream engine task
  [`phase-2.08-meta-systems.04-quest-log-engine`](../../../../../tasks/phase-2/08-meta-systems/04-quest-log-engine.md)
  as a Dependency.

## ⚠ Issues

- **`quest.schema.json` not yet shipped.** Owning task
  [`mvp.02-content-schemas.16-quest-schema`](../../../../../tasks/mvp/02-content-schemas/16-quest-schema.md)
  is `planned` per
  [`tasks/task-status.json`](../../../../../tasks/task-status.json);
  the screen's data contract correctly references the schema as
  scheduled. Per the project root contract ("schema evolution is
  additive-first; alias before remove" — see
  [`enum-lifecycle-policy.md`](../../../enum-lifecycle-policy.md)),
  the owning task must register `quest.schema.json` in
  [`schema-matrix.md`](../../../schema-matrix.md) when it lands;
  this screen's data-contracts row then graduates from `(planned)`
  to a normal reference. Skill did not register the schema (Hard
  Prohibition D).
- **`state.ui.questLog.filter` and `state.ui.questLog.selectedQuestId`
  not registered in `data-inventory.md`.** Transient UI slices;
  persistence contract ("every persisted field is registered" — see
  [`data-inventory.md`](../../../data-inventory.md)) does not
  require rows. Already flagged from sibling [`spec.md`](./spec.md)
  — see that file's `## ⚠ Issues`. No new action; if either slice
  ever becomes session-persistent, the owning UI task must add the
  row. Skill did not edit `data-inventory.md` (Hard Prohibition D).
