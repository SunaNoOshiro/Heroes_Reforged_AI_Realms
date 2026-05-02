# Named RNG Sub-Stream Catalogue

[`determinism.md`](./determinism.md) requires PCG32 with **named
sub-streams**. This file is the canonical catalogue of those names.
Every `rng.next()` call site MUST cite a sub-stream from the table
below; un-named draws are a CI failure.

Without a fixed catalogue the first new system that calls `rng.next()`
silently shifts every other system's draw sequence and breaks every
existing replay.

## Why named sub-streams

- **Replay isolation.** Adding a new system later (for example, a
  weather roll) MUST NOT alter the byte-sequence consumed by `damage`,
  `morale`, or any other live stream. Naming makes each system its own
  independent generator forked from the root seed.
- **Per-system reproducibility.** A failing damage replay can be
  reproduced by replaying only the `damage` stream's draws against the
  same inputs.
- **AI / gameplay isolation.** AI tie-breaks live in `ai-decision`.
  Refining bot heuristics never shifts gameplay RNG.

## Catalogue

The catalogue is **closed and additive-only**. Adding a new entry is a
schema-style additive change; renaming or removing an entry is a
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
2. Append it to the table above; do not insert in the middle, do not
   reorder.
3. Update the owning system's task to cite the new stream by name.
4. Never reuse a retired name; never rename an existing name. If a
   system is removed, the stream entry stays in the table, marked
   `(retired)`, so future PCG32 sub-stream IDs do not collide with
   shipped replays.

## Call-site Discipline

- Every reducer call site uses `rng.fork('<sub-stream>').nextU32()`,
  not a bare `rng.nextU32()`.
- The forked generator's state lives inside `GameState.rngStreams` (see
  [`state-shape.md`](./state-shape.md)) so save / replay restore each
  stream independently.
- New code paths add one entry above before introducing a `fork(...)`
  call.

## Related

- [`determinism.md`](./determinism.md) — PCG32 mandate and forbidden APIs
- [`state-shape.md`](./state-shape.md) — `rngStreams` field references this catalogue
- [`glossary.md`](./glossary.md) — "named sub-stream"
- `tasks/mvp/01-engine-core/03-implement-pcg32-prng-with-named-sub-streams.md` —
  implementation task for the PCG32 generator
