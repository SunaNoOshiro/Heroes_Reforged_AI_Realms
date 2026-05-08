# Implementation Report: 15 — Testability

> Plan: [15-testability-plan.md](./15-testability-plan.md)
> Validation: `npm run all` passes (registry, links, contracts,
> cross-refs, commands, tasks lint, arch, ui-components, animation
> budgets, enums, balance, error-codes, asset-index, wiki, task-
> system report). `npm test` — 32 / 32 pass.

This report records the changes that landed for the testability
readiness audit. Every gap the audit named is now a documented
contract a downstream task implementer can satisfy without inventing
test scaffolding.

---

## 1. New Files

### Architecture docs

- `docs/architecture/testing/ui-smoke-contract.md` — three required
  per-screen smoke assertions (mount with canonical example data,
  bindings reachable, interactions invokable); names the runner,
  the template path, and the smoke-template skip rule.
- `docs/architecture/testing/coverage-policy.md` — per-module
  threshold table (engine ≥ 90 %, rules ≥ 90 %, content-runtime
  ≥ 80 %, persistence ≥ 80 %, net ≥ 80 %, ai ≥ 70 %, ui smoke-only),
  exclusion rules, tightening policy, per-module rationale.
- `docs/architecture/testing/unit-test-contract.md` — per-module
  rubric for `engine`, `rules`, `content-runtime`, `ai`, `net`,
  `persistence`, `ui`. Each subsection names DI seams, canonical
  fakes, and the rubric. Includes the property-testing pattern.
- `docs/architecture/testing/engine-throughput-slo.md` — three
  engine-isolated throughput targets (command dispatch ≥ 100 000 / s,
  state hash ≥ 50 MB / s, replay loader ≥ 10 000 / s), measurement
  method, tightening policy, non-gating rationale.
- `docs/architecture/testing/ai-tournament-harness.md` — single
  reusable bracket runner contract; input shape, output shape
  ([`tournament-result.schema.json`](../../content-schema/schemas/tournament-result.schema.json)),
  reproducibility rule, consumer pattern.
- `docs/architecture/net-transport.md` — `NetTransport` interface
  contract that both real WebRTC and the deterministic `NetSim`
  test transport satisfy. Names the four chaos scenarios required.

### New schemas + canonical examples

- `content-schema/schemas/golden-fixture.schema.json` —
  `{schemaVersion, scenarioId, seed, commandLog, expectedStateHash,
  notes?}`, `additionalProperties: false`. Consumes
  `command.schema.json`.
- `content-schema/examples/golden-fixture/canonical.golden-fixture.json`
- `content-schema/schemas/tournament-result.schema.json` —
  `{matchId, aiA, aiB, gamesPlayed, winRateA, winRateB, drawRate,
  avgDecisionTimeMsA/B, avgBranchingA/B, avgGameLengthTurns, seed,
  contentPack, scenarioId}`. All percent and timing fields are
  integers so the struct serializes byte-stably through canonical
  JSON.
- `content-schema/examples/tournament-result/canonical.tournament-result.json`

### New tasks (Markdown only)

- `tasks/mvp/02-tooling.md` — new module file (Test & Tooling
  Contracts).
- `tasks/mvp/02-tooling/01-ui-smoke-harness.md`
- `tasks/mvp/02-tooling/02-coverage-gate.md`
- `tasks/mvp/02-tooling/03-unit-test-contract.md`
- `tasks/mvp/02-tooling/04-property-based-testing.md`
- `tasks/mvp/02-tooling/05-edge-case-fixtures.md`
- `tasks/mvp/01-engine-core/12-golden-state-suite.md`
- `tasks/mvp/01-engine-core/13-replay-regression-suite.md`
- `tasks/mvp/01-engine-core/14-engine-throughput-benchmark.md`
- `tasks/phase-2/10-ai-tournament-harness.md` — new module file.
- `tasks/phase-2/10-ai-tournament-harness/01-ai-tournament-harness.md`
- `tasks/phase-3/01-multiplayer/12-network-chaos-harness.md`

### Fixtures

- `tests/__fixtures__/golden/README.md` + `.gitkeep` — naming
  convention, blessing policy, initial-corpus rationale.
