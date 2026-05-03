# Stat Composition Pipeline

Status: planned

Module: [Spells, Artifacts & Hero Skills (M3)](../01-spells-artifacts.md)

Description:
Implement the canonical stat composition pipeline:
`applyStatPipeline(hero, ctx) → DerivedStats`. The function combines
base, permanent (level-up), skill, specialty, artifact, and
battlefield-aura inputs in a fixed order, clamping only at the end.
It is the single function that produces the integers consumed by the
combat damage formula.

Read First:
- [`docs/architecture/stat-composition-order.md`](../../../docs/architecture/stat-composition-order.md)
- [`docs/architecture/status-effects.md`](../../../docs/architecture/status-effects.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)
- [`content-schema/schemas/hero.schema.json`](../../../content-schema/schemas/hero.schema.json)

Inputs:
- Hero record (base, permanent, skills, specialty, equipped artifacts)
- Battlefield context (`ctx.auras: AuraDelta[]`)
- Skill appliers from 07b / 07c / 07d
- Specialty applier from `phase-2.01-spells-artifacts.16-hero-specialty-applier`

Outputs:
- `src/rules/stat-pipeline.ts`
- `applyStatPipeline(hero: Hero, ctx: PipelineContext): DerivedStats`
- Pure function; no side effects.
- Golden fixture: `src/rules/__tests__/stat-pipeline.golden.json`

Owned Paths:
- `src/rules/stat-pipeline.ts`
- `src/rules/__tests__/stat-pipeline.golden.json`

Dependencies:
- phase-2.01-spells-artifacts.07a-skill-runtime-contract-and-id-normalization
- phase-2.01-spells-artifacts.07b-combat-skill-appliers
- phase-2.01-spells-artifacts.07c-adventure-skill-appliers
- phase-2.01-spells-artifacts.07d-magic-economy-and-special-skill-appliers
- phase-2.01-spells-artifacts.16-hero-specialty-applier
- phase-2.01-spells-artifacts.05-artifact-paper-doll-system

Acceptance Criteria:
- Step order matches the doc: base → permanent → skill → specialty →
  artifact → aura → clamp
- Source-id tie-break is alphabetical ascending; documented in tests
- Clamps run only at the end (no mid-pipeline clamping)
- All math is integer; no floats anywhere in the pipeline
- Two artifacts contributing `+50 attack` to a base-1 hero produce
  final attack = 99 (clamp), not 51
- Specialty `skill_bonus.levelOffset` replaces the skill step output
  for the named skill before the artifact step runs
- Output is byte-equal across two engines for the golden fixture
- Function is pure: same `(hero, ctx)` → same output bytes

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
