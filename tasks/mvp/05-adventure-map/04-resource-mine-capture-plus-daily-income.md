# Resource Mine Capture + Daily Income

Status: planned

Module: [Adventure Map (M1)](../05-adventure-map.md)

Description:
Mines on the map produce resources daily once captured by a hero. Implement capture logic and the daily income tick.

Read First:
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)

Inputs:
- `AdventureState` (Task 1)
- Mine object definitions (stored in map JSON)

Outputs:
- `src/engine/commands/capture-mine.ts`
- `MINE_CAPTURED` event: `{ heroId, mineId, resourceType, dailyAmount }`
- Daily income applied during `DAY_END` processing (Task 2)

Mine types and default daily income (from `baseline.ruleset.json`;
per-pack overrides allowed):
- Gold Mine: 1000 gold/day
- Ore Mine: 2 ore/day
- Wood Sawmill: 2 wood/day
- Sulfur Pit: 1 sulfur/day
- Crystal Cavern: 1 crystal/day
- Gem Pond: 1 gem/day
- Mercury Pool: 1 mercury/day

Owned Paths:
- `src/engine/commands/capture-mine.ts`

Dependencies:
- mvp.05-adventure-map.02-turn-structure
- mvp.05-adventure-map.03-hero-movement

Acceptance Criteria:
- Capturing a Gold Mine adds 1000 gold per day starting the day after capture
- Neutral mine captures succeed; enemy-owned mines succeed only if enemy garrison is beaten
- Player resource totals update correctly after each `DAY_END`

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
