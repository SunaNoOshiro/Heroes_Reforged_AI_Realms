# Implementation Plan: 15 — Testability

> Source audit: [docs/readiness-audit/15-testability.md](../readiness-audit/15-testability.md)
>
> The audit file is **not** modified. This plan converts every
> ❌ UNKNOWN, ⚠ Partial, Missing-Logic, and Risk item from that audit
> into concrete schema, documentation, task, and tooling work, all
> grounded in the existing M0 engine-core test scaffolding under
> [tasks/mvp/01-engine-core/](../../tasks/mvp/01-engine-core/), the
> determinism contract at
> [docs/architecture/determinism.md](../architecture/determinism.md),
> the module breakdown in
> [docs/architecture/master-plan.md](../architecture/master-plan.md),
> the multiplayer protocol in
> [tasks/phase-3/01-multiplayer/](../../tasks/phase-3/01-multiplayer/),
> and the AI-eval criteria scattered across
> [tasks/phase-2/02-strategic-ai/](../../tasks/phase-2/02-strategic-ai/),
> [tasks/phase-2/03-second-faction/](../../tasks/phase-2/03-second-faction/),
> and [tasks/phase-3/03-mcts-ai/](../../tasks/phase-3/03-mcts-ai/).
>
> Nothing here invents new gameplay mechanics. Every change formalizes
> a testing contract the architecture already implies but has not yet
> pinned in one place.

---

## 1. Overview

**Scope.** Close the ten distinct gaps the testability audit flagged
across the test pyramid:

- per-system unit-test isolation contract (Q248)
- golden-state regression suite — checked-in expected hashes per
  scenario (Q251)
- replay corpus + replay-as-regression runner (Q252)
- property-based testing layer using `fast-check` (Q253)
- network condition simulator (loss / jitter / partition / reorder)
  for the multiplayer stack (Q254)
- reusable AI tournament harness with shared metrics (Q255)
- UI snapshot / interaction / E2E layer wired into `tasks:done` for
  any task whose `ownedPaths` include `src/ui/**` (Q256)
- edge-case scenario fixture catalogue (Q258)
- coverage gate with per-module thresholds (Q259)
- engine-throughput benchmark with a stated SLO (Q260)

**Readiness state today.** AI-Readiness scored **6/10**. The
load-bearing primitives — PCG32 RNG, fixed-point math, canonical JSON
serializer, xxh64 state hash, Replay API, and the AI-vs-AI fuzz
harness — are all fully specified in M0. Everything **above** the
engine layer (golden states, replay regressions, property tests,
network chaos, AI tournament harness, UI snapshot/E2E, edge-case
fixtures, coverage gating, throughput SLOs, per-system unit-test
contract) is either implicit or undefined. Closing every Improvement
item the audit names lifts the score to **9/10** per the audit's own
rationale, which is the threshold for safely opening a
ranked/multiplayer/sharing layer over the engine.

**Out of scope.**

- Authoring runtime engine, rules, or AI code. This plan formalizes
  the testing contracts those layers must satisfy.
- Choosing a hosted CI provider; CI already lives in
  [tasks/mvp/01-engine-core/10-github-actions-ci.md](../../tasks/mvp/01-engine-core/10-github-actions-ci.md).
  This plan extends CI steps; it does not relocate them.
- Re-opening already-`✔ Defined` answers (Q249 determinism, Q250
  headless harness, Q257 fuzzing). Those contracts are stable;
  nothing below modifies them.
- Authoring the multiplayer transport itself. The NetSim layer
  defined here is a **test fake** for the transport contract owned
  by [tasks/phase-3/01-multiplayer/](../../tasks/phase-3/01-multiplayer/).

---

## 2. Critical Fixes (Must Do First)

