# Unit-Test Contract

Per-module rubric for what counts as "tested." Pins the dependency-
injection seams each module exposes, the canonical fakes that consume
those seams, and the bar a reviewer applies when asking "is this
module well-tested?"

> Companion specs:
>
> - [`testing-conventions.md`](../testing-conventions.md) — DI rules,
>   shared fake catalogue, and mocking policy that this file refines
>   per-module.
> - [`coverage-policy.md`](./coverage-policy.md) — line/branch floors
>   paired with this rubric.
> - [`ui-smoke-contract.md`](./ui-smoke-contract.md) — browser-side
>   gate for `src/ui/`.
> - [`ai-tournament-harness.md`](./ai-tournament-harness.md) —
>   behavioural-regression carrier for `src/ai/`.
> - [`multi-engine-harness.md`](../multi-engine-harness.md) — the
>   `createEngine(init)` factory contract used by `src/engine/`.
>
> Owning task:
> [`mvp.02-tooling.03-unit-test-contract`](../../../tasks/mvp/02-tooling/03-unit-test-contract.md).
> Property-test anchors land via
> [`mvp.02-tooling.04-property-based-testing`](../../../tasks/mvp/02-tooling/04-property-based-testing.md).

This file is a **contract**, not an implementation. Each fake-file
path below is a stable promise: when a module first needs a fake,
the implementer places it at the pinned path and owns it from then
on.

---

## 1. Global rules

- **Explicit DI seams.** No global singletons; every dependency is
  constructor- or factory-injected. The `createEngine(init)` factory
  in [`multi-engine-harness.md`](../multi-engine-harness.md) is the
  canonical shape; other modules follow the same pattern.
