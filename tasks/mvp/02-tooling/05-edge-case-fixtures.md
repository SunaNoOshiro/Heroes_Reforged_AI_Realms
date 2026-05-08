# Edge-Case Scenario Fixtures

Module: [Test & Tooling Contracts (M0)](../02-tooling.md)

Description:
Author the initial seed catalogue of edge-case scenario fixtures
under `tests/__fixtures__/edge-cases/`. Six small scenarios drawn
from the audit's enumerated examples — empty garrison, single-stack
vs large stack, dead-heroes victory, resource-overflow turn, full-
inventory artifact pickup, zero-mana spell attempt — each pinned by
[`content-schema/schemas/scenario.schema.json`](../../../content-schema/schemas/scenario.schema.json).
Each scenario gets a one-line purpose entry in a sibling `INDEX.md`.
The golden-state suite owned by
[`tasks/mvp/01-engine-core/12-golden-state-suite.md`](../01-engine-core/12-golden-state-suite.md)
consumes these scenarios to produce checked-in expected hashes.

Read First:
- [`docs/readiness-audit/15-testability.md`](../../../docs/readiness-audit/15-testability.md) § Q258
- [`content-schema/schemas/scenario.schema.json`](../../../content-schema/schemas/scenario.schema.json)
- [`docs/architecture/edge-cases-policy.md`](../../../docs/architecture/edge-cases-policy.md)

Inputs:
- Scenario schema + scenario loader
  (`mvp.08-persistence.04-scenario-loader`).
- Edge-case enumeration in the testability audit and
  `edge-cases-policy.md`.

Outputs:
- `tests/__fixtures__/edge-cases/INDEX.md` — one line per fixture
  with the edge it exercises.
- `tests/__fixtures__/edge-cases/empty-garrison.scenario.json` —
  siege scenario where the defending town has zero garrisoned
  units; pins the "empty garrison auto-loses" rule.
- `tests/__fixtures__/edge-cases/stack-1-vs-1000.scenario.json` —
  battle scenario contrasting a 1-unit stack against a 1000-unit
  stack; pins damage rounding at extremes.
- `tests/__fixtures__/edge-cases/all-heroes-dead-victory.scenario.json`
  — adventure scenario where the loss condition fires on the next
  turn after the last hero is killed.
- `tests/__fixtures__/edge-cases/resource-overflow-turn.scenario.json`
  — economy scenario seeded near the documented per-resource cap so
  day-one accrual triggers the saturation rule pinned in
  `docs/architecture/edge-cases-policy.md` § 6.
- `tests/__fixtures__/edge-cases/full-inventory-pickup.scenario.json`
  — adventure scenario where a hero with a full backpack visits an
  artifact pile.
- `tests/__fixtures__/edge-cases/zero-mana-spell-attempt.scenario.json`
  — combat scenario where a hero attempts a spell with insufficient
  mana.

Owned Paths:
- `tests/__fixtures__/edge-cases/`

Dependencies:
- mvp.08-persistence.04-scenario-loader

Acceptance Criteria:
- Six scenarios live under `tests/__fixtures__/edge-cases/` and each
  validates against
  [`content-schema/schemas/scenario.schema.json`](../../../content-schema/schemas/scenario.schema.json)
  through the scenario loader.
- `INDEX.md` lists every fixture with a one-line purpose comment in
  the same order as the file names above.
- The golden-state suite consumes each fixture and emits a
  corresponding entry under `tests/__fixtures__/golden/`.
- Adding a seventh scenario follows the same naming convention
  (`<edge-name>.scenario.json` plus an `INDEX.md` entry) without
  changing the runner.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
