# Skill Runtime Contract And ID Normalization

Status: planned

Module: [Spells, Artifacts & Hero Skills (M3)](../01-spells-artifacts.md)

Description:
Define the runtime contract for secondary-skill appliers and normalize
stable skill IDs before any skill behavior is implemented. This task
does not implement all skills; it creates the narrow interface and alias
rules that later applier tasks consume.

Read First:
- [`research/deep-research-report.md`](../../../research/deep-research-report.md) (Section "Secondary Skills")
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)
- [`content-schema/schemas/skill.schema.json`](../../../content-schema/schemas/skill.schema.json)

Inputs:
- Baseline skill pack from `phase-2.01-spells-artifacts.04a-baseline-skill-pack`
- Hero skill assignment command from `phase-2.01-spells-artifacts.01a-hero-skill-assignment`
- Existing shared-skill example IDs under `content-schema/examples/packs/shared-skills/`

Outputs:
- `src/engine/skills/skill-runtime-contract.ts`
- `src/content-schema/skill-id-aliases.ts`
- Runtime contract for skill appliers: context shape, deterministic
  inputs, result shape, and error behavior
- Alias table for compatibility IDs such as `shared:skill:wisdom_basic`
  that map to the canonical roster without renaming saved content

Owned Paths:
- `src/engine/skills/skill-runtime-contract.ts`
- `src/content-schema/skill-id-aliases.ts`

Dependencies:
- phase-2.01-spells-artifacts.04a-baseline-skill-pack
- phase-2.01-spells-artifacts.01a-hero-skill-assignment
- mvp.02-content-schemas.07-hero-schema

Acceptance Criteria:
- Skill IDs use one canonical style:
  `shared:skill:<snake_slug>_basic`
- Existing example-pack IDs remain valid through explicit aliases or
  migrations; no task example uses both extensionless, hyphenated, and
  snake-case IDs for the same skill
- The runtime applier interface accepts stable skill ID, mastery, and a
  deterministic context object; it does not read wall-clock time,
  `Math.random()`, presentation paths, or localized labels
- The research file has a real "Secondary Skills" source-of-truth
  section that maps each skill to data-only, runtime-handler-backed, or
  deferred behavior
- Deterministic test vectors cover alias normalization and reject
  unknown skill IDs with a stable `ValidationError`

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
