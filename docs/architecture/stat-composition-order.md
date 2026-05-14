# Stat Composition Order

The canonical pipeline for deriving a hero's combat-time stats.
Pinned so two engines / two replays / two pack mixes never disagree
on the final value.

Companion docs:

- [`status-effects.md`](./status-effects.md) — lifecycle of
  `effect.kind = "status"` records that feed the `aura` step.
- [`effect-registry.md`](./effect-registry.md) — `modify_stat` and
  `modify_primary_stat` kinds consumed at the `artifact` step.
- [`determinism.md`](./determinism.md) — integer-only / canonical-
  ordering invariants the pipeline inherits.

Schemas:
[`hero.schema.json`](../../content-schema/schemas/hero.schema.json),
[`hero-class.schema.json`](../../content-schema/schemas/hero-class.schema.json),
[`effect.schema.json`](../../content-schema/schemas/effect.schema.json).

## 1. Pipeline

```
base
 ↓ (additive)
permanent (level-up gains)
 ↓ (additive)
skill bonuses
 ↓ (multiplicative or replace, per specialty kind)
specialty
 ↓ (additive)
artifact bonuses
 ↓ (additive)
battlefield aura bonuses (last)
 ↓ (clamp once)
DerivedStats
```

Runtime entry point: `applyStatPipeline(hero, ctx) → DerivedStats`.
Pure function — same `(hero, ctx)` returns same output bytes. Each
step writes to a fresh integer accumulator; the hero record is never
mutated.

## 2. Step semantics

| Step | Operation | Source / notes |
|---|---|---|
| `base` | Read hero class baseline (e.g. `attack 1, defense 1, power 1, knowledge 1`). | Provided by `heroClass.startingStats` (see `## ⚠ Issues` — schema gap). |
| `permanent` | Add level-up gains stored on the hero (`hero.primaryStats` deltas above the baseline). | Persisted because level-up is RNG-driven and must replay byte-equal. |
| `skill` | Sum every applier-generated `{stat, value}` delta keyed by hero id. | Skill appliers in 07b / 07c / 07d emit deltas; pure functions of skill records. |
| `specialty` | Apply specialty per its `kind`. Additive by default; **replace** when the kind defines a replacement (e.g. `skill_bonus.levelOffset` overrides the `skill` step output for the named skill). | `hero.specialty.kind ∈ {unit_bonus, creature_specialty, spell_bonus, skill_bonus, resource_bonus}` — see [`hero.schema.json`](../../content-schema/schemas/hero.schema.json). |
| `artifact` | Sum every equipped-artifact `modify_primary_stat` and `modify_stat` effect. | Iterate slots in canonical order: `helmet → cape → torso → main-hand → off-hand → ring1 → ring2 → boots → misc1 → misc2`. |
| `aura` | Sum every aura active for this stack on the battlefield. | Auras apply last so morale-aura, faction-bond, and specialty-aura interactions are predictable. Status records reach this step via [`status-effects.md`](./status-effects.md). |
| `clamp` | Clamp each stat into `[0, 99]`. | `hero.schema.json` `primaryStats` bounds. Clamps run only here, never mid-pipeline. |

## 3. Determinism rules

- **Integers throughout.** No floats. Fractional ratios use paired
  numerator/denominator integers (e.g.
  `creature_specialty.bonus.{perHeroLevelNum, perHeroLevelDen}`),
  consistent with the ruleset convention.
- **Source-id ordering.** When two sources contribute at the same
  step (two artifacts each granting `+2 attack`), iterate them in
  ascending alphabetical order of their stable IDs. The engine never
  relies on insertion order.
- **No early clamp.** Two `+50 attack` contributions on a base-1
  hero compose to `99` after the final clamp, not `50`, even if one
  contribution alone would have exceeded the cap.
- **Pure read.** The pipeline never writes to `hero` or `ctx`.
  Caching is the caller's responsibility.

## 4. Test plan

Golden fixture:
`src/rules/__tests__/stat-pipeline.golden.json` — one hero with one
source layered per step, each contributing `+1 attack`, plus the
expected accumulator after every step. Two-engine harness must
reproduce byte-equal output.

Edge cases:

- Sum > 99 → final clamp at 99.
- Sum < 0 → final clamp at 0.
- Two artifacts with identical deltas but different IDs → identical
  total; iteration order asserted in the test (ID ascending).
