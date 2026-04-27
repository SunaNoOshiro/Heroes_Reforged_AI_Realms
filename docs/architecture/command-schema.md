# Command Schema

Canonical reference for all game commands. Commands are the only way to mutate game state. Every command is deterministic and serializable.

**See also:** [`state-flow.md`](./state-flow.md) (how commands flow through the engine).

---

## Contract

- Every command has a `kind` field (closed enum)
- Commands are **pure data** — no methods, no side effects
- Command dispatcher is a pure reducer: `state' = apply(state, command)`
- All commands serialize / deserialize identically
- Commands are logged in order for replay and multiplayer sync
- Screen interaction tokens are checked by
  [`screen-command-coverage.json`](./screen-command-coverage.json) and
  `npm run validate:commands`. A token must be a schema command, an
  alias to one, UI-local, or explicitly out of scope with an owning task.

---

## Adventure Map Commands

Commands that mutate the strategic layer (`AdventureState`).

### MOVE_HERO

Move a hero along a path, consuming movement points.

```typescript
{
  kind: "MOVE_HERO",
  heroId: string,           // hero to move
  path: HexCoord[]          // target path (validated by pathfinder)
}
```

**Validation:**
- Hero exists
- Path is valid (connected, no impassable terrain)
- Hero has sufficient movement points
- No fog-of-war violations

**Effects:**
- Updates hero position to path[-1]
- Consumes movement points proportional to terrain cost
- Triggers object interactions (mine capture, town enter, artifact pickup, combat)
- Updates fog of war

**Determinism:** Pathfinding is deterministic (no RNG). MP cost is deterministic.

---

### END_HERO_TURN

Hero has finished their turn (no more moves or actions).

```typescript
{
  kind: "END_HERO_TURN",
  heroId: string
}
```

**Validation:**
- Hero is active

**Effects:**
- Marks hero as no longer active for this turn
- Advances to next hero or next day

---

### END_DAY

All heroes have finished; advance to next day.

```typescript
{
  kind: "END_DAY"
}
```

**Validation:**
- All heroes have ended turn or passed

**Effects:**
- Increments day counter
- Recalculates town creature growth
- Distributes daily resource income (from mines)
- Resets hero movement points
- Re-seeds mage guild spell offerings (deterministic per town)

---

### RECRUIT_UNITS

Recruit units from a town dwelling.

```typescript
{
  kind: "RECRUIT_UNITS",
  heroId: string,           // recruiting hero
  townId: string,           // town where recruitment happens
  dwellingUnitId: string,   // unit type to recruit (e.g. "emberwild:unit:ash-hound")
  quantity: number          // how many to recruit
}
```

