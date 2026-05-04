# Unit-Test Contract

Per-module rubric for what counts as "tested." Names the dependency-
injection seams each module must expose, the canonical fakes that
consume those seams, and the unit-test rubric a reviewer applies when
asking "is this module well-tested?" Without a single shared
contract, every test invents its own mocking style and DI seams
diverge between modules with no rationale.

This document is a contract, not an implementation. The fakes
themselves are added incrementally as each module first needs them.
The fake-file paths below are stable promises: when a module gets its
first test that needs a `FakeRng`, it imports from the path named
here; the fake author owns it from then on.

## Global Rules

- **Every module exports its DI seam explicitly.** No global
  singletons; every dependency is constructor- or factory-injected.
  The `createEngine()` factory contract in
  [`multi-engine-harness.md`](../multi-engine-harness.md) is the
  pattern; other modules follow the same shape.
- **Fakes live next to the seam they fake.** The canonical fake for
  `Rng` lives next to the `Rng` interface, not in a generic
  `__mocks__/` pile. This keeps the fake reachable from any test and
  prevents mock duplication.
- **Fakes are deterministic.** Even when faking a non-deterministic
  source (clock, network), the fake is seeded and reproducible.
- **Tests are colocated.** Every module owns a `__tests__/`
  subfolder; cross-module integration tests live in
  `tests/` (deterministic) or under the consumer module's
  `__tests__/`.

## Per-Module Rubric

### `src/engine/`

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
- `src/engine/__tests__/fakes/fake-clock.ts` — manually advanced
  clock; never reads `Date.now()`.

Rubric:

- Every command kind in
  [`content-schema/schemas/command.schema.json`](../../../content-schema/schemas/command.schema.json)
  has at least one accept-path test and at least one reject-path test.
- The canonical-JSON serializer round-trip is property-tested
  (see [`property testing`](#property-testing)).
- The state-hash function is asserted byte-stable against the fixture
  catalogue under `tests/__fixtures__/golden/`.

### `src/rules/`

DI seams:

- `RulesetContext` — pure record passed by value; no mutable state.
- `FormulaEvaluator` — pure function `evaluate(formula, vars,
  context): number`.

Canonical fakes:

- `src/rules/__tests__/fakes/fake-ruleset.ts` — minimal ruleset
  fixture used by every formula test; documented constants only, no
  hidden defaults.

Rubric:

- Every formula in
  [`content-schema/schemas/formula.schema.json`](../../../content-schema/schemas/formula.schema.json)
  has at least one unit test asserting evaluator output for one
  canonical input.
- Property tests cover the operator algebra: associativity of `add`,
  commutativity of `mul`, ordering of `min`/`max`, fixed-point
  invariants from
  [`determinism.md` § Fixed-Point Conventions](../determinism.md#fixed-point-conventions).

### `src/content-runtime/`

DI seams:

- `PackLoader` — `load(packPath): Promise<Pack>`. Filesystem-backed
  in production; in-memory in tests.
- `AssetIndex` — read-only; missing entries follow the fallback rule
  in
  [`pack-contract.md`](../pack-contract.md).

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
- Pack-error-code surface from
  [`pack-error-codes.md`](../pack-error-codes.md) is exhaustive: every
  code has a test that triggers it.

### `src/ai/`

DI seams:

- `BotProvider` — pinned in
  [`ai-contract.md` § 8](../ai-contract.md). Returns `Command` in
  bounded compute.
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
- Behavioral regressions ride on the AI tournament harness in
  [`ai-tournament-harness.md`](./ai-tournament-harness.md), not on
  line-coverage thresholds.

### `src/net/`

DI seams:

- `NetTransport` — pinned in
  [`net-transport.md`](../net-transport.md). Both real WebRTC and
  the deterministic NetSim test transport satisfy the same shape.
- `Peer` — wrapper over `NetTransport` adding sequence numbers; pure
  per-peer state.

Canonical fakes:

- `src/net/__tests__/netsim.ts` — owned by
  [`tasks/phase-3/01-multiplayer/12-network-chaos-harness.md`](../../../tasks/phase-3/01-multiplayer/12-network-chaos-harness.md);
  PCG32-seeded loss / jitter / reorder / partition transport.

Rubric:

- Every transport message type has a round-trip test (encode →
  decode → identity).
- Reconnection, auto-bisect, host migration, and lockstep each have
  a chaos-scenario test under NetSim. See the chaos task above for
  the per-scenario contract.

### `src/persistence/`

DI seams:

- `Storage` — `get(key)`, `put(key, value)`, `delete(key)`,
  `list(prefix)`. IndexedDB-backed in production; in-memory in tests.
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
- Every save format change adds a fixture under
  `tests/__fixtures__/saves/` so future migrations can prove
  backward-compatibility.

### `src/ui/`

UI is the one module where line coverage is intentionally not the
contract. The contract is the
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

## Property Testing

Invariants of the formula evaluator and the canonical serializer
ride on a property-based testing layer, currently `fast-check`. Files
live next to the implementation under `__tests__/*.property.test.ts`.
The two anchor files are pinned in
[`tasks/mvp/02-tooling/04-property-based-testing.md`](../../../tasks/mvp/02-tooling/04-property-based-testing.md):

- `src/rules/__tests__/formula-invariants.property.test.ts` — three
  invariants on the evaluator (purity, fixed-point bounds,
  zero-divisor handling).
- `src/engine/__tests__/canonical-json.property.test.ts` — three
  invariants on canonical JSON (round-trip identity, key-order
  insensitivity, byte-stability).

New modules add their own property tests by copying the pattern; the
contract here is the file-naming and three-invariant convention, not
the specific properties.

## Out Of Scope

- E2E gameplay flows. Higher-level test suites are authored alongside
  the gameplay milestones that need them.
- AI quality regressions. Owned by the tournament harness.
- UI visual regressions. The UI smoke contract is the line; pixel
  diffs are deferred to a future task.
