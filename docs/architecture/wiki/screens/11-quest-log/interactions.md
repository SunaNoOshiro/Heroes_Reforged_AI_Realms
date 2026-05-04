# Screen 11: Quest Log
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Adventure quest ledger listing active, completed, failed, and repeatable map-object quests with requirements, deadlines, and rewards.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select quest | `questLog.selectQuest` | local-ui | Current screen | `SELECT_QUEST_LOG_ENTRY` | Updates selected details only. | Quest tabs flip pages, newly updated quests stamp a seal, selected objectives underline, and source focus closes through a map fade. |
| Change tab | `questLog.changeTab` | local-ui | Current screen | `SET_QUEST_LOG_FILTER` | Filters rows without mutating quests. | Quest tabs flip pages, newly updated quests stamp a seal, selected objectives underline, and source focus closes through a map fade. |
| Show source | `questLog.showSource` | navigation | `07-adventure-map` | `FOCUS_QUEST_SOURCE` | Centers camera on a known quest source object. | Quest tabs flip pages, newly updated quests stamp a seal, selected objectives underline, and source focus closes through a map fade. |
| Close | `questLog.close` | navigation | `07-adventure-map` or previous screen | `CLOSE_QUEST_LOG` | Returns to caller. | Quest tabs flip pages, newly updated quests stamp a seal, selected objectives underline, and source focus closes through a map fade. |

### State Changes
- `state.ui.questLog.filter` refreshes `questFilter` after the owning reducer or local UI draft changes.
- `selectors.quests.visibleQuestRows` refreshes `questRows` after the owning reducer or local UI draft changes.
- `state.ui.questLog.selectedQuestId` refreshes `selectedQuest` after the owning reducer or local UI draft changes.
- `selectors.quests.selectedQuestRequirements` refreshes `requirements` after the owning reducer or local UI draft changes.
- `selectors.quests.selectedQuestRewards` refreshes `rewardPreview` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Show source can route to `07-adventure-map` after guard approval and exit animation.
- Close can route to `07-adventure-map` or previous screen after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.
- Errors are produced by `formatUserError(err, locale)` declared in [`docs/architecture/error-formatter.md`](../../../error-formatter.md); never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