**Validation:**
- Hero is in the town
- Town is friendly (owned by hero's player)
- Dwelling exists and is owned by the town
- Sufficient units available in growth pool
- Hero or town has enough resources
- Recruited units fit in hero army (up to 7 stacks) or town garrison

**Effects:**
- Deducts resources from hero or town
- Removes units from town growth pool
- Adds stack to hero army (or town garrison if army is full)
- If hero army is full, units go to town garrison

---

### BUILD_BUILDING

Construct a building in a town.

```typescript
{
  kind: "BUILD_BUILDING",
  townId: string,           // town where building is constructed
  buildingId: string        // building to construct
}
```

**Validation:**
- Town is friendly
- Building is not already built
- All prerequisites are built
- Town has enough resources
- Only one building per town per day (checked via BuildingBuiltToday flag on town)

**Effects:**
- Deducts resources
- Marks building as built in town.buildings[]
- Adds flag BuildingBuiltToday (reset at END_DAY)
- If building is a creature dwelling, it becomes available for recruitment

---

### LEARN_SPELL

Hero learns a spell from a town's mage guild.

```typescript
{
  kind: "LEARN_SPELL",
  heroId: string,           // learning hero
  townId: string,           // town with mage guild
  spellId: string           // spell to learn
}
```

**Validation:**
- Hero is in the town
- Town has a mage guild at required level
- Spell is available in the mage guild
- Hero has sufficient Knowledge stat for spell level
- Hero does not already know this spell

**Effects:**
- Adds spell to hero.spells[]
- Spell is no longer immediately available (mage guild re-rolls next day)

---

### CAPTURE_MINE

Claim a neutral mine (triggered by MOVE_HERO arrival).

```typescript
{
  kind: "CAPTURE_MINE",
  mineId: string,           // mine being captured
  heroId: string,           // hero capturing it
  playerId: number          // player owner
}
```

**Validation:**
- Mine exists
- Mine is not already owned
- Hero is at mine position
- Mine object is still on map

**Effects:**
- Transfers mine ownership to player
- Mine generates daily income for player
- Removes mine object from map

---

### INITIATE_BATTLE

Hero encounters enemy stack (triggered by MOVE_HERO arrival).

```typescript
{
  kind: "INITIATE_BATTLE",
  attackerId: string,       // attacking hero
  defenderId: string,       // defending hero or neutral stack id
  autoResolve: boolean      // true = auto-resolve, false = enter tactical battle
}
```

**Validation:**
- Attacker hero exists
- Defender hero or neutral stack exists
- Positions are adjacent or same hex

**Effects:**
- Transitions state.phase to "battle"
- If autoResolve: dispatches AUTO_RESOLVE_BATTLE command
- If not: initializes tactical battle state (nested reducer)

---

## Tactical Battle Commands

Commands that mutate tactical battle state (`BattleState`). These run in a nested reducer while `state.phase === "battle"`.

### BATTLE_ATTACK

Stack attacks another stack.

```typescript
{
  kind: "BATTLE_ATTACK",
  attackerStackId: string,
  defenderStackId: string,
  targetPosition: HexCoord  // where defender is (for validation)
}
```

**Validation:**
- Attacker stack exists and is in initiative queue
- Attacker is the current active stack
- Defender stack exists
- Distance is melee (adjacent) or valid ranged (with ranged attack possible)
- Attacker has not already attacked this turn (or has multi-strike ability)
- Defender is not in a protected state (waiting with defend active)

**Effects:**
- Calculates damage via damage formula (AST evaluated against ruleset)
- Applies luck and morale rolls
- Removes HP from defender
- If defender is killed: removes stack from battle
- If defender can retaliate: immediately applies retaliation damage
- Logs the attack event

---

### BATTLE_WAIT

Stack passes their turn, moving to end of initiative queue.

```typescript
{
  kind: "BATTLE_WAIT",
  stackId: string
}
```

**Validation:**
- Stack exists and is the current active stack
- Stack has not already waited this turn

**Effects:**
- Moves stack to end of initiative queue
- Advances to next stack's turn

---

### BATTLE_DEFEND

Stack takes a defensive stance, reducing damage taken.

```typescript
{
  kind: "BATTLE_DEFEND",
  stackId: string
}
```

**Validation:**
- Stack exists and is the current active stack

**Effects:**
- Sets stack's DEFENDING status flag
- Incoming damage this round is reduced by formula (TBD: exact reduction)
- Advances to next stack's turn

---

### BATTLE_SPELL

Hero casts a spell on a target.

```typescript
{
  kind: "BATTLE_SPELL",
  casterId: string,         // hero or stack id casting
  spellId: string,
  targetStackId: string,    // if damage spell
  targetPosition: HexCoord  // if area spell
}
```

**Validation:**
- Caster has spell in spellbook
- Caster has sufficient mana
- Spell is a combat spell (scope includes "combat")
- Target is valid for spell targeting rules

**Effects:**
- Deducts mana from caster
- Evaluates spell effects (damage, heal, status, etc.)
- Applies luck/critical multipliers if applicable
- Advances caster in queue or ends turn

**Note:** Spell system is Phase 2. Combat MVP does not include spells.

---

### BATTLE_SURRENDER

Hero surrenders the battle (optional, for UI only).

```typescript
{
  kind: "BATTLE_SURRENDER",
  heroId: string
}
```

**Validation:**
- Hero is a combatant in the battle

**Effects:**
- Battle ends immediately
- Surrendering hero loses 50 % of army
- Attacker gains all of defender's non-lost army

---

## Auto-Resolve Commands

### AUTO_RESOLVE_BATTLE

Instantly resolve a battle using the damage formula and fixed iterations.

```typescript
{
  kind: "AUTO_RESOLVE_BATTLE",
  attackerArmyId: string,
  defenderArmyId: string,
  attackerHeroId: string | null,
  defenderHeroId: string | null
}
```

**Validation:**
- Both armies exist

**Effects:**
- Simulates 20 rounds of deterministic combat (each side attacks once per round)
- Uses the same damage formula as tactical combat
- Returns winning side and remaining army state
- Dispatches BATTLE_RESOLVED command with results

**Determinism:** Same RNG seed + armies → exact same result every time.

---

## Game Management Commands

### SCENARIO_LOAD

Load a scenario or save file.

```typescript
{
  kind: "SCENARIO_LOAD",
  scenarioId: string,
  seed: number,             // RNG seed for this game
  contentHashes: {
    [packId]: string        // content hash for each loaded pack
  }
}
```

**Validation:**
- Scenario exists
- All referenced packs are loaded

**Effects:**
- Initializes game state from scenario
- Seeds RNG
- Pins content hashes for determinism

---

### BATTLE_RESOLVED

Battle has ended; return to adventure layer.

```typescript
{
  kind: "BATTLE_RESOLVED",
  winnerId: string | null,  // null = draw
  winnerArmy: ArmyStack[],
  loserArmy: ArmyStack[]
}
```

**Validation:**
- Battle is in progress

**Effects:**
- Transitions state.phase back to "adventure"
- Updates winner and loser armies
- Resolves victory conditions (if applicable)
- Continues turn sequence

---

## Future Commands (Phase 2+)

These are documented for reference but not implemented in MVP:

- `SPELL_CAST` — adventure-map and combat spell casting
- `ACTIVATE_ARTIFACT` — artifact special ability
- `TRADE_RESOURCES` — marketplace resource exchange
- `RECRUIT_EXTERNAL_DWELLING_UNITS` — hire from neutral or owned dwellings
- `ATTACK_TOWN` — siege assault
- `DIPLOMACY` — alliances, gifts (multiplayer only)

The JSON schema already reserves command kinds for several phase-2
systems so UI tasks can depend on a closed command vocabulary without
inventing reducers: tavern hiring, prison rescue, creature-bank rewards,
artifact equip/unequip, retreat/surrender, war machines, university
skills, shipyards, grail structures, random-map generation, and army or
artifact transfer flows.

---

## Serialization Contract

Every command must:
1. Serialize to JSON with no functions or circular references
2. Round-trip identically (JSON → object → JSON is byte-equal)
3. Include metadata: `{ kind, ..., turn: number, playerId: number }` (added by dispatcher)

All string IDs (heroId, townId, etc.) must be stable across sessions (defined at scenario load).

---

## Validation Framework

Commands are validated before dispatch:

```
validate(command: unknown): { valid: true, command: Command } | { valid: false, error: ValidationError }
```

Each command kind has:
1. Closed-schema validation (no `additionalProperties`)
2. Semantic validation (hero exists, resources available, etc.)
3. State validation (transition is legal for current phase)

---

## Related Files

- `content-schema/schemas/command.schema.json` — JSON Schema for validation
- `src/engine/commands/` — command handler implementations
- `src/engine/dispatcher.ts` — command dispatcher reducer
- `docs/architecture/state-flow.md` — how commands fit in the game loop
