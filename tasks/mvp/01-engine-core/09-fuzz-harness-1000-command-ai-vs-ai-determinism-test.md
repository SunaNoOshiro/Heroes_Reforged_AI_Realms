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

Owned Paths:
- `src/engine/__tests__/fuzz.test.ts`

Dependencies:
- mvp.01-engine-core.08-replay-api

Acceptance Criteria:
- All 5 seed/1000-command runs pass with zero hash divergences
- Test completes in < 10 seconds (Node 20)
- CI reports the seed + command index on any failure for reproducibility

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
