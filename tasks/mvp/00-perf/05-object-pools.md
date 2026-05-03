# Object pools (vectors, draw commands, AI nodes, VFX)

Status: planned

Module: [Performance Harness & Budgets (M1)](../00-perf.md)

Description:
Implement the four hot-path object pools declared in
[`performance.md` § 3 — Allocation Policy](../../../docs/architecture/performance.md#allocation-policy).
Each pool is a plain freelist with a fixed initial capacity and a
growth limit. Growth past the limit is a **bench-harness failure**
(Scenario A enforces this), not a silent allocation. Pools are
created at engine init and never freed.

The four pool kinds:

- **Hex-coordinate vectors** — used by the renderer per-frame
  culling pass. Initial capacity sized to the on-screen hex count
  at max zoom × 2.
- **Sprite draw-command objects** — one per visible animated
  tile. Initial capacity sized to the on-screen active animation
  ceiling (128 from the entity-ceiling table) × 2.
- **AI search nodes** — used by the threat-map BFS frontier and
  any other AI graph search. Initial capacity sized to one
  200×200 frontier scan.
- **Particle / VFX nodes** — initial capacity sized to "Active
  spells with persistent VFX" × 16 (32 × 16 = 512 per
  performance.md § 5).

The pool primitive lives in `src/engine/pool/` and is consumed by
both renderer and AI code (the only place this is allowed to
cross the `src/engine/` boundary in either direction is via a
small public type signature; see
[`module-graph.md`](../../../docs/architecture/module-graph.md)).

Read First:
- [`docs/architecture/performance.md`](../../../docs/architecture/performance.md)
- [`docs/architecture/module-graph.md`](../../../docs/architecture/module-graph.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- Engine root workspace
  (`mvp.01-engine-core.01-initialize-root-workspace-and-module-layout`).

Outputs:
- `src/engine/pool/index.ts` — `createPool<T>(opts)` primitive
  returning `{ acquire(): T, release(t: T): void, occupancy(): number }`.
- `src/engine/pool/vectors.ts` — hex-coordinate vector pool
  factory.
- `src/engine/pool/draw-commands.ts` — sprite draw-command pool
  factory.
- `src/engine/pool/ai-nodes.ts` — AI search-node pool factory.
- `src/engine/pool/vfx-nodes.ts` — particle / VFX pool factory.
- Pool occupancy selectors exposed for the profiling overlay
  (Task 4).

Owned Paths:
- `src/engine/pool/`

Dependencies:
- mvp.01-engine-core.01-initialize-root-workspace-and-module-layout

Acceptance Criteria:
- Each pool reaches steady-state occupancy on Scenario A without
  growing past its configured cap.
- Renderer per-frame culling pass uses the vector pool; no
  per-frame `{ q, r }` allocations measured by bench harness.
- AI threat-map BFS uses the AI-node pool; no per-frontier-step
  allocations.
- Pool growth past the cap throws in dev builds and emits a
  bench-harness assertion failure in CI.
- Pool primitive has no `Math.random()`, no `Date.now()`, no
  floats — passes the determinism lint.

Verify:
- npm run validate
- npm test

Estimated Time:
- 5 hours
