# Stat Composition Order

The canonical pipeline for deriving a hero's combat-time stats. Pinned
so two engines / two replays / two pack mixes never disagree on the
final value.

Schema reference:
[`hero.schema.json`](../../content-schema/schemas/hero.schema.json),
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
 ↓ (clamp)
DerivedStats
```

Every step writes to a fresh integer accumulator; nothing mutates the
hero record. The runtime function is
`applyStatPipeline(hero, ctx) → DerivedStats` and it is **pure**:
same `(hero, ctx)` → same output bytes.

## 2. Step semantics

| Step | Operation | Notes |
|---|---|---|
| `base` | Read hero class baseline (e.g. attack 1, defense 1, power 1, knowledge 1). | Provided by `heroClass.startingStats`. |
| `permanent` | Add level-up gains stored on the hero (`hero.primaryStats` deltas above the base). | These are persisted because level-up is RNG-driven and must replay byte-equal. |
| `skill` | Sum every applier-generated bonus. | Skill appliers in 07b/07c/07d emit `{stat, value}` deltas keyed by hero id. Pure functions of skill records. |
| `specialty` | Apply specialty per its `kind`. | `unit_bonus`, `creature_specialty`, `spell_bonus`, `skill_bonus`, `resource_bonus` — see hero schema. **Replace semantics** when the specialty kind defines a replacement (e.g. `skill_bonus.levelOffset`); otherwise additive. |
| `artifact` | Sum every equipped-artifact `modify_primary_stat` and `modify_stat` effect. | Artifact effects iterate the slot table in deterministic slot order (helmet → cape → torso → main-hand → off-hand → ring1 → ring2 → boots → misc1 → misc2). |
| `aura` | Sum every aura active for this stack on the battlefield. | Auras are applied last so morale-aura, faction-bond, and specialty-aura interactions are predictable. |
| `clamp` | Clamp each stat into `[0, 99]` (per `hero.schema.json` primary-stat bounds). | Clamps run only here, never mid-pipeline. |

## 3. Determinism rules

- **Integers throughout.** No floats. Fractional ratios use paired
  numerator/denominator integers (consistent with the ruleset
  convention).
- **Source-id ordering.** When two sources contribute to the same step
  (two artifacts both giving +2 attack), iterate them in ascending
  alphabetical order of their stable IDs. The engine never relies on
  insertion order.
- **No early clamp.** Clamps apply once, at the end. Two `+50 attack`
  contributions on a base-1 hero compose to `99` (clamp), not `50`,
  even if one of them would have individually exceeded the cap.
- **Pure read.** The pipeline never writes to `hero` or `ctx`. The
  caller is responsible for caching the result if needed.

## 4. Test plan

Golden fixture: a hero with one of each source layered on, each
contributing `+1 attack`. The expected result after each pipeline
step is captured in
`src/rules/__tests__/stat-pipeline.golden.json`. Two-engine harness
must reproduce byte-equal output.

Edge cases:

- All sources sum to >99 → final clamp at 99.
- All sources sum to <0 → final clamp at 0.
- Two artifacts with the same delta but different IDs → identical
  total but the iteration order is documented in the test (ID
  ascending).
- Specialty `skill_bonus.levelOffset` replaces `skill` step output
  for the named skill before the artifact step runs.

## 5. Relationship to status effects

Status-effect appliers feed into the `aura` step. The aura step is
the only place where status records can shift a stat; this lets
"+2 attack for 3 rounds" and "+2 attack from artifact" co-exist
without double-counting.

The status sub-schema's `stacking` field (see
[`status-effects.md`](status-effects.md)) decides how multiple
*incoming* status records combine *before* they reach this pipeline;
the pipeline itself sees only the resolved aura set.

## 6. Owning task

Pipeline implementation lives in
[`tasks/phase-2/01-spells-artifacts/07e-stat-composition-pipeline.md`](../../tasks/phase-2/01-spells-artifacts/07e-stat-composition-pipeline.md).
Skill appliers (07b, 07c, 07d) are required by the test plan; they
must produce deltas in this canonical shape so the pipeline can
consume them.
