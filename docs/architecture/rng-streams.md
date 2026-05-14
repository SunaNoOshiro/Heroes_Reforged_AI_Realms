# Named RNG Sub-Stream Catalogue

> Companion docs: the PCG32 mandate and forbidden APIs live in
> [`determinism.md`](./determinism.md); the per-stream state field
> `state.rngStreams` is pinned in
> [`state-shape.md`](./state-shape.md); the canonical glossary entry
> for "named sub-stream" is in [`glossary.md`](./glossary.md).

[`determinism.md`](./determinism.md) requires PCG32 with **named
sub-streams**. This file is the canonical catalogue of those names.
Every `rng.next()` call site MUST cite a sub-stream from the table
below; un-named draws are a CI failure. Without a fixed catalogue,
the first new system that calls `rng.next()` silently shifts every
other system's draw sequence and breaks every existing replay.

## Why named sub-streams

- **Replay isolation.** Adding a new system later (for example, a
  weather roll) MUST NOT alter the byte-sequence consumed by
  `damage`, `morale`, or any other live stream. Each name is its own
  independent generator forked from the root seed.
- **Per-system reproducibility.** A failing `damage` replay can be
  reproduced by replaying only that stream's draws against the same
  inputs.
- **AI / gameplay isolation.** AI tie-breaks live in `ai-decision`;
  refining bot heuristics never shifts gameplay RNG.

## Catalogue

The catalogue is **closed and additive-only**. Adding a new entry is
a schema-style additive change; renaming or removing an entry is a
breaking change to replays and is forbidden once shipped.

