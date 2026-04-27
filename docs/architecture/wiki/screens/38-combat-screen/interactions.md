# Screen 38: Combat Screen
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Tactical combat board with hex grid, stack placement, active unit, hero portraits, action bar, target highlights, damage feedback, and combat log.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select target hex | `combat.selectTarget` | local-ui | Current screen | `PREVIEW_COMBAT_TARGET` | Highlights legal movement/attack/cast target. | Active stack halo pulses, legal movement hexes glow, attack lunge/recoil and projectile arcs play after command acceptance, damage floats from reducer result. |
| Move stack | `combat.moveStack` | command | Current screen | `MOVE_COMBAT_STACK` | Updates stack hex and initiative state. | Active stack halo pulses, legal movement hexes glow, attack lunge/recoil and projectile arcs play after command acceptance, damage floats from reducer result. |
| Attack | `combat.attack` | command | Current screen or battle results | `RESOLVE_COMBAT_ATTACK` | Applies deterministic damage, retaliation, morale/luck, death. | Active stack halo pulses, legal movement hexes glow, attack lunge/recoil and projectile arcs play after command acceptance, damage floats from reducer result. |
| Cast spell | `combat.castSpell` | navigation | `44-combat-spell-targeting` | `OPEN_COMBAT_SPELL_TARGETING` | Creates combat spell targeting draft. | Active stack halo pulses, legal movement hexes glow, attack lunge/recoil and projectile arcs play after command acceptance, damage floats from reducer result. |
| Wait | `combat.wait` | command | Current screen | `WAIT_COMBAT_STACK` | Moves active stack later in initiative order. | Active stack halo pulses, legal movement hexes glow, attack lunge/recoil and projectile arcs play after command acceptance, damage floats from reducer result. |
| Defend | `combat.defend` | command | Current screen | `DEFEND_COMBAT_STACK` | Applies defend state and advances initiative. | Active stack halo pulses, legal movement hexes glow, attack lunge/recoil and projectile arcs play after command acceptance, damage floats from reducer result. |

### State Changes
- `state.battle.phase` refreshes `battle.phase` after the owning reducer or local UI draft changes.
- `state.battle.activeStackId` refreshes `activeStack` after the owning reducer or local UI draft changes.
- `state.battle.legalTargets` refreshes `legalHexes` after the owning reducer or local UI draft changes.
- `state.battle.log` refreshes `combatLog` after the owning reducer or local UI draft changes.
- `state.ui.battle.pendingAnimation` refreshes `pendingAnimation` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Attack can route to Current screen or battle results after guard approval and exit animation.
- Cast spell can route to `44-combat-spell-targeting` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.
