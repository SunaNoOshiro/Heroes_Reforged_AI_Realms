# Status Effects — Lifecycle, Duration, Stacking, Dispel

Full lifecycle of `effect.kind = "status"` records. Pinned so content
authored against one pack stays portable when combined with another.

Schema:
[`effect.schema.json`](../../content-schema/schemas/effect.schema.json)
(`status` sub-schema);
[`status-id.schema.json`](../../content-schema/schemas/status-id.schema.json)
(closed `statusId` enum).

Companion docs:

- [`effect-registry.md`](./effect-registry.md) — closed list of effect
  kinds; `status` row points back here for lifecycle.
- [`stat-composition-order.md`](./stat-composition-order.md) — the
  `aura` step that consumes status-record stat deltas.
- [`determinism.md`](./determinism.md) — integer-only and canonical-
  ordering invariants the lifecycle inherits.
- [`schema-matrix.md`](./schema-matrix.md) — `Effect` registry row.

## 1. Duration unit

`duration` is an integer count of `durationUnit`s. The unit enum is
closed:

| Value | Meaning | Tick boundary |
|---|---|---|
| `rounds` | Combat rounds (one full initiative cycle). | Decremented at each combat-round boundary, on the round-start step before any stack acts. |
| `turns` | Single stack turns inside a round. | Decremented at the end of the affected stack's own turn. |
| `days` | Adventure-map calendar days. | Decremented at `DAY_END`. |

### Default

When the author omits `durationUnit`:

- `rounds` for spells/abilities with combat scope (parent
  `spell.scope ∈ {combat, both}`, or the ability is intrinsic to a
  combat unit).
- `days` for spells with `scope = adventure`.

Validators reject content that is ambiguous — e.g. a `both`-scope
spell that uses `duration` without an explicit `durationUnit`. The
ambiguity is loud, not papered over.

`duration = 0` means "instant: apply once and remove on the same
tick." The runtime fires `APPLY` and `EXPIRE` back to back without
ever advancing a tick boundary.

## 2. Stacking policy

When the same `(target, statusId)` pair already has an active record
and a new application is attempted, the runtime resolves it via the
`stacking` field of the **new** record. Default:
`highest_magnitude_refresh_duration`.

| Policy | Behavior |
|---|---|
| `stack` | Add the new record alongside the old; effects are summed (e.g. two `+2 attack` records → +4). Each record keeps its own duration. |
| `refresh` | Drop the old record and replace it with the new one. Most common for buffs. |
| `highest_magnitude_refresh_duration` | Keep the record with the higher `magnitude`; refresh its duration to the longer of the two. **Default.** |
| `ignore` | Reject the new application if an active record already exists. |

### Magnitude

For policies that compare magnitudes, `magnitude` is the integer
authored on the effect. Status effects without numeric magnitude
(e.g. `blinded`) treat all instances as magnitude `1`.

### Mixed-policy precedence

If an existing record's policy and an incoming record's policy
disagree, the incoming record's policy wins (last-write-wins for
policy choice). This keeps reasoning local: pack authors only
predict the behavior of the spell they're shipping.

## 3. Tick lifecycle

```
APPLY → ON_TICK*  → EXPIRE
        │
        └── triggered by the unit listed in §1 "Tick boundary"
```

- `APPLY` — emitted on the tick the status starts. Runs the
  on-apply side-effect (e.g. immediate stat modification) and
  registers the record in the unit's `statusBag`.
- `ON_TICK` — emitted at every tick boundary defined by the unit.
  Runs damage-over-time and similar repeated effects.
- `EXPIRE` — emitted when `duration` reaches `0` or the record is
  dispelled. Runs the inverse of `APPLY`.

`APPLY` and `EXPIRE` are responsible for keeping deterministic stat
composition (see
[`stat-composition-order.md`](./stat-composition-order.md))
consistent. They always run inside the appliers' `aura` step.

## 4. Dispel order

`effect.kind = "dispel"` (see
[`effect-registry.md`](./effect-registry.md)) targets one or more
status records on a unit. Order:

1. Filter by `scope` (`positive` / `negative` / `all`).
2. Sort matching records by `appliedAt` descending — **newest first**.
3. Tie-break by `sourceId` alphabetical ascending (UTF-16 code-point
   order).
4. Remove `count` records from the head of the list (default
   `count = all matching`).

`appliedAt` is captured from the deterministic command sequence
number (not wall-clock), so dispel ordering is replay-stable.

## 5. Replication into save / replay

Every active status record serializes as:

```text
{ statusId, durationRemaining, durationUnit, magnitude, sourceId, appliedAt }
```

The runtime never serializes derived fields. On load, the appliers
replay `APPLY` against the bare record to rebuild any cached stat
deltas.

