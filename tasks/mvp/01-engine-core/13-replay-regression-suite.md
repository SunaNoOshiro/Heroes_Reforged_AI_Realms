# Replay Regression Suite

Module: [Engine Core (M0)](../01-engine-core.md)

Description:
Add a checked-in replay corpus under `tests/replays/` plus a runner
that loads every `*.replay.json` and asserts the recorded
`expectedFinalStateHash` matches actual. Document the policy: every
PR that fixes a mechanics bug must add a replay that fails before the
fix and passes after. Without this gate, a fixed bug can return six
months later with no failing test, and the replay primitive's
regression-test value is unrealized.

The runner shares the canonical-hash + replay primitives with the
golden-state suite ([Task 12](./12-golden-state-suite.md)); landing
both together amortizes review.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md) § Replay
- [`docs/readiness-audit/15-testability.md`](../../../docs/readiness-audit/15-testability.md) § Q252

Inputs:
- Replay API (`mvp.01-engine-core.08-replay-api`); this task extends
  the replay format to add `expectedFinalStateHash`.
- Golden-state suite (`mvp.01-engine-core.12-golden-state-suite`)
  — same canonical-hash primitive.

Outputs:
- `tests/replays/README.md` — naming convention
  (`bug-<issue-id>-<short-name>.replay.json`), the "one replay per
  fixed mechanics bug" policy, the `expectedFinalStateHash` field
  requirement.
- `tests/replays/.gitkeep`
- `src/engine/__tests__/replays.test.ts` — runner that loads every
  `tests/replays/*.replay.json`, replays it, asserts
  `hashState(replayed) === expectedFinalStateHash`.
- `package.json` script `test:replays` invoking the runner.
- One-line cross-reference under
  `docs/architecture/determinism.md` § Replay pointing at the
  corpus directory.

Owned Paths:
- `tests/replays/`
- `src/engine/__tests__/replays.test.ts`

Owned Paths (shared):
- `package.json` (primary owner:
  `mvp.01-engine-core.01-initialize-root-workspace-and-module-layout`;
  this task contributes the `test:replays` script only).
- `docs/architecture/determinism.md` (primary owner:
  `mvp.00-core-architecture`; this task contributes the single-
  sentence cross-reference under § Replay only).

Dependencies:
- mvp.01-engine-core.08-replay-api
- mvp.01-engine-core.12-golden-state-suite

Acceptance Criteria:
- `npm run test:replays` loads every
  `tests/replays/*.replay.json`, replays through
  `replay(seed, commandLog)`, and asserts the final state hash
  equals `expectedFinalStateHash`.
- The replay-format spec inside `08-replay-api.md` documents the
  additive `expectedFinalStateHash` field; the field is optional in
  the schema (no migration needed) but required for fixtures
  consumed by this runner.
- `tests/replays/README.md` documents the
  `bug-<issue-id>-<short-name>.replay.json` naming convention and
  the policy that every fixed mechanics bug must add a replay.
- A deliberate regression of a fixed mechanics bug causes
  `npm run test:replays` to fail with the bisect-friendly hash
  mismatch.
- Shared paths (`package.json`, `docs/architecture/determinism.md`)
  are extended with additive scope only. This task must not rewrite
  existing scripts or determinism sections; the primary owner of
  each shared path remains as named in Owned Paths (shared) above.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
