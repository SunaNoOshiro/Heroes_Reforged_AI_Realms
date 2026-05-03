# Event Schema

Canonical reference for the closed event vocabulary. Pinned parallel
to [`command-schema.md`](./command-schema.md): commands mutate state,
events describe what happened so consumers (animation timeline, sound
system, future replay diagnostics) can react.

The runtime contract — emission timing, consumer iteration order, no
veto, no re-entry, retention, save/load, error isolation, and
determinism guard rules — lives in
[`event-system.md`](./event-system.md). The closed JSON schema lives
in
[`content-schema/schemas/event.schema.json`](../../content-schema/schemas/event.schema.json).
This file enumerates each kind, its payload, its emitting command(s),
and its consumer(s).

---

## Contract

- Every event has a `kind` field (closed enum) and a `payload` object.
- Events are **pure data** — no methods, no callbacks, no side effects.
- Events are emitted synchronously by command handlers and returned
  on the dispatcher's `Result.events` array; they are never globally
  retained by the engine.
- Consumers iterate the array in insertion order on their own clock.
  No consumer may cancel, reorder, mutate, or replace an event.
- Events MUST validate against
  [`event.schema.json`](../../content-schema/schemas/event.schema.json);
  any extra property, unknown `kind`, or malformed payload is a
  `ValidationError`.
- Events are **never serialized**. Saves contain `(seed, content
  hashes, command log, state snapshot)` only; events are re-derived
  by replay. See [`event-system.md` § 7](./event-system.md#7-save--load).
- Screen interaction tokens are checked by
  [`screen-event-coverage.json`](./screen-event-coverage.json) and
  the screen-event coverage validator. A token must be a schema kind,
  an alias to one, UI-local, or explicitly out of scope with an
  owning task.

---

## Summary

| Kind | Emitter(s) | Consumer(s) | Payload |
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

The 13 kinds enumerated above are the closed vocabulary. Adding a new
kind requires extending `event.schema.json`, this doc, and
[`screen-event-coverage.json`](./screen-event-coverage.json) in the
same change.

---

## Combat-Tactical Events

Events emitted from inside the tactical-battle nested reducer. Driven
into presentation by the animation timeline
([`tasks/mvp/06-renderer/07-event-log-animation-timeline.md`](../../tasks/mvp/06-renderer/07-event-log-animation-timeline.md))
and the sound system
([`tasks/phase-3/04-polish/02-sound-system-event-log-driven.md`](../../tasks/phase-3/04-polish/02-sound-system-event-log-driven.md)).

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

**Emitted by:** `BATTLE_MOVE` (tactical), `MOVE_HERO` (adventure-map
presentation projection).

**Consumed by:** animation timeline (walk animation along path).

**Determinism:** payload is a pure projection of the move command;
no RNG. `path` is optional — present when the consumer must animate
hex-by-hex traversal, omitted for teleport-style moves.

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

**Emitted by:** `BATTLE_ATTACK`, `AUTO_RESOLVE_BATTLE` (per-strike).

**Consumed by:** animation timeline (attack swing + hit/miss),
sound system (`sword_hit`).

**Determinism:** `damage` is the integer post-formula damage; no
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

**Emitted by:** `BATTLE_ATTACK`, `BATTLE_SPELL`, `AUTO_RESOLVE_BATTLE`.

**Consumed by:** animation timeline (death animation, then unit
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

**Emitted by:** `BATTLE_ATTACK` for ranged stacks; one
`PROJECTILE_FIRED` precedes the corresponding `UNIT_ATTACKED`.

**Consumed by:** animation timeline (arrow / magic-bolt arc).

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

**Emitted by:** `SPELL_CAST`.

**Consumed by:** animation timeline (spell VFX at target hex /
target stack), sound system (`spell_cast_<school>`; school is
resolved from `spellId` against the spell registry, not embedded in
the event).

---

## Adventure-Map Events

Events emitted from the strategic-layer reducer. Driven by the same
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

**Emitted by:** `CAPTURE_MINE` (chained from `MOVE_HERO` arrival).

**Consumed by:** animation timeline (flag swap), sound system
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

**Emitted by:** `INITIATE_BATTLE` (chained from `MOVE_HERO`
arrival).

**Consumed by:** animation timeline (encounter zoom / banner),
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

**Emitted by:** `MOVE_HERO` (arrival on a town tile).

**Consumed by:** animation timeline (gate animation), sound system.

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

**Emitted by:** `BUILD_BUILDING`.

**Consumed by:** animation timeline (build animation), sound
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

**Emitted by:** `LEVEL_UP`.

**Consumed by:** animation timeline (XP bar / primary-stat flash),
sound system (`level_up`). The level-up dialog screen
([`docs/architecture/wiki/screens/48-level-up-dialog/`](./wiki/screens/48-level-up-dialog/))
binds to this event for its post-confirm animation.

---

## Turn-Marker Events

Calendar / event-log markers emitted by `END_DAY`. Used by HUD,
end-of-turn banner, and weekly-event popup.

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

**Emitted by:** `END_DAY` (after advancing the calendar).

**Consumed by:** animation timeline (banner), sound system.

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

**Emitted by:** `END_DAY` (before advancing the calendar).

**Consumed by:** animation timeline, sound system (`end_turn`).

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

**Emitted by:** `END_DAY` on day-7 rollover; fires exactly once per
week boundary per
[`tasks/mvp/05-adventure-map/02-turn-structure.md`](../../tasks/mvp/05-adventure-map/02-turn-structure.md).

**Consumed by:** animation timeline, sound system. The themed-week
popup screen consumes `themedWeekId` to resolve the localized
description.

---

## Related Docs

- [`event-system.md`](./event-system.md) — runtime contract
  (emission, consumption, no-veto, retention, save/load, error
  isolation, determinism guard rules).
- [`command-schema.md`](./command-schema.md) — the command
  vocabulary that emits these events.
- [`screen-event-coverage.json`](./screen-event-coverage.json) —
  closed-set coverage validator for ALL_CAPS event tokens in screen
  packages.
- [`task-command-token-coverage.json`](./task-command-token-coverage.json) —
  task-side classification of event-only tokens (sibling to this
  doc; the canonical kind list lives here).
- [`schema-matrix.md`](./schema-matrix.md) — record-type matrix
  including the `Event` row.
