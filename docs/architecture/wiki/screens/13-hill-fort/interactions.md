# Screen 13: Hill Fort
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Hill Fort upgrade service where eligible hero stacks can be upgraded for calculated resource costs.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select stack | `hillFort.selectStack` | local-ui | Current screen | `SELECT_HILL_FORT_STACK` | Updates selected upgrade preview. | Eligible stack slots glow, selected stack marches across an arrow, upgraded portrait flashes, and resource cost ticks down after the command resolves. |
| Upgrade selected | `hillFort.upgradeSelected` | command | Current screen | `UPGRADE_ARMY_STACK` | Spends resources and replaces stack creature ID/count. | Eligible stack slots glow, selected stack marches across an arrow, upgraded portrait flashes, and resource cost ticks down after the command resolves. |
| Upgrade all | `hillFort.upgradeAll` | command | Current screen | `UPGRADE_ALL_ELIGIBLE_STACKS` | Applies all legal upgrades in deterministic order. | Eligible stack slots glow, selected stack marches across an arrow, upgraded portrait flashes, and resource cost ticks down after the command resolves. |
| Close | `hillFort.close` | navigation | `07-adventure-map` | `CLOSE_HILL_FORT` | Returns to visited fort tile. | Eligible stack slots glow, selected stack marches across an arrow, upgraded portrait flashes, and resource cost ticks down after the command resolves. |

### State Changes
- `state.heroes.byId[selected].army` refreshes `heroArmy` after the owning reducer or local UI draft changes.
- `selectors.creatures.availableHillFortUpgrades` refreshes `upgradeTargets` after the owning reducer or local UI draft changes.
- `state.ui.hillFort.selectedStackIndex` refreshes `selectedStack` after the owning reducer or local UI draft changes.
- `selectors.economy.upgradeCostPreview` refreshes `costPreview` after the owning reducer or local UI draft changes.
- `state.players.active.resources` refreshes `resources` after the owning reducer or local UI draft changes.
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
