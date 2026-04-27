# Screen 25: Building / Recruitment Dialog
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Town dwelling recruitment dialog with creature portrait, dwelling selection, available growth, quantity controls, total cost, and destination stack preview.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select dwelling | `recruit.selectDwelling` | local-ui | Current screen | `SELECT_RECRUIT_DWELLING` | Updates selected creature, stock, and cost preview. | Dwelling row highlights, quantity counter ticks, max button fills the slider, accepted recruits slide toward the destination army slot. |
| Change quantity | `recruit.changeQuantity` | local-ui | Current screen | `SET_RECRUIT_QUANTITY` | Updates local quantity and total cost. | Dwelling row highlights, quantity counter ticks, max button fills the slider, accepted recruits slide toward the destination army slot. |
| Max quantity | `recruit.max` | local-ui | Current screen | `SET_MAX_RECRUIT_QUANTITY` | Chooses max legal quantity from stock/resources/capacity. | Dwelling row highlights, quantity counter ticks, max button fills the slider, accepted recruits slide toward the destination army slot. |
| Recruit | `recruit.confirm` | command | Current screen | `RECRUIT_UNITS` | Spends resources, decrements stock, updates destination army. | Dwelling row highlights, quantity counter ticks, max button fills the slider, accepted recruits slide toward the destination army slot. |
| Cancel | `recruit.cancel` | navigation | `24-town-screen` | `CLOSE_RECRUITMENT_DIALOG` | Discards recruitment draft. | Dwelling row highlights, quantity counter ticks, max button fills the slider, accepted recruits slide toward the destination army slot. |

### State Changes
- `state.towns.selectedTownId` refreshes `town.id` after the owning reducer or local UI draft changes.
- `state.towns.byId[selected].dwellingStock` refreshes `dwelling.stock` after the owning reducer or local UI draft changes.
- `state.ui.town.selectedDwellingId` refreshes `selectedDwelling` after the owning reducer or local UI draft changes.
- `state.ui.town.recruitQuantity` refreshes `recruitQuantity` after the owning reducer or local UI draft changes.
- `state.townRecruit.destinationArmy` refreshes `destinationArmy` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Cancel can route to `24-town-screen` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
