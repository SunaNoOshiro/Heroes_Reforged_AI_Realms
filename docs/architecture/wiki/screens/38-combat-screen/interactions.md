# Screen 38: Combat Screen
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Tactical combat board with hex grid, stack placement, active unit,
hero portraits, action bar, target highlights, damage feedback, and
combat log.

### Animation & Audio (applies to every command row)
Active stack halo pulses; legal movement hexes glow; attack
lunge/recoil and projectile arcs play **after** command acceptance;
damage floats animate from the reducer result. Audio uses
`audio.ui.hover`, `audio.ui.click`, and the `audio.battle.*`
manifest. Reduced-motion mode preserves visible state changes with
static highlights and localized feedback.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated |
| --- | --- | --- | --- | --- | --- |
| Select target hex | `combat.selectTarget` | local-ui | Current screen | `PREVIEW_COMBAT_TARGET` | Highlights legal movement/attack/cast target. |
| Move stack | `combat.moveStack` | command | Current screen | `MOVE_COMBAT_STACK` | Updates stack hex and initiative state. |
| Attack | `combat.attack` | command | Current screen or `39-battle-results` | `RESOLVE_COMBAT_ATTACK` | Applies deterministic damage, retaliation, morale/luck, death. |
| Cast spell | `combat.castSpell` | navigation | `44-combat-spell-targeting` | `OPEN_COMBAT_SPELL_TARGETING` | Creates combat spell targeting draft. |
| Wait | `combat.wait` | command | Current screen | `WAIT_COMBAT_STACK` | Moves active stack later in initiative order. |
| Defend | `combat.defend` | command | Current screen | `DEFEND_COMBAT_STACK` | Applies defend state and advances initiative. |

Token mapping: `MOVE_COMBAT_STACK`, `RESOLVE_COMBAT_ATTACK`,
`WAIT_COMBAT_STACK`, and `DEFEND_COMBAT_STACK` are screen-package
aliases for the canonical schema kinds `BATTLE_MOVE`,
`BATTLE_ATTACK`, `BATTLE_WAIT`, and `BATTLE_DEFEND` registered in
[`screen-command-coverage.json`](../../../screen-command-coverage.json).
`PREVIEW_COMBAT_TARGET` and `OPEN_COMBAT_SPELL_TARGETING` are
UI-local (matching `PREVIEW_` / `OPEN_` prefixes in
[`screen-command-coverage.json` § localUiPrefixes](../../../screen-command-coverage.json)).

### State Changes
- `battle.phase`, `activeStack`, `legalHexes`, `combatLog`, and
  `pendingAnimation` re-render after the owning reducer or local UI
  draft mutates their backing path in `state.battle.*` /
  `state.ui.battle.pendingAnimation`.
- UI-only hover, focus, selected row, open tab, target cursor, drag
  ghost, and animation frame stay outside deterministic gameplay
  state.

### Navigation Outcomes
- Attack may resolve to battle end → `39-battle-results` after guard
  approval and exit animation.
- Cast spell routes to `44-combat-spell-targeting` after guard
  approval and exit animation.

### Disabled And Error Cases
- Disable controls when required selectors, registry records,
  resource costs, target legality, ownership, phase, or route guards
  fail.
- Missing presentation assets may use resolver fallback. Missing
  gameplay records, invalid content IDs, or rejected commands fail
  loudly per [`fail-loud.md`](../../../fail-loud.md).
- On rejection, keep the current screen open, preserve local draft
  when useful, show localized error text, and play failure feedback.
- Errors are produced by `formatUserError(err, locale)` declared in
  [`error-formatter.md`](../../../error-formatter.md); never construct
  error toast text inline.
