# Screen 59: Loading Screen
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Loading/progress screen for scenario creation, save load, random map generation, asset warmup, and route handoff.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Cancel | `loading.cancel` | navigation | Configured fallback | `CANCEL_LOADING_TASK` | Cancels only recoverable tasks. | Progress bar fills by named task, crest rotates, background torch flickers, and successful load fades to destination screen. |
| Retry | `loading.retry` | local-ui | Current screen | `RETRY_LOADING_STEP` | Retries failed IO/presentation step. | Progress bar fills by named task, crest rotates, background torch flickers, and successful load fades to destination screen. |
| Complete | `loading.complete` | navigation | Configured destination | `COMPLETE_LOADING_TASK` | Routes when all required data is ready. | Progress bar fills by named task, crest rotates, background torch flickers, and successful load fades to destination screen. |

### State Changes
- `state.ui.loading.taskId` refreshes `loadingTask` after the owning reducer or local UI draft changes.
- `state.ui.loading.progress` refreshes `progress` after the owning reducer or local UI draft changes.
- `state.ui.loading.destinationRoute` refreshes `destination` after the owning reducer or local UI draft changes.
- `state.ui.loading.errors` refreshes `errors` after the owning reducer or local UI draft changes.
- `state.ui.loading.contentHashes` refreshes `contentHashes` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Cancel can route to Configured fallback after guard approval and exit animation.
- Complete can route to Configured destination after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
