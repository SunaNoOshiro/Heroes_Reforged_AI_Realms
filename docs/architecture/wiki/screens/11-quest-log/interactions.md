# Screen 11: Quest Log
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Adventure quest ledger listing active, completed, failed, and
repeatable map-object quests with requirements, deadlines, and
rewards. All four controls are UI-local by prefix; none enter the
deterministic command log.

### Actions
| UI Element | Action ID | Type | Next Screen | Token | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select quest (click a row) | `questLog.selectQuest` | local-ui | Current screen | `SELECT_QUEST_LOG_ENTRY` | Writes `state.ui.questLog.selectedQuestId`; re-derives `requirements` and `rewardPreview`. | Row swaps to `slotHot` glow; objective list underlines; `audio.ui.click`. |
| Change tab | `questLog.changeTab` | local-ui | Current screen | `SET_QUEST_LOG_FILTER` | Writes `state.ui.questLog.filter`; re-derives `selectors.quests.visibleQuestRows`. | Quest tabs flip pages; newly updated quests stamp a wax seal; `audio.ui.click`. |
| Show source | `questLog.showSource` | navigation | `07-adventure-map` | `FOCUS_QUEST_SOURCE` | Closes the modal and centers the adventure camera on the known quest source object. | Reverse `modalIn` (book fold closes); map fade; camera pan to source; `audio.adventure.*` cue on land. |
| Close | `questLog.close` | navigation | `07-adventure-map` or previous screen | `CLOSE_QUEST_LOG` | Returns to caller; transient UI draft (`filter`, `selectedQuestId`) is cleared. | Reverse `modalIn` (book fold closes); `audio.ui.click`. |

All four tokens match the UI-local prefix policy in
[`screen-command-coverage.json`](../../../screen-command-coverage.json)
(`SELECT_`, `SET_`, `FOCUS_`, `CLOSE_` are all listed in
`localUiPrefixes`), so none are required in
[`command.schema.json`](../../../../../content-schema/schemas/command.schema.json).

### State Changes
- `state.ui.questLog.filter` refreshes `questFilter` on
  `questLog.changeTab` and is cleared on `questLog.close`.
- `selectors.quests.visibleQuestRows` refreshes `questRows` whenever
  `questFilter`, the underlying quest registry, or per-player quest
  progress changes (owner:
  [`phase-2.08-meta-systems.04-quest-log-engine`](../../../../../tasks/phase-2/08-meta-systems/04-quest-log-engine.md)).
- `state.ui.questLog.selectedQuestId` refreshes `selectedQuest` on
  `questLog.selectQuest` and is cleared on `questLog.close`.
- `selectors.quests.selectedQuestRequirements` refreshes
  `requirements` whenever `selectedQuestId` or the underlying
  quest record changes.
- `selectors.quests.selectedQuestRewards` refreshes `rewardPreview`
  whenever `selectedQuestId` or the underlying quest record changes.
- UI-only hover, focus, drag ghost, and animation-frame state stay
  outside deterministic gameplay state.

### Navigation Outcomes
- `questLog.showSource` routes to `07-adventure-map` after the close
  animation, then pans the camera to the quest's source map object.
  Suppressed when the selected quest has no known visible source
  (e.g. the source object is fogged or has not been discovered).
- `questLog.close` routes to `07-adventure-map` or the previous
  screen after the close animation, with no camera move.

### Disabled And Error Cases
- `SOURCE` is disabled when `selectedQuestId` is `null`, when the
  selected quest has no resolvable source object, or when the source
  object is not visible to the active player.
- Tab and row affordances are disabled when
  `selectors.quests.visibleQuestRows` is empty for the active
  filter; the empty state renders a localized "no quests" string
  from `ui.quest-log.status.empty.*`.
- Missing presentation assets use resolver fallback per
  [`fail-loud.md`](../../../fail-loud.md). Missing gameplay records
  (e.g. quest registry not loaded, unresolved quest source ID) fail
  loudly before controls become enabled, per the same doc.
- On rejection, keep the modal open, preserve the local draft when
  useful, show localized error text, and play failure feedback.
- Errors render via `formatUserError(err, locale)` declared in
  [`docs/architecture/error-formatter.md`](../../../error-formatter.md);
  never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- [`spec.md`](./spec.md) owns static regions and state bindings.
- [`architecture.md`](./architecture.md) diagrams must mirror these
  interactions rather than inventing new behavior.
- [`data-contracts.md`](./data-contracts.md) owns the schema /
  localization / asset surface.

---

## 🔍 Sync Check

- **UI: ✔** — Per-control affordances (`questLog.showSource`,
  `questLog.close`) and button labels (`SOURCE`, `CLOSE`) match the
  `data-action` attributes and text content in
  [`mockup.html`](./mockup.html); row-select and tab-filter
  affordances correspond to `questLog.selectQuest` and
  `questLog.changeTab` per sibling [`spec.md`](./spec.md) component
  tree (`QuestList`, `QuestTabs`).
- **Schema: ✔** — All four tokens are UI-local by prefix per
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  (`SELECT_`, `SET_`, `FOCUS_`, `CLOSE_`); none enter
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json).
  Selectors `selectors.quests.*` are produced by upstream task
  [`phase-2.08-meta-systems.04-quest-log-engine`](../../../../../tasks/phase-2/08-meta-systems/04-quest-log-engine.md).
- **Tasks: ✔** — Owning task
  [`phase-2.07-ui-screen-backlog.11-quest-log-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/11-quest-log-screen.md)
  reads this file first; the screen-coverage validator
  (`npm run validate:commands`) accepts every token via the UI-local
  prefix list.

## ⚠ Issues

- **Tab affordance not visually rendered in `mockup.html`.** This
  file describes `questLog.changeTab` for switching between
  `active / completed / failed / all`, and sibling
  [`spec.md`](./spec.md) lists `QuestTabs` in the component tree,
  but the current mockup only depicts the `Active Quests` page —
  no clickable tab strip. Already flagged in sibling
  [`spec.md`](./spec.md) `## ⚠ Issues`; no doc change required
  here. Skill did not edit `mockup.html` (reference-only per task
  brief).
