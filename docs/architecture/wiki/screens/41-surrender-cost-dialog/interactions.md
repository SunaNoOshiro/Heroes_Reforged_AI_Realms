# Screen 41: Surrender Cost Dialog
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Combat surrender confirmation with ransom cost, available gold, surviving army value, hero survival outcome, and accept/decline controls.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Accept surrender | `surrender.accept` | command | `39-battle-results` | `ACCEPT_BATTLE_SURRENDER` | Spends gold and resolves battle as surrender. | Gold cost plaque pulses, accept button glows only when affordable, accepted modal folds into battle result routing. |
| Decline | `surrender.decline` | navigation | `38-combat-screen` | `CLOSE_SURRENDER_DIALOG` | Returns to active battle. | Gold cost plaque pulses, accept button glows only when affordable, accepted modal folds into battle result routing. |

### State Changes
- `state.battle.surrender.armyValue` refreshes `survivingArmyValue` after the owning reducer or local UI draft changes.
- `state.battle.surrender.cost` refreshes `surrenderCost` after the owning reducer or local UI draft changes.
- `state.players.active.resources.gold` refreshes `availableGold` after the owning reducer or local UI draft changes.
- `state.battle.surrender.heroOutcome` refreshes `heroOutcome` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Accept surrender can route to `39-battle-results` after guard approval and exit animation.
- Decline can route to `38-combat-screen` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
