# Screen 43: Siege Combat Variant
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Siege battlefield variant with walls, gate, towers, moat, catapult target preview, breaching state, and defender/attacker stack placement.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Select wall target | `siege.selectWall` | local-ui | Current screen | `SELECT_CATAPULT_TARGET` | Writes `state.ui.battle.catapultTarget`; highlights wall / gate target. | Target glow pulses on hovered wall segment; hex/wall cursor snaps to legal target. |
| Fire catapult | `siege.fireCatapult` | command | Current screen | `FIRE_CATAPULT` | Applies deterministic wall / gate damage; clears `catapultTarget` on accept. | Catapult arcs toward selected wall; impact dust plays after reducer result; breached segment darkens. |
| Move stack | `siege.moveStack` | command | Current screen | `MOVE_COMBAT_STACK` | Resolves moat / gate passability; advances stack. | Stack walk along path; moat entry plays moat splash / damage tick; gate cell shows blocked or passable cue. |
| Attack | `siege.attack` | command | Current screen or `battle results` | `RESOLVE_COMBAT_ATTACK` | Resolves stack attack with siege modifiers (tower fire, defender bonuses). | Attack swing and impact; tower shot flashes from battlement when defender retaliates; victory wipe on battle-end transition. |

`SELECT_CATAPULT_TARGET` matches the `SELECT_` local-ui prefix per
[`screen-command-coverage.json`](../../../screen-command-coverage.json)
and stays out of the deterministic command log. `MOVE_COMBAT_STACK`
and `RESOLVE_COMBAT_ATTACK` alias to canonical kinds `BATTLE_MOVE`
and `BATTLE_ATTACK` per the same map. `FIRE_CATAPULT` is its own
schema kind in
[`command.schema.json`](../../../../../content-schema/schemas/command.schema.json).

### State Changes
- `state.battle.siege.wallSegments` refreshes `wallState` after the owning reducer applies wall damage.
- `state.battle.siege.gate` refreshes `gateState` after the owning reducer changes gate open / broken / blocked status.
- `state.battle.siege.towers` refreshes `towerState` after tower fire or ammo updates.
- `state.ui.battle.catapultTarget` refreshes `catapultTarget` from local UI draft on hover / select.
- `state.battle.activeStackId` refreshes `activeStack` when initiative order advances.
- UI-only hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- `siege.attack` routes to `battle results` when the resolved attack ends the battle (last enemy stack defeated or siege breach condition met); otherwise the screen stays current and initiative advances.
- All other actions stay on the current screen.

### Disabled And Error Cases
- Disable controls when required selectors, registry records, resource costs, target legality, ownership, phase, or route guards fail.
- Missing presentation assets may use resolver fallback. Missing gameplay records, invalid content IDs, or rejected commands fail loudly.
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.
- Errors are produced by `formatUserError(err, locale)` declared in [`docs/architecture/error-formatter.md`](../../../error-formatter.md); never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather than inventing new behavior.

## Error surfaces

Per [`error-ux.md`](../../../error-ux.md) § 5, this screen inherits
the default code → surface mapping from § 2. The table below maps
each action whose `Type` column is `command` to its default surface
for this screen's dominant error domain. A row whose Notes column
reads `override` replaces the § 2 default for that action; otherwise
the default applies. Specific error codes (e.g. `DISPATCHER_<token>`,
`STORAGE_<token>`) land alongside the engine reducer that owns each
command and trigger the gate in
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing for them.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Fire catapult (`FIRE_CATAPULT`) | `DISPATCHER_REJECTED` | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 `DISPATCHER_*`; disabled control + tooltip on rejection. |
| Move stack (`MOVE_COMBAT_STACK`) | `DISPATCHER_REJECTED` | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 `DISPATCHER_*`; disabled control + tooltip on rejection. |
| Attack (`RESOLVE_COMBAT_ATTACK`) | `DISPATCHER_REJECTED` | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 `DISPATCHER_*`; disabled control + tooltip on rejection. |

---

## 🔍 Sync Check

- **UI: ⚠** — Four siege actions (wall select, fire, move, attack) match `mockup.html` battlefield affordances. The six `ActionBar` buttons in the mockup (`siege-combat.spell` / `.wait` / `.defend` / `.auto` / `.retreat` / `.end`, lines 72–96) are not enumerated here; see sibling `spec.md` § Issues — aligned.
- **Schema: ✔** — `FIRE_CATAPULT` is defined in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) line 1726; `MOVE_COMBAT_STACK` and `RESOLVE_COMBAT_ATTACK` resolve through [`screen-command-coverage.json`](../../../screen-command-coverage.json) `commandAliases` to `BATTLE_MOVE` / `BATTLE_ATTACK`; `SELECT_CATAPULT_TARGET` is local-ui by the `SELECT_` prefix.
- **Tasks: ✔** — Owning task [`phase-2.07-ui-screen-backlog.43-siege-combat-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/43-siege-combat-screen.md) references this file; engine owners [`phase-2.01-spells-artifacts.13-siege-state-machine`](../../../../../tasks/phase-2/01-spells-artifacts/13-siege-state-machine.md) and [`phase-2.01-spells-artifacts.14-fire-catapult-command`](../../../../../tasks/phase-2/01-spells-artifacts/14-fire-catapult-command.md) Read First this file.

## ⚠ Issues

- **`ActionBar` rows missing.** Mockup shows six labeled action-bar buttons; this file documents only the four battlefield actions. Per [`.agents/rules/ui.md`](../../../../../.agents/rules/ui.md) ("read all five together") `interactions.md` owns the per-control rows. Suggested rows (canonical command kinds via [`screen-command-coverage.json`](../../../screen-command-coverage.json) aliases): `siege-combat.spell` → `SPELL_CAST`, `siege-combat.wait` → `BATTLE_WAIT`, `siege-combat.defend` → `BATTLE_DEFEND`, `siege-combat.auto` → `AUTO_RESOLVE_BATTLE`, `siege-combat.retreat` → `RETREAT_BEFORE_BATTLE`. The `siege-combat.end` button has no obvious canonical kind in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) — the owning task ([`phase-2.07-ui-screen-backlog.43-siege-combat-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/43-siege-combat-screen.md)) must pick one before runtime. Not added inline per audit rule B (never invent features).
- **Action-ID namespace inconsistency.** This file uses `siege.<verb>` while `mockup.html` `data-action` attributes use `siege-combat.<verb>`. Both are repo-valid action ID conventions, but `screen-command-coverage.json` and runtime hooks need a single namespace. Suggested fix lives in the owning task; not changed here (audit rule A — never change meaning).
