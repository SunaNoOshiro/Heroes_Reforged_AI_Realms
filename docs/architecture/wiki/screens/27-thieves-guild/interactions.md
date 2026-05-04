# Screen 27: Thieves Guild
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Information ranking screen showing opponents, towns, heroes, resources, artifacts, army strength, and intelligence columns allowed by guild access.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select player | `thieves.selectPlayer` | local-ui | Current screen | `SELECT_THIEVES_GUILD_ROW` | Highlights row and detail footer. | Columns reveal left-to-right based on intelligence level, selected player row glows, unavailable cells stay covered. |
| Change sort | `thieves.sort` | local-ui | Current screen | `SORT_THIEVES_GUILD_COLUMN` | Changes local sort order only. | Columns reveal left-to-right based on intelligence level, selected player row glows, unavailable cells stay covered. |
| Close | `thieves.close` | navigation | `24-town-screen` | `CLOSE_THIEVES_GUILD` | Returns to tavern/town context. | Columns reveal left-to-right based on intelligence level, selected player row glows, unavailable cells stay covered. |

### State Changes
- `state.players.all` refreshes `players` after the owning reducer or local UI draft changes.
- `state.townServices.thievesGuildLevel` refreshes `intelligenceLevel` after the owning reducer or local UI draft changes.
- `state.intelligence.rankings` refreshes `rankings` after the owning reducer or local UI draft changes.
- `state.ui.thievesGuild.selectedPlayerId` refreshes `selectedPlayer` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Close can route to `24-town-screen` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.
- Errors are produced by `formatUserError(err, locale)` declared in [`docs/architecture/error-formatter.md`](../../../error-formatter.md); never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
