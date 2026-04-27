# Screen 21: External Dwelling
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Adventure creature dwelling recruitment window for map dwellings outside towns.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Change quantity | `dwelling.quantity` | local-ui | Current screen | `SET_EXTERNAL_DWELLING_QUANTITY` | Updates cost and destination preview. | Creature portrait breathes, stock counter ticks down, recruited stack slides into destination slot, and empty dwelling greys out. |
| Recruit | `dwelling.recruit` | command | Current screen | `RECRUIT_EXTERNAL_DWELLING_UNITS` | Spends resources, decrements stock, updates hero army. | Creature portrait breathes, stock counter ticks down, recruited stack slides into destination slot, and empty dwelling greys out. |
| Max | `dwelling.max` | local-ui | Current screen | `SET_EXTERNAL_DWELLING_MAX` | Chooses max legal quantity. | Creature portrait breathes, stock counter ticks down, recruited stack slides into destination slot, and empty dwelling greys out. |
| Close | `dwelling.close` | navigation | `07-adventure-map` | `CLOSE_EXTERNAL_DWELLING` | Returns to map. | Creature portrait breathes, stock counter ticks down, recruited stack slides into destination slot, and empty dwelling greys out. |

### State Changes
- `state.ui.adventure.pendingDwellingId` refreshes `dwellingId` after the owning reducer or local UI draft changes.
- `state.mapObjects.byId[dwellingId].stock` refreshes `dwellingStock` after the owning reducer or local UI draft changes.
- `state.ui.externalDwelling.quantity` refreshes `selectedQuantity` after the owning reducer or local UI draft changes.
- `state.heroes.byId[selected].army` refreshes `destinationArmy` after the owning reducer or local UI draft changes.
- `selectors.economy.externalDwellingCost` refreshes `costPreview` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Close can route to `07-adventure-map` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
