---
id: "28-loading-orchestration"
title: "Loading Orchestration — Canvas Lifecycle + Warmup Phases"
category: "system"
short: "28. Loading Orchestration"
---

**How a load advances the progress bar deterministically.** The
WebGL2 canvas is created once at app boot and never destroyed
between loads; each warmup phase emits a reducer command with a fixed
weight that contributes to `state.ui.loading.progress`. Canonical
contract in
[`screens/59-loading-screen/architecture.md`](../wiki/screens/59-loading-screen/architecture.md#canvas-lifecycle-and-warmup-orchestration).

```mermaid
sequenceDiagram
    participant App
    participant UI as Loading Screen
    participant Reducer
    participant Runtime as content-runtime
    participant Renderer

    App->>UI: route -> loading
    Note over App,Renderer: Canvas already mounted; show loading overlay (z-layer 9700)
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

## Rules

- Canvas is persistent across loads. Hidden during load, never
  destroyed; recreated only on tab unload.
- Warmup phases run in the order shown. Each emits exactly one
  `LOADING_PROGRESS` command per completion (or `LOADING_ERROR`
  on failure).
- Phase weights are declared in
  `src/content-runtime/loading-phases.ts` (planned) and total to 1.0.
  No phase writes the progress bar directly.
- Recoverable errors route to `RecoverableErrorPanel`; non-recoverable
  errors escalate to the fatal error boundary (z-layer 10000).
- The progress bar is read from `state.ui.loading.progress` only;
  per-phase reducers are the single source of truth.

## Related diagrams

- [17 — Cache Strategy](./17-cache-strategy.md)
- [01 — Game Startup](./01-game-startup.md)
- [26 — Pointer Event Routing](./26-pointer-event-routing.md)
