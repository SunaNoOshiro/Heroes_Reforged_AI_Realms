# Testing Conventions

> Source plan:
> [`docs/implementation-plans/16-implementation-readiness-plan.md`](../implementation-plans/16-implementation-readiness-plan.md)
> (T10). The actual fake catalogue and per-test-type mechanics are
> owned by
> [`docs/implementation-plans/15-testability-plan.md`](../implementation-plans/15-testability-plan.md)
> and the docs in [`docs/architecture/testing/`](./testing/).

This file is the canonical convention an AI agent or contributor reads
before writing a test. It answers five recurring questions:

1. How do I inject dependencies?
2. Where do shared fakes live, and which ones already exist?
3. When do I mock something vs. let it run?
4. What is the per-module unit-test rubric I must satisfy?
5. Which modules require fuzz / property-based tests vs. unit-only?

---

## 1. Dependency injection

The deterministic core (`src/engine/`, `src/rules/`,
`src/content-runtime/` paths that read inputs) **never** uses a
module-global singleton for an environmental dependency. The
following are always injected:

- the seeded RNG (`Rng` interface),
- the frame-counter clock (`Clock` interface),
- the ID allocator,
- the `PackRegistry`,
- the `AssetLoader`,
- the `CommandBus`,
- the `NetTransport` (when the engine is wrapped in multiplayer).

The TS interface for each handle lives in
[`src/contracts/`](../../src/contracts/) (see T7 in the source plan).
A module accepts the handle through its constructor or through the
factory function that builds it. Code that needs the handle does **not**
import it from a module-level variable.

Consequences:

- Tests construct the module with explicit fake handles.
- Production code constructs the module once at the composition root
  (per the boundary table in [`state-flow.md`](./state-flow.md)).
- Replacing a real handle with a fake never requires monkey-patching.

**Allowed singletons (presentation tier only):** the React root, the
Zustand store, the WebGL context. These are `src/ui/` and
`src/renderer/` concerns and never enter the deterministic path.

---

## 2. Shared fake catalogue

Canonical in-memory implementations live under
[`src/contracts/fakes/`](../../src/contracts/fakes/). Every cross-
module contract in `src/contracts/` ships at least one fake here.

The **rule**: if you need a fake of a contract that is published in
`src/contracts/`, **import the shared fake**. Do not write a new fake
in your test file. If the shared fake is missing a capability you
need, extend the shared fake (and add a test for the new capability).

Inventory (initial; extends as `src/contracts/` grows):

- `FakeRng` — deterministic seeded counter.
- `FakeClock` — frame-counter clock with `tick()`.
- `FakeIdAllocator` — monotonic counter.
- `FakePackRegistry` — in-memory registry seeded from a JS object.
- `FakeAssetLoader` — synchronous in-memory blob store.
- `FakeCommandBus` — appends to an array; replays via `flush()`.
- `FakeNetTransport` — the deterministic `NetSim` from
  [`net-transport.md`](./net-transport.md).

The actual fake bodies are landed by
[`15-testability-plan.md`](../implementation-plans/15-testability-plan.md).
This doc only fixes the **location** and **import discipline**.

---

## 3. Mocking policy

The convention is **mock at the contract surface, not at the
implementation surface**.

| Test type | Engine | Renderer | UI | AI | Net | Persistence |
|---|---|---|---|---|---|---|
| Engine unit / fuzz | real reducer | (n/a) | (n/a) | (n/a) | (n/a) | (n/a) |
| Engine golden replay | real reducer + real ruleset | (n/a) | (n/a) | (n/a) | (n/a) | (n/a) |
| Renderer unit | fake `EngineSnapshot` | real renderer | (n/a) | (n/a) | (n/a) | (n/a) |
| UI smoke | fake `EngineSnapshot` + fake `CommandBus` | jsdom-only render or headless WebGL | real React | (n/a) | (n/a) | (n/a) |
| AI worker | real engine snapshot fixture | (n/a) | (n/a) | real worker | (n/a) | (n/a) |
| Multiplayer integration | real engine | (n/a) | (n/a) | (n/a) | `FakeNetTransport` (NetSim) | (n/a) |
| Persistence integration | real engine | (n/a) | (n/a) | (n/a) | (n/a) | real `IndexedDB` (fake-indexeddb in CI) |

