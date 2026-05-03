# Combat Skill Appliers

Status: planned

Module: [Spells, Artifacts & Hero Skills (M3)](../01-spells-artifacts.md)

Description:
Implement the deterministic runtime appliers for combat-facing secondary
skills. This task consumes the skill runtime contract and implements a
narrow combat slice only.

Read First:
- [`research/deep-research-report.md`](../../../research/deep-research-report.md) (Section "Secondary Skills")
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- Skill runtime contract from
  `phase-2.01-spells-artifacts.07a-skill-runtime-contract-and-id-normalization`
- Battle state and damage formula from tactical combat
- Skill records from the active content registry

Outputs:
- `src/engine/skills/combat-skill-appliers.ts`
- Appliers for Leadership, Luck, Archery, Offense, Armorer, Defense,
  and Discipline
- Deterministic test vectors for each supported mastery tier

Owned Paths:
- `src/engine/skills/combat-skill-appliers.ts`

Dependencies:
- phase-2.01-spells-artifacts.07a-skill-runtime-contract-and-id-normalization
- phase-2.01-spells-artifacts.04a-baseline-skill-pack
- mvp.09-tactical-combat.03-damage-formula
- mvp.09-tactical-combat.06-morale-and-luck-rolls

Acceptance Criteria:
- Combat appliers emit `{stat, value}` deltas that feed the canonical
  pipeline pinned in
  [`docs/architecture/stat-composition-order.md`](../../../docs/architecture/stat-composition-order.md);
  no applier mutates hero stats directly
- Leadership at Expert adds +3 morale through the combat applier before
  battle initialization finalizes stack stats
- Luck, Archery, Offense, Armorer, Defense, and Discipline each have
  deterministic basic/advanced/expert test vectors
- Combat appliers use only stable skill IDs and mastery values; no
  behavior branches on localized names or first-party faction IDs
- No behavior requires an unregistered effect kind. Any future reusable
  effect is blocked on a dedicated effect-registry task before use
- Same battle seed, army state, and skill roster produce identical
  combat hashes across 3 runs

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours
