# Command Schema

Canonical reference for all game commands. Commands are the only way to mutate game state. Every command is deterministic and serializable.

**See also:** [`state-flow.md`](./state-flow.md) (how commands flow through the engine), [`event-schema.md`](./event-schema.md) (the read-only event vocabulary command handlers emit), and [`event-system.md`](./event-system.md) (the runtime contract events flow through).

Events are the read-only flip-side of commands: a command handler computes the next state and the `events: Event[]` array together, and consumers (animation timeline, sound system) iterate the array on their own clock. Events never mutate state, never veto a command, and are never serialized into saves.

---

## Contract

- Every command has a `kind` field (closed enum)
- Commands are **pure data** — no methods, no side effects
- Command dispatcher is a pure reducer: `state' = apply(state, command)`
- All commands serialize / deserialize identically
- Commands are logged in order for replay and multiplayer sync
- Every dispatched command carries a `metadata` block with a `nonce`;
  see [Deduplication](#deduplication)
- Commands enter through one bounded FIFO per engine instance; see
  [Dispatcher Queue](#dispatcher-queue)
- Cross-actor ordering follows the rule in
  [Cross-Actor Ordering](#cross-actor-ordering)
- Commands that mint new entity IDs use the deterministic allocator in
  [`id-allocator.md`](./id-allocator.md); they MUST NOT invent IDs in
  any other way
- Screen interaction tokens are checked by
  [`screen-command-coverage.json`](./screen-command-coverage.json) and
  `npm run validate:commands`. A token must be a schema command, an
  alias to one, UI-local, or explicitly out of scope with an owning task.

### AI-Emitted Commands

Gameplay-AI workers emit the same closed `Command` enum as human
players; there are no AI-only kinds. The AI consumes a projected
per-player `AdventureView` (per
[`ai-contract.md` § 1 Input View](./ai-contract.md#1-input-view))
when deciding which command to emit. The dispatcher validates
the emitted command against full `AdventureState` per the
[Validation Framework](#validation-framework) below; the
projected view is the AI's perception, not a relaxation of
legality. `MOVE_HERO`, `INITIATE_BATTLE`, and every other kind
are checked against the full state at dispatch time, regardless
of which actor emitted them.

### Command Envelope

Every example below shows only the payload fields. The dispatcher
wraps each command in the following envelope before validation,
logging, and dispatch:

```typescript
{
  ...payload,                  // kind plus the per-command fields shown below
  metadata: {
    turn: number,              // current GameState.turn at dispatch
    playerId: number,          // numeric player id of the actor
    nonce: string              // "<actorId>:<turn>:<sequence>"; see Deduplication
  }
}
```

The closed JSON schema in
[`content-schema/schemas/command.schema.json`](../../content-schema/schemas/command.schema.json)
already requires `metadata` with a pattern-checked `nonce` on every
command kind, so individual examples below omit it for brevity.

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
- Seeds RNG (forks every named sub-stream from
  [`rng-streams.md`](./rng-streams.md) off this `seed`)
- Pins content hashes for determinism
- Pins the resolved `seed` into the command log so replays use the same value

#### Seed Source Precedence

`SCENARIO_LOAD.seed` is resolved at session start by the first matching
rule, in this order:

1. **Explicit user input.** Tournament rooms, daily-challenge codes,
   and bug-report replays paste an explicit integer seed. UI surfaces
   that collect this value live in screens
   [`docs/architecture/wiki/screens/`](./wiki/screens/) (multiplayer
   lobby, scenario settings, replay-import dialogs).
2. **Scenario `seed` field.** Authored scenarios may pin a fixed seed
   in their JSON. Used by tutorial and balanced-fixture scenarios.
3. **`ROLL_RMG_SEED` command result.** For random-map games, the
   pre-load `ROLL_RMG_SEED` command produces a seed that
   `SCENARIO_LOAD` then consumes.
4. **Cryptographically strong fallback.** If none of the above apply, a
   single CSPRNG draw produces the seed at session start. The value is
   pinned into the command log immediately so the rest of the session
   is deterministic.

In every case the resolved integer is recorded as
`SCENARIO_LOAD.seed` and is the only RNG entropy the engine ever
consumes.

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
3. Include the dispatcher-added `metadata` block:
   `{ turn: number, playerId: number, nonce: string }` (see
   [Deduplication](#deduplication) and
   [Cross-Actor Ordering](#cross-actor-ordering))

All string IDs (heroId, townId, etc.) must be stable across sessions
(defined at scenario load) or minted via the deterministic allocator
in [`id-allocator.md`](./id-allocator.md).

---

## Deduplication

Commands are intentionally **non-idempotent** — each application
mutates state. To make at-most-once delivery safe at the UI / network
boundary, every dispatched command carries a `nonce` field in its
metadata.

### Nonce Format

```
"<actorId>:<turn>:<sequence>"
```

| Segment | Meaning |
|---|---|
| `actorId` | The actor minting the command. Use a deterministic actor identifier (e.g. `p1`, `p2`, `system` for engine-only commands). Must match `^[A-Za-z0-9_-]+$`. |
| `turn` | The turn at mint time. Matches the metadata `turn` field. |
| `sequence` | A per-actor, per-turn monotonic counter starting at 0; resets at the start of each turn for that actor. |

Example: `p1:12:7` is the eighth command player 1 emitted on turn 12.
JSON Schema enforces the format with the regex
`^[A-Za-z0-9_-]+:[0-9]+:[0-9]+$`.

### Dispatcher Behavior

- The dispatcher rejects a command whose `nonce` already appears in
  the current turn's slice of the command log. Rejection emits a
  structured error `{ kind: 'duplicate_nonce', nonce }` and does NOT
  append to the log or advance state.
- The dedup window is the current turn slice only — once `END_DAY`
  rolls over, the per-actor sequence resets and earlier nonces become
  unreachable by definition.
- Replays trust the log: replaying a logged command never re-checks
  for duplicates, since duplicates were filtered at original dispatch.

### Why a Per-Actor Counter

A deterministic counter (rather than a UUID or wall-clock value)
preserves replay reproducibility: the nonce is a function of state and
order, not entropy. Multiplayer lockstep can demux a network frame
exactly because the tuple `(actorId, turn, sequence)` is total and
totally orderable.

---

## Dispatcher Queue

The engine exposes one **single FIFO queue per engine instance**.

| Property | Value |
|---|---|
| Capacity | 1024 commands (default; configurable per engine) |
| Order | FIFO (single-actor in single-player; for multi-actor see [Cross-Actor Ordering](#cross-actor-ordering)) |
| Drain | Single-threaded synchronous `apply` per dequeue |
| Dedup | At enqueue time using the `nonce` rule above |
| Overflow policy | Hard reject — never silent drop |

### Overflow Error

When enqueue would exceed capacity, the dispatcher returns the
structured error and does not append:

```jsonc
{
  "kind": "queue_overflow",
  "capacity": 1024,
  "queued": 1024
}
```

### Multiplayer Lockstep (M5)

The lockstep transport wraps the per-engine queue with a **network-frame
demuxer**: per-frame command bundles are split into per-engine
sequences ordered by the rule in
[Cross-Actor Ordering](#cross-actor-ordering), then enqueued through
this same FIFO. The per-engine queue contract is unchanged.

### AI Co-Actors and Scripted Scenarios

AI co-actors and scripted scenarios may batch-submit commands as long
as each one carries a unique nonce. Batches still respect the bounded
capacity; over-large batches are rejected with `queue_overflow` and
must be split.

---

## Cross-Actor Ordering

Within a single actor's turn, commands run in the order the actor
emits them. **Across actors**, the canonical tie-break rule is:

| Mode | Rule |
|---|---|
| Single-player | Trivial — one actor per turn. |
| Hotseat | Strict turn order from `players[].turnOrder` in the scenario file (see [`scenario.schema.json`](../../content-schema/schemas/scenario.schema.json)). No interleaving within a turn. Handoff happens through the screen package [`63-hotseat-turn-handoff`](./wiki/screens/63-hotseat-turn-handoff/). |
| AI co-actors | Treated as players with deterministic `playerId`s. Same rule as hotseat. |
| Multiplayer lockstep (M5) | Commands within one network frame are sorted by the tuple `(playerId asc, turn asc, sequence asc)` before dispatch. The `(turn, sequence)` half comes directly from the command's `nonce`. |

Commands minted by the engine itself (e.g. `BATTLE_RESOLVED`,
end-of-day book-keeping) use the literal actor id `"system"` for both
nonce generation and ordering. The `playerId asc` comparison is a
literal Unicode-codepoint compare on the `playerId` segment of the
nonce, so the resulting total order is deterministic across all peers
without any special case.

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
- `docs/architecture/state-shape.md` — top-level `GameState` shape commands consume
- `docs/architecture/rng-streams.md` — named PCG32 sub-streams seeded by `SCENARIO_LOAD`
- `docs/architecture/id-allocator.md` — runtime entity-ID format used by minting commands
- `docs/architecture/multi-engine-harness.md` — desync detection across engine instances
- `docs/architecture/ai-contract.md` — gameplay-AI runtime contract (projected view, worker protocol, budgets, cancellation, parallelism)
