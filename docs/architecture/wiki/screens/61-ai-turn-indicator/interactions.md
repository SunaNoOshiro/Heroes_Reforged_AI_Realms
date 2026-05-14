# Screen 61: AI Turn Indicator — Interactions

## 1. Screen Package

- Mockup: [`mockup.html`](./mockup.html)
- Spec: [`spec.md`](./spec.md)
- Data Contracts: [`data-contracts.md`](./data-contracts.md)
- Architecture Diagrams: [`architecture.md`](./architecture.md)

## 2. Purpose

This file owns **behavior and timing** for the AI turn overlay:
per-control commands, navigation outcomes, disabled and error
states, and animation hooks. `spec.md` owns static regions and
state bindings; `architecture.md` diagrams must mirror this file,
not invent new behavior.

## 3. Actions

| UI element | Action ID | Type | Next screen | Command / event | Effect | Animation / audio |
|---|---|---|---|---|---|---|
| Change speed | `aiTurn.speed` | local-ui | Current | `SET_AI_TURN_SPEED` | Writes `config.ui.aiTurnSpeed`; presentation only. | Beads advance at the new cadence; no gameplay effect. |
| Fast-forward | `aiTurn.fastForward` | local-ui | Current | `FAST_FORWARD_AI_TURN_PRESENTATION` | Skips non-essential animation only. | Camera snaps through the remaining visible actions; `audio.ui.click`. |
| AI turn complete | `aiTurn.complete` | navigation | `07-adventure-map` | `COMPLETE_AI_TURN_PRESENTATION` | Hands control back to the next human player. | Crest fades out; overlay dismisses; map returns to interactive mode. |

`aiTurn.speed` and `aiTurn.fastForward` are presentation-only; they
never alter gameplay state, save data, or replay output.
`aiTurn.complete` fires automatically when
`state.ai.currentPhase = done` and the visible command queue is
drained.

## 4. State Changes

These bindings refresh when their owning reducer or local-UI draft
updates:

- `aiPlayer` ← `state.turn.activePlayerId`
- `aiPhase` ← `state.ai.currentPhase`
- `commandBatch` ← `state.ai.visibleCommandBatch`
- `speed` ← `config.ui.aiTurnSpeed`
- `interruptGuard` ← `selectors.ai.canFastForwardOrPause`

UI-only state — hover, focus, selected row, open tab, target
cursor, drag ghost, animation frame — stays **out** of
deterministic gameplay state and is never persisted.

## 5. Navigation Outcomes

- `aiTurn.complete` routes to
  [`07-adventure-map`](../07-adventure-map/) after route-guard
  approval and the exit fade animation completes. No other outgoing
  routes exist for this screen.

## 6. Disabled And Error Cases

- **Guards.** Disable `aiTurn.fastForward` and `aiTurn.speed` when
  `selectors.ai.canFastForwardOrPause` returns `false` (e.g. while
  a critical combat animation is mid-frame, or the engine is
  resolving a hidden-information step).
- **Required prerequisites.** Disable controls when required
  selectors, registry records, resource costs, target legality,
  ownership, phase, or route guards fail.
- **Asset fallback.** Missing presentation assets may use the
  resolver fallback per
  [`asset-loading.md`](../../../asset-loading.md).
- **Fail-loud gameplay.** Missing gameplay records, invalid content
  IDs, or rejected commands fail loudly per
  [`fail-loud.md`](../../../fail-loud.md) **before** the affected
  controls become enabled.
- **Rejection.** On command rejection, keep the overlay open,
  preserve any local draft when useful, render localized error text,
  and play failure feedback.
- **Error copy.** Error toasts are built by
  `formatUserError(err, locale)` declared in
  [`error-formatter.md`](../../../error-formatter.md); never
  construct error text inline.

## 7. AI Implementation Notes

- The overlay observes the AI command batch; it does not author
  commands.
- Each interaction token whose owning engine task is `done` MUST
  dispatch live. Tokens whose owning task is still `planned` render
  disabled with a localized reason that cites the planned task ID,
  per the owning task's acceptance criteria.

---

## 🔍 Sync Check

- **UI: ⚠** — `aiTurn.speed` and `aiTurn.complete` have no
  `data-action` hook in [`mockup.html`](./mockup.html); only
  `aiTurn.fastForward` is present in the SVG. Behavior preserved
  here for symmetry with sibling [`spec.md`](./spec.md) and
  [`data-contracts.md`](./data-contracts.md). See sibling
  `spec.md` § ⚠ Issues — aligned.
- **Schema: ✔** — Three commands are correctly classified
  `local-ui` / `navigation`; no schema entry expected in
  [`command-schema.md`](../../../command-schema.md).
- **Tasks: ✔** — Acceptance criteria of
  [`phase-2.07-ui-screen-backlog.61-ai-turn-indicator-screen`](../../../../../tasks/phase-2/07-ui-screen-backlog/61-ai-turn-indicator-screen.md)
  require every command listed here to be resolved through
  `docs/architecture/screen-command-coverage.json`.

## ⚠ Issues

- **Coverage-map registration not verified.** This audit did not
  inspect
  [`screen-command-coverage.json`](../../../screen-command-coverage.json)
  for entries covering `SET_AI_TURN_SPEED`,
  `FAST_FORWARD_AI_TURN_PRESENTATION`, and
  `COMPLETE_AI_TURN_PRESENTATION`. Per the owning task's acceptance
  criteria, the screen implementer must confirm each token is
  either schema-backed, alias-mapped, UI-local, or marked
  out-of-scope with an owning task. Skill did not edit
  coverage JSON (Hard Prohibition D).