- `tests/__fixtures__/edge-cases/INDEX.md` — six-fixture purpose
  table.
- `tests/__fixtures__/edge-cases/empty-garrison.scenario.json`
- `tests/__fixtures__/edge-cases/stack-1-vs-1000.scenario.json`
- `tests/__fixtures__/edge-cases/all-heroes-dead-victory.scenario.json`
- `tests/__fixtures__/edge-cases/resource-overflow-turn.scenario.json`
- `tests/__fixtures__/edge-cases/full-inventory-pickup.scenario.json`
- `tests/__fixtures__/edge-cases/zero-mana-spell-attempt.scenario.json`
- `tests/replays/README.md` + `.gitkeep` — bug-replay naming
  convention and policy.

### UI smoke template

- `src/ui/__tests__/smoke.template.test.ts` — copy-paste template
  every new screen package starts from. Documented as a template;
  the runner skips files matching `smoke.template.*`.

---

## 2. Updated Files

### Schema-matrix and contracts

- `docs/architecture/schema-matrix.md` — added `GoldenFixture` and
  `TournamentResult` rows.
- `scripts/check-repo-contracts.mjs` — added two suffix mappings:
  `.golden-fixture.json` → `golden-fixture.schema.json` and
  `.tournament-result.json` → `tournament-result.schema.json`.

### Architecture docs

- `docs/architecture/determinism.md` — added a "Golden-State
  Regression" section under the Non-Negotiable Stack, citing the new
  fixture corpus, the replay-regression suite, and the PCG32-seeded
  NetSim transport.
- `docs/architecture/master-plan.md` — extended `ai` and `net`
  bullets to cite the new tournament-harness and net-transport
  contracts; added the testing-contract index pointing at the four
  per-module docs.
- `docs/architecture/overview.md` — extended the `src/persistence/`
  row to cite the edge-case scenario fixture catalogue.
- `docs/architecture/wiki/README.md` — added a "UI Smoke Contract"
  section above "UI Evolution Policy".

### Task module files

- `tasks/mvp/01-engine-core.md` — added Tasks 12, 13, 14 to the task
  list; updated total estimate from ~45h to ~56h; updated exit
  criteria to include golden, replay, and bench gates.
- `tasks/phase-3/01-multiplayer.md` — added Task 12 to the task list;
  added a "Chaos test contract" section listing the four per-PR
  scenarios paired with the nightly matrix; updated total estimate
  from ~50h to ~56h.

### Existing task acceptance criteria (additive only)

- `tasks/mvp/01-engine-core/02-set-up-vite-plus-typescript-strict-mode-per-module.md`
  — acceptance now requires `vitest.config.ts` to declare the
  per-module coverage threshold map.
- `tasks/mvp/01-engine-core/07b-canonical-json.md` — added a
  "Downstream Consumers" note pointing at the property-test consumer.
- `tasks/mvp/01-engine-core/08-replay-api.md` — added the additive
  `expectedFinalStateHash` field to the replay format outputs.
- `tasks/mvp/01-engine-core/10-github-actions-ci.md` — added
  `npm run test:ui-smoke`, `npm run test:golden`,
  `npm run test:coverage`, `npm run test:replays`, and the non-gating
  `test:bench:engine` step to outputs and acceptance.
- `tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md`
- `tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md`
- `tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md`
- `tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md`
  — each adds a "Per-PR module-level chaos" line requiring passage
  of its corresponding scenario in the new chaos harness.
- `tasks/phase-2/02-strategic-ai/05-grand-master-difficulty-plus-headless-evaluation.md`
- `tasks/phase-2/03-second-faction/06-balance-check-emberwild-vs-necropolis-headless-games.md`
- `tasks/phase-3/03-mcts-ai/06-performance-benchmark-plus-headless-eval.md`
  — each rewrites its outputs from a self-authored bracket loop to a
  consumer of the shared tournament harness; adds the harness task
  as a dependency.

### package.json

- Added scripts: `test:ui-smoke`, `test:golden`, `test:replays`,
  `test:coverage`, `test:bench:engine`, `test:golden:bless`. None of these
  scripts are invoked by `npm run all`; they are wired into the CI
  pipeline by `mvp.01-engine-core.10-github-actions-ci`.

