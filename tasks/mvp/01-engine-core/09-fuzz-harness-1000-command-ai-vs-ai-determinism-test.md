# Fuzz harness — 1000-command AI-vs-AI determinism test

Status: planned

Module: [Engine Core (M0)](../01-engine-core.md)

Description:
Run two parallel instances of the sim (same seed, same command log), both driven by a simple random-move AI. After every command, compare state hashes. If they ever diverge, fail immediately and dump the differing states. This is your proof that the engine is cross-browser deterministic.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)

Inputs:
- Replay API (Task 8)
- Random-move AI stub (generates legal commands without reading UI)

Outputs:
- `src/engine/__tests__/fuzz.test.ts`
- Test runs 1000 commands with 5 different seeds
- Designed to run headless in Node (no browser APIs)
- **Save / load round-trip step (shared owned-path extension owned by
  `mvp.08-persistence.02-log-only-save-format`).** For every fixture
  produced by the fuzz harness, the test additionally calls `save()`
  to produce a `SaveRecord`, then `load()` on the result, and asserts
  the post-replay `stateHash` matches the pre-save `stateHash`. Two
  consecutive `save()` calls of the same session assert identical
  `canonicalContentHash` (byte-equivalence of the canonical-content-
  bearing subset of the record).
- A snapshot-rebase determinism step asserts that replay from
  `(snapshot, log_since_snapshot)` produces the same `stateHash` at
  every checkpoint as replay from `(seed, full_log)` for any verified
  snapshot.

Owned Paths:
- `src/engine/__tests__/fuzz.test.ts`

Dependencies:
- mvp.01-engine-core.08-replay-api
- mvp.08-persistence.02-log-only-save-format
- mvp.08-persistence.07-snapshot-rebase

Acceptance Criteria:
- All 5 seed/1000-command runs pass with zero hash divergences
- Test completes in < 10 seconds (Node 20)
- CI reports the seed + command index on any failure for reproducibility
- Save/load round-trip: for each fixture, `load(save(state))` returns
  a state whose `stateHash` matches the pre-save `stateHash`.
- Re-save byte equivalence: two consecutive `save()` calls of the
  same session produce identical `canonicalContentHash`.
- Snapshot equivalence: replay from `(snapshot, log_since_snapshot)`
  is bit-identical to replay from `(seed, full_log)` for every
  verified snapshot in the fixture.
- **AI `searchBudget` determinism case:** for each fixture, run
  the AI worker (`mvp.10-heuristic-ai.06-run-ai-in-web-worker`)
  twice with identical seed, state, and `searchBudget`, with two
  different simulated `setTimeout` rate profiles ("fast" /
  "slow"). The two runs MUST produce identical `Command`
  outputs and identical `nodesExpanded` counts. Wall-clock-driven
  truncation would break this case; that is the point.
- **Bench harness Scenario C fixtures** are shared with this
  harness. Adding a fixture here adds it to the bench
  Scenario C scenario list (and vice versa) — a single fixture
  source feeds both gates.

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
