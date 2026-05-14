# Coverage Policy

Per-module line + branch coverage floors. The floors live in
[`scripts/lib/module-classes.mjs`](../../../scripts/lib/module-classes.mjs)
(the single source of truth) and are enforced per task by
[`scripts/validate-coverage-floor.mjs`](../../../scripts/validate-coverage-floor.mjs)
during `npm run tasks:done`. The gate is the anti-cheat counterpart
of the mutation-score gate: it catches "no tests at all" (where
mutation-score on zero mutants vacuously passes) and "I deleted the
line that had a surviving mutant" (a no-regression check against
`reports/coverage/.baseline.json`).

> Companion specs:
> [`testing-conventions.md` § 9](../testing-conventions.md),
> [`testing/unit-test-contract.md`](./unit-test-contract.md),
> [`testing/ui-smoke-contract.md`](./ui-smoke-contract.md),
> [`testing/ai-tournament-harness.md`](./ai-tournament-harness.md).
>
> Owning tasks: floors-as-code by
> [`mvp.02-tooling.02-coverage-gate`](../../../tasks/mvp/02-tooling/02-coverage-gate.md);
> paired mutation-score gate by
> [`mvp.02-tooling.06-mutation-test-gate`](../../../tasks/mvp/02-tooling/06-mutation-test-gate.md);
> CI wiring (between `npm test` and the determinism fuzz step) by
> [`mvp.01-engine-core.10-github-actions-ci`](../../../tasks/mvp/01-engine-core/10-github-actions-ci.md).

---

## 1. Floors

Class assignments and floor values are sourced from
[`scripts/lib/module-classes.mjs`](../../../scripts/lib/module-classes.mjs).
A new module class (e.g. `src/audio/`) lands in that one file and
both the coverage gate and the paired mutation-score gate pick it up
without further edits.

| Class | Path prefix | Lines | Branches |
|---|---|---|---|
| `engine` | `src/engine/**` | 90 % | 80 % |
| `rules` | `src/rules/**` | 90 % | 80 % |
| `content-schema` | `src/content-schema/**` | 90 % | 80 % |
| `content-runtime` | `src/content-runtime/**` | 90 % | 80 % |
| `net` | `src/net/**` | 90 % | 80 % |
| `shared` | `src/shared/**` | 90 % | 80 % |
| `contracts` | `src/contracts/**` | 80 % | 70 % |
| `services` | `services/**` | 80 % | 70 % |
| `ui` | `src/ui/**` | 70 % | 60 % |
| `renderer` | `src/renderer/**` | 70 % | 60 % |
| `default` (any unclassified path) | — | 75 % | 65 % |

The mutation-score floors paired with each class live in the same
file and are documented in
[`testing-conventions.md` § 9](../testing-conventions.md#9-locked-runner--mutation-gate-values-2026-05-06).

## 2. Tightening policy

Floors may only be **raised**, never lowered, without an explicit
audit update. A PR that lowers a value in
[`scripts/lib/module-classes.mjs`](../../../scripts/lib/module-classes.mjs)
or relaxes a class boundary is rejected. A new module adopts its
nearest-sibling class until both this file and `module-classes.mjs`
are updated together.

## 3. Tooling

- **Provider.** `v8` (the V8-coverage backend bundled with Vitest
  4.x), declared in
  [`vitest.config.ts`](../../../vitest.config.ts) under
  `test.coverage.provider`. No extra dependency.
- **Reporters.** `json-summary`, `json`, `html`, `text-summary`. The
  per-file totals emitted at
  `reports/coverage/coverage-summary.json` are the input that
  `scripts/validate-coverage-floor.mjs` reads.
- **Baseline.** `reports/coverage/.baseline.json` is updated
  automatically every time the gate passes for a file. Subsequent
  runs assert no regression in line count or covered-line count for
  the file. This is what distinguishes "killed a mutant via
  assertion" from "killed a mutant by deleting the source line."
- **Invocation.** `npm run test:coverage` (`vitest run --coverage`)
  produces the summary; `npm run tasks:done` invokes the per-task
  validator that compares each owned file's class floor against the
  summary and the baseline.

## 4. Exclusions

Configured in `vitest.config.ts` under the `coverage` block:

- `coverage.include = ["src/**/*.ts"]` — only runtime source is
  measured. Repo-root configs (`vite.config.ts`, `vitest.config.ts`,
  `tsconfig*.json`) and `scripts/**` are outside the include glob.
- `coverage.exclude = ["**/__tests__/**", "**/fixtures/**", "**/*.d.ts"]`
  — test files, shared fixtures, and type-only declarations
  contribute no production behaviour.

A file with no production behaviour that would otherwise drag a
class's covered-line count down must justify its presence in source
in code review; the gate offers no inline opt-out (no
`// coverage-ignore-file:` tag, no per-file `// istanbul ignore`).
The presence of such a marker in a PR is rejected by review.

## 5. Rationale per class

- **`engine` / `rules` / `content-schema` / `content-runtime` /
  `net` / `shared` at 90 % / 80 %.** These modules carry — or feed —
  the deterministic-state contract. A missed code path is the most
  likely source of a future replay-divergence or production-only-
  desync bug. The formula evaluator's operator table (`add`, `sub`,
  `mul`, `divFloor`, `ratio`, `min`, `max`, `clamp`, `neg`, `abs`)
  is unit-tested operator-by-operator; the property-based suite
  covers the input space. Pack loading, override resolution, and
  the lockstep / hash-exchange / reconnection / host-migration
  transports are all in this class because schema validation
  catches shape, not control flow.
