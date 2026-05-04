# Screen 39: Battle Results
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Post-combat result panel with victory/defeat banner, experience gain, casualties, spoils, captured artifacts, and continue routing.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Acknowledge result | `battleResults.continue` | command | `07-adventure-map` or `42-victory-defeat-cinematic` | `ACKNOWLEDGE_BATTLE_RESULT` | Finalizes result routing and clears battle phase. | Outcome banner drops in, experience bar fills, spoils appear in sequence, continue button glows after all results are acknowledged. |
| Inspect casualties | `battleResults.inspectCasualties` | local-ui | Current screen | `SELECT_BATTLE_RESULT_ROW` | Highlights casualty detail only. | Outcome banner drops in, experience bar fills, spoils appear in sequence, continue button glows after all results are acknowledged. |
| Inspect spoils | `battleResults.inspectSpoils` | local-ui | Current screen | `SELECT_BATTLE_SPOILS_ITEM` | Shows artifact/resource tooltip. | Outcome banner drops in, experience bar fills, spoils appear in sequence, continue button glows after all results are acknowledged. |

### State Changes
- `state.battle.result.outcome` refreshes `battle.outcome` after the owning reducer or local UI draft changes.
- `state.battle.result.experienceGained` refreshes `experience` after the owning reducer or local UI draft changes.
- `state.battle.result.casualties` refreshes `casualties` after the owning reducer or local UI draft changes.
- `state.battle.result.spoils` refreshes `spoils` after the owning reducer or local UI draft changes.
- `state.battle.result.returnRoute` refreshes `nextRoute` after the owning reducer or local UI draft changes.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Acknowledge result can route to `07-adventure-map` or `42-victory-defeat-cinematic` after guard approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.

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
| Acknowledge result (`ACKNOWLEDGE_BATTLE_RESULT`) | DISPATCHER_REJECTED | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
