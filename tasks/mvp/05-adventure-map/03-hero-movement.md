# Hero Movement

Module: [Adventure Map (M1)](../05-adventure-map.md)

Description:
Heroes move on the adventure map by consuming movement points (MP). Implement the `MOVE_HERO` command: validate path, consume MP, update position, trigger any objects on arrival (mine capture, town enter, artifact pickup).

Read First:
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)

Inputs:
- Pathfinder (`03-map-system.md` Task 4)
- `AdventureState` (Task 1)

Outputs:
- `src/engine/commands/move-hero.ts`
- `MOVE_HERO` command: `{ heroId: string, path: HexCoord[] }`
- Validation: path is valid, sufficient MP, no impassable tiles
- Consumes MP proportional to terrain costs along path
- Triggers object interaction on arrival hex

Owned Paths:
- `src/engine/commands/move-hero.ts`

Dependencies:
- mvp.05-adventure-map.01-strategic-game-state-model
- mvp.03-map-system.04-a-pathfinder-with-terrain-cost-plus-zoc

Acceptance Criteria:
- Moving across 3 grass tiles (cost 100 each) consumes 300 MP
- Moving onto a mine hex triggers `MINE_CAPTURED` event
- Moving onto an enemy hero hex triggers `BATTLE_INITIATED` event
- Moving with 0 MP returns `ValidationError`
- Fog of war updates after each move

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours

---

## Worked Example: MOVE_HERO Command

**Scenario:** Hero at (5, 5) wants to move to gold mine at (7, 6).

**Terrain Costs (from ruleset; mirrored in
[`docs/architecture/diagrams/23-hero-movement.md`](../../../docs/architecture/diagrams/23-hero-movement.md)
for replay-determinism — both files store integer ×100 values, never
decimals):**
```json
{
  "grass": 100,
  "sand": 150,
  "swamp": 200,
  "snow": 200,
  "road": 75,
  "water": 9999,
  "mountain": 9999
}
```

**Roads reduce cost by 50 % (final cost = ceil(baseCost / 2)).**

**Path Calculation (via pathfinder):**
```
Start: (5, 5) — MP = 4500
Hex (6, 5) — grass, cost 100 → cumulative MP: 4500 - 100 = 4400
Hex (7, 6) — grass, cost 100 → cumulative MP: 4400 - 100 = 4300
```

**Valid path: [(5, 5), (6, 5), (7, 6)] (2 moves, 200 MP consumed)**

**MOVE_HERO Command:**
```json
{
  "kind": "MOVE_HERO",
  "heroId": "emberwild-hero-kaelis",
  "path": [
    { "q": 6, "r": 5 },
    { "q": 7, "r": 6 }
  ]
}
```

**Validation steps:**
1. Hero exists: ✓
2. Hero has 4500 MP (≥ 200 required): ✓
3. Path is contiguous (each hex is a neighbor): ✓
4. Path contains no impassable terrain (water, mountains): ✓
5. Path respects zone-of-control rules (can't pass through enemy stacks): ✓

**State mutations:**
```typescript
// Before
hero.position = { q: 5, r: 5 }
hero.movementPoints = 4500

// After
hero.position = { q: 7, r: 6 }
hero.movementPoints = 4300

// Fog of war updated for all hexes in movement range
hero.visibleHexes = calculateFogOfWar(hero.position, hero.sightRange)

// Object interaction triggered
objectAt(7, 6) = goldMine
→ dispatch CAPTURE_MINE event (automatic)
```

**Determinism contract:**
- Pathfinding is deterministic (A* with consistent tie-breaking).
  Ties are broken by **axial coord ascending: `q` first, then `r`**.
  Two equal-cost paths must select the path whose first divergent hex
  has the lower `(q, r)` lexicographic value. The implementation must
  round-trip stable through canonical-JSON serialization.
- MP cost is deterministic (ruleset-based, no variance)
- Fog of war is deterministic (line-of-sight algorithm, seeded by map, not RNG)

---

## Example: Invalid MOVE_HERO

**Scenario:** Hero at (5, 5) tries to move with 0 MP remaining.

**Command:**
```json
{
  "kind": "MOVE_HERO",
  "heroId": "emberwild-hero-kaelis",
  "path": [{ "q": 6, "r": 5 }]
}
```

**Validation fails:**
```typescript
if (hero.movementPoints < pathCost) {
  throw new ValidationError("Insufficient movement points", {
    available: 0,
    required: 100
  });
}
```

**Result:** Command is rejected. State is unchanged. Command is not appended to log.
