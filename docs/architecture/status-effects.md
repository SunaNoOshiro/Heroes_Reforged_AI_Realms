# Status Effects — Lifecycle, Duration, Stacking, Dispel

The full lifecycle of `effect.kind = "status"` records. Pinned so
content authored against one pack stays portable when combined with
another.

Schema:
[`content-schema/schemas/effect.schema.json`](../../content-schema/schemas/effect.schema.json)
(`status` sub-schema).

## 1. Duration unit

`duration` is an integer count of `durationUnit`s. The unit is closed:

| Value | Meaning | Tick boundary |
|---|---|---|
| `rounds` | Combat rounds (one full initiative cycle). | Decremented at each combat-round boundary, on the round-start step before any stack acts. |
| `turns` | Single stack turns inside a round. | Decremented at the end of the affected stack's own turn. |
| `days` | Adventure-map calendar days. | Decremented at `DAY_END`. |

### Default

When the author omits `durationUnit`:

- `rounds` for spells/abilities with combat scope (the parent
  `spell.scope ∈ {combat, both}` or the ability is intrinsic to a
  combat unit).
- `days` for spells with `scope = adventure`.

Validators must reject content that is ambiguous (e.g. a `both`-scope
spell that uses `duration` without an explicit `durationUnit` — the
ambiguity is loud).

`duration = 0` means "instant; apply once and remove on the same
tick"; the runtime fires the apply hook and the expire hook back to
back without ever advancing a tick boundary.

## 2. Stacking policy

When the same `(target, statusId)` pair already has an active record
and a new application is attempted, the runtime resolves it via the
`stacking` field of the *new* record. Default:
`highest_magnitude_refresh_duration`.

| Policy | Behavior |
|---|---|
| `stack` | Add the new record alongside the old; effects are summed (e.g. two `+2 attack` records → +4). Each record carries its own duration. |
| `refresh` | Drop the old record and replace it with the new one (most common for buffs). |
| `highest_magnitude_refresh_duration` | Keep the record with the higher `magnitude`; refresh its duration to the longer of the two. **Default.** |
| `ignore` | Reject the new application if an active record already exists. |

### Magnitude

For policies that compare magnitudes, `magnitude` is the integer
authored on the effect. Status effects without numeric magnitude
(e.g. `blinded`) treat all instances as magnitude `1`.

### Mixed-policy precedent

If an existing record's policy and an incoming record's policy
disagree, the incoming record's policy wins (last-write-wins for
policy choice). This keeps reasoning local: pack authors only need
to predict the behavior of the spell they're shipping.

## 3. Tick lifecycle

```
APPLY → ON_TICK*  → EXPIRE
        │
        └── triggered by the unit listed in §1 "Tick boundary"
```

- `APPLY`: emitted on the tick the status starts. Runs the on-apply
  side-effect (e.g. immediate stat modification) and registers the
  record in the unit's `statusBag`.
- `ON_TICK`: emitted at every tick boundary defined by the unit
  (above). Runs damage-over-time and similar repeated effects.
- `EXPIRE`: emitted when `duration` reaches `0` or the record is
  dispelled. Runs the inverse of `APPLY`.

The `APPLY` and `EXPIRE` hooks are responsible for keeping
deterministic stat composition (see
[`stat-composition-order.md`](stat-composition-order.md)) consistent;
they always run inside the appliers' aura step.

## 4. Dispel order

`effect.kind = "dispel"` (see effect-registry) targets one or more
status records on a unit. Order:

1. Filter by `scope` (`positive` / `negative` / `all`).
2. Sort matching records by `appliedAt` descending — **newest first**.
3. Tie-break by `sourceId` alphabetically (UTF-16 code-point ordering).
4. Remove `count` records from the head of the list (default `count =
   all matching`).

`appliedAt` is captured from the deterministic command sequence
number (not wall-clock), so dispel ordering is replay-stable.

## 5. Replication into save / replay

Every active status record serializes as
`{ statusId, durationRemaining, durationUnit, magnitude, sourceId,
appliedAt }`. The runtime never serializes derived fields; on load
the appliers replay `APPLY` against the bare record to rebuild any
cached stat deltas.

## 6. Validation tests (required)

The status sub-schema lands with the following test plan:

- Combat-scope spell omitting `durationUnit` → defaults to `rounds`.
- Adventure-scope spell omitting `durationUnit` → defaults to `days`.
- `both`-scope spell omitting `durationUnit` → validation error.
- Two casts of `+2 attack` with default policy → magnitude stays `+2`,
  longer duration is kept.
- Two casts of `+2 attack` with `stacking = stack` → magnitude becomes
  `+4`, two records present.
- Dispel of a unit with three buffs applied at command sequence
  `3, 7, 12` removes seq-12 first.

## 7. Relationship to other contracts

- Stat composition order — [`stat-composition-order.md`](stat-composition-order.md)
- Effect registry — [`effect-registry.md`](effect-registry.md)
- Determinism rules — [`determinism.md`](determinism.md)
