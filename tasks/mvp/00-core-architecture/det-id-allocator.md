# Runtime entity-ID allocator

Module: [Core Architecture Contracts (M0)](../00-core-architecture.md)

Description:
Pin the deterministic format and counter-state for IDs minted at
runtime: stacks recruited mid-game, mines captured, summons,
random-map-generated objects. Without this contract two engines fed
identical commands can mint different IDs, breaking saves, replays,
and multiplayer.

Format: `<kind>:<turn>:<actorId>:<perTurnCounter>` with the counter
table living inside `GameState.idCounters` (added by the state-shape
task). Replays reproduce IDs byte-identically because the counters are
part of the canonical state.

Source audit:
[`docs/readiness-audit/01-core-architecture.md`](../../../docs/readiness-audit/01-core-architecture.md)
(Q7, Issue 3.D-2).

Read First:
- [`docs/implementation-plans/01-core-architecture-plan.md`](../../../docs/implementation-plans/01-core-architecture-plan.md)
- [`docs/architecture/state-shape.md`](../../../docs/architecture/state-shape.md)

Inputs:
- Audit Q7 in
  [`docs/readiness-audit/01-core-architecture.md`](../../../docs/readiness-audit/01-core-architecture.md)
- Closed list of minting commands in `command-schema.md`
  (`RECRUIT_UNITS`, `RECRUIT_EXTERNAL_DWELLING_UNITS`,
  `SPLIT_ARMY_STACK`, `CAPTURE_MINE`, `SPELL_CAST` (summon-class
  effects), `BUILD_BOAT`, `GENERATE_RANDOM_MAP`)

Outputs:
- `docs/architecture/id-allocator.md`

Owned Paths:
- `docs/architecture/id-allocator.md`

Dependencies:
- mvp.00-core-architecture.arch-state-shape

Acceptance Criteria:
- Allocator format documented as
  `<kind>:<turn>:<actorId>:<perTurnCounter>` with examples.
- Per-turn-per-actor counter rule documented; counters reset each
  turn for that `(kind, actorId)` pair.
- `state-shape.md` references `idCounters` and links to this file.
- `command-schema.md` Contract section requires minting commands to
  use this allocator.
- `glossary.md` "Stable ID" entry covers both authored and runtime
  forms.

Verify:
- npm run validate

Estimated Time:
- 2 hours
