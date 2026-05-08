# Overflow / saturation fuzz target

Module: [Quality (Phase 2)](../09-quality.md)

Description:
Property-test the saturation policy declared in
[`docs/architecture/determinism.md` § Saturation policy](../../../docs/architecture/determinism.md#saturation-policy)
and
[`docs/architecture/edge-cases-policy.md` § 6](../../../docs/architecture/edge-cases-policy.md#6-overflow--saturation-q210).
Generate near-`MAX_INTERMEDIATE` inputs to every formula step and
assert that:

1. Every intermediate stays at or below `MAX_INTERMEDIATE`
   (`Number.MAX_SAFE_INTEGER`).
2. Resource scalars saturate at `MAX_RESOURCE` and never wrap.
3. Stack counts saturate at `MAX_UNIT_COUNT` and never wrap.
4. Drain effects floor at `0` (no negative-debt accumulation).
5. Dev-build `OverflowError` and `InvariantViolation` are raised on
   any reducer that would breach the cap.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/edge-cases-policy.md`](../../../docs/architecture/edge-cases-policy.md)
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)
- [`content-schema/schemas/numeric.json`](../../../content-schema/schemas/numeric.json)

Inputs:
- `src/engine/constants.ts`
- `src/rules/` formula evaluator
- `content-schema/schemas/numeric.json`

Outputs:
- `tests/fuzz/overflow.fuzz.ts`

Owned Paths:
- `tests/fuzz/overflow.fuzz.ts`

Dependencies:
- mvp.01-engine-core.06-command-dispatcher
- mvp.01-engine-core.09-fuzz-harness-1000-command-ai-vs-ai-determinism-test

Acceptance Criteria:
- Property generator covers integer values in
  `[MAX_INTERMEDIATE - 1024, MAX_INTERMEDIATE]` and replays the
  formula evaluator across every operator (`add`, `sub`, `mul`,
  `divFloor`, `ratio`, `min`, `max`, `clamp`, `neg`, `abs`).
- Saturation invariants asserted on every step: never wrap, always
  saturate at the named cap.
- Drain-against-zero fuzz: random sequence of drain effects against
  a `0` balance never produces a negative resource or unit count.
- A deliberate "wrap" injection (e.g. removing the cap before a
  multiply) causes the test to fail with the seed and step index.
- Test runs headless in Node 20.

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
