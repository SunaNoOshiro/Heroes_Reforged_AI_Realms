# Game State Flow

One diagram, one pass of the turn loop. This file pins down how the
engine, content runtime, and UI hand off state during a single
player turn so that new contributors (and AI agents) can read the
flow without tracing through task docs.

## High-Level Loop

```mermaid
flowchart TD
    A([boot]) --> B[load content packs]
    B --> C{pack hashes match save?}
    C -- no --> C1[fail loud: contentHash mismatch]
    C -- yes --> D[hydrate game state from save or scenario]
    D --> E[enter adventure turn]
    E --> F{player action?}
    F -- move hero --> G[dispatch MoveCommand]
    F -- visit town --> H[dispatch TownCommand]
    F -- engage stack --> I{auto-resolve?}
    I -- yes --> J[dispatch AutoResolveCommand]
    I -- no --> K[enter tactical battle]
    K --> L[tactical turn loop]
    L --> M{battle end?}
    M -- no --> L
    M -- yes --> N[dispatch BattleResolvedCommand]
    G --> O[command dispatcher]
    H --> O
    J --> O
    N --> O
    O --> P[apply reducer: state' = apply state, command]
    P --> Q[append to command log]
    Q --> R[recompute xxh64 state hash]
    R --> S{end of turn?}
    S -- no --> F
    S -- yes --> T[advance day counter]
    T --> U[run daily income + growth]
    U --> V{end of player cycle?}
    V -- no --> E
    V -- yes --> W[next player]
    W --> E
```

## Boundary Responsibilities

| Boundary | Owned by | Notes |
|---|---|---|
| Content load + validation | [`src/content-runtime/`](../../src/content-runtime/) | Manifest resolution, dependency graph, pack-hash pin |
| State hydration | [`src/engine/`](../../src/engine/) | Replay from command log OR initialize from scenario |
| Command queue | [`src/engine/`](../../src/engine/) | Bounded FIFO per engine instance; dedups by nonce. See [`command-schema.md` § Dispatcher Queue](./command-schema.md#dispatcher-queue). |
| Command dispatch | [`src/engine/`](../../src/engine/) | Pure reducer; no I/O, no timing. Cross-actor ordering rule in [`command-schema.md` § Cross-Actor Ordering](./command-schema.md#cross-actor-ordering). |
| Multi-engine desync detection | [`src/engine/`](../../src/engine/) test harness | Two `createEngine()` instances apply the same log; hashes compared per step. See [`multi-engine-harness.md`](./multi-engine-harness.md). |
| Formula evaluation | [`src/rules/`](../../src/rules/) | AST walker over the formula schema |
| Tactical battle step | [`src/engine/`](../../src/engine/) | Nested reducer with its own command alphabet |
| Rendering (read-only) | [`src/renderer/`](../../src/renderer/) | Subscribes to state; never mutates |
| UI shell | [`src/ui/`](../../src/ui/) | Emits commands; never mutates state directly |

The arrow from `F → O` is the only path state changes take.
Rendering reads state; the UI emits commands; the engine owns the
reducer. No other mutation path exists.

## Why the loop looks this way

- **Command log = source of truth.** Replays, multiplayer lockstep,
  and desync detection all pin on `(seed, content hashes, command
  log)`. Removing state mutation outside the dispatcher is what
  keeps that triple canonical.
- **Tactical battle is nested, not forked.** Stepping into a battle
  doesn't branch control flow; it enters an inner reducer that
  eventually emits one `BattleResolvedCommand` back up. Save/replay
  works identically whether or not a tactical battle was fought.
- **Auto-resolve and real combat share the same formulas.** The
  `I → J` short-cut runs the same `attackBonus` and `defenseMitigation`
  AST (from [`baseline.ruleset.json`](../../content-schema/examples/records/rulesets/baseline.ruleset.json))
  that the tactical loop uses per strike. One ruleset edit, not two
  code paths.

## Renderer + UI Subscription Cadence

The reducer is event-driven; the renderer is frame-driven. Both
subscribers read the same Zustand store but on different cadences.
Pinned in [`ui-technology-choice.md` § State Binding](./ui-technology-choice.md#state-binding)
and detailed at the WebGL/DOM seam in
[`ui-renderer-seam.md`](./ui-renderer-seam.md).

```mermaid
flowchart LR
    Cmd["Command dispatched"] --> Reducer["Engine reducer (pure)"]
    Reducer --> Store["Zustand store: state'"]
    Store --> DOM["DOM components<br/>(selector subscription)"]
    Store -.read once per frame.-> RAF["renderer rAF loop"]
    RAF --> GL["WebGL2 frame render"]
    DOM --> Paint["Browser paint"]
```

- DOM components wake only when the slice they observe changed.
  Selectors are pure; equality defaults to shallow.
- WebGL viewport reads `store.getState()` once per `requestAnimationFrame`.
  It never subscribes through React.
- Lag bounds, optimistic UI, and lockstep behavior are pinned in
  [`ui-frame-lag-contract.md`](./ui-frame-lag-contract.md).

## Command Lifecycle (UI side)

A user gesture flows through four UI-visible phases — drafting,
pending confirmation, applied, animating — pinned in
[`ui-state-contract.md` § Command Lifecycle](./ui-state-contract.md#command-lifecycle).
Turn-affecting commands are gated by
`state.ui.animations.activeTimelineId` per
[`ui-input-arbitration.md` § Animation Gate](./ui-input-arbitration.md#animation-gate);
the dispatcher rejects them while the slot is non-null so renderer
animations cannot lap the reducer.

## Related docs

- [`determinism.md`](./determinism.md) — why this loop is pure
- [`effect-registry.md`](./effect-registry.md) — what commands may produce
- [`pack-contract.md`](./pack-contract.md) — how packs enter at step B
- [`ui-technology-choice.md`](./ui-technology-choice.md) — DOM-side framework + selectors
- [`ui-renderer-seam.md`](./ui-renderer-seam.md) — DOM/WebGL seam
- [`ui-frame-lag-contract.md`](./ui-frame-lag-contract.md) — UI lag bounds
- [`ui-state-contract.md`](./ui-state-contract.md) — command lifecycle, selector purity, component-state matrix
- [`ui-input-arbitration.md`](./ui-input-arbitration.md) — single-emit, Esc ladder, animation gates
- [`ui-routing.md`](./ui-routing.md) — screen-router FSM and modal stack
- [`animation-contract.md`](./animation-contract.md) — two-clock model, DAMAGE_FRAME ownership, gameplay-vs-visual state table
