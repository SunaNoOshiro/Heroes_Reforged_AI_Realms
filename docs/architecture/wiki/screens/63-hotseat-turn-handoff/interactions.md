# Screen 63: Hotseat Turn Handoff
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Companion Docs
- Engine state machine: [`tasks/phase-2/08-meta-systems/07-hotseat-turn-state-machine.md`](../../../../../tasks/phase-2/08-meta-systems/07-hotseat-turn-state-machine.md)
- UI screen task: [`tasks/phase-2/07-ui-screen-backlog/63-hotseat-turn-handoff-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/63-hotseat-turn-handoff-screen.md)
- Error formatter: [`docs/architecture/error-formatter.md`](../../../error-formatter.md)
- Command schema: [`docs/architecture/command-schema.md`](../../../command-schema.md)

### Purpose
Privacy handoff between hotseat players. The map stays hidden
behind a full-screen cover until the next player presses BEGIN.
Mounts between the previous seat's `END_DAY` and the next seat's
adventure-map input unblock.

### Actions
| UI Element | Action ID | Type | Next Screen | Command / Event | Data Updated | Animation / Audio |
| --- | --- | --- | --- | --- | --- | --- |
| Begin turn | `hotseat.begin` | navigation | `07-adventure-map` or pending popup | `BEGIN_HOTSEAT_TURN` | Clears privacy cover; advances active player; routes to map or queued popup. | Banner unfurls, shield pulses, shutters open onto the adventure map. |
| Open options | `hotseat.options` | navigation | `56-options` | `OPEN_OPTIONS_FROM_HANDOFF` | Suspends handoff; lets the next player adjust presentation before reveal. | Shutters stay closed; options portal fades in over the covered map. |

### State Changes
- `state.turn.activePlayerId` refreshes `nextPlayer` after the engine reducer commits.
- `state.calendar.currentDate` refreshes `calendar` after the engine reducer commits.
- `state.ui.hotseat.coverActive` refreshes `privacyCover` after the engine state machine or local UI draft updates it.
- `state.players.byId[next].displayName` refreshes `playerName` after the engine reducer commits.
- `selectors.turn.pendingStartOfTurnAnnouncements` refreshes `pendingAnnouncements` after the engine reducer commits.
- Hover, focus, selected row, open tab, target cursor, drag ghost, and animation frame stay outside deterministic gameplay state.

### Navigation Outcomes
- `hotseat.begin` routes to `07-adventure-map`, or to a pending start-of-turn popup if `selectors.turn.pendingStartOfTurnAnnouncements` is non-empty, after guard approval and the exit animation.
- `hotseat.options` routes to `56-options` after guard approval and the exit animation.

### Disabled And Error Cases
- BEGIN is disabled until the engine state machine reports the next seat is local-human and ready (see engine task acceptance criteria for `BEGIN_HOTSEAT_HANDOFF`).
- Controls disable when required selectors, registry records, ownership, phase, or route guards fail.
- Missing presentation assets fall back through the asset resolver. Missing gameplay records, invalid content IDs, or rejected commands fail loudly per [`fail-loud.md`](../../../fail-loud.md).
- On rejection, keep the current screen open, preserve local draft when useful, show localized error text, and play failure feedback.
- Errors are produced by `formatUserError(err, locale)` declared in [`docs/architecture/error-formatter.md`](../../../error-formatter.md); never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- [`spec.md`](./spec.md) owns static regions and state bindings.
- [`data-contracts.md`](./data-contracts.md) owns schemas, config, asset, and localization references.
- [`architecture.md`](./architecture.md) diagrams must mirror these interactions, not invent new behavior.

---

## 🔍 Sync Check

- **UI: ⚠** — `hotseat.begin` matches the single BEGIN affordance in [`mockup.html`](./mockup.html). `hotseat.options` has no visible affordance in the mockup; see issues.
- **Schema: ❌** — `BEGIN_HOTSEAT_TURN` and `OPEN_OPTIONS_FROM_HANDOFF` are **not defined** in [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json). [`command-schema.md`](../../../command-schema.md) references this screen package but does not register either kind.
- **Tasks: ❌** — Engine task [`07-hotseat-turn-state-machine.md`](../../../../../tasks/phase-2/08-meta-systems/07-hotseat-turn-state-machine.md) defines `BEGIN_HOTSEAT_HANDOFF` / `CONFIRM_HOTSEAT_HANDOFF` for the seat-handoff flow; the names in this table do not match. UI task [`63-hotseat-turn-handoff-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/63-hotseat-turn-handoff-screen.md) requires every interaction token to resolve through [`screen-command-coverage.json`](../../../screen-command-coverage.json), which currently has no entry for screen 63.

## ⚠ Issues

- **Command-name drift versus engine task.** Table lists `BEGIN_HOTSEAT_TURN` and `OPEN_OPTIONS_FROM_HANDOFF`; canonical engine state machine [`07-hotseat-turn-state-machine.md`](../../../../../tasks/phase-2/08-meta-systems/07-hotseat-turn-state-machine.md) defines `BEGIN_HOTSEAT_HANDOFF` (set up cover) and `CONFIRM_HOTSEAT_HANDOFF` (advance `activePlayerId`). Per CLAUDE.md "Stable IDs are public API", the engine task is canonical. Suggested rewrite: BEGIN row → `CONFIRM_HOTSEAT_HANDOFF`; `BEGIN_HOTSEAT_HANDOFF` dispatched on screen mount, not by a control. Skill did not rename (Hard Prohibition A — IDs must survive). See sibling [`architecture.md`](./architecture.md) trailer — aligned.
- **`OPEN_OPTIONS_FROM_HANDOFF` is undefined and not in `mockup.html`.** No Options control drawn; no matching command in the engine task or `command.schema.json`. Either the mockup must add an Options control (owner approval — reference-only) or this row must be removed. Skill did not edit `mockup.html` (Hard Prohibition D) and did not drop the row (Hard Prohibition A — preserve meaning until ownership decides). See sibling [`spec.md`](./spec.md) trailer — aligned.
- **Missing `screen-command-coverage.json` row for `63-hotseat-turn-handoff`.** UI task [`63-hotseat-turn-handoff-screen.md`](../../../../../tasks/phase-2/07-ui-screen-backlog/63-hotseat-turn-handoff-screen.md) acceptance criterion requires every action ID here to resolve through that file. Owner: `phase-2.07-ui-screen-backlog.63-hotseat-turn-handoff-screen`.
- **Missing `command.schema.json` registrations.** Neither hotseat command (whichever naming wins) is in [`content-schema/schemas/command.schema.json`](../../../../../content-schema/schemas/command.schema.json). Per CLAUDE.md hard constraints, schema-backed commands must be registered before dispatch. Owner: `phase-2.08-meta-systems.07-hotseat-turn-state-machine` or its predecessor schema task.