**Critical rule**: tests that target the engine **do not mock the
engine**. They construct the real reducer and run it with seed +
commands. If your test needs to "mock the engine", you are testing the
wrong thing.

Tests that target a downstream consumer (UI, renderer, net) mock the
engine via the `EngineSnapshot` / `CommandBus` contract surface. They
do **not** stub internal engine functions.

---

## 4. Per-module unit-test rubric

Each module that owns code under `src/` must satisfy:

- **Happy path** — every public function exported from the module's
  `src/<module>/index.ts` (or named entry) has at least one test that
  exercises the success path with realistic inputs.
- **Determinism golden** — every effect emitter (anything that emits
  events the renderer consumes) has a golden-replay test that runs a
  fixed seed + command list and asserts the resulting event log matches
  a checked-in golden.
- **Edge cases** — every branch flagged in
  [`edge-cases-policy.md`](./edge-cases-policy.md) for the module is
  covered by a unit or integration test.
- **NFR guard** — every NFR row in
  [`non-functional-requirements.md`](./non-functional-requirements.md)
  with `Owning module = <this module>` ships a benchmark task that
  references the row.

The detailed unit-test contract (test file naming, fixture layout,
golden-bless workflow) lives in
[`testing/unit-test-contract.md`](./testing/unit-test-contract.md).

---

## 5. Fuzz / property targets

| Module | Test type required | Where |
|---|---|---|
| `src/engine/` | property-based + fuzz | `mvp.01-engine-core.fuzz` (existing); + edge-case fuzz harness `mvp.09-tactical-combat.12-edge-case-fuzz-harness` |
| `src/rules/` | property-based (formula evaluator round-trip) | `mvp.02-tooling.04-property-based-testing` |
| `src/content-runtime/` | unit + integration (loader scenarios) | `mvp.02-content-schemas.*` |
| `src/content-schema/` | schema-roundtrip property tests | `mvp.02-tooling.04-property-based-testing` |
| `src/persistence/` | integration with `fake-indexeddb` | `mvp.08-persistence.*` |
| `src/net/` | integration via `FakeNetTransport` (NetSim) | `phase-3.01-multiplayer.12-network-chaos-harness` |
| `src/ai/` | tournament harness (deterministic) | [`testing/ai-tournament-harness.md`](./testing/ai-tournament-harness.md) |
| `src/renderer/` | snapshot + frame-budget guard | `mvp.06-renderer.*`, `mvp.00-perf.*` |
| `src/ui/` | smoke (jsdom or headless) | [`testing/ui-smoke-contract.md`](./testing/ui-smoke-contract.md) |
| `src/editor/` | smoke + content-roundtrip | future editor tasks |

If a module is **not** in this table and lands code under `src/`,
that is a bug — add the row in the same PR.

---

## 6. Escape hatches and prohibitions

- Tests must not reach for `Math.random()` or `Date.now()` directly.
  Use `FakeRng` / `FakeClock`. (The wall-clock lint catches this in
  production code; tests follow the same rule by convention.)
- Tests must not pull production network or storage. The shared
  fakes cover both.
- Tests must not call `process.exit()` or skip via `--bail` to mask
  flakes. A flaky test is a bug; quarantine it with a tracked issue
  in the issue tracker, not with a `TODO` marker in the file (the
  `TBD` / `TODO` grep gate forbids the literal markers in canonical
  paths).

---

## 7. Verified by

- [`scripts/check-cross-references.mjs`](../../scripts/check-cross-references.mjs)
  enforces that every `Verify:` block in a `src/`-touching task names
  at least one test command (T10 cross-ref rule, planned with the
  `validate:tasks` extension below).
- [`scripts/check-repo-contracts.mjs`](../../scripts/check-repo-contracts.mjs)
  refuses bare placeholder markers in this file.