- **Fakes live next to the seam they fake.** The canonical fake for
  a module-local seam lives next to that seam, not in a generic
  `__mocks__/` pile. Fakes of contracts published in
  [`src/contracts/`](../../../src/contracts/) follow the shared-
  catalogue rule in
  [`testing-conventions.md` § 2](../testing-conventions.md#2-shared-fake-catalogue):
  import from
  [`src/contracts/fakes/`](../../../src/contracts/fakes/) rather
  than duplicate per-module.
- **Fakes are deterministic.** Even when faking a non-deterministic
  source (clock, network), the fake is seeded and reproducible.
- **Tests are colocated.** Every module owns a `__tests__/`
  subfolder; cross-module integration tests live in top-level
  `tests/` (deterministic fixtures under
  `tests/__fixtures__/golden/`) or under the consumer module's
  `__tests__/`.

## 2. Per-module rubric

Each subsection lists, in order, **DI seams**, **canonical fakes**,
**rubric**.

### 2.1 `src/engine/`

DI seams:

- `Rng` — `next(): bigint`, `nextInt(maxExclusive): number`,
  `fork(streamId): Rng`. Pure. No `Math.random()`.
- `Clock` — only the wall-clock readers in
  [`determinism.md` § Wall-clock readers](../determinism.md#wall-clock-readers)
  may consume this seam.
- `EngineFactory` — `createEngine(init)` per
  [`multi-engine-harness.md`](../multi-engine-harness.md).

Canonical fakes:

- `src/engine/__tests__/fakes/fake-rng.ts` — PCG32 with a fixed
  seed; reproducible across calls; supports `fork()`.
- `src/engine/__tests__/fakes/fake-clock.ts` — manually advanced;
  never reads `Date.now()`.

Rubric:

- Every command kind in
  [`content-schema/schemas/command.schema.json`](../../../content-schema/schemas/command.schema.json)
  has at least one accept-path test and one reject-path test.
- The canonical-JSON serializer round-trip is property-tested (see
  [§ 3](#3-property-testing)).
- The state-hash function is asserted byte-stable against the fixture
  catalogue under `tests/__fixtures__/golden/`.

### 2.2 `src/rules/`

DI seams:

- `RulesetContext` — pure record passed by value; no mutable state.
- `FormulaEvaluator` — pure function `evaluate(formula, vars,
  context): number`.

Canonical fakes:

- `src/rules/__tests__/fakes/fake-ruleset.ts` — minimal ruleset
  fixture; documented constants only, no hidden defaults.

Rubric:

- Every formula kind in
  [`content-schema/schemas/formula.schema.json`](../../../content-schema/schemas/formula.schema.json)
  has at least one unit test asserting evaluator output for one
  canonical input.
- Property tests cover the operator algebra: associativity of `add`,
  commutativity of `mul`, ordering of `min` / `max`, and the
  fixed-point invariants from
  [`determinism.md` § Fixed-Point Conventions](../determinism.md#fixed-point-conventions).

### 2.3 `src/content-runtime/`

DI seams:

- `PackLoader` — `load(packPath): Promise<Pack>`. Filesystem-backed
  in production; in-memory in tests.
- `AssetIndex` — read-only; missing entries follow the fallback rule
  in [`pack-contract.md`](../pack-contract.md).

Canonical fakes:

- `src/content-runtime/__tests__/fakes/in-memory-asset-index.ts` —
  constructed from a `Record<string, Asset>` literal; no I/O.
- `src/content-runtime/__tests__/fakes/in-memory-pack-loader.ts` —
  constructed from a `Record<string, PackRecord>` literal; supports
  override-precedence ordering.

Rubric:

- Every override-precedence rule pinned in
  [`content-system-policy.md`](../content-system-policy.md) has a
  unit test asserting the resolved record.
- The pack-error-code surface from
  [`pack-error-codes.md`](../pack-error-codes.md) is exhaustive:
  every code has a test that triggers it.

### 2.4 `src/ai/`

DI seams:

- `BotProvider` — pinned in
  [`ai-contract.md` § 8](../ai-contract.md#8-botprovider). Returns
  `Command` in bounded compute.
- `AiInputView` — pure projection of `GameState`; no live
  references.

Canonical fakes:

- `src/ai/__tests__/fakes/fake-bot.ts` — emits a fixed command
  sequence keyed by turn number; used by the tournament harness to
  test infrastructure (not AI quality).
- `src/ai/__tests__/fakes/fake-ai-input-view.ts` — minimal
  projection used for evaluator unit tests.

Rubric:

- Every difficulty level has a per-turn-budget test that asserts the
  bot returns within `maxNodes(difficulty, mapDims)`.
- Behavioural regressions ride on the AI tournament harness in
  [`ai-tournament-harness.md`](./ai-tournament-harness.md), not on
  line-coverage thresholds.

### 2.5 `src/net/`

DI seams:

- `NetTransport` — pinned in
  [`net-transport.md`](../net-transport.md). Both the real WebRTC
  transport and the deterministic NetSim test transport satisfy the
  same shape.
- `Peer` — wrapper over `NetTransport` adding sequence numbers;
  pure per-peer state.

Canonical fakes:

- `src/net/__tests__/netsim.ts` — owned by
  [`phase-3.01-multiplayer.12-network-chaos-harness`](../../../tasks/phase-3/01-multiplayer/12-network-chaos-harness.md);
  PCG32-seeded loss / jitter / reorder / partition transport.

Rubric:

- Every transport message type has a round-trip test
  (encode → decode → identity).
- Reconnection, auto-bisect, host migration, and lockstep each have
  a chaos-scenario test under NetSim. See the chaos task above for
  the per-scenario contract.

### 2.6 `src/persistence/`

DI seams:

- `Storage` — `get(key)`, `put(key, value)`, `delete(key)`,
  `list(prefix)`. IndexedDB-backed in production; in-memory in
  tests.
- `MigrationRegistry` — ordered list of `(fromVersion, toVersion,
  migrate)` records.

Canonical fakes:

- `src/persistence/__tests__/fakes/in-memory-storage.ts` — stub
  storage; deterministic iteration order.
- `src/persistence/__tests__/fakes/fixed-clock.ts` — for
  `metadata.createdAt` assertions.

Rubric:

- Every migration has at least one round-trip test:
  `migrate(oldRecord) → newRecord → migrate(newRecord) === newRecord`
  (idempotency of the latest-version migrator).
- Every save-format change adds a fixture under
  `tests/__fixtures__/saves/` so future migrations prove
  backward-compatibility.

### 2.7 `src/ui/`

UI is the one module where line coverage is intentionally not the
contract. The browser-side gate is the
[`UI smoke contract`](./ui-smoke-contract.md): every screen package
has one `<screen>.smoke.test.ts` that mounts, asserts bindings, and
fires interactions. Non-screen UI utilities (formatters, selectors)
follow the engine-style rubric: pure, deterministic, unit-tested.

DI seams:

- `Selector` — pure `(state, params) => derived`. Pinned in
  [`ui-state-contract.md` § Selector Purity](../ui-state-contract.md#selector-purity).
- `CommandEmitter` — `emit(command): void`. Constructor-injected.

Canonical fakes:

- `src/ui/__tests__/fakes/spy-command-emitter.ts` — records every
  emitted command; no side effects.

## 3. Property testing

Invariants of the formula evaluator and the canonical-JSON serializer
ride on a property-based testing layer (currently `fast-check`).
Files live next to the implementation under
`__tests__/*.property.test.ts`. The two anchor files are owned by
[`mvp.02-tooling.04-property-based-testing`](../../../tasks/mvp/02-tooling/04-property-based-testing.md):

- `src/rules/__tests__/formula-invariants.property.test.ts` — three
  invariants on the evaluator (purity, fixed-point bounds,
  zero-divisor handling).
- `src/engine/__tests__/canonical-json.property.test.ts` — three
  invariants on canonical JSON (round-trip identity, key-order
  insensitivity, byte stability).

New modules add their own property tests by copying the pattern;
the contract here is the file-naming + three-invariant convention,
not the specific properties.

## 4. Out of scope

- **E2E gameplay flows.** Higher-level suites are authored
  alongside the gameplay milestones that need them.
- **AI quality regressions.** Owned by the tournament harness
  ([§ 2.4](#24-srcai)).
- **UI visual regressions.** The UI smoke contract is the line;
  pixel diffs are deferred to a future task.

---

## 🔍 Sync Check

- **UI: ✔** — `src/ui/` subsection points at the canonical
  [`UI smoke contract`](./ui-smoke-contract.md) for the binding
  signal rather than restating it; the `Selector` seam resolves to
  [`ui-state-contract.md § Selector Purity`](../ui-state-contract.md#selector-purity).
- **Schema: ✔** — Engine and rules rubric rows reference
  [`command.schema.json`](../../../content-schema/schemas/command.schema.json)
  and
  [`formula.schema.json`](../../../content-schema/schemas/formula.schema.json)
  by canonical path; both files exist.
- **Tasks: ⚠** — Owning task
  [`mvp.02-tooling.03-unit-test-contract`](../../../tasks/mvp/02-tooling/03-unit-test-contract.md)
  requires every module from
  [`master-plan.md` § Important `src/` modules](../master-plan.md)
  to appear "exactly once"; this file covers seven of the ten
  modules listed there. Detail in `## ⚠ Issues`.

## ⚠ Issues

- **Missing module subsections versus the owning task's acceptance
  criteria.** [`master-plan.md` § Important `src/` modules](../master-plan.md)
  lists ten modules: `engine`, `rules`, `content-schema`,
  `content-runtime`, `renderer`, `ui`, `editor`, `ai`, `net`,
  `persistence`. This file covers seven; `src/content-schema/`,
  `src/renderer/`, and `src/editor/` have no rubric. The owning
  task [`mvp.02-tooling.03-unit-test-contract`](../../../tasks/mvp/02-tooling/03-unit-test-contract.md)
  explicitly requires "every implementation module from
  `master-plan.md` § Important `src/` modules exactly once"
  (Acceptance Criteria). Per Hard Prohibition B the audit did not
  invent new rubric content. Suggested values for the owner: 
  `src/content-schema/` — DI seam `SchemaValidator` (compiled Ajv
  validators), rubric "every `additionalProperties: false` schema
  has a canonical-example round-trip test";
  `src/renderer/` — binding signal is the frame-budget guard under
  the perf milestone per
  [`testing-conventions.md` § 5](../testing-conventions.md#5-fuzz--property-targets),
  so the rubric mirrors `src/ui/` (snapshot + non-frame-path
  utilities follow engine-style);
  `src/editor/` — per the same row, the rubric is "smoke +
  content-roundtrip" with owner "future editor tasks", so a
  one-line forward reference suffices.
- **Per-module fake paths versus the shared-fakes catalogue.**
  [`testing-conventions.md` § 2](../testing-conventions.md#2-shared-fake-catalogue)
  names a shared cross-module fake catalogue under
  [`src/contracts/fakes/`](../../../src/contracts/fakes/) (initial
  inventory: `FakeRng`, `FakeClock`, `FakeIdAllocator`,
  `FakePackRegistry`, `FakeAssetLoader`, `FakeCommandBus`,
  `FakeNetTransport`) and instructs implementers to "import the
  shared fake" rather than duplicate per-module. This file's
  § 2.1 pins `src/engine/__tests__/fakes/fake-rng.ts` and
  `src/engine/__tests__/fakes/fake-clock.ts` as canonical, which
  reads as a per-module duplicate of the shared `FakeRng` /
  `FakeClock`. § 1 of this rewrite adds a one-line clarifying note
  pointing at the shared catalogue, but the underlying inventory
  mismatch (which fakes are shared vs module-local, and where
  `FakeIdAllocator` / `FakePackRegistry` / `FakeAssetLoader` /
  `FakeCommandBus` actually live) is unresolved. Per Hard
  Prohibition D the audit did not edit `testing-conventions.md` or
  the shared-fakes package. Owner:
  [`mvp.02-tooling.03-unit-test-contract`](../../../tasks/mvp/02-tooling/03-unit-test-contract.md)
  reconciles by deciding, per seam, whether the canonical fake
  lives in `src/contracts/fakes/` or at the per-module path named
  here, and updating both files so the two inventories match.
- **`Storage` and `MigrationRegistry` are not in
  [`src/contracts/`](../../../src/contracts/).** § 2.6 names these
  as DI seams for `src/persistence/`, but they are not part of the
  cross-module contracts package (grep of `src/contracts/` returns
  no matches). Both are persistence-local interfaces by intent
  (the persistence module is the only consumer), so this is not
  necessarily a bug — but the doc-reader cannot tell from this
  file alone whether they should live in `src/contracts/` or stay
  local. Per Hard Prohibition B the audit did not move them.
  Suggested fix in the owning task: add a single sentence to § 1
  (or here) clarifying the rule for "seam published cross-module"
  vs "module-local seam". Owner:
  [`mvp.02-tooling.03-unit-test-contract`](../../../tasks/mvp/02-tooling/03-unit-test-contract.md).
