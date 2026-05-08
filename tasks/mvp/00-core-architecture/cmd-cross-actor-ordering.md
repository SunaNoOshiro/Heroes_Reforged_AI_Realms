# Cross-actor command ordering

Module: [Core Architecture Contracts (M0)](../00-core-architecture.md)

Description:
Within a single actor's turn, commands run in the order the actor
emits them. Across actors (hotseat handoff, AI co-actors, multiplayer
peers), the canonical tie-break rule was unspecified. This task pins
that rule so M5 multiplayer lockstep has a spec to implement against.

Rule:
- Single-player: trivial — one actor per turn.
- Hotseat: strict turn order from `players[].turnOrder` (no
  interleaving within a turn); handoff via screen package
  [`63-hotseat-turn-handoff`](../../../docs/architecture/wiki/screens/63-hotseat-turn-handoff/).
- AI co-actors: deterministic `playerId`s, same rule as hotseat.
- Multiplayer lockstep: commands within one network frame are sorted
  by `(playerId asc, turn asc, sequence asc)` before dispatch; the
  `(turn, sequence)` half comes from the command's nonce.

Source audit:
[`docs/readiness-audit/01-core-architecture.md`](../../../docs/readiness-audit/01-core-architecture.md)
(Q17, Issue 3.B-3).

Read First:
- [`docs/implementation-plans/01-core-architecture-plan.md`](../../../docs/implementation-plans/01-core-architecture-plan.md)
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)

Inputs:
- Audit Q17 in
  [`docs/readiness-audit/01-core-architecture.md`](../../../docs/readiness-audit/01-core-architecture.md)
- Existing scenario schema at
  `content-schema/schemas/scenario.schema.json`
  (`players[].turnOrder` field)

Outputs:
- New "Cross-Actor Ordering" section in
  [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- "Cross-actor ordering" entry in
  [`docs/architecture/glossary.md`](../../../docs/architecture/glossary.md)

Owned Paths:
- (none — additive section in the existing command-schema doc; primary owner is mvp.01-engine-core.06b-extend-command-schema-coverage-checklist)

Dependencies:
- mvp.00-core-architecture.cmd-nonce

Acceptance Criteria:
- "Cross-Actor Ordering" section enumerates rules per mode (single-
  player, hotseat, AI co-actor, multiplayer lockstep).
- Hotseat rule references the screen package
  `docs/architecture/wiki/screens/63-hotseat-turn-handoff` by path.
- Multiplayer rule documents the `(playerId, turn, sequence)` tuple
  and that `playerId` ordering is a literal Unicode-codepoint compare.
- `glossary.md` has a "cross-actor ordering" entry.

Verify:
- npm run validate

Estimated Time:
- 2 hours
