# Hero Specialty Applier

Module: [Spells, Artifacts & Hero Skills (M3)](../01-spells-artifacts.md)

Description:
Apply hero specialty records from content to deterministic combat,
spell, unit, and adventure calculations. Specialties are data-driven
capabilities; the engine must not branch on first-party hero names.

Read First:
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)
- [`docs/architecture/pack-contract.md`](../../../docs/architecture/pack-contract.md)

Inputs:
- Hero schema specialty fields
- Unit, spell, skill, and ruleset effect registries
- Existing computed-stat and spell mastery paths

Outputs:
- `src/engine/hero-specialties.ts`
- Specialty effect applier wired into computed hero, army, spell, and
  adventure movement calculations
- Validation tests for unit-class, spell, and skill specialty examples

Owned Paths:
- `src/engine/hero-specialties.ts`

Dependencies:
- phase-2.01-spells-artifacts.01b-spell-school-loader-plus-mastery-scaling
- phase-2.01-spells-artifacts.05-artifact-paper-doll-system
- phase-2.01-spells-artifacts.07a-skill-runtime-contract-and-id-normalization
- phase-2.01-spells-artifacts.07b-combat-skill-appliers
- phase-2.01-spells-artifacts.07c-adventure-skill-appliers
- phase-2.01-spells-artifacts.07d-magic-economy-and-special-skill-appliers

Acceptance Criteria:
- Unit specialties can modify only declared unit classes or stable unit
  IDs from loaded content
- Spell specialties apply through spell effect scaling without changing
  the meaning of old spell fields
- Skill specialties compose with secondary skills and artifacts in a
  deterministic, documented order
- Missing specialty target content fails validation loudly before play
- No engine branch checks a specific first-party hero, faction, or
  asset path

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours
