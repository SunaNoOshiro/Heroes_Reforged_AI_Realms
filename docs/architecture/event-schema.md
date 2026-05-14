# Event Schema

Per-kind catalog of the closed event vocabulary. Pinned parallel to
[`command-schema.md`](./command-schema.md): commands mutate state,
events describe what happened so consumers (animation timeline,
sound system, future replay diagnostics) can react.

The runtime contract — emission timing, consumer iteration order,
no-veto, no re-entry, retention, save/load, error isolation, and
determinism guard rules — lives in
[`event-system.md`](./event-system.md). The closed JSON schema lives
in
[`content-schema/schemas/event.schema.json`](../../content-schema/schemas/event.schema.json).
This file is the human-readable companion: one section per `kind`
with payload, emitter command(s), and consumer(s).

---

## Contract (summary)

Full rules in [`event-system.md`](./event-system.md). The clauses
this catalog leans on:

- Every event has a `kind` field (closed enum) and a `payload`
  object. Events are pure data — no methods, no callbacks.
- Events are emitted synchronously by command handlers and returned
  on the dispatcher's `Result.events` array. Consumers iterate in
  insertion order on their own clock; no consumer may cancel,
  reorder, mutate, or replace an event.
- Events MUST validate against
  [`event.schema.json`](../../content-schema/schemas/event.schema.json).
  Any extra property, unknown `kind`, or malformed payload is a
  `ValidationError`.
