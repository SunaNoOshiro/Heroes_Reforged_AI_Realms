# Screen 39: Battle Results
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Post-combat result panel. Surfaces a deterministic battle result
already produced by the engine and routes the player onward.

### Actions
| UI Element | Action ID | Type | Next Screen | Token | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Continue (mockup glyph `OK`) | `battleResults.continue` | local-ui | `07-adventure-map` or `42-victory-defeat-cinematic` per `state.battle.result.returnRoute` | `ACKNOWLEDGE_BATTLE_RESULT` | Dismisses the results overlay and routes the shell. Engine state is unchanged (already settled by `BATTLE_RESOLVED`). | Continue button glow → exit animation → route. |
| Inspect casualty row | `battleResults.inspectCasualties` | local-ui | Current screen | `SELECT_BATTLE_RESULT_ROW` | Updates `state.ui.battleResults.selectedRow` for tooltip / detail. | Slot highlight + hover audio. |
| Inspect spoils slot | `battleResults.inspectSpoils` | local-ui | Current screen | `SELECT_BATTLE_SPOILS_ITEM` | Updates `state.ui.battleResults.selectedSpoil` for artifact / resource tooltip. | Slot highlight + hover audio. |

Mount animation order: outcome banner drops in → experience bar
fills → spoils slots appear in sequence → continue button glow
enables the dismiss action.

### Tokens And Coverage
- All three tokens match a `localUiPrefixes` entry in
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  (`ACKNOWLEDGE_`, `SELECT_`). They do not enter the deterministic
  command log.
- The engine command that finalizes the battle outcome is
  `BATTLE_RESOLVED`, owned by the inner battle reducer (see
  [`command-schema.md` § BATTLE_RESOLVED](../../../command-schema.md)).
  This screen never dispatches `BATTLE_RESOLVED`; it reads the
  resulting `state.battle.result.*` slice.

### State Changes
- `state.battle.result.outcome` → `battle.outcome` binding (read-only here).
- `state.battle.result.experienceGained` → `experience` (read-only here).
- `state.battle.result.casualties` → `casualties` (read-only here).
- `state.battle.result.spoils` → `spoils` (read-only here).
- `state.battle.result.returnRoute` → `nextRoute` (consumed on continue).
- UI-only hover, focus, selected row, tooltip target, drag ghost,
  and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- On continue: route to `07-adventure-map` or
  `42-victory-defeat-cinematic` per `state.battle.result.returnRoute`,
  after the screen's exit animation completes.

### Disabled And Error Cases
- Continue is disabled until the mount animation settles
  (reduced-motion mode disables it for one frame only).
- Continue is disabled if `state.battle.result.returnRoute` is
  unresolved; the screen renders a localized error string from the
  `ui.battle-results.errors.*` keyspace.
- Missing presentation assets fall back through the asset resolver;
  missing gameplay records (no `state.battle.result` after a battle
  ends) fail loudly per
  [`fail-loud.md`](../../../fail-loud.md).
- Errors render through `formatUserError(err, locale)` per
  [`error-formatter.md`](../../../error-formatter.md). Never
  construct toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather
  than inventing new behavior.

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
| _(none)_ | — | — | — | All three actions are `local-ui` per `screen-command-coverage.json`; they do not dispatch engine commands and inherit no dispatcher-error surface. The screen's only failure surface is the disabled-continue state described in § Disabled And Error Cases above. |

---

## 🔍 Sync Check

- **UI: ✔** — Actions, animation order, and copy match
  [`spec.md`](./spec.md), `mockup.html`, and the diagrams in
  [`architecture.md`](./architecture.md).
- **Schema: ⚠** — All three tokens are local-ui by prefix per
  [`screen-command-coverage.json`](../../../screen-command-coverage.json);
  `BATTLE_RESOLVED` (the real engine command) is defined in
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json)
  and not dispatched from this screen. Outcome enum values are listed
  in [`spec.md`](./spec.md) but not registered in a closed schema —
  flagged in `## ⚠ Issues`.
- **Tasks: ✔** — Owning task
  [`tasks/phase-2/07-ui-screen-backlog/39-battle-results-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/39-battle-results-screen.md)
  reads this file first.

## ⚠ Issues

- **`ACKNOWLEDGE_BATTLE_RESULT` was previously labeled `command`.**
  Earlier revisions of this file marked the continue action `Type:
  command` and described it as "Finalizes result routing and clears
  battle phase." Per
  [`screen-command-coverage.json`](../../../screen-command-coverage.json),
  the `ACKNOWLEDGE_` prefix is `localUiPrefixes` (UI-local). The
  closed engine command that clears the battle phase is
  `BATTLE_RESOLVED` in
  [`command-schema.md`](../../../command-schema.md), emitted by the
  inner battle reducer, not by this screen. Reclassified to
  `local-ui` to match the coverage rule; preserved the routing
  description because that part of the prior claim is correct (the
  local-ui acknowledgement triggers shell route change, not phase
  mutation). No code change implied; the rewrite resolves an internal
  contradiction in the doc.
- **Outcome enum not closed in a schema.** Spec lists
  `win | loss | retreat | surrender` for `state.battle.result.outcome`
  but no entry in
  [`schema-matrix.md`](../../../schema-matrix.md) or
  [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json)
  closes the enum. Owner: the Phase-2 battle-result-wiring task that
  produces `state.battle.result`. Suggested values:
  `oneOf: ["win", "loss", "retreat", "surrender"]` per
  [`enum-lifecycle-policy.md`](../../../enum-lifecycle-policy.md).
- **No data-inventory row for `state.battle.result.*`.** Mirrors the
  trailer note in sibling
  [`spec.md`](./spec.md) and the sibling-screen note in
  [`38-combat-screen/data-contracts.md`](../38-combat-screen/data-contracts.md).
  Per CLAUDE.md, a row in
  [`data-inventory.md`](../../../data-inventory.md) is required
  before the slice can ship. Owner: the `BATTLE_RESOLVED` producing
  task. Not rewritten here per Hard Prohibition D.
