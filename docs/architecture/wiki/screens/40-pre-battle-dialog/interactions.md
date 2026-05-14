# Screen 40: Pre-Battle Dialog
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Pre-battle confirmation modal: pick Fight, Auto-Resolve, or Retreat
after a hero meets an enemy hero or guarded stack.

### Animation & Audio (applies to every command row)
Army strength bars fill in, the central `VS` emblem pulses, the
Fight route fades into the battlefield, and a disabled `RETREAT`
button shakes when the player clicks it while
`retreatAllowed === false`. Audio uses `audio.ui.hover`,
`audio.ui.click`, and the `audio.battle.*` manifest. Reduced-motion
mode preserves visible state changes with static highlights and
localized feedback.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated |
| --- | --- | --- | --- | --- | --- |
| Fight | `preBattle.fight` | command | `45-tactics-phase` when `tacticsAvailable === true`, otherwise `38-combat-screen` | `START_TACTICAL_BATTLE` | Initialises deterministic tactical-battle state. |
| Auto resolve | `preBattle.autoResolve` | command | `39-battle-results` | `AUTO_RESOLVE_BATTLE` | Runs deterministic auto-resolve. |
| Retreat | `preBattle.retreat` | command | `07-adventure-map` | `RETREAT_BEFORE_BATTLE` | Cancels the encounter when `retreatAllowed === true`. |
| Inspect army | `preBattle.inspectArmy` | local-ui | Current screen | `SELECT_PRE_BATTLE_STACK` | Shows a stack-detail tooltip for the right-clicked slot. |

Token mapping: `START_TACTICAL_BATTLE` is a screen-package alias for
the canonical schema kind `INITIATE_BATTLE` registered in
[`screen-command-coverage.json` § commandAliases](../../../screen-command-coverage.json).
`AUTO_RESOLVE_BATTLE` and `RETREAT_BEFORE_BATTLE` are canonical
`Command` kinds in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json).
`SELECT_PRE_BATTLE_STACK` is UI-local (matches the `SELECT_` prefix
in [`screen-command-coverage.json` § localUiPrefixes](../../../screen-command-coverage.json)).

### State Changes
- `state.pendingBattle.attacker`, `state.pendingBattle.defender`,
  `state.pendingBattle.terrainId`, `state.pendingBattle.tacticsAvailable`,
  and `state.pendingBattle.retreatAllowed` refresh their bound UI
  selectors after the owning reducer (see [`command-schema.md` § INITIATE_BATTLE](../../../command-schema.md#initiate_battle))
  stages the slice.
- UI-only hover, focus, selected slot, tooltip target, drag ghost,
  and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- Fight routes to `45-tactics-phase` when
  `state.pendingBattle.tacticsAvailable === true`, otherwise to
  `38-combat-screen`. Either path follows guard approval and exit
  animation.
- Auto resolve routes to `39-battle-results` after guard approval
  and exit animation.
- Retreat routes to `07-adventure-map` after guard approval and
  exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records,
  resource costs, target legality, ownership, phase, or route
  guards fail.
- `RETREAT` is additionally disabled when
  `state.pendingBattle.retreatAllowed === false` (e.g. attacker
  already retreated this turn).
- Missing presentation assets may use resolver fallback per
  [`asset-policy.md`](../../../asset-policy.md). Missing gameplay
  records, invalid content IDs, or rejected commands fail loudly
  per [`fail-loud.md`](../../../fail-loud.md).
- On rejection, keep the dialog open, preserve local draft when
  useful, show localized error text, and play failure feedback.
- Errors are produced by `formatUserError(err, locale)` declared in
  [`error-formatter.md`](../../../error-formatter.md); never
  construct error toast text inline.

### AI Implementation Notes
- This file owns behavior, timing, and command routing.
- [`spec.md`](./spec.md) owns static regions and state bindings.
- [`architecture.md`](./architecture.md) diagrams must mirror these
  interactions rather than inventing new behavior.

## Error surfaces

Per [`error-ux.md` § 5](../../../error-ux.md#5-per-screen-wiring),
this screen inherits the default code → surface mapping from § 2.
The table below maps each action whose `Type` column is `command`
to its default surface for this screen's dominant error domain. A
row whose Notes column reads `override` replaces the § 2 default
for that action; otherwise the default applies. Specific error
codes (e.g. `DISPATCHER_<token>`, `STORAGE_<token>`) land alongside
the engine reducer that owns each command and trigger the gate in
[`scripts/check-error-ux-coverage.mjs`](../../../../../scripts/check-error-ux-coverage.mjs)
if a row is missing for them.

| Action | Default error code | Surface | Localization key | Notes |
| --- | --- | --- | --- | --- |
| Fight (`START_TACTICAL_BATTLE`) | `DISPATCHER_REJECTED` | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
| Auto resolve (`AUTO_RESOLVE_BATTLE`) | `DISPATCHER_REJECTED` | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
| Retreat (`RETREAT_BEFORE_BATTLE`) | `DISPATCHER_REJECTED` | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |

---

## 🔍 Sync Check

- **UI: ⚠** — Aligned with sibling [`spec.md`](./spec.md) Component
  Tree and the three buttons drawn by [`mockup.html`](./mockup.html)
  (`FIGHT`, `AUTO`, `RETREAT`). `preBattle.inspectArmy` is implicit
  in the mockup (right-click on a `data-item` stack slot, no
  rendered button) — repeated from sibling [`spec.md`](./spec.md)
  § ⚠ Issues.
- **Schema: ⚠** — Every command token resolves via
  [`screen-command-coverage.json`](../../../screen-command-coverage.json):
  `START_TACTICAL_BATTLE` aliases `INITIATE_BATTLE`;
  `AUTO_RESOLVE_BATTLE` and `RETREAT_BEFORE_BATTLE` are canonical
  schema kinds in [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json);
  `SELECT_PRE_BATTLE_STACK` is UI-local. The underlying
  `state.pendingBattle.*` slice itself is unregistered — see
  sibling [`spec.md`](./spec.md) § ⚠ Issues, repeated below.
- **Tasks: ✔** — Owning task
  [`phase-2.07-ui-screen-backlog.40-pre-battle-dialog-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/40-pre-battle-dialog-screen.md)
  Reads First this file plus the three siblings; engine-side
  dependencies on `mvp.05-adventure-map.06-auto-resolve-combat` and
  `mvp.09-tactical-combat.11-combat-hud-overlay` resolve via the
  task's `Dependencies` list.

## ⚠ Issues

- **`state.pendingBattle.*` slice not registered in `state-shape.md`
  or `data-inventory.md`.** Same gap as sibling
  [`spec.md`](./spec.md) § ⚠ Issues — owning task closes it before
  this screen ships.
- **Inspect-army row not visualised in the mockup.** Same mismatch
  as sibling [`spec.md`](./spec.md) § ⚠ Issues — owning task picks
  between drawing the affordance and dropping the row.
