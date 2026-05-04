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
- **End-turn debounce.** Wait / Defend / End-turn buttons and hotkeys are debounced 250 ms (trailing edge). Dispatcher single-flight on `(playerId, END_BATTLE_TURN)` and `(playerId, START_BATTLE)` is the safety net; the second arrival within the same tick returns `DUPLICATE_INTENT`. See [`docs/architecture/command-schema.md` § Single-flight commands](../../../command-schema.md#single-flight-commands).

### Multiplayer Disconnect (Q213)
- When a peer's `state.net.opponentDisconnect` is non-null, render the localized banner `mp.combat.disconnect_banner` over the combat board. The banner shows the seconds remaining in the 30 s reconnect window.
- The combat clock pauses during the window — no auto-advance, no AI takeover of the absent player's stack.
- At 120 s, the still-present player wins by forfeit. Render the localized modal `mp.combat.forfeit_modal`; on dismissal, route to `39-battle-results` with a forfeit outcome.
- Cross-cutting framing in [`docs/architecture/edge-cases-policy.md` § 9](../../../edge-cases-policy.md#9-mid-combat-disconnect-q213).

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.

## Error surfaces

Per [`error-ux.md`](../../../error-ux.md) § 5, this screen inherits
the default code → surface mapping from § 2. The table below
maps each action whose `Type` column is `command` to its default
surface for this screen's dominant error domain. A row whose Notes
column reads `override` replaces the § 2 default for that action;
otherwise the default applies. Specific error codes (e.g.
`DISPATCHER_<token>`, `STORAGE_<token>`) land alongside the engine
reducer that owns each command and trigger the gate in
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing for them.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Move stack (`MOVE_COMBAT_STACK`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
| Attack (`RESOLVE_COMBAT_ATTACK`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
| Wait (`WAIT_COMBAT_STACK`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
| Defend (`DEFEND_COMBAT_STACK`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