- **End-turn debounce.** Wait / Defend / End-turn buttons and
  hotkeys are debounced 250 ms (trailing edge). Dispatcher
  single-flight on `(playerId, END_BATTLE_TURN)` and
  `(playerId, START_BATTLE)` is the safety net; the second arrival
  within the same tick returns `DUPLICATE_INTENT`. See
  [`command-schema.md` § Single-flight commands](../../../command-schema.md#single-flight-commands).

### Multiplayer Disconnect
- When `state.net.opponentDisconnect` is non-null, render the
  localized banner `mp.combat.disconnect_banner` over the combat
  board. The banner shows the seconds remaining in the **30 s**
  reconnect window.
- The combat clock pauses during the window — no auto-advance, no AI
  takeover of the absent player's stack.
- At **120 s** of continuous disconnect, the still-present player
  wins by forfeit. Render the localized modal
  `mp.combat.forfeit_modal`; on dismissal, route to
  `39-battle-results` with a forfeit outcome.
- Cross-cutting framing in
  [`edge-cases-policy.md` § 9](../../../edge-cases-policy.md#9-mid-combat-disconnect).

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams must mirror these interactions rather
  than inventing new behavior.

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
| Move stack (`MOVE_COMBAT_STACK`) | `DISPATCHER_REJECTED` | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
| Attack (`RESOLVE_COMBAT_ATTACK`) | `DISPATCHER_REJECTED` | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
| Wait (`WAIT_COMBAT_STACK`) | `DISPATCHER_REJECTED` | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |
| Defend (`DEFEND_COMBAT_STACK`) | `DISPATCHER_REJECTED` | inline | `error.dispatcher.rejected.body` | Default per `error-ux.md` § 2 DISPATCHER_*; disabled control + tooltip on rejection. |

---

## 🔍 Sync Check

- **UI: ⚠** — Sibling [`mockup.html`](./mockup.html) shows `combat.auto`, `combat.retreat`, and `combat.surrender` buttons; this file documents only the six rows above. Sibling [`spec.md`](./spec.md) Mechanics Mapping calls out retreat / surrender, and the owning task [`mvp.09-tactical-combat.11-combat-hud-overlay`](../../../../../tasks/mvp/09-tactical-combat/11-combat-hud-overlay.md) requires retreat + auto-combat handlers — see `## ⚠ Issues`.
- **Schema: ✔** — Every command token is registered in [`screen-command-coverage.json`](../../../screen-command-coverage.json) either as a canonical-kind alias or as a `localUiPrefixes` match; `END_BATTLE_TURN` is `outOfScope` (reserved single-flight kind, owned by `mvp.09-tactical-combat`).
- **Tasks: ✔** — Owning task [`mvp.09-tactical-combat.11-combat-hud-overlay`](../../../../../tasks/mvp/09-tactical-combat/11-combat-hud-overlay.md) reads this file plus the three siblings; multiplayer disconnect cross-link lands in [`edge-cases-policy.md` § 9](../../../edge-cases-policy.md#9-mid-combat-disconnect).

## ⚠ Issues

- **Mockup buttons `combat.auto` / `combat.retreat` / `combat.surrender` lack action rows here.** Sibling [`mockup.html`](./mockup.html) renders all three; [`spec.md`](./spec.md) declares retreat and surrender as deterministic commands; the owning HUD task explicitly enumerates `retreat` and `auto-combat` handlers. Per CLAUDE.md ("stable IDs are public API"), the HUD task must add three rows here mapping each action to a canonical kind — likely `RETREAT_BEFORE_BATTLE` and `ACCEPT_BATTLE_SURRENDER` from [`command.schema.json`](../../../../../content-schema/schemas/command.schema.json) (or a new `BATTLE_AUTO` kind), with the appropriate `Next Screen` (surrender likely routes via [`41-surrender-cost-dialog`](../41-surrender-cost-dialog/); retreat routes to `39-battle-results`). Not added here per Hard Prohibition B (no invented kinds).
- **`PREVIEW_COMBAT_TARGET` and `OPEN_COMBAT_SPELL_TARGETING` are UI-local events, not commands.** Both tokens start with `PREVIEW_` / `OPEN_` prefixes listed in [`screen-command-coverage.json` § localUiPrefixes](../../../screen-command-coverage.json); the table's `Type` column already correctly tags them as `local-ui` and `navigation`. Inline note added so AI implementers do not dispatch them as engine commands.
