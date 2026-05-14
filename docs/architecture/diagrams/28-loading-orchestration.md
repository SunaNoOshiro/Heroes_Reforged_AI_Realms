---
id: "28-loading-orchestration"
title: "Loading Orchestration — Canvas Lifecycle + Warmup Phases"
category: "system"
short: "28. Loading Orchestration"
---

**How a load advances the progress bar deterministically.** The
WebGL2 canvas is created once at app boot and is never destroyed
between loads; each warmup phase emits one reducer command with a
fixed weight that contributes to `state.ui.loading.progress`.

## Companion docs

- Canonical contract:
  [`screens/59-loading-screen/architecture.md` § Canvas Lifecycle and Warmup Orchestration](../wiki/screens/59-loading-screen/architecture.md#canvas-lifecycle-and-warmup-orchestration).
- Interactions / runtime-emitted commands:
  [`screens/59-loading-screen/interactions.md` § Runtime-Emitted Commands](../wiki/screens/59-loading-screen/interactions.md#runtime-emitted-commands).
- State selectors and copy keys:
  [`screens/59-loading-screen/data-contracts.md`](../wiki/screens/59-loading-screen/data-contracts.md).
- Z-stack contract (loading plate `9700`, fatal boundary `10000`):
  [`ui-technology-choice.md` § Z-Stack Contract](../ui-technology-choice.md#z-stack-contract).
- Cache priming that this orchestration drives:
  [`diagrams/17-cache-strategy.md`](./17-cache-strategy.md).
- Owning task:
  [`mvp.07-ui-shell.09-loading-screen`](../../../tasks/mvp/07-ui-shell/09-loading-screen.md).

## Sequence

```mermaid
sequenceDiagram
    participant App
    participant UI as Loading Screen
    participant Reducer
    participant Runtime as content-runtime
    participant Renderer

    App->>UI: route -> loading
    Note over App,Renderer: Canvas already mounted; loading plate covers it (z 9700)
    UI->>Reducer: BEGIN_LOADING_TASK { taskId, destination }
    Reducer-->>UI: state.ui.loading = { progress: 0, errors: [] }

    UI->>Runtime: schema-validation
    Runtime-->>Reducer: LOADING_PROGRESS { phase: schema-validation, weight }
    Reducer-->>UI: progress += w1

    UI->>Runtime: pack-load
    Runtime-->>Reducer: LOADING_PROGRESS { phase: pack-load, weight }
    Reducer-->>UI: progress += w2

    UI->>Renderer: atlas-decode
    Renderer-->>Reducer: LOADING_PROGRESS { phase: atlas-decode, weight }
    Reducer-->>UI: progress += w3

    UI->>Renderer: atlas-upload
    Renderer-->>Reducer: LOADING_PROGRESS { phase: atlas-upload, weight }
    Reducer-->>UI: progress += w4

    UI->>Renderer: shader-compile
    Renderer-->>Reducer: LOADING_PROGRESS { phase: shader-compile, weight }
    Reducer-->>UI: progress += w5

    UI->>Renderer: warmup-render
    Renderer-->>Reducer: LOADING_PROGRESS { phase: warmup-render, weight }
    Reducer-->>UI: progress += w6

    UI->>Reducer: COMPLETE_LOADING_TASK
    Reducer-->>UI: state.ui.loading.progress = 1.0
    UI->>App: route -> destination

    alt phase fails
        Runtime-->>Reducer: LOADING_ERROR { phase, code, recoverable, retry }
        Reducer-->>UI: state.ui.loading.errors[]
        UI-->>App: show RecoverableErrorPanel
        App->>UI: RETRY_LOADING_STEP
    end
```

## Phase order

The six warmup phases run in this order; the seventh,
`route-transition`, is the implicit handoff dispatched as
`COMPLETE_LOADING_TASK`. Canonical list in
[`architecture.md` § Phases](../wiki/screens/59-loading-screen/architecture.md#phases).

1. `schema-validation` — content-runtime validates pack manifests
   and schema versions.
2. `pack-load` — pack archives mount; content hashes resolve into
   `state.ui.loading.contentHashes`.
3. `atlas-decode` — sprite / UI atlas PNGs decode in workers.
4. `atlas-upload` — decoded atlases upload into GL textures.
5. `shader-compile` — renderer compiles its shader programs.
6. `warmup-render` — renderer issues one off-screen render to JIT
   the GL pipelines.
7. `route-transition` — `COMPLETE_LOADING_TASK` routes the shell
   to `state.ui.loading.destinationRoute`.

Phase weights live in `src/content-runtime/loading-phases.ts`
(planned; no current owning task — see Issues) and must total `1.0`.

## Rules

- **Canvas is persistent.** Created once at app boot, hidden via
  the loading plate during load, recreated only on tab unload. This
  avoids context-recreate stalls between scenarios.
- **One command per phase.** Each phase emits exactly one
  `LOADING_PROGRESS` on success or one `LOADING_ERROR` on failure.
  No phase writes the progress bar directly.
- **Progress bar reads `state.ui.loading.progress` only.** The
  reducer is the single source of truth; UI never accumulates
  weights itself.
- **Recoverable errors mount `RecoverableErrorPanel`.**
  Non-recoverable errors escalate to the fatal error boundary at
  z-layer `10000` per
  [`ui-technology-choice.md` § Z-Stack Contract](../ui-technology-choice.md#z-stack-contract).
- **All error copy uses `formatUserError(err, locale)`** from
  [`error-formatter.md`](../error-formatter.md). Never construct
  error strings inline.

## Commands surfaced here

| Command | Origin | Effect |
|---|---|---|
| `BEGIN_LOADING_TASK { taskId, destination }` | UI shell, on route entry | Initializes `state.ui.loading` |
| `LOADING_PROGRESS { phase, weight }` | Runtime / renderer | Sums into `state.ui.loading.progress` |
| `LOADING_ERROR { phase, code, recoverable, retry }` | Runtime / renderer | Appends to `state.ui.loading.errors[]` |
| `COMPLETE_LOADING_TASK` | UI shell, auto on `progress = 1.0` | Routes to `destinationRoute` |
| `RETRY_LOADING_STEP` | User, from `RecoverableErrorPanel` | Replays the failed phase |
| `CANCEL_LOADING_TASK` | User, from `RecoverableErrorPanel` | Routes to caller fallback |

These tokens pass
[`screen-command-coverage.json`](../screen-command-coverage.json)
via the `localUiPrefixes` allow-list; they update `state.ui.*` and
do **not** enter the deterministic engine command log.

## Related diagrams

- [01 — Game Startup](./01-game-startup.md) — canvas creation at app boot.
- [04 — Map Loading](./04-map-loading.md) — scenario-load flow that triggers this orchestration.
- [17 — Cache Strategy](./17-cache-strategy.md) — what `pack-load` / `atlas-*` phases prime.
- [26 — Pointer Event Routing](./26-pointer-event-routing.md) — input routing while the loading plate is mounted.

---

## 🔍 Sync Check

- **UI: ✔** — Phases, copy hooks, and z-layer values match [`screens/59-loading-screen/architecture.md`](../wiki/screens/59-loading-screen/architecture.md), [`interactions.md`](../wiki/screens/59-loading-screen/interactions.md), and [`data-contracts.md`](../wiki/screens/59-loading-screen/data-contracts.md). Z-layers `9700` / `10000` match [`ui-technology-choice.md` § Z-Stack Contract](../ui-technology-choice.md#z-stack-contract).
- **Schema: ⚠** — Loading commands (`BEGIN_LOADING_TASK`, `LOADING_PROGRESS`, `LOADING_ERROR`, `COMPLETE_LOADING_TASK`, `RETRY_LOADING_STEP`, `CANCEL_LOADING_TASK`) are not enumerated in [`command-schema.md`](../command-schema.md); they pass validation only via the `localUiPrefixes` allow-list in [`screen-command-coverage.json`](../screen-command-coverage.json). State-slice `state.ui.loading.*` is correctly absent from [`data-inventory.md`](../data-inventory.md) (transient session UI).
- **Tasks: ✔** — Owning task [`mvp.07-ui-shell.09-loading-screen`](../../../tasks/mvp/07-ui-shell/09-loading-screen.md) Reads-First the canonical screen architecture, and its acceptance criteria cover the load/cancel/retry/complete surfaces this diagram describes.

## ⚠ Issues

- **`src/content-runtime/loading-phases.ts` has no explicit owning task.** This diagram and [`architecture.md` § Phases](../wiki/screens/59-loading-screen/architecture.md#phases) both pin the file as the phase-weight source, but `mvp.07-ui-shell.09-loading-screen` declares only `src/ui/screens/LoadingScreen.tsx` as an Owned Path. Per [`.agents/rules/tasks.md`](../../../.agents/rules/tasks.md) (one task primarily owns each path), either the loading-screen task should extend `Owned Paths` to include `src/content-runtime/loading-phases.ts`, or a co-task under `tasks/mvp/02b-asset-pipeline/` should own it. Same gap noted in sibling [`architecture.md` § Issues](../wiki/screens/59-loading-screen/architecture.md#-issues) and [`data-contracts.md` § Issues](../wiki/screens/59-loading-screen/data-contracts.md#-issues). No fix applied here (Hard Prohibition D — never edit cross-checked files).
- **Loading-orchestration commands are not registered in [`command-schema.md`](../command-schema.md).** The six tokens above currently pass [`screen-command-coverage.json`](../screen-command-coverage.json) implicitly via the `localUiPrefixes` allow-list. Per `command-schema.md` § Contract ("a token must be a schema command, an alias to one, UI-local, or explicitly out of scope with an owning task"), the implicit pass risks drift. Owner: `mvp.07-ui-shell.09-loading-screen` should land these as `runtime-only` / `local-ui` entries in `command-schema.md`, or add explicit rows to `screen-command-coverage.json`. Same gap noted in sibling [`interactions.md` § Issues](../wiki/screens/59-loading-screen/interactions.md#-issues). Not CI-blocking. No fix applied here (Hard Prohibition D).
