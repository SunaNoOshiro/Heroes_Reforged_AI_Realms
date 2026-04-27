# Screen 08: Kingdom Overview
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Adventure-layer kingdom ledger showing owned towns, heroes, daily income, movement status, and strategic warnings without changing gameplay state.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Click town row | `kingdom.selectTown` | navigation | `24-town-screen` | `OPEN_TOWN_SCREEN` | Sets selected town context; no economy mutation. | Ledger slides up over the map, selected rows receive a brass outline, resource deltas count upward after day/week changes, and close fades back to map focus. |
| Click hero row | `kingdom.selectHero` | navigation | `46-hero-screen` | `OPEN_HERO_SCREEN` | Sets selected hero context and preserves adventure camera. | Ledger slides up over the map, selected rows receive a brass outline, resource deltas count upward after day/week changes, and close fades back to map focus. |
| Focus on map | `kingdom.focusMap` | navigation | `07-adventure-map` | `FOCUS_ADVENTURE_ENTITY` | Centers camera on the selected town or hero. | Ledger slides up over the map, selected rows receive a brass outline, resource deltas count upward after day/week changes, and close fades back to map focus. |
| Close | `kingdom.close` | navigation | `07-adventure-map` | `CLOSE_KINGDOM_OVERVIEW` | Returns to previous adventure selection. | Ledger slides up over the map, selected rows receive a brass outline, resource deltas count upward after day/week changes, and close fades back to map focus. |

### State Changes
- `state.players.active.townIds` refreshes `townRows` after the owning reducer or local UI draft changes.
- `state.players.active.heroIds` refreshes `heroRows` after the owning reducer or local UI draft changes.
- `selectors.economy.dailyIncomeByResource` refreshes `incomeTotals` after the owning reducer or local UI draft changes.
- `state.ui.kingdomOverview.selectedRowId` refreshes `selectedRow` after the owning reducer or local UI draft changes.
- `selectors.adventure.kingdomWarnings` refreshes `warnings` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Click town row can route to `24-town-screen` after guard approval and exit animation.
- Click hero row can route to `46-hero-screen` after guard approval and exit animation.
- Focus on map can route to `07-adventure-map` after guard approval and exit animation.
- Close can route to `07-adventure-map` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
