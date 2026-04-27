# Victory / Defeat Conditions

Status: planned

Module: [Adventure Map (M1)](../05-adventure-map.md)

Description:
Check win/loss conditions after each turn. MVP baseline: defeat =
lose all heroes and towns; victory = eliminate all other players OR
satisfy a scenario-defined victory condition (see
`scenario.schema.json` — closed union of victory kinds).

Read First:
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)

Inputs:
- `AdventureState` (Task 1)

Outputs:
- `src/engine/victory.ts`
- `checkVictory(state: AdventureState): VictoryResult | null`
- `VictoryResult`: `{ winnerId: number, reason: "eliminated_all" | "grail_capture" | "days_exceeded" }`

Owned Paths:
- `src/engine/victory.ts`

Dependencies:
- mvp.05-adventure-map.01-strategic-game-state-model

Acceptance Criteria:
- Returns `null` when game is still active
- Returns `VictoryResult` when one player has no heroes and no towns
- Correctly identifies the winning player ID

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