- Specialty `skill_bonus.levelOffset` replaces the `skill` step
  output for the named skill before the `artifact` step runs.

## 5. Relationship to status effects

Status-effect appliers feed the `aura` step. The aura step is the
only place where status records can shift a stat — this lets
`+2 attack for 3 rounds` and `+2 attack from artifact` co-exist
without double-counting.

The `effect.status.stacking` field
([`status-effects.md`](./status-effects.md) § 2) decides how multiple
*incoming* status records combine *before* they reach this pipeline;
the pipeline itself sees only the resolved aura set.

## 6. Owning task

Pipeline implementation lives in
[`tasks/phase-2/01-spells-artifacts/07e-stat-composition-pipeline.md`](../../tasks/phase-2/01-spells-artifacts/07e-stat-composition-pipeline.md).
Skill appliers
([`07b`](../../tasks/phase-2/01-spells-artifacts/07b-combat-skill-appliers.md),
[`07c`](../../tasks/phase-2/01-spells-artifacts/07c-adventure-skill-appliers.md),
[`07d`](../../tasks/phase-2/01-spells-artifacts/07d-magic-economy-and-special-skill-appliers.md))
and the specialty applier
([`16`](../../tasks/phase-2/01-spells-artifacts/16-hero-specialty-applier.md))
are scheduling dependencies on 07e — they must emit deltas in the
canonical shape this pipeline consumes.

---

## 🔍 Sync Check

- **UI: ✔** — No UI surfaces named in this doc; the combat HUD reads
  `DerivedStats` from the pipeline runtime, not from this doc.
- **Schema: ⚠** — Specialty `kind` enum, `modify_stat` /
  `modify_primary_stat` shapes, and `primaryStats` `[0, 99]` bounds
  match
  [`hero.schema.json`](../../content-schema/schemas/hero.schema.json)
  and
  [`effect.schema.json`](../../content-schema/schemas/effect.schema.json)
  exactly. However, the `base` step's source claim
  (`heroClass.startingStats`) has no matching field in
  [`hero-class.schema.json`](../../content-schema/schemas/hero-class.schema.json)
  — see `## ⚠ Issues`.
- **Tasks: ✔** — Owning task
  [`tasks/phase-2/01-spells-artifacts/07e-stat-composition-pipeline.md`](../../tasks/phase-2/01-spells-artifacts/07e-stat-composition-pipeline.md)
  lists this doc in `Read First`; sibling tasks 07a / 07b / 07c /
  07d / 16 / 05 all exist; `task-registry.json` shows three
  applier-task entries linking back to this doc.

## ⚠ Issues

- **`heroClass.startingStats` field does not exist on the
  hero-class schema.** The `base` row asserts the per-class baseline
  is "Provided by `heroClass.startingStats`."
  [`hero-class.schema.json`](../../content-schema/schemas/hero-class.schema.json)
  defines only `primaryStatGrowth` (level-up weights), `skillPool`,
  and `presentation` — there is no `startingStats` block, and
  [`hero.schema.json`](../../content-schema/schemas/hero.schema.json)
  reserves `primaryStats` for the running level-up totals (the
  `permanent` step's source). Per the project root contract
  ("Schema evolution is additive-first; alias before remove" —
  CLAUDE.md), the gap closes by either (a) adding an additive
  `startingStats: { attack, defense, power, knowledge }` block on
  `hero-class.schema.json` and updating the snapshot via
  `npm run generate:enum-snapshot` (owner: 07e or a new
  MVP-content-schemas task), or (b) pinning the per-class baseline
  as a hardcoded engine constant and rewriting this row to cite the
  constant. Skill did not edit the schema or invent the field
  (Hard Prohibitions B and D).

- **Pipeline diagram and `## 2.` table disagree on the specialty
  operator.** The diagram labels the `specialty` arrow
  `multiplicative or replace, per specialty kind`, but the table
  describes the step as additive (default) or replace. No specialty
  kind in
  [`hero.schema.json`](../../content-schema/schemas/hero.schema.json)
  applies a multiplicative operator to the running accumulator —
  `creature_specialty.bonus.{perHeroLevelNum, perHeroLevelDen}` is a
  per-level integer ratio whose result is *added* at the specialty
  step. Both wordings are preserved verbatim per Hard Prohibition A;
  the next editor with implementation context (likely while landing
  07e) should reconcile the diagram label to match the table and the
  schema.
