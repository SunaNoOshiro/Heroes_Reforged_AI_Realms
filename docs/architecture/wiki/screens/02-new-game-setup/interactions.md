# Screen 02: New Game Setup
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Scenario setup shell for single scenario, campaign, random map, multiplayer, difficulty, player color, and starting options.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select mode | `newGame.selectMode` | local-ui | Current screen | `SET_NEW_GAME_MODE` | Updates setup draft and visible fields. | Mode tabs depress, scenario preview parchment slides in, player color flags flip, and Start fades into loading once validation succeeds. |
| Select scenario | `newGame.selectScenario` | local-ui | Current screen | `SELECT_SCENARIO` | Updates preview and player slots. | Mode tabs depress, scenario preview parchment slides in, player color flags flip, and Start fades into loading once validation succeeds. |
| Start game | `newGame.start` | navigation | `59-loading-screen` | `CREATE_GAME_FROM_SETUP` | Validates setup and creates deterministic initial game request. | Mode tabs depress, scenario preview parchment slides in, player color flags flip, and Start fades into loading once validation succeeds. |
| Back | `newGame.back` | navigation | `01-main-menu` | `CANCEL_NEW_GAME_SETUP` | Discards setup draft. | Mode tabs depress, scenario preview parchment slides in, player color flags flip, and Start fades into loading once validation succeeds. |

### State Changes
- `state.ui.newGame.mode` refreshes `setupMode` after the owning reducer or local UI draft changes.
- `selectors.scenarios.availableScenarios` refreshes `scenarioList` after the owning reducer or local UI draft changes.
- `state.ui.newGame.selectedScenarioId` refreshes `selectedScenario` after the owning reducer or local UI draft changes.
- `state.ui.newGame.playerSlots` refreshes `playerSlots` after the owning reducer or local UI draft changes.
- `state.ui.newGame.difficulty` refreshes `difficulty` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Start game can route to `59-loading-screen` after guard approval and exit animation.
- Back can route to `01-main-menu` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