- **`contracts` / `services` at 80 % / 70 %.** Cross-module contract
  surfaces (`src/contracts/`) and backend adapters (signaling, AI
  gateway). Schema validation already covers shape; coverage
  targets the resolution and adapter logic schemas cannot express.
- **`ui` / `renderer` at 70 % / 60 %.** Presentation tier. Line
  coverage is noisier here (snapshot tests, DOM-event sequencing).
  For `src/ui/`, the binding signal is the
  [`UI smoke contract`](./ui-smoke-contract.md); for
  `src/renderer/`, the binding signal is the frame-budget guard
  under the perf milestone. The lower line/branch floor exists so
  a screen or renderer module with zero unit tests still fails the
  gate.
- **Behavioural AI regressions** ride on the
  [`AI tournament harness`](./ai-tournament-harness.md), not on
  line-coverage thresholds — heuristic drift is hard to test by
  line count.

## 6. Relationship to the mutation-score gate

Coverage and mutation-score are paired gates owned by
[`mvp.02-tooling.06-mutation-test-gate`](../../../tasks/mvp/02-tooling/06-mutation-test-gate.md):

- **Mutation-score** is the primary signal — it catches "the test
  executes the line but never asserts on the output."
- **Coverage** is the floor — it catches "no test exists at all"
  and "I deleted the line that had a surviving mutant" (via the
  baseline-regression check above).

Both gates source class floors from
[`scripts/lib/module-classes.mjs`](../../../scripts/lib/module-classes.mjs);
they can never disagree about which class a file belongs to.
Anti-cheat rules (no source deletion, no assertion softening, no
threshold lowering, no silent excludes, no unjustified
`// Stryker disable`) live in
[`.claude/skills/mutation-test/SKILL.md`](../../../.claude/skills/mutation-test/SKILL.md).

---

## 🔍 Sync Check