| Sub-stream | Owner | Used in |
|---|---|---|
| `damage` | rules / battle | melee and ranged damage rolls |
| `morale` | rules / battle | morale checks (extra turn / freeze) |
| `luck` | rules / battle | luck triggers (double damage) |
| `mage-guild` | rules / town | mage-guild spell selection at build time |
| `hero-traits` | rules / hero | starting traits, level-up secondary-skill offers |
| `creature-growth` | rules / town | weekly creature growth variance (if any) |
| `treasure` | rules / world | adventure-map treasure rolls (chests, pandora's-box equivalents) |
| `combat-init` | rules / battle | initiative tiebreak when speeds tie |
| `rmg` | content-runtime | random-map generation seeding |
| `ai-decision` | ai | bot tie-break / heuristic noise — kept separate so AI changes never shift gameplay RNG |

## Add-a-stream Rule

1. Pick a kebab-case name that is unique in the table.
2. Append it to the table; do not insert in the middle, do not
   reorder.
3. Update the owning system's task to cite the new stream by name.
4. Never reuse a retired name; never rename an existing name. If a
   system is removed, its row stays in the table marked `(retired)`
   so future PCG32 sub-stream IDs do not collide with shipped
   replays.

## Call-site Discipline

- Every reducer call site uses `rng.fork('<sub-stream>').nextU32()`,
  not a bare `rng.nextU32()`.
- The forked generator's state lives inside `GameState.rngStreams`
  (see [`state-shape.md`](./state-shape.md)) so save and replay
  restore each stream independently.
- New code paths add a row to the catalogue **before** introducing
  a `fork(...)` call.

## Related

- [`determinism.md`](./determinism.md) — PCG32 mandate and forbidden
  APIs
- [`state-shape.md`](./state-shape.md) — `rngStreams` field
  references this catalogue
- [`glossary.md`](./glossary.md) — "named sub-stream"
- [`tasks/mvp/00-core-architecture/det-rng-streams.md`](../../tasks/mvp/00-core-architecture/det-rng-streams.md)
  — owning task for this catalogue
- [`tasks/mvp/01-engine-core/03-implement-pcg32-prng-with-named-sub-streams.md`](../../tasks/mvp/01-engine-core/03-implement-pcg32-prng-with-named-sub-streams.md)
  — implementation task for the PCG32 generator

---

## 🔍 Sync Check

- **UI: ✔** — No screen-spec strings asserted; this catalogue ships
  only stream names and call-site discipline.
- **Schema: ⚠** — `state-shape.md` and
  [`game-state.schema.json`](../../content-schema/schemas/game-state.schema.json)
  correctly key `rngStreams` by sub-stream name from this catalogue,
  but the hand-authored `RngStream` union in
  [`src/contracts/rng.ts`](../../src/contracts/rng.ts) does not
  enumerate the same names. See Issues.
- **Tasks: ⚠** — Owning task
  [`mvp.00-core-architecture.det-rng-streams`](../../tasks/mvp/00-core-architecture/det-rng-streams.md)
  and the PCG32 implementation task
  [`mvp.01-engine-core.03-implement-pcg32-prng-with-named-sub-streams`](../../tasks/mvp/01-engine-core/03-implement-pcg32-prng-with-named-sub-streams.md)
  both reference this catalogue, but the implementation task's
  outputs diverge from the catalogue's call-site discipline rule.
  See Issues.

## ⚠ Issues

- **`RngStream` contract enum diverges from the catalogue.**
  [`src/contracts/rng.ts`](../../src/contracts/rng.ts) declares
  `RngStream = "world-gen" | "battle" | "morale" | "luck" | "ai" | "themed-week" | "loot"`
  (7 names), while this catalogue ships 10 kebab-case names
  (`damage`, `morale`, `luck`, `mage-guild`, `hero-traits`,
  `creature-growth`, `treasure`, `combat-init`, `rmg`,
  `ai-decision`). Only `morale` and `luck` overlap exactly; the
  remainder are aliased or missing on each side. Per
  [`.agents/rules/engine.md`](../../.agents/rules/engine.md),
  `src/contracts/` is generated except for hand-authored interface
  contracts — this file is hand-authored and must be brought into
  sync. The catalogue is canonical (per
  `det-rng-streams.md` AC #1 and the `state-shape.md` /
  `game-state.schema.json` pointers), so the contract should be
  updated, not the other way round. Owner:
  [`mvp.01-engine-core.03-implement-pcg32-prng-with-named-sub-streams`](../../tasks/mvp/01-engine-core/03-implement-pcg32-prng-with-named-sub-streams.md).
  Suggested values: union of the 10 kebab-case literals above (in
  table order). Surfaced rather than rewritten silently because
  the registry is canonical (Skill § 8 Option B).
- **PCG32 task's `Rng` interface contradicts Call-site Discipline.**
  This catalogue mandates
  `rng.fork('<sub-stream>').nextU32()`, but
  [`tasks/mvp/01-engine-core/03-implement-pcg32-prng-with-named-sub-streams.md`](../../tasks/mvp/01-engine-core/03-implement-pcg32-prng-with-named-sub-streams.md)
  outputs `Rng = { nextU32(); nextFloat(): never; fork(name): Rng }`
  with example streams `rng.map`, `rng.battle`, `rng.aiNoise` — none
  of which are catalogued kebab-case names. The hand-authored
  contract in
  [`src/contracts/rng.ts`](../../src/contracts/rng.ts) makes it
  worse by replacing `fork(name).nextU32()` with
  `nextUint32(stream: RngStream)` and `nextInt(stream, lo, hi)`,
  which has no `fork` at all. Owner:
  [`mvp.01-engine-core.03-implement-pcg32-prng-with-named-sub-streams`](../../tasks/mvp/01-engine-core/03-implement-pcg32-prng-with-named-sub-streams.md).
  Suggested fix: align the task's example sub-streams with the
  catalogue (e.g. drop `rng.map`/`rng.battle`/`rng.aiNoise` in favor
  of `damage`/`morale`/`rmg`) and either reconcile the contract
  surface (`fork().nextU32()` vs `nextUint32(stream)`) or update
  this catalogue's Call-site Discipline to match.
- **`determinism.md § Bot RNG Sub-Streams` introduces derived
  per-bot streams not registered here.**
  [`determinism.md` § Bot RNG Sub-Streams](./determinism.md#bot-rng-sub-streams)
  asserts `botRngStreamId = hash(matchSeed, botId)` and claims each
  bot's stream is "named in `rng-streams.md`". The catalogue ships
  exactly one AI entry, `ai-decision`, and the Add-a-stream Rule
  requires kebab-case unique entries — derived per-bot stream IDs
  are not expressible under that rule, so the determinism doc's
  claim is inconsistent with this one. Owner:
  [`mvp.00-core-architecture.det-rng-streams`](../../tasks/mvp/00-core-architecture/det-rng-streams.md).
  Suggested fix: add a "namespace clause" to the Add-a-stream Rule
  permitting `<base>:<sub-key>` runtime forks (with `ai-decision`
  the registered base used by every bot via
  `ai-decision:<botId>`), or replace the determinism-doc paragraph
  with "every bot forks `ai-decision` further by `botId` at
  runtime". Surfaced rather than rewritten silently because either
  fix touches a sibling file (Skill Hard Prohibition D).
