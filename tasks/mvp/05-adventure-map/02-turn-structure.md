# Turn Structure

Status: planned

Module: [Adventure Map (M1)](../05-adventure-map.md)

Description:
Implement the strategic turn lifecycle using the canonical command
schema. The UI may expose an "End Turn" control, but reducer inputs use
schema-backed command kinds only. Baseline corridor: all human players
act sequentially, then all AI players act, then resource collection
happens at end of day. On day 7, weekly growth triggers.

Read First:
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- [`content-schema/schemas/command.schema.json`](../../../content-schema/schemas/command.schema.json)

Inputs:
- `AdventureState` from `mvp.05-adventure-map.01-strategic-game-state-model`
- Command dispatcher from `mvp.01-engine-core.06-command-dispatcher`
- Canonical `END_HERO_TURN` and `END_DAY` payloads from
  `content-schema/schemas/command.schema.json`

Outputs:
- `src/engine/adventure-turn.ts`
- `applyEndHeroTurn(state, command: EndHeroTurnCommand)`
- `applyEndDay(state, command: EndDayCommand)`
- Events emitted as event-log entries, not command kinds:
  - `DAY_START` restores hero MP and notifies all players
  - `DAY_END` collects daily resource income
  - `WEEK_START` triggers unit growth in towns and rolls a themed-week
    record via the roller task
    [`phase-2.08-meta-systems.08-themed-week-roller`](../../phase-2/08-meta-systems/08-themed-week-roller.md)
    (the rolled id is captured on the scenario for the popup)

Owned Paths:
- `src/engine/adventure-turn.ts`

Dependencies:
- mvp.05-adventure-map.01-strategic-game-state-model
- mvp.01-engine-core.06-command-dispatcher

Acceptance Criteria:
- The implementation does not introduce `END_TURN` or `PASS_TURN`
  command kinds
- UI aliases such as `END_PLAYER_TURN` map through
  `docs/architecture/screen-command-coverage.json` to `END_DAY` or
  dispatch a deterministic sequence of `END_HERO_TURN` commands followed
  by `END_DAY`
- After all active heroes end, `END_DAY` advances the calendar
  deterministically
- Day 7 `WEEK_START` event fires exactly once and town growth triggers
- Hero MP is restored at start of each new day
- Turn order is deterministic (same seed → same order)
- Same seed and command log produce the same final state hash across 3
  runs

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
