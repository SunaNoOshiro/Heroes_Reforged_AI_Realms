# Hotseat Turn State Machine

Status: planned

Module: [Campaign, Quest, And Status Meta Systems (P2)](../08-meta-systems.md)

Description:
Local-only state machine that hands off the active player seat between
human players sitting at the same machine. No network. Lives entirely
in the deterministic engine: same command log, same hash, same replay.

Read First:
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)
- `docs/architecture/wiki/screens/63-hotseat-turn-handoff/spec.md`
- `docs/architecture/wiki/screens/63-hotseat-turn-handoff/interactions.md`
- `docs/architecture/wiki/screens/63-hotseat-turn-handoff/data-contracts.md`

Inputs:
- `AdventureState.players[]` and `activePlayerId` from
  `mvp.05-adventure-map.01-strategic-game-state-model`
- `END_DAY` from `mvp.01-engine-core.06-command-dispatcher`
- Screen package `docs/architecture/wiki/screens/63-hotseat-turn-handoff/`

Outputs:
- `src/engine/hotseat/turn-state-machine.ts`
- `BEGIN_HOTSEAT_HANDOFF` and `CONFIRM_HOTSEAT_HANDOFF` reducers
- Seat order resolution: round-robin over `players[]` filtered by
  `controller === "local-human"`

Owned Paths:
- `src/engine/hotseat/turn-state-machine.ts`

Dependencies:
- mvp.05-adventure-map.01-strategic-game-state-model
- mvp.05-adventure-map.02-turn-structure
- mvp.01-engine-core.06-command-dispatcher

Acceptance Criteria:
- `BEGIN_HOTSEAT_HANDOFF` validates that `END_DAY` was the last command
  and that the next seat is local-human; otherwise returns
  `ValidationError`
- `CONFIRM_HOTSEAT_HANDOFF` advances `activePlayerId` to the next
  local-human seat and unblocks input; replay produces identical hashes
- State machine has exactly three states: `idle`, `awaiting_confirm`,
  `handed_off`; encoded as a `phase` enum on `AdventureState`, no
  shadow state stored elsewhere
- Screen `63-hotseat-turn-handoff` dispatches both commands through the
  shared command hook
- No network, no timers, no `Date.now()`

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
