# Multi-engine harness contract

Status: done

Module: [Core Architecture Contracts (M0)](../00-core-architecture.md)

Description:
Desync detection requires running two engine instances side by side
and comparing state hashes after each command. The engine's purity
makes this implicitly possible — but only if every shared global,
module-level singleton, or hidden cache is forbidden. This task pins
the `createEngine()` factory contract and a canonical desync test
fixture so engine implementers cannot accidentally introduce hidden
non-purity.

Source audit:
[`docs/readiness-audit/01-core-architecture.md`](../../../docs/readiness-audit/01-core-architecture.md)
(Q20, Issue 3.A-3).

Read First:
- [`docs/implementation-plans/01-core-architecture-plan.md`](../../../docs/implementation-plans/01-core-architecture-plan.md)
- [`docs/architecture/state-shape.md`](../../../docs/architecture/state-shape.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- Audit Q20 in
  [`docs/readiness-audit/01-core-architecture.md`](../../../docs/readiness-audit/01-core-architecture.md)
- `GameState` shape from `state-shape.md`

Outputs:
- `docs/architecture/multi-engine-harness.md`
- "Multi-engine harness" entry in `glossary.md`
- Cross-links from `state-flow.md` boundary table and
  `determinism.md` step-6 fuzz-harness section

Owned Paths:
- `docs/architecture/multi-engine-harness.md`

Dependencies:
- mvp.00-core-architecture.arch-state-shape

Acceptance Criteria:
- `multi-engine-harness.md` documents the `createEngine()` factory
  contract: no globals, no module-level singletons, no shared mutable
  caches, no `Math.random` / `Date.now` / `performance.now`, no I/O.
- The doc shows a canonical desync-detection pseudocode pattern that
  applies the same command stream to two engines and compares
  `Engine.hash()` per step.
- A "Prohibited Patterns" list flags module-level mutable bindings,
  singletons, and Map/Set iteration without an explicit order.
- `glossary.md` has a "multi-engine harness" entry pointing to the
  new file.
- `determinism.md` cross-links the new doc from its fuzz-harness
  bullet.

Verify:
- npm run validate

Estimated Time:
- 2 hours
