# Strategic Game State Model

Module: [Adventure Map (M1)](../05-adventure-map.md)

Description:
Define the `AdventureState` — the complete serializable state of the strategic layer. This is the top-level state object that the command dispatcher (Task 6 of `01-engine-core.md`) operates on.

Read First:
- [`docs/architecture/state-flow.md`](../../../docs/architecture/state-flow.md)

Inputs:
- Map system (`03-map-system.md`)
- Content pack (`04-faction-emberwild.md`)

Outputs:
- `src/engine/adventure-state.ts`

Owned Paths:
- `src/engine/adventure-state.ts`

State shape:
```typescript
type AdventureState = {
  turn: number,
  phase: "player_turn" | "ai_turn" | "battle" | "game_over",
  activePlayerId: number,
  players: Player[],
  heroes: Hero[],
  towns: Town[],
  mines: Mine[],
  objects: MapObject[],   // artifacts, resources, events on map
  map: MapStorage,
  rng: RngState,          // serialized RNG state
  log: Command[],         // command log for replay
}

type Hero = {
  id: string,
  playerId: number,
  position: HexCoord,
  movementPoints: number,
  army: ArmyStack[],       // schema-enforced maxItems: 7 (hero.schema.json)
                           // runtime invariant: STACK_CAP_EXCEEDED on overflow
                           // see docs/architecture/edge-case-policy.md
  experience: number,
  level: number,
  primaryStats: PrimaryStats,
  secondarySkills: SkillEntry[],
  artifacts: ArtifactSlots,
  visitedTownIds: string[],
}

type Town = {
  id: string,
  playerId: number | null,  // null = neutral
  position: HexCoord,
  faction: string,
  buildings: string[],      // built building ids
  garrison: ArmyStack[],
  garrisonHeroId: string | null,    // see two-hero-per-town protocol
  visitingHeroId: string | null,    // SWAP_TOWN_HEROES command
  mageGuildSpells: SpellId[][],  // [level][index]
}
```

Dependencies:
- mvp.01-engine-core.06-command-dispatcher

Acceptance Criteria:
- `AdventureState` fully serializes / deserializes via `serializer.ts` with identical hash
- No mutable references (all arrays are never mutated in place; use spread/structuredClone)
- TypeScript strict types — no `any`
- `hero.army` schema-enforces `maxItems: 7`; the runtime additionally
  rejects any reducer that would create an 8th stack with
  `STACK_CAP_EXCEEDED` (see
  [`docs/architecture/edge-case-policy.md`](../../../docs/architecture/edge-case-policy.md))
- `Town` shape carries optional `garrisonHeroId` and `visitingHeroId`
  for the two-hero-per-town protocol; SWAP_TOWN_HEROES command in
  [`18-transfer-stack-commands.md`](18-transfer-stack-commands.md)

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours

---

## Worked Example: Command Sequence

**Initial State (Turn 1, Day 1):**
```json
{
  "turn": 1,
  "day": 1,
  "phase": "player_turn",
  "activePlayerId": 0,
  "players": [{ "id": 0, "faction": "emberwild" }],
  "heroes": [
    {
      "id": "emberwild-hero-kaelis",
      "playerId": 0,
      "position": { "q": 5, "r": 5 },
      "movementPoints": 4500,
      "level": 1,
      "experience": 0,
      "primaryStats": { "attack": 2, "defense": 2, "power": 1, "knowledge": 1 },
      "army": [
        { "unitId": "emberwild:unit:ash-hound", "count": 5, "hp": 6 }
      ],
      "secondarySkills": [],
      "artifacts": {},
      "visitedTownIds": []
    }
  ],
  "towns": [
    {
      "id": "emberwild-town-1",
      "playerId": 0,
      "position": { "q": 10, "r": 10 },
      "faction": "emberwild",
      "buildings": ["village-hall", "ash-hound-dwelling"],
      "garrison": [],
      "mageGuildSpells": []
    }
  ],
  "mines": [
    {
      "id": "gold-mine-1",
      "resourceType": "gold",
      "playerId": null,
      "position": { "q": 7, "r": 6 }
    }
  ]
}
```

**Command 1: MOVE_HERO (toward gold mine)**
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

**State After Command 1:**
- Hero position: (7, 6) — on the gold mine
- Movement points: 4500 - (100 + 100) = 4300 (grass costs 100 each)
- Gold mine status: triggers CAPTURE_MINE event

**Command 2: CAPTURE_MINE (auto-triggered by MOVE_HERO arrival)**
```json
{
  "kind": "CAPTURE_MINE",
  "mineId": "gold-mine-1",
  "heroId": "emberwild-hero-kaelis",
  "playerId": 0
}
```

**State After Command 2:**
- Gold mine now owned by player 0
- Mine.playerId = 0
- Mine object removed from map.objects

**Command 3: MOVE_HERO (toward town)**
```json
{
  "kind": "MOVE_HERO",
  "heroId": "emberwild-hero-kaelis",
  "path": [
    { "q": 8, "r": 8 },
    { "q": 9, "r": 9 },
    { "q": 10, "r": 10 }
  ]
}
```

**State After Command 3:**
- Hero position: (10, 10) — in the town
- Movement points: 4300 - 300 = 4000
- TOWN_VISITED event triggered

**Command 4: RECRUIT_UNITS (from town dwelling)**
```json
{
  "kind": "RECRUIT_UNITS",
  "heroId": "emberwild-hero-kaelis",
  "townId": "emberwild-town-1",
  "dwellingUnitId": "emberwild:unit:ash-hound",
  "quantity": 3
}
```

**State After Command 4:**
- Hero army: now has 8 ash-hounds (5 + 3)
- Town resources: deducted 3 × (cost of ash-hound) from player gold
- Town creature growth pool: decremented by 3

**Command 5: BUILD_BUILDING (construct kennels)**
```json
{
  "kind": "BUILD_BUILDING",
  "townId": "emberwild-town-1",
  "buildingId": "emberwild:building:kennels"
}
```

**State After Command 5:**
- Town buildings: now includes "emberwild:building:kennels"
- Town resources: deducted cost from player gold
- BuildingBuiltToday flag set on town (prevents another build this day)

**Command 6: END_HERO_TURN (no more moves)**
```json
{
  "kind": "END_HERO_TURN",
  "heroId": "emberwild-hero-kaelis"
}
```

**State After Command 6:**
- Hero is no longer active
- Phase advances (if all heroes done: END_DAY)

**Command 7: END_DAY**
```json
{
  "kind": "END_DAY"
}
```

**State After Command 7:**
- Day increments to 2
- All hero movement points reset to 4500
- Town creature growth calculated (+ base growth per dwelling)
- Daily income from mines added (gold mine: +1000 gold)
- Mage guild spells re-rolled (deterministically)
- BuildingBuiltToday flags reset on all towns

**Determinism Note:** All state transitions are deterministic. Same seed + same command log = identical state on replay. No floating-point arithmetic, no `Date.now()`, no branching on randomness during state mutation.