These are the items where leaving the gap unaddressed creates a
shipping blocker — either a safety hazard ("tests pass headless, UI
breaks live"), a silent-drift risk (no golden-state hashes), a
production-only failure mode (no network chaos before Phase-3 ships),
or a coverage blind spot that hides whole subsystems shipping with
zero tests. They must land before Phase-3 multiplayer or any
ranked/competitive surface is exposed.

### Issue: UI smoke / interaction / E2E layer is not wired into the verify chain

**Source:** Q256 (⚠ Partial), Risk #1 ("Tests pass headless, UI
breaks live"), Improvement: "Wire `vitest --browser` (or Playwright)
into `scripts/tasks.mjs done` for any task whose `ownedPaths` include
`src/ui/**`."

**Problem:** Today, UI tasks rely on
`npm run validate && npm test` (Node-only) plus manual inspection
against the wiki mockups
([docs/architecture/wiki/screens/](../architecture/wiki/screens/)).
No snapshot, interaction, or E2E framework is wired in. The audit
chapter explicitly names this gap and quotes the prior audits
([AUDIT-2026-04-30-TASK-SYSTEM-FULL-CONSISTENCY.md](../archive/AUDIT-2026-04-30-TASK-SYSTEM-FULL-CONSISTENCY.md))
as already having flagged it. The
[scripts/tasks.mjs](../../scripts/tasks.mjs) gate runs each task's
`verifyCommands` but has no per-`ownedPaths` policy that adds a
browser smoke step when UI files are touched.

**Impact:**

- A UI task can pass `tasks:done` without ever rendering in a
  browser; a binding-name typo, missing event handler, or layout
  regression escapes the gate.
- The wiki mockups are documentation, not tests; nothing fails when
  the implementation drifts away from them.
- Every UI screen package
  ([docs/architecture/wiki/screens/](../architecture/wiki/screens/))
  has `interactions.md`, but no automated check ever exercises the
  interactions described there.
- The
  [scripts/verify-ui-smoke.mjs](../../scripts/verify-ui-smoke.mjs)
  filename suggests a hook exists, but no task currently owns it as
  a real browser harness.

**Solution:** Adopt **`vitest --browser`** (lighter weight than
Playwright, integrates with the existing Vitest test runner pinned by
[tasks/mvp/01-engine-core/02-set-up-vite-plus-typescript-strict-mode-per-module.md](../../tasks/mvp/01-engine-core/02-set-up-vite-plus-typescript-strict-mode-per-module.md))
as the in-browser snapshot/interaction layer. Author a per-screen
smoke contract: each screen package gets one `*.smoke.test.ts` that
mounts the screen and asserts the binding names from
`data-contracts.md` resolve. Extend
[scripts/tasks.mjs](../../scripts/tasks.mjs) `done` so that any task
whose `ownedPaths` glob matches `src/ui/**` automatically runs
`npm run test:ui-smoke` in addition to its declared `verifyCommands`.

**Files to Update:**

- [scripts/tasks.mjs](../../scripts/tasks.mjs) — add an "ownedPaths
  → extra verify step" rule: if any owned path matches `src/ui/**`,
  prepend `npm run test:ui-smoke` to the verify chain.
- [scripts/verify-ui-smoke.mjs](../../scripts/verify-ui-smoke.mjs)
  — promote from placeholder to an actual runner that invokes
  `vitest --browser run -- src/ui/**/*.smoke.test.ts`.
- [tasks/mvp/01-engine-core/10-github-actions-ci.md](../../tasks/mvp/01-engine-core/10-github-actions-ci.md)
  — add a CI step `npm run test:ui-smoke` between `test` and the
  fuzz step; document the headless-Chromium dependency.
- [package.json](../../package.json) — add `test:ui-smoke` script
  and `@vitest/browser` + `playwright` (used as the browser driver
  by `@vitest/browser`) as devDependencies.
- [docs/architecture/wiki/README.md](../architecture/wiki/README.md)
  — add a "UI smoke contract" section pointing at the new doc.

**New Files:**

- `docs/architecture/testing/ui-smoke-contract.md` — defines the
  per-screen smoke shape: mount the screen with canonical example
  data, assert each binding name from `data-contracts.md` is
  reachable, run each interaction in `interactions.md` with a
  no-op effect handler. One paragraph per requirement.
- `tasks/mvp/02-tooling/01-ui-smoke-harness.md` — owns
  `scripts/verify-ui-smoke.mjs`, the `test:ui-smoke` script, the
  smoke contract doc, and the `tasks.mjs` `ownedPaths` rule.
- `src/ui/__tests__/smoke.template.test.ts` — a copy-paste template
  every new screen package starts from. Not a real test; documented
  as a template in the smoke contract.

**Implementation Steps:**

1. Author `ui-smoke-contract.md` with the three required assertions
   (mount, bindings reachable, interactions invokable).
2. Add `@vitest/browser` and `playwright` to [package.json](../../package.json)
   devDependencies; add the `test:ui-smoke` npm script.
3. Replace [scripts/verify-ui-smoke.mjs](../../scripts/verify-ui-smoke.mjs)
   with a real runner that resolves UI smoke files via glob.
4. Extend [scripts/tasks.mjs](../../scripts/tasks.mjs) `done` to
   compute `affectsUI = ownedPaths.some(p => p.startsWith('src/ui/'))`
   and prepend `npm run test:ui-smoke` to the verify chain when true.
5. Add the smoke template under `src/ui/__tests__/`.
6. Update CI YAML in
   [tasks/mvp/01-engine-core/10-github-actions-ci.md](../../tasks/mvp/01-engine-core/10-github-actions-ci.md)
   acceptance criteria to include the smoke step and the
   < 3-minute total CI budget renegotiation if needed.
7. Run `npm run validate:tasks` and `npm run validate`.

**Dependencies:** None blocking; M0 tooling already exists. Must
land before any Phase-2 UI screen task starts (`07-ui-screen-backlog`)
otherwise screens accumulate without smoke coverage.

**Complexity:** M.

---

### Issue: No golden-state regression suite — mechanics drift undetected

**Source:** Q251 (❌ UNKNOWN), Risk #2 ("Mechanics drift silently
because no golden-state hashes guard them; only differential hashing
between two live instances catches divergence, not unintended
*intentional* changes"), Improvement: "Add a `__fixtures__/golden/`
corpus with `(scenario, seed) → expectedStateHash` and a runner that
fails on any drift."

**Problem:** All primitives needed for golden-state testing exist —
canonical JSON serializer
([tasks/mvp/01-engine-core/07b-canonical-json.md](../../tasks/mvp/01-engine-core/07b-canonical-json.md)),
xxh64 state hash
([tasks/mvp/01-engine-core/07-state-serializer-plus-xxh64-hash.md](../../tasks/mvp/01-engine-core/07-state-serializer-plus-xxh64-hash.md)),
Replay API
([tasks/mvp/01-engine-core/08-replay-api.md](../../tasks/mvp/01-engine-core/08-replay-api.md)).
But no task or doc defines a golden-state suite. The fuzz harness
([tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md](../../tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md))
compares two **live** instances against each other — it catches
non-determinism but **does not catch intentional rule changes that
silently change canonical outcomes**.

**Impact:**

- A formula tweak in `src/rules/` (e.g. a damage formula) produces
  a different state hash for a known scenario, and nothing fails.
  The reviewer must spot the change in code review.
- "Refactor with no behavior change" cannot be proven; only
  asserted.
- Replays from before the change silently diverge after the change
  with no automated alert. Bug bisect becomes manual.

**Solution:** Add a `tests/__fixtures__/golden/` corpus where each
fixture is `{scenarioId, seed, commandLog, expectedStateHash}`. A
runner under `src/engine/__tests__/golden.test.ts` loads each
fixture, replays the command log against `scenarioId` with `seed`,
and asserts the final state hash equals `expectedStateHash`. On any
drift, it fails with the diff between expected and actual canonical
JSON (truncated to the first 50 differing lines for log readability).
Add a `test:golden:bless` script that re-emits the expected hash for a
named fixture, gated behind an explicit human action so blessing is
never accidental.

**Files to Update:**

- [package.json](../../package.json) — add `test:golden:bless` script
  invoking `node scripts/golden-bless.mjs`.
- [tasks/mvp/01-engine-core/10-github-actions-ci.md](../../tasks/mvp/01-engine-core/10-github-actions-ci.md)
  — add `npm run test:golden` to CI steps.
- [docs/architecture/determinism.md](../architecture/determinism.md)
  — add a "Golden-state regression" section under the existing
  Non-Negotiable Stack, citing the new fixture corpus as the
  canonical drift sentinel.

**New Files:**

- `content-schema/schemas/golden-fixture.schema.json` —
  `{scenarioId, seed, commandLog: Command[], expectedStateHash}`,
  `additionalProperties: false`. References the existing
  [content-schema/schemas/command.schema.json](../../content-schema/schemas/command.schema.json).
- `content-schema/examples/golden-fixture/canonical.json` — one
  worked example using a small canonical scenario.
- `tests/__fixtures__/golden/README.md` — naming convention,
  `(scenarioId, seed)` uniqueness rule, blessing policy.
- `tests/__fixtures__/golden/.gitkeep` — keep the directory in git
  even when empty at first.
- `src/engine/__tests__/golden.test.ts` — the runner.
- `scripts/golden-bless.mjs` — re-emits the expected hash for a
  named fixture; refuses to run in CI (checks `process.env.CI`).
- `tasks/mvp/01-engine-core/11-golden-state-suite.md` — owns the
  schema, the runner, the fixtures directory, and the bless
  script. Lists Tasks 7, 7b, 8 as `Dependencies`.

**Implementation Steps:**

1. Author the schema and one canonical example.
2. Author the runner with the diff-on-fail behavior.
3. Author the bless script with a CI-refusal guard.
4. Add the `test:golden:bless` and `test:golden` npm scripts.
5. Add the new task file with `ownedPaths` covering only the new
   files plus the determinism-doc paragraph.
6. Update the CI task acceptance criteria.
7. Run `npm run validate:tasks` and `npm run validate`.

**Dependencies:**
- mvp.01-engine-core.07-state-serializer-plus-xxh64-hash
- mvp.01-engine-core.07b-canonical-json
- mvp.01-engine-core.08-replay-api

**Complexity:** M.

---

### Issue: Multiplayer ships with no network chaos — first lossy network is production

**Source:** Q254 (❌ UNKNOWN), Risk #3 ("Multiplayer is allowed to
ship with desync detection but no chaos testing — first time a real
lossy network is exercised will be in production"), Improvement:
"Add a NetSim layer in `src/net/` with configurable loss/jitter/
partition; bind two parallel instances to it for chaos tests of
lockstep + reconnection."

**Problem:** The eight Phase-3 multiplayer tasks
([tasks/phase-3/01-multiplayer/](../../tasks/phase-3/01-multiplayer/))
cover signaling, WebRTC peer setup, lockstep command serialization,
per-turn hash exchange, desync detection, auto-bisect, reconnection,
and host migration. None exercise these against a **simulated lossy
transport**. Real-world packet loss, jitter, partition, NAT failure,
and message reordering are all triggered for the first time in
production.

**Impact:**

- Reconnection logic
  ([tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md](../../tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md))
  is verified at the protocol level only — never exercised under a
  flaky transport.
- Host migration
  ([tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md](../../tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md))
  has no test for the partition scenario it is designed to handle.
- Auto-bisect
  ([tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md](../../tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md))
  is never tested against an actual mismatch caused by transport
  reordering.

**Solution:** Add a `src/net/__tests__/netsim.ts` module — a
deterministic, seedable in-memory transport that wraps the same
`NetTransport` interface the real WebRTC datachannel will satisfy.
Configurable: `lossRate` (per-message Bernoulli drop), `latencyMs`
(constant + jitter via PCG32), `reorderWindow` (deliver out of order
within N messages), `partitionAt(seq)` (drop everything from seq N
onward until `heal()`). Author chaos tests under
`src/net/__tests__/chaos.test.ts` that bind two engine instances
through NetSim and assert lockstep + auto-bisect + reconnection +
host migration each survive their respective adversarial scenarios.
NetSim is **deterministic** (PCG32-driven from a seed) so chaos test
failures are reproducible by `(seed, scenario)`.

**Files to Update:**

- [tasks/phase-3/01-multiplayer.md](../../tasks/phase-3/01-multiplayer.md)
  — add a "Chaos test contract" section listing the four
  adversarial scenarios required.
- [tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md](../../tasks/phase-3/01-multiplayer/03-input-only-lockstep-command-serialization-plus-sequencing.md)
  — extend acceptance to require passing the lockstep chaos
  scenario.
- [tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md](../../tasks/phase-3/01-multiplayer/05-auto-bisect-on-hash-mismatch.md)
  — extend acceptance to require passing the bisect chaos scenario.
- [tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md](../../tasks/phase-3/01-multiplayer/06-reconnection-log-range-request-plus-replay.md)
  — extend acceptance to require passing the reconnect chaos
  scenario.
- [tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md](../../tasks/phase-3/01-multiplayer/07-host-migration-heartbeat-election.md)
  — extend acceptance to require passing the partition chaos
  scenario.
- [docs/architecture/determinism.md](../architecture/determinism.md)
  — one-line cross-reference: NetSim is PCG32-seeded and
  reproducible by `(seed, scenario)`.

**New Files:**

- `docs/architecture/net-transport.md` — defines the `NetTransport`
  interface contract that both real WebRTC and NetSim satisfy.
- `src/net/__tests__/netsim.ts` — the deterministic test transport.
- `src/net/__tests__/chaos.test.ts` — the four scenarios.
- `tasks/phase-3/01-multiplayer/09-network-chaos-harness.md` —
  owns the doc, NetSim module, and chaos test file. Lists tasks 3,
  5, 6, 7 as `Dependencies`.

**Implementation Steps:**

1. Author `net-transport.md` defining the interface (`send`,
   `onMessage`, `close`).
2. Author Task 9 with `ownedPaths` covering only the new files and
   the multiplayer-doc paragraph.
3. The four existing multiplayer task edits add chaos-scenario
   acceptance lines but do **not** change those tasks' `ownedPaths`
   (they consume NetSim, they do not own it).
4. Run `npm run validate:tasks` and `npm run validate`.

**Dependencies:**
- mvp.01-engine-core.03-implement-pcg32-prng-with-named-sub-streams
  (NetSim uses PCG32 for jitter / loss decisions)
- All four multiplayer tasks listed in "Files to Update" must
  have their interfaces declared first; chaos exercises but does
  not author them.

**Complexity:** L.

---

### Issue: No coverage gate — whole subsystems can ship with zero tests

**Source:** Q259 (❌ UNKNOWN), Risk #5 ("No coverage signal means
whole subsystems (e.g. `content-runtime` overrides, `persistence`
migrations) can ship with zero tests without flagging"), Improvement:
"Add `vitest --coverage` with per-module thresholds (engine ≥ 90%,
rules ≥ 90%, content-runtime ≥ 80%, ai ≥ 70%, ui smoke only) and a
CI gate."