- Events are **never serialized**. Saves contain `(seed, content
  hashes, command log, state snapshot)`; events are re-derived by
  replay. See
  [`event-system.md` § 7](./event-system.md#7-save--load).
- Screen tokens are validated by
  [`screen-event-coverage.json`](./screen-event-coverage.json): a
  token must be a schema kind, an alias to one, UI-local, or
  explicitly out of scope with an owning task.

Adding a new kind requires extending `event.schema.json`, this doc,
and [`screen-event-coverage.json`](./screen-event-coverage.json) in
the same change.

---

## Summary

The 13 kinds enumerated below are the closed vocabulary.

| Kind | Emitter command(s) | Consumer(s) | Payload keys |
|---|---|---|---|
| `UNIT_MOVED` | `BATTLE_MOVE`, `MOVE_HERO` (presentation) | animation timeline, sound system | `unitId`, `fromHex`, `toHex`, `path?` |
| `UNIT_ATTACKED` | `BATTLE_ATTACK`, `AUTO_RESOLVE_BATTLE` | animation timeline, sound system (`sword_hit`) | `attackerStackId`, `defenderStackId`, `damage` |
| `UNIT_DIED` | `BATTLE_ATTACK`, `BATTLE_SPELL`, `AUTO_RESOLVE_BATTLE` | animation timeline, sound system (`death_cry`) | `unitId` |
| `PROJECTILE_FIRED` | `BATTLE_ATTACK` (ranged) | animation timeline | `attackerStackId`, `defenderStackId` |
| `SPELL_CAST` | `SPELL_CAST` | animation timeline, sound system (`spell_cast_<school>`) | `casterId`, `spellId`, `target?` |
| `MINE_CAPTURED` | `CAPTURE_MINE` | animation timeline, sound system (`mine_capture`) | `mineId`, `heroId`, `playerId` |
| `BATTLE_INITIATED` | `INITIATE_BATTLE` | animation timeline, sound system | `battleId?`, `attackerId`, `defenderId` |
| `TOWN_VISITED` | `MOVE_HERO` (arrival on town tile) | animation timeline, sound system | `townId`, `heroId` |
| `BUILDING_BUILT` | `BUILD_BUILDING` | animation timeline, sound system (`construction`) | `townId`, `buildingId` |
| `HERO_LEVEL_UP` | `LEVEL_UP` | animation timeline, sound system (`level_up`) | `heroId`, `newLevel` |
| `DAY_START` | `END_DAY` (post-advance) | animation timeline, sound system | `turn` |
| `DAY_END` | `END_DAY` (pre-advance) | animation timeline, sound system (`end_turn`) | `turn` |
| `WEEK_START` | `END_DAY` (day-7 rollover) | animation timeline, sound system | `week`, `themedWeekId?` |

The animation-timeline owner is
[`tasks/mvp/06-renderer/07-event-log-animation-timeline.md`](../../tasks/mvp/06-renderer/07-event-log-animation-timeline.md);
the sound-system owner is
[`tasks/phase-3/04-polish/02-sound-system-event-log-driven.md`](../../tasks/phase-3/04-polish/02-sound-system-event-log-driven.md).

---

## Combat-tactical events

Emitted from inside the tactical-battle nested reducer.

### UNIT_MOVED

A unit/stack moved from one hex to another.

```typescript
{
  kind: "UNIT_MOVED",
  payload: {
    unitId: string,
    fromHex: { q: number, r: number },
    toHex: { q: number, r: number },
    path?: { q: number, r: number }[]
  }
}
```

- **Emitted by:** `BATTLE_MOVE` (tactical), `MOVE_HERO` (adventure-
  map presentation projection).
- **Consumed by:** animation timeline (walk animation along path).
- **Determinism:** payload is a pure projection of the move command;
  no RNG. `path` is present when the consumer must animate hex-by-
  hex traversal, omitted for teleport-style moves.

---

### UNIT_ATTACKED

A stack performed a melee or ranged attack.

```typescript
{
  kind: "UNIT_ATTACKED",
  payload: {
    attackerStackId: string,
    defenderStackId: string,
    damage: integer  // ≥ 0
  }
}
```

- **Emitted by:** `BATTLE_ATTACK`, `AUTO_RESOLVE_BATTLE`
  (per-strike).
- **Consumed by:** animation timeline (attack swing + hit/miss),
  sound system (`sword_hit`).
- **Determinism:** `damage` is the integer post-formula damage; no
  RNG inside the event.

---

### UNIT_DIED

A stack reached zero HP and is removed from the battlefield.

```typescript
{
  kind: "UNIT_DIED",
  payload: {
    unitId: string
  }
}
```

- **Emitted by:** `BATTLE_ATTACK`, `BATTLE_SPELL`,
  `AUTO_RESOLVE_BATTLE`.
- **Consumed by:** animation timeline (death animation, then unit
  removal), sound system (`death_cry`).

---

### PROJECTILE_FIRED

A ranged unit launched a projectile.

```typescript
{
  kind: "PROJECTILE_FIRED",
  payload: {
    attackerStackId: string,
    defenderStackId: string
  }
}
```

- **Emitted by:** `BATTLE_ATTACK` for ranged stacks; one
  `PROJECTILE_FIRED` precedes the corresponding `UNIT_ATTACKED`.
- **Consumed by:** animation timeline (arrow / magic-bolt arc).

---

### SPELL_CAST

A hero or stack cast a spell. Used in tactical and adventure-map
contexts.

```typescript
{
  kind: "SPELL_CAST",
  payload: {
    casterId: string,
    spellId: string,
    target?: {
      stackId: string | null,
      position: HexCoord | null
    }
  }
}
```

- **Emitted by:** `SPELL_CAST`.
- **Consumed by:** animation timeline (spell VFX at target hex /
  target stack), sound system (`spell_cast_<school>`; school is
  resolved from `spellId` against the spell registry, not embedded
  in the event).

---

## Adventure-map events

Emitted from the strategic-layer reducer; consumed by the same
animation-timeline / sound-system pair as combat events.

### MINE_CAPTURED

A mine changed ownership.

```typescript
{
  kind: "MINE_CAPTURED",
  payload: {
    mineId: string,
    heroId: string,
    playerId: integer  // ≥ 0
  }
}
```

- **Emitted by:** `CAPTURE_MINE` (chained from `MOVE_HERO` arrival).
- **Consumed by:** animation timeline (flag swap), sound system
  (`mine_capture`).

---

### BATTLE_INITIATED

An encounter created pending battle state.

```typescript
{
  kind: "BATTLE_INITIATED",
  payload: {
    battleId?: string,
    attackerId: string,
    defenderId: string
  }
}
```

- **Emitted by:** `INITIATE_BATTLE` (chained from `MOVE_HERO`
  arrival).
- **Consumed by:** animation timeline (encounter zoom / banner),
  sound system.

---

### TOWN_VISITED

A hero entered a town tile.

```typescript
{
  kind: "TOWN_VISITED",
  payload: {
    townId: string,
    heroId: string
  }
}
```

- **Emitted by:** `MOVE_HERO` (arrival on a town tile).
- **Consumed by:** animation timeline (gate animation), sound
  system.

---

### BUILDING_BUILT

A town building completed construction.

```typescript
{
  kind: "BUILDING_BUILT",
  payload: {
    townId: string,
    buildingId: string
  }
}
```

- **Emitted by:** `BUILD_BUILDING`.
- **Consumed by:** animation timeline (build animation), sound
  system (`construction`).

---

### HERO_LEVEL_UP

A hero gained a level.

```typescript
{
  kind: "HERO_LEVEL_UP",
  payload: {
    heroId: string,
    newLevel: integer  // ≥ 2
  }
}
```

- **Emitted by:** `LEVEL_UP`.
- **Consumed by:** animation timeline (XP bar / primary-stat flash),
  sound system (`level_up`). The level-up dialog screen
  ([`docs/architecture/wiki/screens/48-level-up-dialog/`](./wiki/screens/48-level-up-dialog/))
  binds to this event for its post-confirm animation.

---

## Turn-marker events

Calendar / event-log markers emitted by `END_DAY`. Consumed by the
HUD, end-of-turn banner, and weekly-event popup.

### DAY_START

The next strategic day began (hero MP restored, all-players
notified).

```typescript
{
  kind: "DAY_START",
  payload: {
    turn: integer  // ≥ 0; the new day number
  }
}
```

- **Emitted by:** `END_DAY` (after advancing the calendar).
- **Consumed by:** animation timeline (banner), sound system.

---

### DAY_END

The strategic day ended (daily resource income collected).

```typescript
{
  kind: "DAY_END",
  payload: {
    turn: integer  // ≥ 0; the day that just ended
  }
}
```

- **Emitted by:** `END_DAY` (before advancing the calendar).
- **Consumed by:** animation timeline, sound system (`end_turn`).

---

### WEEK_START

A new week began (weekly unit growth + themed-week roll).

```typescript
{
  kind: "WEEK_START",
  payload: {
    week: integer,         // ≥ 1
    themedWeekId?: string  // resolved by phase-2.08-meta-systems.08-themed-week-roller
  }
}
```

- **Emitted by:** `END_DAY` on day-7 rollover; fires exactly once
  per week boundary per
  [`tasks/mvp/05-adventure-map/02-turn-structure.md`](../../tasks/mvp/05-adventure-map/02-turn-structure.md).
- **Consumed by:** animation timeline, sound system. The themed-
  week popup screen consumes `themedWeekId` to resolve the
  localized description.

---

## Related docs

- [`event-system.md`](./event-system.md) — runtime contract
  (emission, consumption, no-veto, retention, save/load, error
  isolation, determinism guard rules).
- [`command-schema.md`](./command-schema.md) — the command
  vocabulary that emits these events.
- [`schema-matrix.md`](./schema-matrix.md) — record-type matrix
  including the `Event` row.
- [`screen-event-coverage.json`](./screen-event-coverage.json) —
  closed-set coverage validator for ALL_CAPS event tokens in screen
  packages.
- [`task-command-token-coverage.json`](./task-command-token-coverage.json)
  — task-side classification of event-only tokens (sibling to this
  doc). The canonical kind list lives in this file and in
  [`event.schema.json`](../../content-schema/schemas/event.schema.json).

---

## 🔍 Sync Check

- **UI: ✔** — `wiki/screens/48-level-up-dialog/` exists and
  `HERO_LEVEL_UP` is mapped to that screen in
  [`screen-event-coverage.json`](./screen-event-coverage.json); all
  13 kinds appear in the coverage map.
- **Schema: ⚠** — All 13 `kind` consts, payload shapes, required
  keys, and minima in
  [`event.schema.json`](../../content-schema/schemas/event.schema.json)
  match this doc, and the `Event` row exists in
  [`schema-matrix.md`](./schema-matrix.md). The doc and the schema
  agree that `UNIT_DIED` is emitted by `BATTLE_SPELL`, but
  `BATTLE_SPELL` is not a member of the closed `Command` union in
  [`command.schema.json`](../../content-schema/schemas/command.schema.json)
  (the schema only ships `SPELL_CAST`). Detail in `## ⚠ Issues`.
- **Tasks: ✔** — Animation-timeline owner
  [`tasks/mvp/06-renderer/07-event-log-animation-timeline.md`](../../tasks/mvp/06-renderer/07-event-log-animation-timeline.md),
  sound-system owner
  [`tasks/phase-3/04-polish/02-sound-system-event-log-driven.md`](../../tasks/phase-3/04-polish/02-sound-system-event-log-driven.md),
  turn-structure owner
  [`tasks/mvp/05-adventure-map/02-turn-structure.md`](../../tasks/mvp/05-adventure-map/02-turn-structure.md),
  and themed-week roller `phase-2.08-meta-systems.08-themed-week-roller`
  all resolve in `tasks/task-registry.json`.

## ⚠ Issues

- **`BATTLE_SPELL` emitter is unbacked by the command schema.** This
  doc and the `unitDied` `description` in
  [`event.schema.json`](../../content-schema/schemas/event.schema.json)
  list `BATTLE_SPELL` among the emitters of `UNIT_DIED`, and
  [`command-schema.md` § BATTLE_SPELL](./command-schema.md#battle_spell)
  documents the command, but the closed `Command` `oneOf` in
  [`command.schema.json`](../../content-schema/schemas/command.schema.json)
  has no `BATTLE_SPELL` entry (the schema uses `SPELL_CAST` for both
  adventure and tactical spell casts). The same gap is already
  flagged in the [`command-schema.md` Sync Check](./command-schema.md).
  Per the project root contract that schemas are the public
  contract, the closing change is one of: (a) add a `BATTLE_SPELL`
  branch to `command.schema.json` (and regenerate
  `enums.snapshot.json`) so the doc-side claim resolves, or (b)
  rewrite the `BATTLE_SPELL` references in this doc, in
  `event.schema.json`'s `unitDied.description`, and in
  `command-schema.md` § `BATTLE_SPELL` to point at `SPELL_CAST`. The
  doc-audit skill leaves the choice to the owning task because
  either fix touches files outside this audit's scope (Hard
  Prohibition D).