## 6. Validation tests (required)

The status sub-schema lands with the following test plan:

- Combat-scope spell omitting `durationUnit` → defaults to `rounds`.
- Adventure-scope spell omitting `durationUnit` → defaults to `days`.
- `both`-scope spell omitting `durationUnit` → validation error.
- Two casts of `+2 attack` with default policy → magnitude stays
  `+2`; the longer duration is kept.
- Two casts of `+2 attack` with `stacking = stack` → magnitude
  becomes `+4`; two records present.
- Dispel on a unit with three buffs applied at command sequence
  `3, 7, 12` removes seq-`12` first.

## 7. Relationship to other contracts

- Stat composition order —
  [`stat-composition-order.md`](./stat-composition-order.md)
- Effect registry — [`effect-registry.md`](./effect-registry.md)
- Determinism rules — [`determinism.md`](./determinism.md)

---

## 🔍 Sync Check

- **UI: ✔** — No UI surfaces named in this doc; status-effect
  presentation is pulled from the parent
  [`effect-registry.md`](./effect-registry.md) row and the
  animation track contract in
  [`schema-matrix.md`](./schema-matrix.md) `AnimationSet` (`status`
  track).
- **Schema: ✔** — `durationUnit` enum
  (`rounds | turns | days`), `stacking` enum
  (`stack | refresh | highest_magnitude_refresh_duration | ignore`),
  and `dispel.scope` enum (`positive | negative | all`) match
  [`effect.schema.json`](../../content-schema/schemas/effect.schema.json)
  exactly. `statusId` values are the closed enum in
  [`status-id.schema.json`](../../content-schema/schemas/status-id.schema.json).
  `Effect` row present in
  [`schema-matrix.md`](./schema-matrix.md).
- **Tasks: ⚠** — No task in
  [`task-registry.json`](../../tasks/task-registry.json) declares
  ownership of the status-effect runtime (`statusBag`, `APPLY` /
  `ON_TICK` / `EXPIRE` hooks, dispel resolver). The only Read First
  back-link is from
  [`07e-stat-composition-pipeline`](../../tasks/phase-2/01-spells-artifacts/07e-stat-composition-pipeline.md),
  which consumes the resolved aura set but does not own the
  lifecycle. See `## ⚠ Issues`.

## ⚠ Issues

- **No owning task for the status-effect runtime.** § 3 (tick
  lifecycle, `statusBag`) and § 4 (dispel resolver with
  `appliedAt` ordering and `count` removal) describe a runtime
  module that no task in
  [`task-registry.json`](../../tasks/task-registry.json) claims as
  Owned Paths. Combat spells that produce status records
  ([`02-combat-spells.md`](../../tasks/phase-2/01-spells-artifacts/02-combat-spells.md):
  Blind, Slow, Haste) and adventure spells
  ([`03-adventure-map-spells.md`](../../tasks/phase-2/01-spells-artifacts/03-adventure-map-spells.md))
  do not Read First this doc, and the stat pipeline only
  consumes the resolved aura set. Per the project root contract
  (every described logic has a task), a new task — likely under
  `tasks/phase-2/01-spells-artifacts/` — should own
  `src/rules/status-effects/` (statusBag mutations, tick handlers,
  dispel resolver, save/replay round-trip) and Read First this
  doc. Suggested values: id
  `phase-2.01-spells-artifacts.07f-status-effect-runtime`; Owned
  Paths `src/rules/status-effects/**`,
  `src/rules/__tests__/status-effects.golden.json`. Skill did not
  create the task or edit the registry (Hard Prohibition D).

- **`dispel.count` is not exposed in the schema.** § 4 step 4
  removes `count` records from the head of the matched list
  (default `count = all matching`), but the `dispel` sub-schema in
  [`effect.schema.json`](../../content-schema/schemas/effect.schema.json)
  only declares `kind | scope | target` — there is no `count`
  field. Either (a) the doc describes a future capability and
  should say so, or (b) `effect.schema.json` needs an additive
  `count: { type: "integer", minimum: 1 }` (per
  [`enum-lifecycle-policy.md`](./enum-lifecycle-policy.md)
  additive-first), with the snapshot regenerated via
  `npm run generate:enum-snapshot`. Owner: the same status-effect
  runtime task above, or
  [`tasks/mvp/02-content-schemas/13-effect-registry.md`](../../tasks/mvp/02-content-schemas/13-effect-registry.md)
  if the schema is amended ahead of the runtime. Surfaced rather
  than silently rewritten because schema is canonical and the
  prose may be load-bearing on a planned-but-unlanded extension
  (Hard Prohibitions A and B).
