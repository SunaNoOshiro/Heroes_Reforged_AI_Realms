# Coverage Policy

Per-module line + branch coverage thresholds enforced by
`npm run test:coverage`. CI fails on any threshold violation; the
gate landed in
[`tasks/mvp/02-tooling/02-coverage-gate.md`](../../../tasks/mvp/02-tooling/02-coverage-gate.md)
and is wired into
[`tasks/mvp/01-engine-core/10-github-actions-ci.md`](../../../tasks/mvp/01-engine-core/10-github-actions-ci.md)
between `npm test` and the determinism fuzz step.

## Thresholds

| Module | Lines | Branches | Rationale |
|---|---|---|---|
| `src/engine/**` | 90 % | 85 % | Determinism stack — every code path must be exercised; a missed branch is a determinism leak waiting to happen. |
| `src/rules/**` | 90 % | 85 % | Formula evaluator is data; every operator (`add`, `sub`, `mul`, `divFloor`, `ratio`, `min`, `max`, `clamp`, `neg`, `abs`) must have a unit test, and the property-based suite covers the input space. |
| `src/content-runtime/**` | 80 % | 70 % | Pack loading and override resolution. Schema validation already covers shape; coverage targets the resolver, dependency graph walk, and override precedence logic. |
| `src/persistence/**` | 80 % | 70 % | Save/replay/scenario loaders. Migrations get explicit fixtures; coverage prevents a migration ship without at least one round-trip. |
| `src/ai/**` | 70 % | 60 % | Heuristic drift is hard to test by line count; the AI tournament harness covers behavioral regressions. The threshold guards against shipping an AI module with zero tests. |
| `src/net/**` | 80 % | 70 % | Lockstep / hash-exchange / reconnection / host-migration transports. The chaos harness covers behavioral coverage; line coverage guards branch-table omissions. |
| `src/ui/**` | smoke only | smoke only | The UI smoke contract is the binding test. Coverage here would penalize component composition and bias toward over-tested presentation. |

Thresholds are calibrated against the audit's own recommendations
([`docs/readiness-audit/15-testability.md`](../../readiness-audit/15-testability.md)
Q259) and pinned in `vitest.config.ts` under the canonical `coverage`
block.

## Tightening Policy

Thresholds may only be **raised**, never lowered, without an audit
update. A PR that lowers a threshold is rejected. New modules adopt
the same threshold as their nearest sibling unless this file is
updated first.

## Tooling

The coverage provider is the c8 backend bundled with Vitest; no extra
dependency is needed. CI emits a JSON summary at
`coverage/summary.json`. The README badge cited by
[`tasks/mvp/01-engine-core/10-github-actions-ci.md`](../../../tasks/mvp/01-engine-core/10-github-actions-ci.md)
reads the engine + rules combined coverage and renders it as the top-
level coverage badge; per-module bars are surfaced inside the
PR comment authored by the bench-and-coverage reporter script.

## Exclusions

- Generated files: `dist/**`, `**/*.d.ts`, `**/__generated__/**`.
- Test files themselves: `**/__tests__/**`, `**/*.test.ts`.
- Configuration: `vite.config.ts`, `vitest.config.ts`,
  `tsconfig*.json`.
- Editor-only scaffolds tagged `// coverage-ignore-file:` at file top
  with a one-line justification (CI lints that the justification is
  present and non-empty).

## Rationale Per Module

- **engine + rules at 90 % / 85 %.** These modules carry the
  deterministic-state contract. A missed code path is the most likely
  source of a future replay-divergence bug. Property tests cover the
  formula evaluator's input space; line coverage covers the operator
  table itself.
- **content-runtime + persistence at 80 % / 70 %.** Schema validation
  catches most shape errors at load time. The remaining 20 % is the
  resolution and migration logic that schemas cannot express.
- **ai at 70 % / 60 %.** AI heuristics drift by design; behavioral
  regressions are the AI tournament harness's job. Coverage guards
  against a whole AI submodule shipping with zero tests, which is the
  failure mode the audit flagged.
- **net at 80 % / 70 %.** Lockstep / reconnection / host-migration
  branch tables are the failure mode where untested code paths cause
  production-only desync. Chaos covers behavior; coverage guards the
  table.
- **ui at smoke-only.** The UI smoke contract is the load-bearing
  signal here. Forcing line coverage on UI penalizes component
  composition.
