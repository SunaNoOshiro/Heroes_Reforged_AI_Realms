# Screen 57: High Scores
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
High score ledger showing completed game rankings, player names, score, days, difficulty, scenario, and campaign medals.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select row | `scores.selectRow` | local-ui | Current screen | `SELECT_HIGH_SCORE_ROW` | Updates details panel. | Score rows cascade, top-three plaques glint, filter tabs turn pages, and new records pulse once after victory. |
| Change filter | `scores.filter` | local-ui | Current screen | `SET_HIGH_SCORE_FILTER` | Filters ranking table. | Score rows cascade, top-three plaques glint, filter tabs turn pages, and new records pulse once after victory. |
| Back | `scores.back` | navigation | `01-main-menu` or previous screen | `CLOSE_HIGH_SCORES` | Returns to caller. | Score rows cascade, top-three plaques glint, filter tabs turn pages, and new records pulse once after victory. |

### State Changes
- `state.profile.highScores` refreshes `scoreRecords` after the owning reducer or local UI draft changes.
- `state.ui.highScores.filter` refreshes `filter` after the owning reducer or local UI draft changes.
- `state.ui.highScores.selectedRecordId` refreshes `selectedRecord` after the owning reducer or local UI draft changes.
- `selectors.profile.sortedHighScores` refreshes `sortOrder` after the owning reducer or local UI draft changes.
- `state.ui.highScores.newRecordId` refreshes `newRecordId` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Back can route to `01-main-menu` or previous screen after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
