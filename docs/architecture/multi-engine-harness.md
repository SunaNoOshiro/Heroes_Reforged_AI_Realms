# Multi-Engine Harness

Desync detection requires running **two engine instances side by side**
and comparing their state hashes after each command. The engine's
purity makes this implicitly possible, but only if every shared global,
module-level singleton, or hidden cache is forbidden. This file is the
contract every engine implementer must satisfy so the harness is real.

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
- **No I/O.** The factory takes already-loaded packs and scenario data;
  it never reads from disk or network.

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

The test passes **iff** the engine has no hidden non-purity. Adding a
module-level cache, a wall-clock call, or an unsorted Map iteration
will surface here on the first divergent draw.

## Prohibited Patterns

A non-exhaustive list of patterns that break the harness. CI lint
should flag these in `src/engine/**`:

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

## Relationship to the Fuzz Harness

The fuzz harness in
[`tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md`](../../tasks/mvp/01-engine-core/09-fuzz-harness-1000-command-ai-vs-ai-determinism-test.md)
generates random command streams and replays them through one engine.
The multi-engine harness is its **structural complement**: it replays
the *same* stream through *two parallel* engines and compares hashes
after each command, catching the class of leaks the single-engine fuzz
cannot see (e.g. module-level caches that survive between two
`createEngine(...)` calls inside the same Node process).

Both harnesses run in CI on every PR.

## Multiplayer Lockstep (M5)

The multiplayer transport (`src/net/`) is, in effect, the multi-engine
harness running across two machines. The same `createEngine(...)`
factory contract is what makes M5 implementable at all:

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
- [`glossary.md`](./glossary.md) — "multi-engine harness"
