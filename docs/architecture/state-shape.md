# Top-Level `GameState` Shape

The deterministic engine is the pure reducer
`state' = apply(state, command)`. This file pins the shape of `state`,
its immutability strategy, and its serialization rules so two
implementers cannot pick incompatible designs.

The closed JSON schema is
[`content-schema/schemas/game-state.schema.json`](../../content-schema/schemas/game-state.schema.json).
A canonical example is
[`content-schema/examples/game-state.example.json`](../../content-schema/examples/game-state.example.json).

## Top-Level Keys

`GameState` is one plain object with the following keys, in canonical
key order (alphabetical for the serializer, but the conceptual grouping
is preserved here for readers):

| Key | Type | Purpose |
|---|---|---|
| `schemaVersion` | integer | Migration anchor; bumped only on breaking shape changes |
| `phase` | `"adventure" \| "battle" \| "menu"` | Top-level phase discriminator |
| `turn` | integer ≥ 0 | Current turn (increments on `END_DAY`) |
| `activePlayerId` | integer ≥ 0 | Whose turn it is |
| `players` | object — `byId` + `order` | Player records keyed by id, plus deterministic seating order |
| `worldMap` | object | Hex grid, terrain, fog masks (per-player), object placement index |
| `towns` | object — `byId` + `order` | Town records, normalized |
| `heroes` | object — `byId` + `order` | Hero records, normalized |
| `stacks` | object — `byId` + `order` | Army stacks (hero-attached or garrison or wandering), normalized |
| `mines` | object — `byId` + `order` | Mines and adventure resource buildings, normalized |
| `mapObjects` | object — `byId` + `order` | Treasures, banks, dwellings on the adventure map |
| `battle` | object \| null | Nested tactical-battle sub-state when `phase === "battle"`, otherwise `null` |
| `log` | array | Ordered command log slice for the current session (replay source of truth) |
| `events` | array | Ordered event objects emitted by the reducer (consumed by the renderer) |
| `rngStreams` | object | Per-stream PCG32 state, keyed by sub-stream name from [`rng-streams.md`](./rng-streams.md) |
| `idCounters` | object | Mid-game entity-ID allocator counters; see [`id-allocator.md`](./id-allocator.md) |
| `contentHashes` | object | Pinned `{ packId: contentHash }` map from `SCENARIO_LOAD` |
| `engineHash` | string | Engine build digest pinned at `SCENARIO_LOAD` |
| `seed` | integer | Root seed that forked every `rngStreams` entry; pinned at `SCENARIO_LOAD` |

### Tactical battle sub-state

When `phase === "battle"`, `battle` is an object with its own normalized
sub-trees (`battleStacks.byId`, `battlefield`, `initiativeQueue`,
`battleLog`, `battleEvents`, `tacticsPlacement`). It is not a separate
top-level state. The outer reducer transitions in via `INITIATE_BATTLE`
and out via `BATTLE_RESOLVED`; while in battle the inner reducer owns
`battle`. See [`state-flow.md`](./state-flow.md) for the loop.

## Normalization Rule

Per-entity collections are stored as `{ byId: { id: record }, order:
[id, id, ...] }` pairs. This is mandatory for `players`, `towns`,
`heroes`, `stacks`, `mines`, `mapObjects`, and (inside `battle`) all
battle stacks.

- `byId` is the primary store. All cross-references inside `GameState`
  use IDs.
- `order` is an explicit deterministic sequence used wherever iteration
  order would otherwise leak Map/Set insertion order into hashes,
  events, or replays.
- Arrays are reserved for ordered logs (`log`, `events`, `battle.log`,
  `battle.events`, `initiativeQueue`) and for per-record ordered lists
  (e.g. a hero's army slot list, a town's build-order history).

## Immutability Strategy

The reducer treats `GameState` as fully immutable.

- New states are produced by **structural sharing**: helpers in
  `src/engine/state/` build new sub-trees, copying only the path from
  the root to the changed leaf. Untouched sub-trees keep referential
  identity for cheap diffing and snapshotting.
- All state objects and sub-objects are `Object.freeze`d at the engine
  boundary in development builds. Production may opt out for perf, but
  reducers must never mutate inputs even when freeze is disabled.
- **No third-party library.** Plain frozen objects only — no Immer, no
  immutable.js. This keeps the reducer portable to any host (Node, web
  worker, native re-implementation) and avoids hidden iteration order.
- The reducer never produces a state that aliases a sub-tree of two
  different commands; structural sharing reuses unchanged children, but
  changed children are fresh objects.

## Canonical Serialization

State serializes to JSON using the canonical-JSON rules already
specified in [`determinism.md`](./determinism.md):

- keys sorted by Unicode codepoint at every level
- no whitespace, no trailing newline
- integers without exponent; no `Infinity`/`NaN`
- booleans literal `true`/`false`
- `null` only where the schema explicitly allows it (`battle`,
  `winnerId`, etc.)

The `xxh64` state hash is computed over canonical bytes. Two engines
that disagree on any field, including `byId` insertion vs. canonical
ordering, will hash differently and trip desync detection (see
[`multi-engine-harness.md`](./multi-engine-harness.md)).

## RNG and ID Counters

- `rngStreams[name]` carries the live PCG32 state for one entry in the
  catalogue at [`rng-streams.md`](./rng-streams.md). Replay rebuilds
  these by forking the root `seed` plus replaying the command log.
- `idCounters` is the runtime entity-ID allocator's state; see
  [`id-allocator.md`](./id-allocator.md). It is part of `GameState`
  precisely so replays mint identical IDs deterministically.

## Schema Conformance

- The closed JSON schema at
  [`game-state.schema.json`](../../content-schema/schemas/game-state.schema.json)
  uses `additionalProperties: false` everywhere a sub-shape is fully
  enumerated.
- Sub-trees that are themselves schema-driven records (heroes, towns,
  units in stacks) reference the relevant record schema rather than
  re-declaring fields.
- New fields are added by bumping `schemaVersion` and shipping a
  migration in `src/content-schema/`.

## Related

- [`determinism.md`](./determinism.md) — canonical JSON, hashing,
  forbidden APIs
- [`rng-streams.md`](./rng-streams.md) — names that populate
  `rngStreams`
- [`id-allocator.md`](./id-allocator.md) — runtime ID format and
  `idCounters`
- [`command-schema.md`](./command-schema.md) — every payload references
  one of the sub-trees above
- [`multi-engine-harness.md`](./multi-engine-harness.md) — desync
  detection consumes this shape via `createEngine()`
- [`state-flow.md`](./state-flow.md) — how state moves through the
  reducer
