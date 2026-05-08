# Ranged Attack — Obstacle Check, Range Limit

Module: [Tactical Combat (M2)](../09-tactical-combat.md)

Description:
Ranged units (Archers, Marksmen, Monks, Zealots) can attack from a distance. Two penalties apply: halved damage if enemy is adjacent (melee penalty, except Monks/Zealots), and halved damage beyond "long range" (if no Eagle Eye specialty).

Read First:
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)

Inputs:
- `BattleState` (Task 1)
- Attacker and defender positions

Outputs:
- `src/engine/ranged.ts`
- `isRangedAttackValid(state, attackerId, defenderId): boolean`
- `getRangedPenalty(attacker, distance, obstacles): number` — multiplier (1.0, 0.5, or 0.25 for both penalties)
- Obstacle check: wall / fortification hexes block ranged shots (line-of-sight check)

Baseline-corridor ranged rules (all constants live in the ruleset,
see `research/deep-research-report.md`):
- Short range: ≤ `rangedShortRangeHexes` (default 10) → no penalty
- Long range: > `rangedShortRangeHexes` → ×`rangedLongRangePenaltyNum`/`Den` (default 1/2)
- Melee penalty: enemy unit adjacent to a ranged attacker →
  ×`rangedMeleePenaltyNum`/`Den` (default 1/2)
- Penalties stack multiplicatively (defaults → ×1/4)

Owned Paths:
- `src/engine/ranged.ts`

Dependencies:
- mvp.09-tactical-combat.03-damage-formula
- mvp.03-map-system.01-axial-hex-coordinate-utilities

## Line of sight

Wall hexes, fortifications, and battlefield obstacles block ranged
shots via the deterministic cube-interpolation hex-line algorithm
pinned in
[`docs/architecture/line-of-sight.md`](../../../docs/architecture/line-of-sight.md).
Stacks do **not** occlude shots by default; flying stacks never
occlude. Use `castLineOfSight(field, src, dst)` from
`src/engine/line-of-sight.ts`; on `blocked`, the ranged attack
returns a validation error rather than a silent miss.

Acceptance Criteria:
- Marksman at distance 5 deals full damage (no penalty)
- Marksman at distance 15 deals ×0.5 damage
- Marksman adjacent to enemy deals ×0.5 (melee penalty)
- Monk at distance 15 adjacent to enemy deals ×0.5 (no melee penalty, but long range applies)
- Shots property depletes by 1 per ranged attack; at 0, unit must use melee
- Shot blocked by a wall hex returns `BLOCKED`; shot blocked at edge
  tie selects the lower `(q, r)` hex per the algorithm spec

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
