# Mutation Test Gate

Module: [Test & Tooling Contracts (M0)](../02-tooling.md)

Description:
Adopt StrykerJS as the mutation-testing gate that runs before
`npm run tasks:done` flips a task to `done`. The gate scopes Stryker
to each task's `ownedPaths` and enforces a per-module mutation-score
floor plus a per-file coverage-no-regression check, so a task only
ships when its tests actually pin behavior — not just when they
execute lines. Anti-cheat rules forbid the easy ways to make the gate
green (deleting source, softening assertions, lowering thresholds,
silent excludes); the rules and the loop are pinned in the
mutation-test skill, owned by this task.

The runner choice (Vitest) and the node:test → Vitest migration of
the two existing src/ test files are owned by the Vite/TS bootstrap
task, not by this task; this task wires Stryker on top of whatever
Vitest setup that task produces.

Read First:
- [`.claude/skills/mutation-test/SKILL.md`](../../../.claude/skills/mutation-test/SKILL.md)
- [`docs/architecture/testing/coverage-policy.md`](../../../docs/architecture/testing/coverage-policy.md)
- [`docs/architecture/testing-conventions.md`](../../../docs/architecture/testing-conventions.md) § 8
- [`docs/planning/decision-log.md`](../../../docs/planning/decision-log.md) DEC-003

Inputs:
- `vitest.config.ts` pinned by
  `mvp.01-engine-core.02-set-up-vite-plus-typescript-strict-mode-per-module`
- Per-module coverage thresholds from `mvp.02-tooling.02-coverage-gate`

Outputs:
- `stryker.conf.mjs` — Stryker configuration with Vitest runner,
  `coverageAnalysis: "perTest"`, mutation scope excluding contracts /
  tests / d.ts / constants.
- `scripts/validate-mutation-score.mjs` — reads
  `reports/mutation/mutation.json`, applies per-module floor,
  fails on any owned file missing from the report (anti-cheat:
  silent excludes).
- `scripts/validate-coverage-floor.mjs` — reads
  `reports/coverage/coverage-summary.json`, applies coverage floor,
  compares against `reports/coverage/.baseline.json` and fails on any
  per-file regression (anti-cheat: deleting tested lines).
- `.claude/skills/mutation-test/SKILL.md` — the skill that documents
  the loop, the anti-cheat rules, the equivalent-mutant procedure,
  and the `verifyCommands` template tasks adopt to wire the gate.
- `reports/mutation/` and `reports/coverage/.baseline.json` —
  generated artifacts, gitignored.
- `package.json` scripts (additive): `mutation`,
  `mutation:incremental`, `validate:mutation-score`,
  `validate:coverage-floor`.

Owned Paths:
- `stryker.conf.mjs`
- `scripts/validate-mutation-score.mjs`
- `scripts/validate-coverage-floor.mjs`
- `.claude/skills/mutation-test/SKILL.md`
- `reports/mutation/`
- `reports/coverage/.baseline.json`

Owned Paths (shared):
- `vitest.config.ts` (primary owner:
  `mvp.01-engine-core.02-set-up-vite-plus-typescript-strict-mode-per-module`;
  this task only relies on the Vitest setup it produces and does
  not edit it).
- `package.json` (primary owner:
  `mvp.01-engine-core.01-initialize-root-workspace-and-module-layout`;
  this task contributes the four mutation-related scripts only and
  the StrykerJS / vitest / coverage-v8 devDependencies).
- `docs/architecture/testing-conventions.md` (primary owner:
  `mvp.02-tooling.03-unit-test-contract`; this task contributes a
  cross-link to the mutation-test skill from § 8 only).
- `AGENTS.md` (and the symlinked `CLAUDE.md`; primary owner:
  repo-level guidance task; this task contributes one pointer line
  to the mutation-test skill from the Workflow section only).

Dependencies:
- mvp.01-engine-core.02-set-up-vite-plus-typescript-strict-mode-per-module
- mvp.02-tooling.02-coverage-gate

Acceptance Criteria:
- `npm run test:mutation` invokes Stryker against `src/` (excluding
  contracts, tests, d.ts, constants) using the Vitest runner.
- `npm run validate:mutation-score -- --task <id>` exits 0 when the
  task has no source-code `ownedPaths`, exits 1 with a clear message
  when `reports/mutation/mutation.json` is missing or any matched
  file's score is below the module-class floor in
  `.claude/skills/mutation-test/SKILL.md`, and exits 1 when an
  `ownedPaths` entry has no matching file in the report.
- `npm run validate:coverage-floor -- --task <id>` exits 0 when the
  task has no source-code `ownedPaths`, exits 1 with a clear message
  when coverage on a matched file is below floor or when line-count
  or covered-line count regressed vs. the baseline at
  `reports/coverage/.baseline.json`, and updates the baseline only
  on success.
- A deliberately tautological test (e.g. `expect(fn(1, 2)).toBeDefined()`)
  on a function with arithmetic produces ≥ 1 surviving mutant in the
  Stryker report, and `validate:mutation-score` fails on that file.
- Deleting a tested source line on a tracked file causes
  `validate:coverage-floor` to fail with a
  "covered lines dropped" message that cites SKILL.md anti-cheat
  rule A.
- `stryker.conf.mjs` is **not** listed in any task's `ownedPaths`
  except this one, and CI rejects PRs that move it into another
  task's `ownedPaths` (anti-cheat rule D).
- Shared paths (`vitest.config.ts`, `package.json`,
  `docs/architecture/testing-conventions.md`, `AGENTS.md`) are
  extended with additive scope only. This task must not rewrite the
  existing Vitest config, package scripts, testing-conventions
  body, or AGENTS workflow; the primary owner of each shared path
  remains as named in Owned Paths (shared) above.

Verify:
- npm run validate
- npm run test:mutation -- --dryRunOnly
- npm run validate:mutation-score -- --task mvp.02-tooling.06-mutation-test-gate
- npm run validate:coverage-floor -- --task mvp.02-tooling.06-mutation-test-gate

Estimated Time:
- 4 hours
