# Top-Level `GameState` Shape

> Companion docs: [`determinism.md`](./determinism.md) defines the
> canonical-JSON and hashing rules this shape must serialize under;
> [`state-flow.md`](./state-flow.md) pins the reducer loop that
> produces successor states; [`rng-streams.md`](./rng-streams.md)
> catalogues the names that key `state.rngStreams`;
> [`id-allocator.md`](./id-allocator.md) owns `state.idCounters`;
> [`command-schema.md`](./command-schema.md) is the alphabet of
> commands the reducer consumes; [`multi-engine-harness.md`](./multi-engine-harness.md)
> consumes this shape via `Engine.state()`.
>
> Closed schema:
> [`content-schema/schemas/game-state.schema.json`](../../content-schema/schemas/game-state.schema.json)
> (registered in [`schema-matrix.md`](./schema-matrix.md)).
> Canonical example:
> [`content-schema/examples/game-state.example.json`](../../content-schema/examples/game-state.example.json).

The deterministic engine is the pure reducer
`state' = apply(state, command)`. This file pins the shape of
`state`, its immutability strategy, and its serialization rules so
two implementers cannot pick incompatible designs.

## 1. Top-Level Keys

`GameState` is a single plain object. The serializer emits keys
sorted by Unicode codepoint per
[`determinism.md` § Canonical Serialization](./determinism.md);
the table below groups them conceptually for readers.

