# Side-Effect Matrix

> Sister docs:
> [`determinism.md`](./determinism.md) (what is forbidden in
> deterministic paths) and
> [`state-flow.md`](./state-flow.md) (which boundaries can do I/O).

This file is the per-`src/<module>` ledger of side effects. For every
top-level module under `src/`, it answers:

- **Purity** — pure / boundary / impure.
- **Permitted side effects** — concrete list (specific APIs, not
  categories).
- **Forbidden in this module** — concrete list of escape hatches that
  must not appear here.
- **Enforced by** — the script, lint rule, or test that catches
  violations.

The matrix is the readable companion of
[`module-graph.md`](./module-graph.md) (which restricts edges) and the
boundary table in [`state-flow.md`](./state-flow.md) (which restricts
data direction).

## Purity legend

- **pure** — no observable side effects; same input → same output;
  uses no `Date.now()`, `Math.random()`, network, storage, or DOM.
- **boundary** — owns a small, audited set of side effects at a system
  edge (storage, network, DOM, asset fetch). Tests target the
  boundary so that downstream consumers can stay pure.
- **impure** — concentrates user-visible side effects (DOM mutation,
  audio output, frame submission). Always pinned by a boundary
  contract upstream.

## Matrix

| Module | Purity | Permitted side effects | Forbidden in this module | Enforced by |
|---|---|---|---|---|
| [`src/contracts/`](../../src/contracts/) | pure (types-only) | None — type definitions and shared interfaces only. | Runtime values, `import` of non-type JS, network, storage, DOM. | TS `--noEmit` build; `npm run validate:arch`; package has no runtime deps. |
| [`src/content-schema/`](../../src/content-schema/) | pure | Read-only JSON-Schema documents; pure validators and migrators. | Network, storage, DOM, `Date.now()`, `Math.random()`, dynamic `import()`. | `npm run validate:contracts`, `npm run validate:enums`. |
| [`src/rules/`](../../src/rules/) | pure | Pure AST walkers over formulas; pure mathematical helpers (fixed-point integer math). | `Math.random()`, `Date.now()`, network, storage, DOM, dynamic `import()`. | `npm run validate:arch` (rules ⇏ engine/renderer/ui/etc.); engine fuzz harness; multi-engine harness. |
| [`src/engine/`](../../src/engine/) | pure (reducer) | Receive commands, emit events to an in-memory event log, return new immutable state. Seeded RNG and frame-counter clock are *injected*, not read directly. | `Date.now()`, `performance.now()`, `Math.random()`, `crypto.randomUUID()`, network, storage, DOM, console output in production paths, `setTimeout`/`setInterval`, dynamic `import()`. | [`determinism.md`](./determinism.md); `scripts/check-no-wall-clock.mjs` (planned in `mvp.01-engine-core.11-no-wall-clock-lint`); engine fuzz + multi-engine harness; `npm run validate:arch`. |
| [`src/content-runtime/`](../../src/content-runtime/) | boundary | Read manifests and asset indices from disk or browser-bundled resources, parse JSON, resolve dependency graphs, compute content/asset hashes. Hot-reload re-runs the same loader path (see [`hot-reload-flow.md`](./hot-reload-flow.md)). | Mutating engine state, emitting commands, network calls outside the asset/manifest fetcher, blocking the deterministic dispatcher, DOM. | `npm run validate:arch`; `npm run validate:contracts` (manifest schema); pack-resolver tests. |
| [`src/persistence/`](../../src/persistence/) | boundary | `IndexedDB` / `localStorage` reads and writes for saves and replays; canonical-JSON serialization; quota-error handling per [`storage-policy.md`](./storage-policy.md). | Mutating engine state in place, emitting commands, network, DOM, `Date.now()` in serialization paths (timestamps come from injected clock). | `npm run validate:arch`; storage-policy tests; replay regression suite (`tasks/mvp/01-engine-core/13-replay-regression-suite.md`). |
| [`src/net/`](../../src/net/) | boundary | WebRTC data channel I/O via the `NetTransport` contract; lockstep step exchange; nonce dedup; signaling-server requests. The deterministic `NetSim` test transport satisfies the same contract. | Mutating engine state in place, calling renderer, calling UI, reading wall-clock time outside of injected clock, DOM. | `npm run validate:arch`; [`net-transport.md`](./net-transport.md); network chaos harness (`tasks/phase-3/01-multiplayer/12-network-chaos-harness.md`). |
| [`src/renderer/`](../../src/renderer/) | impure | WebGL2 calls, `requestAnimationFrame` scheduling, GPU resource allocation, atlas binding. Reads engine state via store snapshots; never writes back. | Mutating engine state, dispatching commands, persistent storage, network, `Math.random()`, `Date.now()` outside of frame-time measurement helpers. | `npm run validate:arch` (renderer ⇏ engine); [`ui-renderer-seam.md`](./ui-renderer-seam.md); per-frame budget tests in `mvp.00-perf`. |
| [`src/ui/`](../../src/ui/) | impure | DOM mutation via React, audio playback, clipboard, gamepad/keyboard listeners, fullscreen requests, `localStorage` for UI prefs only (gameplay saves go through `src/persistence/`). | Mutating engine state directly, calling renderer internals, `Math.random()` in selectors, `Date.now()` in selectors (selectors are pure). | `npm run validate:arch`; [`ui-state-contract.md`](./ui-state-contract.md) (selector purity); UI smoke harness (`tasks/mvp/02-tooling/01-ui-smoke-harness.md`). |
| [`src/ai/`](../../src/ai/) | boundary | Web-Worker boundary calls per [`ai-contract.md`](./ai-contract.md); seeded RNG read via injected source; provider-backed content generation through [`ai-integration.md`](./ai-integration.md). | Mutating engine state, emitting commands without the dispatcher, reading wall-clock time outside the per-turn budget timer, network calls outside the configured BotProvider. | `npm run validate:arch`; AI tournament harness; `npm run validate:contracts` for provider-neutral planning text. |
| [`src/editor/`](../../src/editor/) | boundary | DOM, file-system pickers (browser File API), drag-and-drop, asset import pipelines, undo/redo via [`ui-state-contract.md`](./ui-state-contract.md). | Mutating engine runtime state, dispatching gameplay commands, reading or writing saves outside the editor's own scratch storage. | `npm run validate:arch`; editor unit tests (planned). |

## Adding a new module

1. Add a top-level folder under `src/` and add it to
   [`module-graph.md`](./module-graph.md) (allowed/forbidden edges).
2. Add a row to the matrix above with all four columns filled.
3. Wire the "Enforced by" entry to a real check
   (`npm run validate:arch`, a fuzz harness, a smoke test, etc.).
4. Run `npm run validate` to confirm cross-references resolve.

`scripts/check-cross-references.mjs` enforces that every `src/<module>/`
folder has a row here. CI fails if a folder lands in `src/` without a
matching row.

## Verified by

- [`scripts/check-module-graph.mjs`](../../scripts/check-module-graph.mjs)
  — refuses cross-layer imports.
- [`scripts/check-cross-references.mjs`](../../scripts/check-cross-references.mjs)
  — refuses a `src/<module>/` directory that has no row in this matrix.
- [`scripts/check-repo-contracts.mjs`](../../scripts/check-repo-contracts.mjs)
  — refuses bare placeholder markers in canonical sources, so this
  matrix can never decay back to a placeholder marker.
