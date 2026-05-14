# Multi-Engine Harness

> Companion docs: [`determinism.md`](./determinism.md) defines the
> purity rules this contract enforces; [`state-shape.md`](./state-shape.md)
> pins the `GameState` returned by `Engine.state()`;
> [`command-schema.md`](./command-schema.md) defines the `Command`
> envelope, the [Dispatcher Queue](./command-schema.md#dispatcher-queue),
> and the [Cross-Actor Ordering](./command-schema.md#cross-actor-ordering)
> rule the multiplayer transport applies. The implementation is owned
> by
> [`tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md`](../../tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md).

Desync detection runs **two engine instances side by side** and
compares state hashes after each command. The engine's purity makes
this implicitly possible — but only if every shared global,
module-level singleton, or hidden cache is forbidden. This file pins
the contract every engine implementer must satisfy so the harness can
detect leaks.

## `createEngine()` Factory Contract

The engine module exports a single factory:

```typescript
function createEngine(init: {
  scenario: ScenarioRecord;
  packs: PackRegistry;
  rulesetId: string;
  seed: number;
}): Engine;

interface Engine {
  state(): GameState;
  apply(command: Command): Result<{ state: GameState; events: Event[] }, ValidationError>;
  hash(): string;          // canonical-JSON xxh64 of state()
  enqueue(command: Command): EnqueueResult;  // bounded FIFO; see command-schema.md § Dispatcher Queue
  drain(): void;           // dispatches every queued command in FIFO order
}
```

Hard rules:

- **No globals.** No `let foo = …` at module scope that the reducer
  reads or writes. Every piece of state lives inside the `Engine`
  instance returned by the factory.
- **No singletons.** No `getDefaultRng()`, `getRulesetCache()`,
  `getCommandHistory()` accessors that return module-level objects.
- **No shared mutable caches.** Memoization tables, derived selectors,
  pathfinder caches, etc. live on the instance and are reset on
  re-creation.
- **No `Math.random()`, `Date.now()`, `performance.now()`** anywhere
  in the engine module graph (already required by
  [`determinism.md`](./determinism.md)).
- **No I/O.** The factory takes already-loaded packs and scenario
  data; it never reads from disk or network.

Two `createEngine(...)` calls with the same `init` must produce two
engines that, when fed the same command stream, agree on state hash
after every step.

## Canonical Desync-Detection Test Pattern

```typescript
import { createEngine } from "src/engine";
import { canonicalCommandStream } from "src/engine/test/fixtures";

function expectLockstep(commands: Command[]) {
  const a = createEngine(initFixture());
  const b = createEngine(initFixture());

  for (const cmd of commands) {
    const ra = a.apply(cmd);
    const rb = b.apply(cmd);

    if (ra.ok !== rb.ok) {
      throw new Error(`engines disagree on validity at ${cmd.metadata.nonce}`);
    }
    if (a.hash() !== b.hash()) {
      throw new Error(
        `engines diverged after ${cmd.kind} (${cmd.metadata.nonce}): ` +
          `${a.hash().slice(0, 12)} vs ${b.hash().slice(0, 12)}`
      );
    }
  }
}

expectLockstep(canonicalCommandStream());
```

The test passes **iff** the engine has no hidden non-purity. A
module-level cache, a wall-clock call, or an unsorted Map iteration
will surface on the first divergent draw.

## Prohibited Patterns

A non-exhaustive worked-example list of failures the hard rules
above are meant to prevent. CI lint should flag these in
`src/engine/**`:

- module-level mutable bindings:
  ```ts
  // ❌
  let cachedDamageTable: number[] | null = null;
  ```
- module-level random or time:
  ```ts
  // ❌
  const sessionId = Math.random();
  const startedAt = Date.now();
  ```
- singletons returned from getters:
  ```ts
  // ❌
  export function getRng() { return defaultRng; }
  ```
- `Map` / `Set` iteration where insertion order is observable:
  ```ts
  // ❌
  for (const [id, hero] of heroesMap) { ... }       // depends on insertion order
  // ✅
  for (const id of state.heroes.order) { ... }     // explicit deterministic order
  ```
- shared async work:
  ```ts
  // ❌
  await fetchRuleset();   // I/O inside reducer path
  ```

## Implementation: the Fuzz Harness

This contract is realised by the fuzz harness owned by
[`tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md`](../../tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md):
two parallel `createEngine(...)` instances driven by a random-move AI
share one command stream, and per-step `hash()` comparison fails the
test on the first divergent draw. The same task's
`writeTranscript()` step feeds
[`tasks/mvp/01-engine-core/09b-cross-environment-canonical-bytes-test.md`](../../tasks/mvp/01-engine-core/09b-cross-environment-canonical-bytes-test.md),
which replays the transcript through a Playwright headless Chromium
and asserts byte equality against the Node run, satisfying the
browser engine floor pinned by
[`runtime-requirements.md` RR-08 / RR-09](./runtime-requirements.md#rr-08-browser-engine-floor).

The fuzz harness runs in CI on every PR via `npm test`.

## Multiplayer Lockstep (M5)

The multiplayer transport (`src/net/`) is the multi-engine harness
running across two machines. The same `createEngine(...)` factory
contract is what makes M5 implementable:

- each peer holds its own `Engine`
- a network frame's commands are ordered with the rule from
  [`command-schema.md` § Cross-Actor Ordering](./command-schema.md#cross-actor-ordering)
- both peers `apply` the ordered stream and compare hashes at frame
  boundaries
- a hash mismatch is an immediate desync; the transport disconnects
  and reports the first divergent command's `nonce`

If the harness passes locally, M5 has a tractable spec to implement;
if it fails locally, M5 cannot ship.

## Related

- [`determinism.md`](./determinism.md) — purity rules
- [`state-shape.md`](./state-shape.md) — `GameState` returned by `Engine.state()`
- [`command-schema.md`](./command-schema.md) — what `Engine.apply` consumes
- [`module-graph.md`](./module-graph.md) — engine import boundaries this contract protects
- [`glossary.md`](./glossary.md) — "multi-engine harness"

---

## 🔍 Sync Check

- **UI: ✔** — File pins an engine-purity contract; no UI surface to compare against.
- **Schema: ✔** — `Command`, `GameState`, and `ValidationError` resolve to [`command.schema.json`](../../content-schema/schemas/command.schema.json), [`game-state.schema.json`](../../content-schema/schemas/game-state.schema.json), and [`dispatcher-validation-error.schema.json`](../../content-schema/schemas/dispatcher-validation-error.schema.json); the cited [`command-schema.md` § Dispatcher Queue](./command-schema.md#dispatcher-queue) and [§ Cross-Actor Ordering](./command-schema.md#cross-actor-ordering) anchors both resolve.
- **Tasks: ✔** — Doc owner [`mvp.00-core-architecture.arch-multi-engine-harness`](../../tasks/mvp/00-core-architecture/arch-multi-engine-harness.md) lists this file as Owned Path; implementation owner [`mvp.01-engine-core.09-fuzz-harness…`](../../tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md) reads `determinism.md`, which links here. Reverse links exist in [`glossary.md`](./glossary.md), [`state-flow.md`](./state-flow.md), [`state-shape.md`](./state-shape.md), [`id-allocator.md`](./id-allocator.md), [`module-graph.md`](./module-graph.md), [`observability.md`](./observability.md), [`command-schema.md`](./command-schema.md), and [`testing/unit-test-contract.md`](./testing/unit-test-contract.md).

## ⚠ Issues

- **"Fuzz harness vs multi-engine harness" framing was inverted in the original prose.** The pre-rewrite "Relationship to the Fuzz Harness" section described the fuzz harness as single-engine and the multi-engine harness as a separate "structural complement", but [`tasks/mvp/01-engine-core/09-fuzz-harness…`](../../tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md) specifies two parallel sim instances with per-command hash comparison — i.e. that task **is** the multi-engine harness, and there is no separate single-engine fuzz target in the codebase. [`determinism.md` § Non-Negotiable Stack step 6](./determinism.md#non-negotiable-stack) treats them as one chain. Per § 8 Option A, the section was rewritten in the target as "Implementation: the Fuzz Harness" rather than positing two harnesses. No code or sibling-doc change implied.
- **Engine surface methods `enqueue` / `drain` are not pinned in [`command-schema.md`](./command-schema.md).** The interface block here exposes `enqueue(command): EnqueueResult` and `drain(): void` and points at [`command-schema.md` § Dispatcher Queue](./command-schema.md#dispatcher-queue), which describes the bounded FIFO and overflow rules but does not name the engine method surface. Functionally consistent, but a future engine implementer reading either doc in isolation would not see the method names. Suggested fix: add an "Engine surface" subsection to [`command-schema.md` § Dispatcher Queue](./command-schema.md#dispatcher-queue) naming `engine.enqueue` / `engine.drain` and the `EnqueueResult` discriminator (`enqueued` / `duplicate_nonce` / `queue_overflow`). Not done here per Hard Prohibition D.
- **`canonicalCommandStream` fixture path `src/engine/test/fixtures` is unowned.** The fuzz-harness task pins the test file at `src/engine/__tests__/fuzz.test.ts`; the fixture import path used in this doc's example is illustrative and is not pinned by any task or schema. Kept the snippet as-is (pseudocode, not a load-bearing path) but flagged so the engine-core implementer knows the fixture module is unowned.
