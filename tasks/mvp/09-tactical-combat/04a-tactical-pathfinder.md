# Tactical-Combat Pathfinder

Status: planned

Module: [Tactical Combat (M2)](../09-tactical-combat.md)

Description:
Implement the tactical pathfinder used by `BATTLE_MOVE`. Reuses the
adventure A* and the axial-hex utilities, but enforces the tactical
grid's specifics: obstacle hexes, flying bypass, wall-segment
navigation (using line-of-sight), and the deterministic tie-break
shared with the adventure pathfinder.

Read First:
- [`docs/architecture/line-of-sight.md`](../../../docs/architecture/line-of-sight.md)
- [`docs/architecture/edge-case-policy.md`](../../../docs/architecture/edge-case-policy.md)
- [`tasks/mvp/03-map-system/01-axial-hex-coordinate-utilities.md`](../../mvp/03-map-system/01-axial-hex-coordinate-utilities.md)
- [`tasks/mvp/03-map-system/04-a-pathfinder-with-terrain-cost-plus-zoc.md`](../../mvp/03-map-system/04-a-pathfinder-with-terrain-cost-plus-zoc.md)

Inputs:
- `BattleState` from `mvp.09-tactical-combat.01-battlestate-init-army-placement-plus-speed-order`
- Source / destination hex
- Stack abilities (flying, ground, fly-only)
- Movement-points budget

Outputs:
- `src/engine/battle-pathfinder.ts`
- `findBattlePath(battle, src, dst, abilities, mp): Hex[] | null`
- Reuses A* from the map-system pathfinder; only the cost / blocker
  table differs.

Owned Paths:
- `src/engine/battle-pathfinder.ts`

Dependencies:
- mvp.03-map-system.01-axial-hex-coordinate-utilities
- mvp.03-map-system.04-a-pathfinder-with-terrain-cost-plus-zoc
- mvp.09-tactical-combat.01-battlestate-init-army-placement-plus-speed-order
- mvp.09-tactical-combat.04-ranged-attack-obstacle-check-range-limit

### Cost / blocker table

- Empty hex: `1` MP per step (integer; no terrain modifier on the
  tactical grid in MVP)
- Obstacle hex: cost `Infinity` for non-flying; cost `1` for flying
  (ignores obstacle)
- Friendly stack hex: cost `Infinity` (cannot enter; even flying)
- Enemy stack hex: only legal as the *destination* (melee adjacency
  check); transit is `Infinity`
- Wall segment: blocked outright for ranged shots (LoS); blocked for
  ground movement; flying may pass over only when wall is destroyed

Acceptance Criteria:
- Path through a 1-hex gap chooses the lower-`(q, r)` divergent hex
  on a deliberate tie (consistent with adventure pathfinder)
- Flying stack routes around a friendly stack but ignores obstacle
  hexes
- Ground stack respects ZoC of adjacent enemy stacks (consistent with
  adventure A*)
- Wall hexes block ground movement until the wall is destroyed
  (`hp == 0`)
- Function is pure and deterministic: same `(battle, src, dst,
  abilities, mp)` → same `Hex[]` (or `null`)
- Returns `null` if `mp` is insufficient for any reachable path

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
