# Screen 41: Surrender Cost Dialog
## Interaction Map

### Source Files
- Mockup: [`mockup.html`](./mockup.html)
- Spec: [`spec.md`](./spec.md)
- Data Contracts: [`data-contracts.md`](./data-contracts.md)
- Architecture Diagrams: [`architecture.md`](./architecture.md)

### Purpose
Confirm or cancel a tactical-battle surrender. Surfaces ransom cost,
available gold, surviving-army value, hero outcome, and the
Accept / Decline controls.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Accept surrender | `surrender.accept` | command | `39-battle-results` | `ACCEPT_BATTLE_SURRENDER` | Spends `surrenderCost` gold and resolves the battle as a surrender with the declared hero outcome. | Gold cost plaque pulses; Accept button glows only when affordable; accepted modal folds into battle-result routing. |
| Decline | `surrender.decline` | navigation | `38-combat-screen` | `CLOSE_SURRENDER_DIALOG` (local-ui, route-only) | Closes the dialog; returns to active battle with no state change. | Gold cost plaque pulses; Accept button glows only when affordable; accepted modal folds into battle-result routing. |

### State Changes
- `state.battle.surrender.armyValue` refreshes `survivingArmyValue`
  after the owning reducer or local UI draft changes.
- `state.battle.surrender.cost` refreshes `surrenderCost` after the
  owning reducer or local UI draft changes.
- `state.players.active.resources.gold` refreshes `availableGold`
  after the owning reducer or local UI draft changes.
- `state.battle.surrender.heroOutcome` refreshes `heroOutcome` after
  the owning reducer or local UI draft changes.
- Hover, focus, selected row, open tab, target cursor, drag ghost,
  and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Accept surrender can route to `39-battle-results` after guard
  approval and exit animation.
- Decline can route to `38-combat-screen` after guard approval and
  exit animation.

### Disabled And Error Cases
- Disable Accept when affordability, battle-phase, ownership, or
  route-guard checks fail (e.g. `availableGold < surrenderCost`,
  hero is not the current actor, or battle is not in a surrenderable
  phase).
- Missing presentation assets may use resolver fallback. Missing
  gameplay records, invalid content IDs, or rejected commands fail
  loudly.
- On rejection, keep the dialog open, preserve any local draft when
  useful, show localized error text, and play failure feedback.
- Errors are produced by `formatUserError(err, locale)` declared in
  [`docs/architecture/error-formatter.md`](../../../error-formatter.md);
  never construct error toast / tooltip text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- [`spec.md`](./spec.md) owns static regions and state bindings.
- [`architecture.md`](./architecture.md) diagrams must mirror these
  interactions rather than inventing new behavior.

## Error surfaces

Per [`error-ux.md` § 5](../../../error-ux.md#5-per-screen-wiring),
this screen inherits the default code → surface mapping from § 2.
The table below maps each action whose `Type` column is `command` to
its default surface for this screen's dominant error domain. A row
whose Notes column reads `override` replaces the § 2 default for
that action; otherwise the default applies. Specific error codes
(e.g. `DISPATCHER_<token>`, `STORAGE_<token>`) land alongside the
engine reducer that owns each command and trigger the gate in
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing for them.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Accept surrender (`ACCEPT_BATTLE_SURRENDER`) | `DISPATCHER_REJECTED` | inline | `error.dispatcher.rejected.body` | Default per [`error-ux.md` § 2](../../../error-ux.md#2-code--surface-mapping) `DISPATCHER_*`; disabled control + tooltip on rejection. |

---

## 🔍 Sync Check
- **UI: ✔** — Action IDs (`surrender.accept`, `surrender.decline`)
  match the `data-action` tokens in [`mockup.html`](./mockup.html);
  state bindings match sibling [`spec.md`](./spec.md) and
  [`data-contracts.md`](./data-contracts.md).
- **Schema: ⚠** — `ACCEPT_BATTLE_SURRENDER` is defined in
  [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json)
  and registered in [`command-schema.md`](../../../command-schema.md).
  `CLOSE_SURRENDER_DIALOG` is intentionally local-ui and lives in
  no schema; the Decline action type is `navigation`, not
  `command`. See Issues.
- **Tasks: ✔** — The reducer flow is owned by
  [`mvp.09-tactical-combat.13-retreat-and-surrender-commands`](../../../../../tasks/mvp/09-tactical-combat/13-retreat-and-surrender-commands.md);
  the UI screen task
  [`phase-2/07-ui-screen-backlog/41-surrender-cost-dialog-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/41-surrender-cost-dialog-screen.md)
  lists this file under `Read First`.

## ⚠ Issues
- **Missing `data-inventory.md` rows for `state.battle.surrender.*`.**
  This file binds `state.battle.surrender.armyValue`,
  `state.battle.surrender.cost`, and
  `state.battle.surrender.heroOutcome`; no rows exist in
  [`data-inventory.md`](../../../data-inventory.md). Per CLAUDE.md
  root contract, the reducer owner
  [`mvp.09-tactical-combat.13-retreat-and-surrender-commands`](../../../../../tasks/mvp/09-tactical-combat/13-retreat-and-surrender-commands.md)
  must add them. Suggested values: domain=`battle`,
  owner=`mvp.09-tactical-combat.13`, persistence=`indexeddb`,
  retention=`battle-scope`.
- **Decline animation copy mirrors Accept verbatim.** The Decline
  row reuses the Accept animation cell ("accepted modal folds into
  battle-result routing"). The phrase is accurate for Accept and
  describes shared cost-plaque / affordability cues that exist
  while the dialog is mounted; the "fold into battle-result routing"
  clause does not apply to Decline (which routes back to
  `38-combat-screen`). Per [doc-audit Hard Prohibition A](../../../../../.claude/skills/doc-audit/SKILL.md),
  the copy was preserved verbatim; the UI screen task
  [`phase-2/07-ui-screen-backlog/41-surrender-cost-dialog-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/41-surrender-cost-dialog-screen.md)
  may split the Decline cell to "modal fades out; returns to combat"
  in a follow-up.
