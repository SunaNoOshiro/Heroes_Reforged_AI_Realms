# Module: Test & Tooling Contracts (M0)

Cross-cutting test infrastructure that pins the contracts every
module above the deterministic engine layer must satisfy. Each task
in this module turns one of the gaps named in
[`docs/readiness-audit/15-testability.md`](../../docs/readiness-audit/15-testability.md)
into an enforceable runner, doc, or CI step.

This module exists for the same reason `00-perf` exists: the
contracts span engine, rules, content-runtime, ai, net, persistence,
and ui, so dropping them inside any one module would couple them.
The runners and the policy docs ship together so a UI task, an AI
eval task, and a persistence migration task all hit the same gates.

Source plan:
[`docs/implementation-plans/15-testability-plan.md`](../../docs/implementation-plans/15-testability-plan.md).
Source audit:
[`docs/readiness-audit/15-testability.md`](../../docs/readiness-audit/15-testability.md).

**Milestone**: M0 — Test contract foundation
**Total Estimate**: ~17 hours
**Exit Criteria**: `npm run test:ui-smoke`, `npm run test:coverage`,
property-test pattern, edge-case fixture catalogue, and per-module
unit-test rubric all wired into CI before any Phase-2 UI screen task
or AI eval task lands.

---

## Task Files

- [01-ui-smoke-harness.md](02-tooling/01-ui-smoke-harness.md)
  🤖 Task 1: UI smoke harness — `vitest --browser` per-screen contract (~5h)
- [02-coverage-gate.md](02-tooling/02-coverage-gate.md)
  🤖 Task 2: Coverage gate — per-module thresholds + CI gate (~3h)
- [03-unit-test-contract.md](02-tooling/03-unit-test-contract.md)
  🤖 Task 3: Unit-test contract — DI seams, canonical fakes, rubric (~3h)
- [04-property-based-testing.md](02-tooling/04-property-based-testing.md)
  🤖 Task 4: Property-based testing — `fast-check` invariants (~3h)
- [05-edge-case-fixtures.md](02-tooling/05-edge-case-fixtures.md)
  🤖 Task 5: Edge-case scenario fixtures (~3h)
