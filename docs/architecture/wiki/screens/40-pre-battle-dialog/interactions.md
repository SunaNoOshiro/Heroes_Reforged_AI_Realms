# Screen 40: Pre-Battle Dialog
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Encounter confirmation dialog comparing attacker and defender heroes/armies, terrain context, tactics availability, and fight/retreat/auto-resolve choices.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Fight | `preBattle.fight` | command | `38-combat-screen` or `45-tactics-phase` | `START_TACTICAL_BATTLE` | Creates deterministic battle state. | Army strength bars fill, crossed-swords emblem pulses, fight route fades into battlefield, retreat disabled state shakes when illegal. |
| Auto resolve | `preBattle.autoResolve` | command | `39-battle-results` | `AUTO_RESOLVE_BATTLE` | Runs deterministic auto-resolve. | Army strength bars fill, crossed-swords emblem pulses, fight route fades into battlefield, retreat disabled state shakes when illegal. |
| Retreat | `preBattle.retreat` | command | `07-adventure-map` | `RETREAT_BEFORE_BATTLE` | Cancels encounter if legal. | Army strength bars fill, crossed-swords emblem pulses, fight route fades into battlefield, retreat disabled state shakes when illegal. |
| Inspect army | `preBattle.inspectArmy` | local-ui | Current screen | `SELECT_PRE_BATTLE_STACK` | Shows stack detail tooltip. | Army strength bars fill, crossed-swords emblem pulses, fight route fades into battlefield, retreat disabled state shakes when illegal. |

### State Changes
- `state.pendingBattle.attacker` refreshes `attacker` after the owning reducer or local UI draft changes.
- `state.pendingBattle.defender` refreshes `defender` after the owning reducer or local UI draft changes.
- `state.pendingBattle.terrainId` refreshes `terrain` after the owning reducer or local UI draft changes.
- `state.pendingBattle.tacticsAvailable` refreshes `tacticsAvailable` after the owning reducer or local UI draft changes.
- `state.pendingBattle.retreatAllowed` refreshes `retreatAllowed` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Fight can route to `38-combat-screen` or `45-tactics-phase` after guard approval and exit animation.
- Auto resolve can route to `39-battle-results` after guard approval and exit animation.
- Retreat can route to `07-adventure-map` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
