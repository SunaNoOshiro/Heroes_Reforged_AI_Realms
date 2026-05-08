# BattleState Init — Army Placement + Speed Order

Module: [Tactical Combat (M2)](../09-tactical-combat.md)

Description:
Initialize the `BattleState` from two opposing armies. Place unit stacks on the 11×15 hex grid in their starting positions (columns 1–2 for attacker, columns 13–14 for defender). Build the initiative queue sorted by unit speed, with ties broken by side (attacker first) and then stack index.

Read First:
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)

Inputs:
- Attacker army (`ArmyStack[]`)
- Defender army (`ArmyStack[]`)
- Terrain type for the battlefield (affects sprite sheet, not mechanics in MVP)
- RNG state (for morale/luck rolls)

Outputs:
- `src/engine/battle-state.ts`
- `BattleState`:
  ```typescript
  type BattleState = {
    field: MapStorage,    // 11×15 grid
    stacks: UnitStack[],  // all stacks with position, hp, flags
    initiativeQueue: string[],  // ordered stack ids for this round
    round: number,
    activeStackId: string | null,
    waitedThisTurn: Set<string>,
    rng: RngState,
    log: BattleEvent[],
  }
  ```
- `initBattle(attacker, defender, terrain, rng): BattleState`

Owned Paths:
- `src/engine/battle-state.ts`

Dependencies:
- mvp.03-map-system.01-axial-hex-coordinate-utilities
- mvp.03-map-system.03-layered-tile-storage
- mvp.04-faction-emberwild.04-baseline-ruleset

Acceptance Criteria:
- Attacker stacks placed in columns 1–2 (left side), defender in columns 13–14 (right side)
- Initiative queue orders all 14 stacks (7 per side) by speed descending
- Two stacks with same speed: attacker goes first
- `initBattle` is deterministic for same inputs (same seed → same stack IDs, same queue)
- Battlefield stack cap = `ruleset.combat.battlefieldMaxStacks`
  (default 14); summon/raise effects rejected past the cap per
  [`docs/architecture/in-combat-stack-rules.md`](../../../docs/architecture/in-combat-stack-rules.md)

## Not in scope

- **In-combat split** — splitting a stack mid-battle is explicitly
  out-of-scope. See
  [`docs/architecture/in-combat-stack-rules.md`](../../../docs/architecture/in-combat-stack-rules.md)
  and the corresponding row in
  [`docs/architecture/mechanics-coverage.md`](../../../docs/architecture/mechanics-coverage.md).

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
