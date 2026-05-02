# Runtime Entity-ID Allocator

Scenario-load entity IDs are stable and authored. **Mid-game** entities
— recruited stacks, captured mines, summoned creatures, treasures
spawned by random-map generation — need a deterministic allocator so
that two engines fed identical commands mint identical IDs. This file
pins that allocator.

## Format

Mid-game IDs are strings of the form:

```
<kind>:<turn>:<actorId>:<perTurnCounter>
```

| Segment | Meaning | Constraint |
|---|---|---|
| `kind` | Entity kind discriminator | One of `stack`, `mine`, `mapObject`, `summon`, `boat`, `rmgObject`, ... |
| `turn` | Current turn at mint time | Integer ≥ 0; matches `GameState.turn` |
| `actorId` | The minting actor's stable id | `playerId` for player-driven actions; `system` for engine-only mints (RMG, weekly growth) |
| `perTurnCounter` | Monotonic counter, zero-padded to 3 | Resets to 0 each turn per `(kind, actorId)` pair |

Examples:

- `stack:12:p1:003` — fourth stack player 1 minted on turn 12 (e.g. via
  `RECRUIT_UNITS`).
- `summon:7:p2:000` — first creature summon player 2 made on turn 7
  (e.g. via `SPELL_CAST`).
- `rmgObject:0:system:042` — 43rd object the random-map generator
  placed at scenario load.

## Where Counters Live

The counters live in `GameState.idCounters` (see
[`state-shape.md`](./state-shape.md)) so they are part of the canonical
hashed state and survive replays:

```jsonc
"idCounters": {
  "stack":     { "p1:12": 4, "p2:12": 0 },   // (actorId : turn)
  "mine":      { "p1:0": 3 },
  "summon":    { "p1:7": 1 },
  "rmgObject": { "system:0": 43 }
}
```

Lookup at mint time:

1. `bucket = idCounters[kind][actorId + ":" + turn] ?? 0`
2. mint `id = ${kind}:${turn}:${actorId}:${pad3(bucket)}`
3. write back `bucket + 1` into `idCounters[kind][actorId + ":" + turn]`

Counters are **never reused**, **never depend on wall-clock or
insertion order**, and are part of the reducer's deterministic state.

## Commands That Mint IDs

The following command kinds (closed list; extend additively):

| Command | Mints | Counter |
|---|---|---|
| `RECRUIT_UNITS` | new stack joining hero / garrison | `stack` |
| `RECRUIT_EXTERNAL_DWELLING_UNITS` | new stack | `stack` |
| `SPLIT_ARMY_STACK` | new stack id for the split half | `stack` |
| `CAPTURE_MINE` | runtime mine record (if not pre-placed) | `mine` |
| `SPELL_CAST` (summon-class effects) | summoned battle stack | `summon` |
| `BUILD_BOAT` | adventure-map boat object | `boat` |
| `GENERATE_RANDOM_MAP` | every spawned tile / object | `rmgObject` |
| `BUILD_BUILDING` (with adventure-side effect) | adventure dwelling, when applicable | `mapObject` |

`SCENARIO_LOAD` does **not** use this allocator. Authored scenario IDs
come from the scenario file and are the public-API stable IDs. See the
"Stable ID" entry in [`glossary.md`](./glossary.md).

Each minting reducer cites this doc and uses the helper that bumps the
right counter. Reducers must not mint IDs through any other route.

## Replay Safety

Because counters are part of `GameState`, replays produce
byte-identical IDs:

- Replay starts from the saved (or scenario-derived) counters.
- Each replayed command runs the same mint helper against the same
  counter state.
- The minted ID is therefore identical across machines, sessions, and
  multiplayer peers.

If two clients diverge on a minted ID, they will diverge on the
canonical state hash on the very next reducer step — desync detection
catches it (see
[`multi-engine-harness.md`](./multi-engine-harness.md)).

## Add-a-Kind Rule

1. Pick a kebab-case `kind` not already in the table above.
2. Append a row.
3. Update the minting command's reducer to call the allocator with the
   new kind.
4. Counter buckets for new kinds appear lazily in `idCounters`; no
   migration needed for existing saves.

Renaming or retiring a `kind` is a breaking change to replays and is
forbidden once shipped.

## Related

- [`state-shape.md`](./state-shape.md) — `idCounters` field
- [`command-schema.md`](./command-schema.md) — minting command kinds
- [`determinism.md`](./determinism.md) — why this matters
- [`glossary.md`](./glossary.md) — "Stable ID"
