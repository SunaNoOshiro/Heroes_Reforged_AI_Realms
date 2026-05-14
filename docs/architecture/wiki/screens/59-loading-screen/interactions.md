# Screen 59: Loading Screen
## Interaction Map

### Source Files
- Mockup: `mockup.html`
- Spec: `spec.md`
- Data Contracts: `data-contracts.md`
- Architecture Diagrams: `architecture.md`

### Purpose
Progress screen for content/pack load, save load, scenario or
random-map generation, asset warmup, and route handoff. Drives
no gameplay state; routes the shell to the configured
destination once all phases succeed.

### Control Surfaces
The happy path renders no buttons — the crest, bar, and step
text update until completion fades to the destination route.
The `RecoverableErrorPanel` mounts only when
`state.ui.loading.errors.length > 0`; it carries `Cancel` and
`Retry`.

| UI Element | Action ID | Type | Trigger | Next Screen | Command / Event | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `RecoverableErrorPanel` → Cancel | `loading.cancel` | navigation | User | Configured fallback | `CANCEL_LOADING_TASK` | Only enabled while the active phase is `recoverable: true`. |
| `RecoverableErrorPanel` → Retry | `loading.retry` | local-ui | User | Current screen | `RETRY_LOADING_STEP` | Retries the failed phase named in `state.ui.loading.errors[*].phase`. |
| (none) | `loading.complete` | navigation (automatic) | Runtime | Configured destination | `COMPLETE_LOADING_TASK` | Dispatched by the UI shell once every required phase has accepted; no user-visible control. |

`CANCEL_`, `RETRY_`, and `COMPLETE_` tokens pass
[`screen-command-coverage.json`](../../../screen-command-coverage.json)
via the `localUiPrefixes` allow-list and update `state.ui.*`
without entering the deterministic gameplay command log.

### Runtime-Emitted Commands
The phase pipeline emits these reducer-only commands (no user
control). They are listed here for cross-reference with
[diagram 28 — loading orchestration](../../../diagrams/28-loading-orchestration.md):

- `BEGIN_LOADING_TASK { taskId, destination }` — initializes
  `state.ui.loading` on route entry.
- `LOADING_PROGRESS { phase, weight }` — one per phase
  completion; sums into `state.ui.loading.progress`.
- `LOADING_ERROR { phase, code, recoverable, retry }` — appends
  to `state.ui.loading.errors[]`.

### State Changes
- `state.ui.loading.taskId` — set on `BEGIN_LOADING_TASK`,
  cleared after route handoff.
- `state.ui.loading.progress` — monotonically increases as each
  phase accepts; reset on cancel/retry of the owning task.
- `state.ui.loading.destinationRoute` — set by the caller before
  entering the route; consumed by `COMPLETE_LOADING_TASK`.
- `state.ui.loading.errors` — appended on `LOADING_ERROR`;
  cleared by `RETRY_LOADING_STEP` for the retried phase.
- `state.ui.loading.contentHashes` — written during the
  `pack-load` phase from validated manifests.
- Hover, focus, target cursor, drag ghost, and animation frame
  stay outside deterministic gameplay state and out of saves.

### Navigation Outcomes
- `loading.cancel` routes to the caller-configured fallback
  after guard approval and the exit fade.
- `loading.complete` routes to `state.ui.loading.destinationRoute`
  after every required phase accepts and the exit fade plays.
- A non-recoverable failure escalates to the fatal error
  boundary (z-layer `10000`) rather than routing.

### Disabled And Error Cases
- The `RecoverableErrorPanel` only mounts when at least one
  entry in `state.ui.loading.errors[]` carries `recoverable:
  true`; non-recoverable failures bypass it.
- `Cancel` is disabled when the active task declares itself
  non-cancellable (e.g. a fatal save migration mid-write).
- Missing presentation assets may use resolver fallback per
  [`docs/architecture/fail-loud.md`](../../../fail-loud.md);
  missing gameplay content IDs, invalid commands, or rejected
  guards fail loudly before controls become enabled.
- Error copy is produced exclusively by `formatUserError(err,
  locale)` from
  [`docs/architecture/error-formatter.md`](../../../error-formatter.md);
  never construct error toast text inline.

### AI Implementation Notes
- This file owns behavior and timing.
- `spec.md` owns static regions and state bindings.
- `architecture.md` diagrams mirror these interactions; they
  must not introduce hidden behavior.

---

## 🔍 Sync Check

- **UI: ✔** — Cancel/Retry surfaces match `spec.md` (`RecoverableErrorPanel` only) and `mockup.html` (no button on the happy path). Animation rule ("bar fills, crest rotates, torch flickers, fade to destination") is the canonical statement in sibling `spec.md` § Animation Contract.
- **Schema: ✔** — `CANCEL_LOADING_TASK`, `RETRY_LOADING_STEP`, and `COMPLETE_LOADING_TASK` pass [`screen-command-coverage.json`](../../../screen-command-coverage.json) via `localUiPrefixes`; `BEGIN_LOADING_TASK`, `LOADING_PROGRESS`, and `LOADING_ERROR` are sourced from [diagram 28](../../../diagrams/28-loading-orchestration.md) and listed as runtime-emitted here for symmetry.
- **Tasks: ✔** — [`mvp.07-ui-shell.09-loading-screen`](../../../../../tasks/mvp/07-ui-shell/09-loading-screen.md) Reads-First this file and accepts the cancel/retry/complete flow as part of its acceptance criteria.

## ⚠ Issues

- **Loading-screen tokens are not registered in `command-schema.md`.** `CANCEL_LOADING_TASK`, `RETRY_LOADING_STEP`, and `COMPLETE_LOADING_TASK` (plus the runtime-emitted trio in diagram 28) currently pass the validator via `localUiPrefixes` only. Per [`docs/architecture/command-schema.md` § Contract](../../../command-schema.md#contract), screen-interaction tokens must be either a schema command, an alias, or marked local-UI with explicit ownership; today they pass implicitly. The owning task `mvp.07-ui-shell.09-loading-screen` should either land these as `runtime-only`/`local-ui` entries in `command-schema.md` or add an explicit row to `screen-command-coverage.json`. Not CI-blocking (validator accepts), but the implicit pass risks drift. No fix applied here (Hard Prohibition D — never edit cross-checked files).