- The detailed test mechanics are pinned in
  [`testing/unit-test-contract.md`](./testing/unit-test-contract.md),
  [`testing/coverage-policy.md`](./testing/coverage-policy.md),
  [`testing/ui-smoke-contract.md`](./testing/ui-smoke-contract.md),
  and [`testing/ai-tournament-harness.md`](./testing/ai-tournament-harness.md).

---

## 8. Script and test file extensions

Pinned per Plan 32 § PI-3:

- All scripts under `scripts/` ship as `.mjs` until Task
  [`mvp.01-engine-core.02-set-up-vite-plus-typescript-strict-mode-per-module`](../../tasks/mvp/01-engine-core/02-set-up-vite-plus-typescript-strict-mode-per-module.md)
  (the Vite/TS bootstrap) lands. Once it does, scripts migrate
  `.mjs` → `.ts` in batches per module under a new follow-up task.
- Tests under `src/**/__tests__/` are permitted as `.ts` and run
  via `node --experimental-strip-types --test` **only until the
  Vite/TS bootstrap task lands**. That task migrates the existing
  `node:test` files to the Vitest API and rewires `npm test` to
  invoke Vitest. After that, the runner is Vitest and the StrykerJS
  mutation-test gate (owned by
  [`mvp.02-tooling.06-mutation-test-gate`](../../tasks/mvp/02-tooling/06-mutation-test-gate.md))
  runs scoped to each task's `ownedPaths` before
  `npm run tasks:done` flips status; the gate's loop and anti-cheat
  rules are pinned in
  [`.claude/skills/mutation-test/SKILL.md`](../../.claude/skills/mutation-test/SKILL.md).
- Tests under `scripts/__tests__/` (gate tests for repo tooling)
  stay on Node's built-in `node --test` runner permanently and are
  **not** in scope for the Vitest migration above. They exercise
  pure-Node `.mjs` scripts that have no need for the Vitest browser
  / jsdom features, and StrykerJS does not mutate `scripts/`. The
  trust-anchor `node --test scripts/__tests__/*.test.mjs` invocation
  in `package.json` is the canonical wiring.

## 9. Locked runner + mutation-gate values (2026-05-06)

The choices below are repo-owned and threshold changes go through a
separate PR with a written rationale, not a drive-by tweak.

- **Runner:** Vitest 4.x.
- **Mutation framework:** StrykerJS 9.x via
  `@stryker-mutator/vitest-runner`.
- **Coverage analysis:** `perTest` (Stryker's
  [per-test analysis mode](https://stryker-mutator.io/docs/stryker-js/configuration/#coverageanalysis-string)
  that gives a 5–10× speedup over the off / all alternatives).
- **Mutation-score floors** (kills/total):

  | Module class | Floor |
  |---|---|
  | `engine`, `rules`, `content-schema`, `content-runtime`, `net`, `shared` | 80 % |
  | `contracts`, `services` | 75 % |
  | `ui`, `renderer` | 65 % |

- **Coverage floors** (lines / branches):

  | Module class | Lines | Branches |
  |---|---|---|
  | `engine`, `rules`, `content-schema`, `content-runtime`, `net`, `shared` | 90 % | 80 % |
  | `contracts`, `services` | 80 % | 70 % |
  | `ui`, `renderer` | 70 % | 60 % |

The thresholds and class assignments live in
[`scripts/lib/module-classes.mjs`](../../scripts/lib/module-classes.mjs).
A future "include `src/audio/`" change lands in that one file.

**Rationale.** `node:test` has no first-class StrykerJS plugin; the
command-runner workaround loses `perTest` coverage analysis (the
5–10× speedup that makes mutation testing affordable per task).
Mutation score is the only gate that catches the "test executes the
line but never asserts on the output" failure mode that pure
coverage misses — exactly the failure mode most likely under
autonomous AI execution. UI/renderer get lower floors because
mutation score is noisier on presentation code (snapshot tests,
DOM-event sequencing). Anti-cheat rules (no source deletion, no
assertion softening, no threshold lowering, no silent excludes, no
unjustified `// Stryker disable`) are documented in
[`.claude/skills/mutation-test/SKILL.md`](../../.claude/skills/mutation-test/SKILL.md).
