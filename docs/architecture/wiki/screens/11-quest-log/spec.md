# Screen 11: Quest Log

### Screen Package
- Mockup: `mockup.html`
- Spec: `spec.md`
- Interactions: `interactions.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Description
Adventure quest ledger listing active, completed, failed, and
repeatable map-object quests with requirements, deadlines, and
rewards. The log is read-only with respect to gameplay: it can focus
a source object or reveal completion requirements but never grants
rewards.

### Visual Direction
- Original internal UI contract. Do not use third-party captures,
  copied franchise art, or external product pixels as implementation
  input.

### Visual Contract
- Curation status: `curated-pass-3`.
- Fixed `800 × 600` layout. The adventure map and right-side command
  panel remain visible behind a centered torn-parchment book modal
  (`modalIn` keyframe). The left page carries the quest list under
  an `Active Quests` heading; the right page carries the selected
  quest's source / requirement / reward / deadline summary plus the
  reward slot strip and the `SOURCE` / `CLOSE` buttons.
- Use dense classic fantasy strategy UI: ornate gold frame,
  red/brown/stone panels, compact icon slots, right-click detail
  affordances, and bottom status/resource feedback.
- Hover and the currently selected quest row render with the
  `slotHot` glow; other rows render with the dim `slot` class.
- `mockup.html` carries the visible UI only. Logic, transitions, and
  implementation notes live in the sibling Markdown files.

### Component Tree
- `QuestLog`
  - `QuestTabs`
  - `QuestList`
  - `QuestDetails`
  - `RequirementChecklist`
  - `RewardSlots`
  - `SourceFocusButton`

### State Bindings
| Element | Bound to | Notes |
| --- | --- | --- |
| `questFilter` | `state.ui.questLog.filter` | Local tab: `active`, `completed`, `failed`, or `all`. Transient; never persisted. |
| `questRows` | `selectors.quests.visibleQuestRows` | Quest rows visible to the active player, filtered by `questFilter`. |
| `selectedQuest` | `state.ui.questLog.selectedQuestId` | Local selected quest. Transient; never persisted. |
| `requirements` | `selectors.quests.selectedQuestRequirements` | Artifacts, creatures, resources, hero level, or deadline gating completion. |
| `rewardPreview` | `selectors.quests.selectedQuestRewards` | Visible reward slots derived from the quest registry. |

The three `selectors.quests.*` paths and the quest registry they
read are owned by
[`phase-2.08-meta-systems.04-quest-log-engine`](../../../../../tasks/phase-2/08-meta-systems/04-quest-log-engine.md),
which itself depends on `quest.schema.json` from
[`mvp.02-content-schemas.16-quest-schema`](../../../../../tasks/mvp/02-content-schemas/16-quest-schema.md).

### Mechanics Mapping
- Quest state derives from scenario quest records and hero / player
  progress. The screen reads selectors only; it never writes quest
  progress or grants rewards (that lives in the quest-log engine
  task above).
- UI previews stay local until a route guard accepts a navigation
  action. `questLog.changeTab` and `questLog.selectQuest` only mutate
  `state.ui.questLog.*`.
- Costs, spells, artifacts, buildings, stacks, heroes, towns, and
  map objects resolve through registries and content schemas — never
  hardcoded view logic.

### Animation Contract
- `modalIn` (parchment book opens) on mount; reverse `modalIn` on
  close. Quest tabs flip pages on `questLog.changeTab`; newly
  updated quests stamp a wax seal; the selected quest's objectives
  underline; `questLog.showSource` plays a map fade as the modal
  closes and the camera pans.
- Animation consumes selector or route results; it never decides
  gameplay outcomes.
- Reduced-motion mode preserves visible state changes with static
  highlights and localized feedback. The
  `@media (prefers-reduced-motion: reduce)` rule in `mockup.html` is
  the canonical example.

### Acceptance Criteria
- Mockup is visually distinct from sibling screens and follows this
  package's internal visual direction.
- Spec lists every visible region and authoritative state binding.
- `interactions.md` covers every primary control, next screen, state
  update, animation cue, disabled case, and error path.
- `architecture.md` carries screen-specific diagrams, not copied
  archetype diagrams.
- `data-contracts.md` identifies the schema, config, localization,
  asset, sound, VFX, save, and replay fields required to implement
  the screen.

### AI Implementation Notes
- Screen slug `quest-log`; system group `adventure`; curation marker
  `curated-pass-3`.
- Build runtime components from this package contract — never from
  third-party captures or external product pixels.
- Resolve presentation through asset IDs and manifests; gameplay
  records carry stable IDs and scalar values only.
- All four control tokens (`questLog.selectQuest`,
  `questLog.changeTab`, `questLog.showSource`, `questLog.close`) are
  **UI-local** by prefix coverage — they do not enter the
  deterministic command log. See sibling
  [`interactions.md`](./interactions.md) for per-control routing and
  [`data-contracts.md`](./data-contracts.md) for the prefix
  coverage.

---

## 🔍 Sync Check

- **UI: ✔** — Component tree (`QuestLog` → `QuestTabs`, `QuestList`,
  `QuestDetails`, `RequirementChecklist`, `RewardSlots`,
  `SourceFocusButton`) covers the regions in `mockup.html`; the
  `SOURCE` / `CLOSE` button labels match the `data-action`
  attributes in the mockup. Animation contract mirrors the
  `modalIn`, `pulse`, and `glow` rules in the mockup `<style>`
  block.
- **Schema: ⚠** — `selectors.quests.*` and the underlying quest
  records are produced by
  [`phase-2.08-meta-systems.04-quest-log-engine`](../../../../../tasks/phase-2/08-meta-systems/04-quest-log-engine.md)
  and
  [`mvp.02-content-schemas.16-quest-schema`](../../../../../tasks/mvp/02-content-schemas/16-quest-schema.md);
  both are `planned` per
  [`tasks/task-status.json`](../../../../../tasks/task-status.json).
  Not CI-blocking — the spec correctly documents what the screen
  will consume; flagged so the implementer knows neither the schema
  nor the selectors are resolvable in `main` yet.
- **Tasks: ✔** — Owning task
  [`phase-2.07-ui-screen-backlog.11-quest-log-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/11-quest-log-screen.md)
  reads this file first and lists `src/ui/screens/QuestLog.tsx` as
  the sole Owned Path.

## ⚠ Issues

- **`QuestTabs` defined but not depicted in `mockup.html`.** The
  component tree and animation contract describe a tab strip for
  `active / completed / failed / all`, but the current mockup only
  renders the `Active Quests` page label — no visible tab affordance.
  Not a doc fault (the contract is correct); flagged so a future
  mockup pass for this package adds the missing visual element.
  Skill did not edit `mockup.html` (reference-only per task brief).
- **`state.ui.questLog.filter` and `state.ui.questLog.selectedQuestId`
  not registered in `data-inventory.md`.** Transient UI slices, not
  persisted, so the persistence contract ("every persisted field is
  registered" — see
  [`data-inventory.md`](../../../data-inventory.md)) does not require
  rows. If either slice ever becomes session-persistent, the owning
  task
  [`phase-2.07-ui-screen-backlog.11-quest-log-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/11-quest-log-screen.md)
  must add a `low / in-memory / session` row before merge. Skill did
  not add the row itself (Hard Prohibition D).