**Problem:** CI runs `lint`, `type-check`, `test`, and the fuzz
harness with a < 3-minute wall-clock budget
([tasks/mvp/01-engine-core/10-github-actions-ci.md](../../tasks/mvp/01-engine-core/10-github-actions-ci.md)).
No coverage tool, per-module threshold, or coverage badge is
specified anywhere in `docs/` or `tasks/`. A whole module can land
with zero tests and CI is green.

**Impact:**

- `src/content-runtime/` overrides logic and `src/persistence/`
  migrations are most likely to ship without tests because they
  have no obvious determinism or fuzz coverage from M0.
- "We have tests" becomes a folklore claim; no number ever appears
  on a PR.
- Future regressions in untested modules surface only at
  integration time.

**Solution:** Adopt `vitest --coverage` with the c8 provider
(already bundled with Vitest). Author a `vitest.config.ts` patch
that defines per-module thresholds matching the audit's recommended
levels (engine ≥ 90%, rules ≥ 90%, content-runtime ≥ 80%, ai ≥ 70%,
ui untracked because smoke covers it). Add `npm run test:coverage`
that fails on threshold violation; wire it into CI.

**Files to Update:**

- [package.json](../../package.json) — add `test:coverage` script.
- [tasks/mvp/01-engine-core/02-set-up-vite-plus-typescript-strict-mode-per-module.md](../../tasks/mvp/01-engine-core/02-set-up-vite-plus-typescript-strict-mode-per-module.md)
  — extend acceptance to require the per-module coverage
  thresholds in `vitest.config.ts`.