- **UI: ✔** — Doc carries no UI surface claims; the screen-level signal it cites is the [`UI smoke contract`](./ui-smoke-contract.md), which it points at rather than restates.
- **Schema: ✔** — No schema claims. Class floors trace to the lookup table in [`scripts/lib/module-classes.mjs`](../../../scripts/lib/module-classes.mjs), matching [`testing-conventions.md` § 9](../testing-conventions.md#9-locked-runner--mutation-gate-values-2026-05-06).
- **Tasks: ⚠** — Owning task [`mvp.02-tooling.02-coverage-gate`](../../../tasks/mvp/02-tooling/02-coverage-gate.md) is still `planned` in [`tasks/task-status.json`](../../../tasks/task-status.json) and its own description names the pre-2026-05-06 threshold list (`engine ≥ 90 %, rules ≥ 90 %, content-runtime ≥ 80 %, persistence ≥ 80 %, net ≥ 80 %, ai ≥ 70 %, ui smoke-only`) plus a `vitest.config.ts` threshold-map deliverable. The runtime today enforces floors per task via `validate-coverage-floor.mjs` against `module-classes.mjs`; the task description is what needs updating, not this doc.

## ⚠ Issues

- **Threshold-table drift corrected in-place.** Original target listed engine/rules at 90 % / **85 %** branches, `content-runtime`/`persistence` at 80 % / 70 %, `net` at 80 % / 70 %, `ai` at 70 % / 60 %, and `ui` as smoke-only. The canonical source [`scripts/lib/module-classes.mjs`](../../../scripts/lib/module-classes.mjs) — named as authoritative by [`testing-conventions.md` § 9](../testing-conventions.md#9-locked-runner--mutation-gate-values-2026-05-06) — declares engine/rules/content-schema/content-runtime/net/shared at 90 % / **80 %**, contracts/services at 80 % / 70 %, and ui/renderer at 70 % / 60 % (no `persistence` or `ai` class — both fall through to `DEFAULT_CLASS` at 75 % / 65 %). Per the doc-audit Option A (rewrite when the target is wrong and the rest of the system is consistent), the table now mirrors `module-classes.mjs`. No cross-checked file was edited.
- **Owning task description is stale.** [`tasks/mvp/02-tooling/02-coverage-gate.md`](../../../tasks/mvp/02-tooling/02-coverage-gate.md) still names the pre-drift threshold list and the `vitest.config.ts` threshold-map deliverable that did not land (the implementation route landed in `scripts/lib/module-classes.mjs` + `scripts/validate-coverage-floor.mjs` instead). Per [`.agents/rules/tasks.md`](../../../.agents/rules/tasks.md), the task owner must reconcile the task `.md` against the canonical floors source before the task can flip to `done`. Suggested values: replace the threshold list in the task description with a reference to `scripts/lib/module-classes.mjs`; restate the deliverable as "pin the threshold table here and the matching class assignments in `module-classes.mjs`."
- **`src/persistence/`, `src/ai/`, `src/editor/` are not classified in `module-classes.mjs`.** All three directories exist under `src/` but have no matching entry in [`scripts/lib/module-classes.mjs`](../../../scripts/lib/module-classes.mjs); every file in them currently lands at `DEFAULT_CLASS` (lines 75 % / branches 65 %). For `src/persistence/` (carrying save/replay/migration logic) and `src/ai/` (carrying the worker entry points referenced by [`testing-conventions.md` § 3](../testing-conventions.md#3-mocking-policy) and [`unit-test-contract.md`](./unit-test-contract.md)), the implicit DEFAULT floor is lower than the per-module intent the prior version of this doc encoded. Per the same single-source-of-truth pattern, the gap must close in `module-classes.mjs` (not silently in this doc). Suggested values: `src/persistence/` and `src/ai/` at the deterministic-stack tier (lines 90 % / branches 80 %, mutation 80 %); `src/editor/` at the presentation tier (lines 70 % / branches 60 %, mutation 65 %). Owning task to amend: `mvp.02-tooling.02-coverage-gate` (the doc owner) coordinating with `mvp.02-tooling.06-mutation-test-gate`.
- **CI does not yet block on `test:coverage` thresholds.** [`mvp.01-engine-core.10-github-actions-ci`](../../../tasks/mvp/01-engine-core/10-github-actions-ci.md) lists `npm run test:coverage` as a CI step, but `vitest.config.ts` declares no `coverage.thresholds` block — `npm run test:coverage` today only produces the summary file; the floor check runs only inside `tasks:done`. None of the workflows under [`.github/workflows/`](../../../.github/workflows/) call `validate:coverage-floor`. CI enforcement is therefore honor-system at the workflow tier; the per-task gate inside `tasks:done` is the actual block. Closing requires either pinning thresholds in `vitest.config.ts` (the prior plan) or running `validate-coverage-floor.mjs` over the changed-files set inside CI. Owner: `mvp.02-tooling.02-coverage-gate`.
- **README coverage badge is unwired.** Original doc claimed "the README badge cited by `mvp.01-engine-core.10-github-actions-ci` reads the engine + rules combined coverage and renders it as the top-level coverage badge; per-module bars are surfaced inside the PR comment authored by the bench-and-coverage reporter script." Cross-check: `README.md` has no `coverage` token, and no `bench-and-coverage` reporter script exists under `scripts/`. The claim has been removed from the rewrite. Per the owning CI task, restoring it requires (a) a badge URL added to `README.md` and (b) either an existing reporter script or a tracked task to author one. Owner: `mvp.01-engine-core.10-github-actions-ci`.
