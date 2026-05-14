# Runtime Entity-ID Allocator

Companion docs:
[`state-shape.md`](./state-shape.md) (`idCounters` field on `GameState`),
[`command-schema.md`](./command-schema.md) (commands that mint IDs),
[`determinism.md`](./determinism.md) (why this is part of state),
[`glossary.md`](./glossary.md#content-model) (the "Stable ID" entry covers
both authored and runtime forms).

Closed schema:
[`content-schema/schemas/game-state.schema.json`](../../content-schema/schemas/game-state.schema.json)
(`idCounters` property).

Authored entities (scenario-load IDs) are pinned by the scenario file
and are public-API stable IDs. **Mid-game** entities — recruited
stacks, captured mines, summoned creatures, treasures spawned by
random-map generation — need a deterministic allocator so that two
engines fed identical commands mint identical IDs. This file pins
that allocator.

## 1. Format

Mid-game IDs are strings:

```
<kind>:<turn>:<actorId>:<perTurnCounter>
```

| Segment | Meaning | Constraint |
|---|---|---|
| `kind` | Entity kind discriminator | One of `stack`, `mine`, `mapObject`, `summon`, `boat`, `rmgObject`, … (closed list, extended additively per [§ 5](#5-add-a-kind-rule)) |
| `turn` | Current turn at mint time | Integer ≥ 0; matches `GameState.turn` |
| `actorId` | The minting actor's stable id | `playerId` for player-driven actions; literal `system` for engine-only mints (RMG, weekly growth) |
| `perTurnCounter` | Monotonic counter, zero-padded to 3 digits | Resets to 0 each turn per `(kind, actorId)` pair |

Examples:

- `stack:12:p1:003` — fourth stack player 1 minted on turn 12 (e.g.
  via `RECRUIT_UNITS`).
- `summon:7:p2:000` — first creature summon player 2 made on turn 7
  (e.g. via `SPELL_CAST`).
- `rmgObject:0:system:042` — 43rd object the random-map generator
  placed at scenario load.

## 2. Where Counters Live

Counters live in `GameState.idCounters` so they are part of the
canonical hashed state and survive replays:

```jsonc
"idCounters": {
  "stack":     { "p1:12": 4, "p2:12": 0 },   // (actorId : turn)
  "mine":      { "p1:0": 3 },
  "summon":    { "p1:7": 1 },
  "rmgObject": { "system:0": 43 }
}
```

Mint algorithm:

- **Inputs:** `kind`, `actorId`, `turn = state.turn`.
- **Lookup:** `bucket = idCounters[kind][actorId + ":" + turn] ?? 0`.
- **Mint:** `id = ${kind}:${turn}:${actorId}:${pad3(bucket)}`.
- **Write back:** `idCounters[kind][actorId + ":" + turn] = bucket + 1`.

Counters are **never reused**, **never depend on wall-clock or
insertion order**, and are part of the reducer's deterministic state.

## 3. Commands That Mint IDs

Closed list (extended additively per [§ 5](#5-add-a-kind-rule)):

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
come from the scenario file and are the public-API stable IDs (see
the "Stable ID" entry in [`glossary.md`](./glossary.md#content-model)).

Each minting reducer cites this doc and uses the helper that bumps the
right counter. Reducers MUST NOT mint IDs through any other route.

## 4. Replay Safety

Because counters are part of `GameState`, replays produce
byte-identical IDs:

- Replay starts from the saved (or scenario-derived) counter state.
- Each replayed command runs the same mint helper against the same
  counter state.
- The minted ID is therefore identical across machines, sessions, and
  multiplayer peers.

If two clients diverge on a minted ID, they will diverge on the
canonical state hash on the very next reducer step — desync detection
catches it (see
[`multi-engine-harness.md`](./multi-engine-harness.md)).

## 5. Add-a-Kind Rule

1. Pick a lowerCamelCase `kind` not already in the [§ 3 table](#3-commands-that-mint-ids).
2. Append a row to that table.
3. Update the minting command's reducer to call the allocator with
   the new kind.
4. Counter buckets for new kinds appear lazily in `idCounters`; no
   migration needed for existing saves (the schema permits any
   non-empty string key).

Renaming or retiring a `kind` is a breaking change to replays and is
forbidden once shipped — alias-before-remove per
[`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md) if a kind
must ever be retired.

## Related

- [`state-shape.md`](./state-shape.md) — `idCounters` field
- [`command-schema.md`](./command-schema.md) — minting command kinds
- [`determinism.md`](./determinism.md) — why this matters
- [`glossary.md`](./glossary.md) — "Stable ID"
- [`multi-engine-harness.md`](./multi-engine-harness.md) — desync
  detection that catches ID divergence

---

## 🔍 Sync Check

- **UI: ✔** — No screen package surfaces this allocator directly; mid-game IDs are an engine concern. No UI cross-check applies.
- **Schema: ⚠** — `game-state.schema.json` `idCounters` shape (`object → object → integer ≥ 0`) and its description ("Per-actor, per-turn entity-ID allocator counters. See docs/architecture/id-allocator.md.") match the doc. **However**, the hand-authored TS contract [`src/contracts/id-allocator.ts`](../../src/contracts/id-allocator.ts) declares a wholly different design (`kind` enum `"hero" | "stack" | "battle" | "command" | "event" | "ai-decision"`, format `<kind>:<n>`, single counter per kind). Detail in `## ⚠ Issues`.
- **Tasks: ✔** — Owning task [`tasks/mvp/00-core-architecture/det-id-allocator.md`](../../tasks/mvp/00-core-architecture/det-id-allocator.md) lists this file in `Owned Paths` and reads `state-shape.md` first; engine-core task [`tasks/mvp/01-engine-core.md`](../../tasks/mvp/01-engine-core.md) cites `src/contracts/id-allocator.ts` as part of its public surface. No orphan tasks.

## ⚠ Issues

- **TS contract `src/contracts/id-allocator.ts` does not match this doc.** The header comment claims `Pinned by docs/architecture/id-allocator.md`, but the contract exposes a single-counter-per-kind allocator (`next(kind): "<kind>:<n>"`, snapshot `Record<IdAllocatorKind, number>`) over a fixed `IdAllocatorKind` enum (`"hero" | "stack" | "battle" | "command" | "event" | "ai-decision"`). The doc and [`game-state.schema.json`](../../content-schema/schemas/game-state.schema.json) pin per-`(kind, actorId, turn)` buckets and the format `<kind>:<turn>:<actorId>:<perTurnCounter>`. Per CLAUDE.md ("Stable IDs are public API"; "Determinism. Saves, replays, and multiplayer must be byte-identical"), this drift is replay-breaking. Owning task [`mvp.00-core-architecture.det-id-allocator`](../../tasks/mvp/00-core-architecture/det-id-allocator.md) is currently `revalidate` in [`task-status.json`](../../tasks/task-status.json); it must rewrite the TS contract to expose `next({ kind, actorId, turn })` returning the four-segment string and a snapshot mirroring the schema's nested map shape, then re-run the gate. Not edited here per Hard Prohibition D.
- **`kind` casing convention silently changed in this rewrite.** The previous wording said "Pick a kebab-case `kind`" but every existing kind in the [§ 3 table](#3-commands-that-mint-ids) is lowerCamelCase (`mapObject`, `rmgObject`); the schema accepts any non-empty string, so neither form is enforced. Rewrote § 5 to say `lowerCamelCase` because that is consistent with the existing table values and the canonical ID list — the kebab-case wording was a typo, not a deliberate rule. Flagged here so the owning task can confirm and update [`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md) if a casing rule needs to be added globally.