- [tasks/mvp/01-engine-core/10-github-actions-ci.md](../../tasks/mvp/01-engine-core/10-github-actions-ci.md)
  — add `npm run test:coverage` between `test` and the fuzz step;
  add a coverage badge requirement to the README acceptance line.

**New Files:**

- `docs/architecture/testing/coverage-policy.md` — names the
  per-module thresholds, justifies each (engine/rules at 90% for
  determinism guarantees; content-runtime at 80% because schema
  validation already covers shape; ai at 70% because heuristic
  drift is hard to test; ui at "smoke only" because the smoke
  layer is the contract). One paragraph per module.
- `tasks/mvp/02-tooling/02-coverage-gate.md` — owns the policy
  doc, the `vitest.config.ts` threshold patch, the
  `test:coverage` script, and the README badge.

**Implementation Steps:**

1. Author the coverage-policy doc.
2. Add the `test:coverage` npm script and the per-module
   threshold map in `vitest.config.ts` (file owned by Task #2 of
   M0; this plan extends its acceptance criteria, not its
   `ownedPaths`).
3. Author Task #2 of `mvp/02-tooling` with `ownedPaths` over the
   new doc, the README badge line, and the threshold map.
4. Update CI task acceptance.
5. Run `npm run validate:tasks` and `npm run validate`.

**Dependencies:**
- mvp.01-engine-core.02-set-up-vite-plus-typescript-strict-mode-per-module
  (consumes its `vitest.config.ts`).

**Complexity:** S.

---

## 3. System Improvements

Grouped by area. Each item is a separate authored change; complexity
sized to fit the existing M0/M-Phase-2 task conventions.

### Test Infrastructure

#### Issue: No per-system unit-test isolation contract

**Source:** Q248 (⚠ Partial), Missing Logic #10, Improvement:
"Document a per-system unit-test contract in
`docs/architecture/`: mocking conventions, DI seams, and the
canonical fake set."

**Problem:** [CLAUDE.md](../../CLAUDE.md) mandates SOLID-style
boundaries and a strict module split, but no document defines:
- which seams each module exposes for dependency injection
- what fakes / mocks are canonical (e.g. `FakeRng`, `FakeClock`,
  `FakeNetTransport`, `InMemoryAssetIndex`)
- the per-module test rubric (what counts as "tested")
The only fully scoped per-module test artifact is the engine fuzz
harness; nothing analogous exists for `rules`, `content-runtime`,
`ai`, `net`, `persistence`, or `ui`.

**Impact:**

- Every new test invents its own mocking style.
- DI seams differ between modules with no rationale.
- Reviewers cannot tell if a module is "well-tested" without
  reading every test file.

**Solution:** Author a single `unit-test-contract.md` that lists,
per module: the DI seams the module must expose, the canonical
fakes that consume those seams, and the unit-test rubric (what
must be covered to call a feature "tested"). This is a contract
doc, not a fake implementation; the fakes themselves are added
incrementally as each module first needs them.

**Files to Update:**

- [docs/architecture/master-plan.md](../architecture/master-plan.md)
  — single-line cross-reference to the new contract doc under
  the module breakdown.

**New Files:**