| Key | Type | Purpose |
|---|---|---|
| `schemaVersion` | integer ≥ 1 | Migration anchor; bumped only on breaking shape changes |
| `phase` | `"adventure" \| "battle" \| "menu"` | Top-level phase discriminator |
| `turn` | integer ≥ 0 | Current turn (increments on `END_DAY`) |
| `activePlayerId` | integer ≥ 0 | Whose turn it is |
| `players` | normalized collection | Player records keyed by stable id, plus deterministic seating order |
| `worldMap` | object | Hex grid, terrain, per-player fog masks, object placement index |
| `towns` | normalized collection | Town records |
| `heroes` | normalized collection | Hero records |
| `stacks` | normalized collection | Army stacks (hero-attached, garrisoned, or wandering) |
| `mines` | normalized collection | Mines and adventure resource buildings |
| `mapObjects` | normalized collection | Treasures, banks, dwellings on the adventure map |
| `battle` | object \| `null` | Nested tactical-battle sub-state when `phase === "battle"`; otherwise `null` |
| `log` | array | Ordered command log slice for the current session (replay source of truth) |
| `events` | array | Ordered event objects emitted by the reducer (consumed by the renderer per [`event-system.md`](./event-system.md)) |
| `rngStreams` | object | Per-stream PCG32 state, keyed by sub-stream name from [`rng-streams.md`](./rng-streams.md) |
| `idCounters` | object | Mid-game entity-ID allocator counters; see [`id-allocator.md`](./id-allocator.md) |
| `contentHashes` | object | Pinned `{ packId: contentHash }` map from `SCENARIO_LOAD` |
| `engineHash` | string | Engine build digest pinned at `SCENARIO_LOAD` |
| `seed` | integer | Root seed that forked every `rngStreams` entry; pinned at `SCENARIO_LOAD` |
| `mapVersion` | integer ≥ 0 | Monotonic counter bumped by terrain-mutating commands; pathfinder-cache key per [`determinism.md` § Pathfinder Cache Invariants](./determinism.md#pathfinder-cache-invariants) |
| `zocVersion` | integer ≥ 0 | Monotonic counter bumped by hero tile-occupancy commands; pathfinder-cache key per [`determinism.md` § Pathfinder Cache Invariants](./determinism.md#pathfinder-cache-invariants) |

All keys above are **required**; the schema declares
`additionalProperties: false`.

### Tactical battle sub-state

When `phase === "battle"`, `battle` is an object with these required
keys: `battleId`, `battleStacks` (normalized collection),
`battlefield` (`width`, `height`, optional `obstacles`),
`initiativeQueue` (array of stack ids), `log`, and `events`.
`tacticsPlacement` is optional. The outer reducer transitions in via
`INITIATE_BATTLE` and out via `BATTLE_RESOLVED`; while in battle the
inner reducer owns `battle`. See [`state-flow.md`](./state-flow.md)
for the loop.

## 2. Normalization Rule

Per-entity collections are stored as `{ byId, order }` pairs.
Mandatory for `players`, `towns`, `heroes`, `stacks`, `mines`,
`mapObjects`, and `battle.battleStacks`.

- `byId` — primary store. Keys are stable string ids; values are
  records. All cross-references inside `GameState` use ids.
- `order` — explicit deterministic id sequence, used wherever
  iteration order would otherwise leak Map/Set insertion order into
  hashes, events, or replays.
- Arrays are reserved for ordered logs (`log`, `events`,
  `battle.log`, `battle.events`, `battle.initiativeQueue`) and for
  per-record ordered lists (e.g. a hero's army-slot list, a town's
  build-order history).

## 3. Immutability Strategy

The reducer treats `GameState` as fully immutable.

- **Structural sharing.** Helpers in `src/engine/state/` build new
  sub-trees, copying only the path from the root to the changed
  leaf. Untouched sub-trees keep referential identity for cheap
  diffing and snapshotting.
- **Frozen at the engine boundary.** All state objects and
  sub-objects are `Object.freeze`d in development builds. Production
  may opt out for perf, but reducers MUST NOT mutate inputs even
  when freeze is disabled.
- **No third-party library.** Plain frozen objects only — no Immer,
  no immutable.js. Keeps the reducer portable to any host (Node, web
  worker, native re-implementation) and avoids hidden iteration
  order.
- **No alias across commands.** Structural sharing reuses unchanged
  children, but every changed child is a fresh object; the reducer
  never produces a state that aliases a sub-tree of two different
  commands.

## 4. Canonical Serialization

State serializes to JSON using the rules in
[`determinism.md`](./determinism.md):

- keys sorted by Unicode codepoint at every level
- no whitespace, no trailing newline
- integers without exponent; no `Infinity` / `NaN`
- booleans literal `true` / `false`
- `null` only where the schema explicitly allows it (e.g. `battle`)

The xxh64 state hash is computed over the canonical bytes. Two
engines that disagree on any field — including `byId` insertion
order vs. canonical key order — will hash differently and trip
desync detection (see
[`multi-engine-harness.md`](./multi-engine-harness.md)).

## 5. RNG and ID Counters

- `rngStreams[name]` carries the live PCG32 state for one entry in
  the catalogue at [`rng-streams.md`](./rng-streams.md). Each entry
  is a `{ state, inc }` pair encoded as decimal-string BigInts.
  Replay rebuilds these by forking the root `seed` and replaying the
  command log.
- `idCounters` is the runtime entity-ID allocator's state; see
  [`id-allocator.md`](./id-allocator.md). It is part of `GameState`
  precisely so replays mint identical IDs deterministically.

## 6. Schema Conformance

- The closed JSON schema at
  [`game-state.schema.json`](../../content-schema/schemas/game-state.schema.json)
  uses `additionalProperties: false` everywhere a sub-shape is fully
  enumerated.
- Sub-trees that are themselves schema-driven records (heroes,
  towns, units in stacks) are intended to reference the relevant
  record schema rather than re-declare fields. Today the schema's
  `byId` declares values as generic `{ type: "object" }`; tightening
  to `$ref` per record schema is tracked in `## ⚠ Issues` below.
- New fields are added by bumping `schemaVersion` and shipping a
  migration in [`src/content-schema/migrations/`](../../src/content-schema/migrations/).
  Enum / const changes follow
  [`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md).

## 7. Related

- [`determinism.md`](./determinism.md) — canonical JSON, hashing,
  forbidden APIs
- [`state-flow.md`](./state-flow.md) — how state moves through the
  reducer
- [`rng-streams.md`](./rng-streams.md) — names that populate
  `rngStreams`
- [`id-allocator.md`](./id-allocator.md) — runtime ID format and
  `idCounters`
- [`command-schema.md`](./command-schema.md) — every payload
  references one of the sub-trees above
- [`multi-engine-harness.md`](./multi-engine-harness.md) — desync
  detection consumes this shape via `createEngine()`
- [`schema-matrix.md`](./schema-matrix.md) — registration row for
  `GameState`
- [`glossary.md`](./glossary.md) — `GameState` glossary entry

---

## 🔍 Sync Check

- **UI: ✔** — Doc describes engine-internal shape only; no UI
  surfaces are claimed. The renderer / Zustand subscription cadence
  lives in [`state-flow.md`](./state-flow.md) and is not duplicated
  here.
- **Schema: ⚠** — All top-level keys, types, and required-flag
  semantics now match
  [`game-state.schema.json`](../../content-schema/schemas/game-state.schema.json)
  and the row in [`schema-matrix.md`](./schema-matrix.md). Two
  residual gaps are flagged below: (1) the schema does not yet
  `$ref` per-record schemas inside `byId`; (2) the canonical example
  uses an integer `activePlayerId` against string-keyed
  `players.byId`.
- **Tasks: ✔** — Doc is the deliverable of
  [`tasks/mvp/00-core-architecture/arch-state-shape.md`](../../tasks/mvp/00-core-architecture/arch-state-shape.md);
  consumed by [`tasks/mvp/01-engine-core/06-command-dispatcher.md`](../../tasks/mvp/01-engine-core/06-command-dispatcher.md),
  [`tasks/mvp/10-heuristic-ai/07-ai-player-view-projection.md`](../../tasks/mvp/10-heuristic-ai/07-ai-player-view-projection.md),
  and the harness/RNG/ID-allocator tasks; registered in
  [`tasks/task-registry.json`](../../tasks/task-registry.json).

## ⚠ Issues

- **Top-level keys `mapVersion` and `zocVersion` were missing from
  the doc.** The schema lists both as required (with descriptions
  pointing to the pathfinder-cache invariant in `determinism.md`),
  and [`determinism.md` § Pathfinder Cache Invariants](./determinism.md#pathfinder-cache-invariants)
  describes how they are bumped. Per Hard Prohibition A
  (meaning preservation) the rewrite added the rows so the doc
  matches the schema; no schema or determinism-doc change implied.
- **Battle sub-state listing was inconsistent with the schema.** The
  original prose listed `battleLog` and `battleEvents` and omitted
  the required `battleId`. The schema's `$defs.battle` requires
  `battleId`, `battleStacks`, `battlefield`, `initiativeQueue`,
  `log`, `events` (with `tacticsPlacement` optional). The rewrite
  now mirrors the schema. Per Hard Prohibition A this is a
  meaning-preserving correction, not a scope addition.
- **`byId` values are not `$ref`-typed in the schema.** The doc
  asserts that schema-driven records (heroes, towns, units in
  stacks) "reference the relevant record schema rather than
  re-declare fields", but `game-state.schema.json` declares
  `normalizedCollection.byId` values as generic
  `{ "type": "object" }`. Per CLAUDE.md ("`src/contracts/` is
  generated from `content-schema/schemas/`") and the additive-first
  schema rule, the canonical fix is in the schema, owned by
  [`tasks/mvp/00-core-architecture/arch-state-shape.md`](../../tasks/mvp/00-core-architecture/arch-state-shape.md).
  Suggested values: replace each `normalizedCollection.byId` value
  type with `{ "$ref": "<record>.schema.json" }` once the per-record
  schemas exist (heroes, towns, stacks). No edit made here per Hard
  Prohibition D.
- **Example `activePlayerId` type vs. `players.byId` keys.**
  [`game-state.example.json`](../../content-schema/examples/game-state.example.json)
  uses `"activePlayerId": 0` while `players.byId` is keyed by the
  string id `"p1"`; the schema declares `activePlayerId` as
  `integer ≥ 0` and `players.byId` keys as `stringId`. The lookup
  `players.byId[activePlayerId]` therefore cannot resolve. Per Hard
  Prohibition B (no invented features) this is flagged rather than
  rewritten; the canonical fix lives in the schema and example,
  owned by [`tasks/mvp/00-core-architecture/arch-state-shape.md`](../../tasks/mvp/00-core-architecture/arch-state-shape.md).
  Suggested values: either change `activePlayerId` to `stringId`
  (preferred — matches the rest of the cross-reference convention)
  or change `players.byId` keys to numeric strings.
