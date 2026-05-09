# Golden-State Regression Suite

Module: [Engine Core (M0)](../01-engine-core.md)

Description:
Add a checked-in golden-state regression suite that pins `(scenarioId,
seed) → expectedStateHash` for every fixture in
`tests/__fixtures__/golden/`. The differential fuzz harness
([`09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md`](./09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md))
catches non-determinism between two live engine instances; it does
**not** catch an unintended *intentional* mechanics change that
silently shifts a canonical state hash. The golden suite closes that
gap by replaying each fixture's command log and asserting the final
`stateHash` matches the checked-in expected hash. On any drift the
runner fails with a diff between expected and actual canonical JSON
(truncated to the first 50 differing lines for log readability).

A `test:golden:bless` script re-emits the expected hash for a named
fixture, gated behind an explicit human action (refuses to run when
`process.env.CI` is set) so blessing is never accidental.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- Canonical JSON serializer + content hash
  (`mvp.01-engine-core.07b-canonical-json`)
- State serializer + xxh64 hash
  (`mvp.01-engine-core.07-state-serializer-plus-xxh64-hash`)
- Replay API (`mvp.01-engine-core.08-replay-api`)
- Edge-case scenario fixtures
  (`mvp.02-tooling.05-edge-case-fixtures`)

Outputs:
- `content-schema/schemas/golden-fixture.schema.json` — schema for
  a golden fixture: `{scenarioId, seed, commandLog: Command[],
  expectedStateHash}`, `additionalProperties: false`. References
  the existing
  [`content-schema/schemas/command.schema.json`](../../../content-schema/schemas/command.schema.json).
- `content-schema/examples/golden-fixture/canonical.golden-fixture.json`
  — one worked example using a small canonical scenario.
- `tests/__fixtures__/golden/README.md` — naming convention,
  `(scenarioId, seed)` uniqueness rule, blessing policy.
- `tests/__fixtures__/golden/.gitkeep` — keep the directory in git
  even when the corpus is empty at first.
- `src/engine/__tests__/golden.test.ts` — runner that loads each
  fixture, replays through `replay(seed, commandLog)`, asserts
  `hashState(state) === expectedStateHash`.
- `scripts/golden-bless.mjs` — re-emits the expected hash for a
  named fixture; refuses to run in CI (`process.env.CI` guard).
- `package.json` script `test:golden:bless` invoking the bless script
  and `test:golden` invoking the runner.

Owned Paths:
- `content-schema/schemas/golden-fixture.schema.json`
- `content-schema/examples/golden-fixture/`
- `tests/__fixtures__/golden/`
- `src/engine/__tests__/golden.test.ts`
- `scripts/golden-bless.mjs`

Owned Paths (shared):
- `package.json` (primary owner:
  `mvp.01-engine-core.01-initialize-root-workspace-and-module-layout`;
  this task contributes the `test:golden:bless` and `test:golden`
  scripts only).
- `docs/architecture/determinism.md` (primary owner:
  `mvp.00-core-architecture`; this task contributes a single
  "Golden-state regression" section under the existing Non-
  Negotiable Stack).
- `scripts/check-repo-contracts.mjs` (primary owner: contracts
  task; this task contributes the `.golden-fixture.json`
  suffix mapping only).

Dependencies:
- mvp.01-engine-core.07-state-serializer-plus-xxh64-hash
- mvp.01-engine-core.07b-canonical-json
- mvp.01-engine-core.08-replay-api
- mvp.02-tooling.05-edge-case-fixtures

Acceptance Criteria:
- `npm run test:golden` loads every `tests/__fixtures__/golden/*.json`,
  replays it, and asserts the final state hash equals
  `expectedStateHash`.
- A deliberate ruleset formula change in `src/rules/` causes
  `npm run test:golden` to fail with a canonical-JSON diff.
- `npm run test:golden:bless -- <fixtureName>` re-emits the expected hash
  for one named fixture; running the same command in CI environment
  exits non-zero with a "blessing in CI is forbidden" message.
- The schema validates a fixture missing `expectedStateHash` and
  rejects unknown properties.
- Shared paths (`package.json`, `docs/architecture/determinism.md`,
  `scripts/check-repo-contracts.mjs`) are extended with additive
  scope only. This task must not rewrite existing scripts,
  determinism sections, or schema-suffix mappings; the primary
  owner of each shared path remains as named in Owned Paths
  (shared) above.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