- `docs/architecture/testing/unit-test-contract.md` — the
  per-module rubric. One subsection per module: `engine`, `rules`,
  `content-runtime`, `ai`, `net`, `persistence`, `ui`. Each
  subsection lists DI seams (interface name + responsibility),
  canonical fakes (file path + behavior), and the rubric (e.g.
  for `rules`: "every formula in `formula.schema.json` must have
  at least one unit test asserting evaluator output for one
  canonical input").
- `tasks/mvp/02-tooling/03-unit-test-contract.md` — owns the
  contract doc and the master-plan cross-reference.

**Implementation Steps:**

1. Author the contract doc, drawing from the existing module
   responsibilities in
   [docs/architecture/overview.md](../architecture/overview.md)
   and [docs/architecture/master-plan.md](../architecture/master-plan.md).
2. Author the new task with `ownedPaths` over the doc and the
   master-plan cross-reference.
3. Run `npm run validate`.

**Dependencies:** None.

**Complexity:** M (writing dominates; no code).

---

#### Issue: No replay corpus or replay-as-regression runner

**Source:** Q252 (⚠ Partial), Missing Logic #2, Improvement: "Add
a `tests/replays/*.replay.json` corpus and a replay-regression
task; require a replay for every fixed mechanics bug."

**Problem:** Replay API exists
([tasks/mvp/01-engine-core/08-replay-api.md](../../tasks/mvp/01-engine-core/08-replay-api.md))
and saves/replays/multiplayer pin `contentHash` + `engineHash`, so a
stored replay must reproduce the exact same final state. But there
is no checked-in replay corpus, no replay-regression runner, and no
policy on **when** to add a replay (e.g. on every fixed bug).

**Impact:**

- Bug fixes for mechanics regressions land with no test that locks
  the fix.
- Six months later, the same bug can return undetected.
- The replay primitive's regression-test value is unrealized.

**Solution:** Add `tests/replays/` with a documented naming
convention `bug-<issue-id>-<short-name>.replay.json`. Author a
runner that loads every `*.replay.json`, replays it, and asserts
the recorded `expectedFinalStateHash` matches actual. Document the
policy: every PR that fixes a mechanics bug must add a replay that
fails before the fix and passes after.

**Files to Update:**

- [package.json](../../package.json) — add `test:replays` script.
- [tasks/mvp/01-engine-core/10-github-actions-ci.md](../../tasks/mvp/01-engine-core/10-github-actions-ci.md)
  — add `npm run test:replays` to CI steps.
- [docs/architecture/determinism.md](../architecture/determinism.md)
  — single sentence in "Replay" section pointing at the corpus.

**New Files:**

- `tests/replays/README.md` — naming convention, "one replay per
  fixed mechanics bug" policy, the
  `expectedFinalStateHash` field requirement.
- `tests/replays/.gitkeep`
- `src/engine/__tests__/replays.test.ts` — the runner.
- `tasks/mvp/01-engine-core/12-replay-regression-suite.md` —
  owns the runner, the corpus directory, and the determinism-doc
  cross-reference. Lists Task 8 as a dependency.

**Implementation Steps:**

1. Extend the replay format spec inside Task 8 to include
   `expectedFinalStateHash` (a single field; back-compatible).
2. Author the runner.
3. Author the corpus README and the policy.
4. Author Task 12 with appropriate `ownedPaths`.
5. Update CI task acceptance.
6. Run `npm run validate`.

**Dependencies:**
- mvp.01-engine-core.08-replay-api
- This plan's golden-state task (above) — same canonical-hash
  primitive; landing them together amortizes review.

**Complexity:** S.

---

#### Issue: No property-based testing layer

**Source:** Q253 (❌ UNKNOWN), Missing Logic #3, Improvement: "Adopt
`fast-check` for invariant tests on the rules/formula evaluator and
the canonical serializer."

**Problem:** No mention of `fast-check` or any property-based
testing tool in the architecture, planning, or task files. The
existing fuzz harness
([tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md](../../tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md))
is randomized differential testing — same input into two engines —
not invariant testing. Likewise the canonical-JSON fuzz test
([tasks/mvp/01-engine-core/07b-canonical-json.md](../../tasks/mvp/01-engine-core/07b-canonical-json.md))
uses random JSON values but does not declare invariants in a
property-test framework.

**Impact:**

- Invariants of the formula evaluator (e.g. "damage is
  non-negative", "no division by zero", "deterministic for fixed
  inputs") are not asserted across a generated input space.
- Canonical serializer round-trip identity holds for the random
  10,000-value test but is not generalized to a shrinking
  property test.
- Future rule additions (e.g. spell formulas) have no invariant
  scaffold to plug into.

**Solution:** Adopt `fast-check`. Author two initial property test
files: `src/rules/__tests__/formula-invariants.property.test.ts`
and `src/engine/__tests__/canonical-json.property.test.ts`. Define
a small set of canonical invariants: formula evaluator is pure,
canonical JSON round-trip is identity, fixed-point math is
associative within the documented bounds. Document the
pattern so subsequent modules add their own.

**Files to Update:**

- [package.json](../../package.json) — add `fast-check` as a
  devDependency.
- [tasks/mvp/01-engine-core/07b-canonical-json.md](../../tasks/mvp/01-engine-core/07b-canonical-json.md)
  — note the property-test pair as a downstream consumer (no
  `ownedPaths` change).
- [docs/architecture/testing/unit-test-contract.md](../architecture/testing/unit-test-contract.md)
  *(new file from the contract issue above)* — add a "Property
  testing" subsection.

**New Files:**

- `src/rules/__tests__/formula-invariants.property.test.ts`
- `src/engine/__tests__/canonical-json.property.test.ts`
- `tasks/mvp/02-tooling/04-property-based-testing.md` — owns
  the two test files and the contract subsection. Lists the
  unit-test contract task as a dependency.

**Implementation Steps:**

1. Add `fast-check` to devDependencies.
2. Author the two property test files with three invariants each
   (kept small to anchor the pattern).
3. Author the new task with `ownedPaths` covering only the test
   files and the contract subsection.
4. Run `npm test` to confirm the property tests run inside the
   existing Vitest pipeline.
5. Run `npm run validate`.

**Dependencies:**
- This plan's unit-test contract task (above).

**Complexity:** S.

---

#### Issue: No edge-case scenario fixture catalogue

**Source:** Q258 (❌ UNKNOWN), Missing Logic #7, Risk #6 ("Edge
cases (empty garrisons, dead-hero victories, resource-overflow
turns) are not pinned by fixtures, so refactors can change behavior
with no failing test"), Improvement: "(implicit) checked-in
edge-case scenarios with paired golden hashes."

**Problem:** [content-schema/examples/](../../content-schema/examples/)
holds canonical examples per schema, not edge-case scenarios.
[src/persistence/](../../src/persistence/) is described in
[docs/architecture/overview.md](../architecture/overview.md) as
owning saves/replays/scenarios, but no task owns an
`__fixtures__/edge-cases/` corpus or equivalent.

**Impact:**

- "Siege with empty garrison", "stack of 1 vs 1000",
  "all-heroes-dead victory", "out-of-resources turn", and similar
  edge cases are unpinned by tests.
- Refactors can change behavior in these corner cases with no
  failing test.
- The golden-state suite (above) needs concrete scenarios to
  hash; without an edge-case catalogue, that suite covers only
  the canonical happy path.

**Solution:** Author a catalogue under
`tests/__fixtures__/edge-cases/` of small scenario JSON files
(pinned by the existing
[content-schema/schemas/scenario.schema.json](../../content-schema/schemas/scenario.schema.json)).
Each scenario is named for the edge it exercises, has a one-line
purpose comment in a sibling `INDEX.md`, and is consumed by the
golden-state suite to produce a checked-in hash. Initial seed of
six scenarios drawn from the audit's enumerated examples (empty
garrison, single-stack vs large stack, dead-heroes victory,
resource-overflow turn, full-inventory hero artifact pickup,
zero-mana spell attempt).

**Files to Update:**

- [docs/architecture/overview.md](../architecture/overview.md) —
  one-line cross-reference under `src/persistence/` mention.

**New Files:**

- `tests/__fixtures__/edge-cases/INDEX.md` — one line per
  fixture with the edge it exercises.
- `tests/__fixtures__/edge-cases/empty-garrison.scenario.json`
- `tests/__fixtures__/edge-cases/stack-1-vs-1000.scenario.json`
- `tests/__fixtures__/edge-cases/all-heroes-dead-victory.scenario.json`
- `tests/__fixtures__/edge-cases/resource-overflow-turn.scenario.json`
- `tests/__fixtures__/edge-cases/full-inventory-pickup.scenario.json`
- `tests/__fixtures__/edge-cases/zero-mana-spell-attempt.scenario.json`
- `tasks/mvp/02-tooling/05-edge-case-fixtures.md` — owns the
  catalogue and the overview-doc cross-reference. Lists the
  golden-state task as a downstream consumer.

**Implementation Steps:**

1. Author the six scenario fixtures, validating each against
   `scenario.schema.json` via existing
   [scripts/check-repo-contracts.mjs](../../scripts/check-repo-contracts.mjs).
2. Author INDEX.md describing each.
3. Author the new task.
4. The golden-state task (above) consumes these fixtures: each
   scenario gets a corresponding golden fixture pinning its
   expected post-replay state hash.
5. Run `npm run validate`.

**Dependencies:**
- Scenario schema + scenario loader exist (mvp.08-persistence.04).

**Complexity:** M.

---

### Engine Layer

#### Issue: No engine-throughput SLO or benchmark task

**Source:** Q260 (⚠ Partial), Missing Logic #9, Improvement: "Add
an engine-throughput benchmark task with a target (e.g. ≥ 100k
commands/sec on M1 Node 20) and track regressions."

**Problem:** The fuzz harness implies fast execution (1000 cmds × 5
seeds < 10 s), but no explicit throughput SLO exists. The
[Phase-3 MCTS performance benchmark](../../tasks/phase-3/03-mcts-ai/06-performance-benchmark-plus-headless-eval.md)
benchmarks the AI, not the engine.

**Impact:**

- Engine performance can regress 5× without any test failing,
  because the fuzz harness only fails at a 5× regression past 10 s.
- AI training (MCTS, headless tournaments) silently slows when
  the engine slows, with no signal pointing at the cause.
- "Stress mode" use cases (1M-command replays, server-side
  validation) have no SLO to plan against.

**Solution:** Author a benchmark harness under
`src/engine/__tests__/throughput.bench.ts` using
[`vitest bench`](https://vitest.dev/guide/features.html#benchmarking)
(no new dependency). Targets: command dispatch throughput
≥ 100 000 commands/sec on Node 20 (cold), state hash ≥ 50 MB/sec on
canonical JSON output, replay loader ≥ 10 000 commands/sec.
Document the targets and the measurement method (which scenario,
which seed, which warmup count). CI runs the bench in a non-gating
mode (records numbers, comments on PR with delta) — flipped to
gating only after a stability window because microbenchmarks are
noisy on shared CI runners.

**Files to Update:**

- [package.json](../../package.json) — add `test:bench:engine` script.
- [tasks/mvp/01-engine-core/10-github-actions-ci.md](../../tasks/mvp/01-engine-core/10-github-actions-ci.md)
  — add a non-gating bench step + PR comment behavior.

**New Files:**

- `docs/architecture/testing/engine-throughput-slo.md` — names
  the three SLO targets, the measurement method, and the policy
  for tightening them as the engine matures.
- `src/engine/__tests__/throughput.bench.ts` — the benchmark
  file.
- `tasks/mvp/01-engine-core/13-engine-throughput-benchmark.md`
  — owns the doc, the bench file, and the CI step. Lists Task 6
  (command dispatcher) and Task 7 (state serializer + hash) as
  dependencies.

**Implementation Steps:**

1. Author the SLO doc with three targets and rationale.
2. Author the bench file using `vitest bench`.
3. Author the new task.
4. Update CI task acceptance to add the non-gating bench step
   and the PR-delta-comment behavior (e.g. via
   `vitest bench --reporter=json` + a small reporter script).
5. Run `npm run validate`.

**Dependencies:**
- mvp.01-engine-core.06-command-dispatcher
- mvp.01-engine-core.07-state-serializer-plus-xxh64-hash
- mvp.01-engine-core.08-replay-api

**Complexity:** M.

---

### AI Layer

#### Issue: No reusable AI tournament harness — eval criteria are scattered

**Source:** Q255 (⚠ Partial), Missing Logic #4, Risk #4 ("AI
quality is gated on per-task win rates with no shared metric, so
cross-AI regressions (e.g. heuristic AI degrades after MCTS lands)
may go unnoticed"), Improvement: "Promote the ad-hoc headless eval
tasks into one shared `src/ai/__tests__/tournament.ts` runner
emitting standard metrics (winrate, decision-time, branching)."

**Problem:** Tournament-style evaluation appears as exit criteria in
four separate tasks
([phase-2/02-strategic-ai/05](../../tasks/phase-2/02-strategic-ai/05-grand-master-difficulty-plus-headless-evaluation.md),
[phase-2/03-second-faction/06](../../tasks/phase-2/03-second-faction/06-balance-check-emberwild-vs-necropolis-headless-games.md),
[phase-3/03-mcts-ai/06](../../tasks/phase-3/03-mcts-ai/06-performance-benchmark-plus-headless-eval.md),
plus the user-facing
[phase-3/04-polish/04-tournament-mode-ui](../../tasks/phase-3/04-polish/)).
Each invents its own runner, its own metric, and its own pass/fail
threshold.

**Impact:**

- Cross-AI regressions (heuristic AI degrades after MCTS lands)
  are invisible because each AI is benchmarked in its own silo.
- Three implementations of "100 headless games, count wins" exist
  in parallel.
- A new AI difficulty has no harness to plug into; it must
  re-author the loop.

**Solution:** Author `src/ai/__tests__/tournament.ts` — a single
reusable bracket runner. Inputs: `{aiA, aiB, gamesPerMatch, seed,
contentPack}`. Outputs: standard metrics struct
(`{winRateA, winRateB, drawRate, avgDecisionTimeMs, avgBranching,
avgGameLengthTurns}`). The four existing tasks switch from
authoring their own runners to consuming the shared one — they keep
their own pass/fail thresholds, but stop owning the loop and the
metrics.

**Files to Update:**

- [tasks/phase-2/02-strategic-ai/05-grand-master-difficulty-plus-headless-evaluation.md](../../tasks/phase-2/02-strategic-ai/05-grand-master-difficulty-plus-headless-evaluation.md)
  — change "100 headless games" prose to "100 games via shared
  tournament harness"; update `Dependencies` to add the new task.
- [tasks/phase-2/03-second-faction/06-balance-check-emberwild-vs-necropolis-headless-games.md](../../tasks/phase-2/03-second-faction/06-balance-check-emberwild-vs-necropolis-headless-games.md)
  — same edit pattern.
- [tasks/phase-3/03-mcts-ai/06-performance-benchmark-plus-headless-eval.md](../../tasks/phase-3/03-mcts-ai/06-performance-benchmark-plus-headless-eval.md)
  — same edit pattern; explicitly note that the perf-benchmark
  half remains owned by this task.
- [docs/architecture/master-plan.md](../architecture/master-plan.md)
  — single-line cross-reference under `src/ai/`.

**New Files:**

- `docs/architecture/testing/ai-tournament-harness.md` — defines
  the input/output shape, the metric definitions, and the
  reproducibility contract (PCG32 seed → identical bracket
  outcome).
- `src/ai/__tests__/tournament.ts` — the runner.
- `content-schema/schemas/tournament-result.schema.json` — the
  metrics struct schema, `additionalProperties: false`.
- `content-schema/examples/tournament-result/canonical.json`
- `tasks/phase-2/09-ai-tournament-harness.md` — owns the doc,
  the runner, the schema and example. Lists the engine's headless
  primitives (Tasks 6, 7, 8 of M0) as dependencies. Sits in
  Phase-2 because the first consumer is `phase-2/02-strategic-ai/05`.

**Implementation Steps:**

1. Author the harness doc with the metric definitions.
2. Author the schema and example.
3. Author the runner with the PCG32-seeded bracket logic.
4. Author the new task with appropriate `ownedPaths`.
5. Edit the three consumer tasks to cite the harness rather than
   author their own runners.
6. Run `npm run validate:tasks` and `npm run validate`.

**Dependencies:**
- mvp.01-engine-core.06-command-dispatcher
- mvp.01-engine-core.08-replay-api

**Complexity:** M.

---

## 4. Suggested Task Breakdown

New task files (one Markdown task per item, sized to fit the existing
M0 and M-Phase conventions). The `tasks/mvp/02-tooling/` folder
itself does not exist today and is created by this plan; the layout
mirrors `tasks/mvp/01-engine-core/`.

- [ ] `tasks/mvp/02-tooling/01-ui-smoke-harness.md`
      — Vitest browser harness, `tasks.mjs` `ownedPaths` rule.
- [ ] `tasks/mvp/02-tooling/02-coverage-gate.md`
      — `vitest --coverage` with per-module thresholds.
- [ ] `tasks/mvp/02-tooling/03-unit-test-contract.md`
      — DI seams, canonical fakes, per-module rubric.
- [ ] `tasks/mvp/02-tooling/04-property-based-testing.md`
      — `fast-check` invariants for rules + canonical JSON.
- [ ] `tasks/mvp/02-tooling/05-edge-case-fixtures.md`
      — six initial scenario fixtures + INDEX.
- [ ] `tasks/mvp/01-engine-core/11-golden-state-suite.md`
      — `tests/__fixtures__/golden/` corpus + runner + bless script.
- [ ] `tasks/mvp/01-engine-core/12-replay-regression-suite.md`
      — `tests/replays/` corpus + runner + policy.
- [ ] `tasks/mvp/01-engine-core/13-engine-throughput-benchmark.md`
      — `vitest bench` SLO + non-gating CI step.
- [ ] `tasks/phase-2/09-ai-tournament-harness.md`
      — shared bracket runner + metrics schema.
- [ ] `tasks/phase-3/01-multiplayer/09-network-chaos-harness.md`
      — NetSim transport + four chaos scenarios.

Edits to existing tasks (extend acceptance criteria; do **not**
change `ownedPaths`):

- [ ] Edit
      `tasks/mvp/01-engine-core/02-set-up-vite-plus-typescript-strict-mode-per-module.md`
      to require the per-module coverage thresholds in
      `vitest.config.ts`.
- [ ] Edit
      `tasks/mvp/01-engine-core/07b-canonical-json.md` to note the
      property-test consumer.
- [ ] Edit
      `tasks/mvp/01-engine-core/08-replay-api.md` to add the
      `expectedFinalStateHash` field to the replay format.
- [ ] Edit
      `tasks/mvp/01-engine-core/10-github-actions-ci.md` to add
      `npm run test:ui-smoke`, `npm run test:golden`,
      `npm run test:coverage`, `npm run test:replays`, and the
      non-gating `test:bench:engine` step.
- [ ] Edit each of the four multiplayer tasks (3, 5, 6, 7) to
      require passing the corresponding chaos scenario.
- [ ] Edit
      `tasks/phase-2/02-strategic-ai/05-grand-master-difficulty-plus-headless-evaluation.md`,
      `tasks/phase-2/03-second-faction/06-balance-check-emberwild-vs-necropolis-headless-games.md`,
      and `tasks/phase-3/03-mcts-ai/06-performance-benchmark-plus-headless-eval.md`
      to consume the shared tournament harness.

Each new task must declare `ownedPaths` covering only the schemas /
docs / scripts / test files it introduces, with `Dependencies` on
existing tasks listed in §3 above. Run `npm run validate:tasks`
after each.

---

## 5. Execution Order

Topological order — strict prerequisites only. Items on the same
row may be done in any order within the row.

1. **Pure documentation, no runtime impact** (safe to land in any
   order; unblocks everything downstream):
   - `tasks/mvp/02-tooling/03-unit-test-contract.md`
   - `docs/architecture/testing/ui-smoke-contract.md` (part of
     task 02-tooling/01)
   - `docs/architecture/testing/coverage-policy.md` (part of
     task 02-tooling/02)
   - `docs/architecture/testing/engine-throughput-slo.md` (part of
     engine-core/13)
   - `docs/architecture/testing/ai-tournament-harness.md` (part
     of phase-2/09)
2. **Coverage gate + UI smoke harness** (Critical Fixes block):
   - `tasks/mvp/02-tooling/02-coverage-gate.md`
   - `tasks/mvp/02-tooling/01-ui-smoke-harness.md`
   These ship in parallel; both extend CI and `tasks.mjs done`
   once and only once.
3. **Golden-state + replay-regression + edge-case fixtures**
   (must land together: edge-case scenarios become golden fixtures;
   replay-regression shares the same canonical-hash runner pattern):
   - `tasks/mvp/01-engine-core/11-golden-state-suite.md`
   - `tasks/mvp/01-engine-core/12-replay-regression-suite.md`
   - `tasks/mvp/02-tooling/05-edge-case-fixtures.md`
4. **Property-based testing layer** (depends on the unit-test
   contract):
   - `tasks/mvp/02-tooling/04-property-based-testing.md`
5. **Engine throughput benchmark** (depends on engine-core 6/7/8;
   safe in parallel with step 4):
   - `tasks/mvp/01-engine-core/13-engine-throughput-benchmark.md`
6. **AI tournament harness** (Phase-2 consumer; lands when
   `phase-2/02-strategic-ai/05` is being authored, not before):
   - `tasks/phase-2/09-ai-tournament-harness.md`
   - then the three consumer-task edits.
7. **Network chaos harness** (Phase-3; depends on the four
   multiplayer task interfaces being declared first):
   - `tasks/phase-3/01-multiplayer/09-network-chaos-harness.md`
   - then the four consumer-task edits.
8. **Final validation:** `npm run generate:task-system-report`,
   `npm run validate:tasks`, `npm run validate`. Confirm the
   schema-matrix lists every new schema, every new task is in the
   registry, every new doc is linked from the wiki index, the
   `02-tooling/` folder appears under the M0 module page, and the
   tooling tasks have a `Module:` line that resolves.

Steps 1–5 are M0-scoped and can land before Phase-2 starts. Steps 6
and 7 are scheduled with their respective phases.

---

## 6. Risks if Not Implemented

The audit's Risk list, restated as the operational consequence of
shipping the next layer (Phase-2 AI, Phase-3 multiplayer, any
ranked/competitive surface) without each fix:

- **No UI smoke layer** → "tests pass headless, UI breaks live" on
  every Phase-2 screen task. The bug only surfaces in manual QA;
  CI never catches it. Already explicitly named by prior audits
  and still unmitigated.
- **No golden-state suite** → unintended *intentional* mechanics
  changes ship undetected. Differential fuzz catches
  non-determinism but not silent rule changes.
- **No network chaos harness** → first lossy network is
  production. Reconnection, host migration, and auto-bisect are
  exercised at the protocol level only; under realistic transport
  conditions they may exhibit untested failure modes.
- **No coverage gate** → `content-runtime/` and `persistence/`
  ship with whatever tests their authors happened to write.
  No subsystem-level signal exists.
- **No replay-regression runner** → mechanics bug fixes are not
  pinned by replays; the same bug can recur in 6 months.
- **No property-based tests** → invariants of formula evaluator
  and canonical serializer are not asserted across an input space.
  A round-trip-breaking JSON value type lands undetected.
- **No edge-case fixture catalogue** → "siege with empty
  garrison", "stack of 1 vs 1000", "all-heroes-dead victory" are
  unpinned. Refactors silently change behavior.
- **No AI tournament harness** → cross-AI regressions invisible.
  Heuristic AI degrades after MCTS lands and nothing flags it
  because each AI is benchmarked in its own silo.
- **No engine throughput SLO** → engine performance can regress
  5× silently. AI training and 1M-command replays slow with no
  signal pointing at the engine layer.
- **No per-system unit-test contract** → every new test invents
  its own mocking style. Reviewers cannot tell if a module is
  "well-tested" without reading every file.

---

## 7. AI Implementation Readiness

Score: **9/10** *(after this plan lands; today's score is 6/10
per the audit)*.

Reason: Once the schemas, docs, and runners in §4 land and the
existing tasks are edited to consume them, every gap the audit
names becomes a documented contract that an autonomous
implementer can satisfy without inventing test scaffolding. The
remaining 1 point reflects items that **cannot** be closed at the
contract layer alone — choosing a hosted CI runner spec stable
enough for gating microbenchmarks, picking the headless browser
binary version for `vitest --browser` reproducibly, and tuning
the coverage thresholds against actual measured baselines once
modules exist — which are operational decisions, correctly
deferred until the contracts have been exercised on real code.