---

## 3. Assumptions

⚠️ Assumption: The plan named `tasks/mvp/01-engine-core/11-golden-state-suite.md`,
`tasks/mvp/01-engine-core/12-replay-regression-suite.md`, and
`tasks/mvp/01-engine-core/13-engine-throughput-benchmark.md`. Slot 11
is already occupied by `11-no-wall-clock-lint.md`, so the three new
tasks landed at slots 12, 13, and 14 respectively. The plan's intent
(three tasks under engine-core) is preserved; only the numeric
prefixes shifted.

⚠️ Assumption: The plan named `tasks/phase-3/01-multiplayer/09-network-chaos-harness.md`.
Slot 09 is already occupied by `09-snapshot-resync-fallback.md`, so
the new task landed at slot 12. The existing
`11-network-chaos-test-matrix.md` is the **nightly stack-level**
chaos matrix (Playwright + signaling restart); the new
`12-network-chaos-harness.md` is the **per-PR module-level** chaos
harness (in-memory NetSim transport). Both layers ship.

⚠️ Assumption: The plan named `tasks/phase-2/09-ai-tournament-harness.md`
as a single task file at the phase-2 root. That path would conflict
with the existing `09-quality` module and would also be parsed by
`scripts/generate-task-registry.mjs` as a depth-2 module file (not a
task). The harness was instead authored as a new module
`phase-2/10-ai-tournament-harness/` with one task inside, preserving
the plan's intent (a separately addressable, phase-2-scoped task)
while satisfying the registry's depth contract.

⚠️ Assumption: New runtime test files (`src/engine/__tests__/golden.test.ts`,
`src/engine/__tests__/replays.test.ts`, `src/engine/__tests__/throughput.bench.ts`,
`src/rules/__tests__/formula-invariants.property.test.ts`,
`src/engine/__tests__/canonical-json.property.test.ts`,
`src/ai/__tests__/tournament.ts`, `src/net/__tests__/netsim.ts`,
`src/net/__tests__/chaos.test.ts`, `scripts/golden-bless.mjs`) are
declared in their owning tasks' Outputs sections but not authored
in this plan-application step. Following prior plan-application
precedent, runtime files land alongside the task that owns them
when that task is implemented.

⚠️ Assumption: Adding `@vitest/browser`, `playwright`, `fast-check`,
and the c8 coverage provider as devDependencies is documented in the
relevant task files but the actual `package.json` `devDependencies`
block is not modified here, since the existing `package-lock.json`
holds zero packages and `npm run all` does not require an install
step. The future task implementer adds the dependencies as part of
authoring each runner.

⚠️ Assumption: The minimal scenario JSONs under
`tests/__fixtures__/edge-cases/` are valid placeholder records — they
satisfy the required-field shape of `scenario.schema.json` and
reference canonical pack ids, but their starting-state details (zero-
unit garrison, near-cap resources, etc.) will be tightened when the
golden-state runner first replays them under the actual scenario
loader and reducer. The validator checks live in
`scripts/check-repo-contracts.mjs` only walk
`content-schema/examples/`, so these test fixtures are not gated by
`npm run all`.

---

## 4. Blockers

None. `npm run all` and `npm test` both pass.

---

## 5. Validation

`npm run all`:

- generate:task-registry → 370 tasks, 28 modules
- validate:links → all Markdown links resolve
- validate:contracts → repo contract checks passed
- validate:cross-refs → cross-reference checks passed
- validate:commands → command coverage check passed
- validate:tasks → 370 tasks, 0 issues
- validate:arch → module-graph check passed
- validate:ui-components → screen component coverage passed
- validate:animation-budgets → ok
- validate:enums → enum snapshot check passed
- validate:balance → 0 violations
- validate:error-codes → 0 unknown codes referenced
- generate:asset-index --check → 0 drifted packs
- generate:wiki → 60 docs, 27 diagrams, 69 screens
- generate:task-system-report → wrote
  `docs/planning/task-system-report.md`

`npm test`: 32 / 32 pass.
