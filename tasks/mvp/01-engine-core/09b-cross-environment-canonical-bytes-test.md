# Cross-environment canonical-bytes parity test

Module: [Engine Core (M0)](../01-engine-core.md)

Description:
Prove that the canonical serializer + xxh64 hash pinned by
[`07-state-serializer-plus-xxh64-hash.md`](07-state-serializer-plus-xxh64-hash.md)
produces byte-identical output on Node and on every browser engine
that meets [`runtime-requirements.md` RR-08](../../../docs/architecture/runtime-requirements.md#rr-08-browser-engine-floor)
and RR-09. Today the fuzz harness in
[`09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md`](09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md)
runs Node-only; this task adds the Playwright-driven browser leg.

Read First:
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`docs/architecture/runtime-requirements.md`](../../../docs/architecture/runtime-requirements.md)
- [`docs/architecture/multi-engine-harness.md`](../../../docs/architecture/multi-engine-harness.md)

Inputs:
- Existing fuzz transcript exporter (`writeTranscript({state,
  canonicalBytes, hash}[])`) added by the parent fuzz task
- Browser-supported engine factory from
  [`07-state-serializer-plus-xxh64-hash.md`](07-state-serializer-plus-xxh64-hash.md)

Outputs:
- `tests/determinism/cross-env/playwright.config.ts` — Playwright
  config targeting Chromium (mandatory) plus WebKit and Firefox
  gated behind an env-var flag (see
  [`DEF-015`](../../../docs/planning/deferred.md))
- `tests/determinism/cross-env/parity.spec.ts` — Playwright spec
  that reads the Node-emitted transcript and asserts byte equality
  + identical xxh64 in the headless browser
- `tests/determinism/cross-env/transcript-runner.ts` — shared module
  imported on both sides so the byte-comparison code is the same on
  Node and browser

Owned Paths:
- `tests/determinism/cross-env/playwright.config.ts`
- `tests/determinism/cross-env/parity.spec.ts`
- `tests/determinism/cross-env/transcript-runner.ts`

Owned Paths (shared):
- `.github/workflows/multiplayer-determinism.yml`

Dependencies:
- mvp.01-engine-core.07-state-serializer-plus-xxh64-hash
- mvp.01-engine-core.09-fuzz-harness-1000-command-ai-vs-ai-determinism-test

Acceptance Criteria:
- A 1000-command run produces a transcript file under
  `tests/determinism/cross-env/__transcripts__/` containing
  `(state, canonicalBytes, hash)` triples.
- Playwright Chromium replays the transcript and asserts byte
  equality and xxh64 equality at every step.
- WebKit + Firefox legs run under `HR_CROSS_ENV_FULL=1` and are
  optional in the default CI gate (per
  [`DEF-015`](../../../docs/planning/deferred.md)).
- The CI job named "determinism-cross-env" runs in
  `.github/workflows/multiplayer-determinism.yml` and is required
  for merge once `src/engine/serializer.ts` lands.
- Shared-path work is additive only: this task adds a
  `determinism-cross-env` job to the existing workflow without
  changing the existing multiplayer-determinism job. The primary
  owner of the workflow remains the parent multiplayer-determinism
  task; this task must not rewrite the existing job.

Verify:
- npm run validate
- npm test

Estimated Time:
- 6 hours
