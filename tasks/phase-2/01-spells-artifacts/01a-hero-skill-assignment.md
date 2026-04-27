# Hero Skill Assignment — ASSIGN_SKILL Command

Status: planned

Module: [Spells & Artifacts (P2)](../01-spells-artifacts.md)

Description:
When a hero levels up, the player (or AI) chooses which secondary skill to increase. Implement the `ASSIGN_SKILL` command that validates skill availability and updates the hero's skill roster.

Read First:
- [`docs/architecture/command-schema.md`](../../../docs/architecture/command-schema.md)
- [`research/deep-research-report.md`](../../../research/deep-research-report.md) (Section "Secondary Skills")
- `00-hero-leveling.md` (this module's prerequisite)

Inputs:
- Hero record (secondarySkills array, level)
- Skill ID to assign (from closed skill roster)
- Ruleset (skill availability rules)
- Content registry (all available skills)
- Canonical stable skill ID convention from
  `research/deep-research-report.md`, section "Secondary Skills"

Outputs:
- `src/engine/commands/assign-skill.ts`
- `ASSIGN_SKILL` command: `{ kind: "ASSIGN_SKILL", heroId: string, skillId: string, skillLevel: "basic" | "advanced" | "expert" }`
- Hero skill roster updated: `secondarySkills: SkillEntry[]`

Secondary Skill System (28 Total):

Heroes can learn secondary skills from the closed pool of 28 skills, grouped by category:

**Combat Skills (8):**
- Leadership (hero morale bonus)
- Defense (damage reduction in tactical combat)
- Archery (ranged damage bonus)
- Offense (melee damage bonus)
- Armorer (armor class improvement)
- Necromancy (raise undead from fallen units)
- Pathfinding (movement point cost reduction)
- Luck (critical hit chance)

**Magic Skills (8 schools, 1 per school):**
- Wisdom (Fire, Water, Earth, Air, Light, Dark, Arcane, Nature mastery)
  - Each Wisdom (Fire) grants basic/advanced/expert mastery of fire spells
  - Heroes can learn any school (no restriction)

**Special Skills (12):**
- Scouting (extended fog of war)
- Mysticism (increased mana pool)
- Sorcery (spell cost reduction)
- Interference (enemy spell disruption)
- Diplomacy (hired troops morale bonus)
- Logistics (army carrying capacity)
- Navigation (travel cost reduction on water)
- Smuggling (movement through enemy zones)
- Conversion (stack conversion special ability)
- Discipline (morale stability)
- Trading (resource exchange rates)
- Learning (bonus experience gain)

**Assignment Rules:**

1. Heroes can learn up to N secondary skills (N = hero level / 5, rounded up, capped at 10)
2. Each skill has 3 tiers: basic, advanced, expert
3. Learning a skill at tier 1 is free; upgrading to tier 2 requires learning at tier 1 first
4. Some skills are restricted by class role (optional, Phase 2 expansion)

Example:
- Level 1–5: Can learn 1 skill (basic only)
- Level 6–10: Can learn 2 skills (can upgrade 1 to advanced)
- Level 11–15: Can learn 3 skills (can upgrade to expert)

Owned Paths:
- `src/engine/commands/assign-skill.ts`
- Create `content-schema/examples/packs/shared-skills/` if not exist (extend with full roster)

Dependencies:
- mvp.05-adventure-map.01-strategic-game-state-model
- phase-2.01-spells-artifacts.00-hero-leveling
- phase-2.01-spells-artifacts.04a-baseline-skill-pack

Acceptance Criteria:
- Hero at level 1 can learn 1 basic skill
- Hero at level 10 can learn up to 2 skills (one can be upgraded to advanced)
- ASSIGN_SKILL validates: skill exists in registry, hero can learn it (slot available), tier is legal
- Assigning skill for 2nd time (upgrade to advanced) works only if already learned at basic
- Assigning invalid skill ID returns ValidationError with available skill list
- Skill effects are applied immediately (morale, damage bonus, etc.)
- Skill IDs use the canonical `shared:skill:<snake_slug>_basic`
  convention or an explicitly documented compatibility alias
- RNG is not used for skill assignment (deterministic choice)

Verify:
- npm run validate
- npm test

Estimated Time:
- 3 hours

---

## Skill Roster Management (Hero State)

```typescript
type SkillEntry = {
  skillId: string,
  mastery: "basic" | "advanced" | "expert"
}

type Hero = {
  ...
  secondarySkills: SkillEntry[],
  ...
}
```

**Example Hero Roster (Level 20):**
```json
{
  "secondarySkills": [
    { "skillId": "shared:skill:leadership_basic", "mastery": "expert" },
    { "skillId": "shared:skill:defense_basic", "mastery": "advanced" },
    { "skillId": "shared:skill:wisdom_fire_basic", "mastery": "basic" },
    { "skillId": "shared:skill:pathfinding_basic", "mastery": "basic" }
  ]
}
```

Hero is at level 20 → can learn ⌈20 / 5⌉ = 4 skills → roster shows 4 skills ✓

---

## ASSIGN_SKILL Command Examples

**Assign basic Leadership:**
```json
{
  "kind": "ASSIGN_SKILL",
  "heroId": "warrior-hero-1",
  "skillId": "shared:skill:leadership_basic",
  "skillLevel": "basic"
}
```

Validation:
- Hero exists ✓
- Skill exists in registry ✓
- Hero has < 4 skill slots (level 20) ✓
- Skill not already learned ✓
- → Accepted ✓

**Upgrade Leadership to advanced:**
```json
{
  "kind": "ASSIGN_SKILL",
  "heroId": "warrior-hero-1",
  "skillId": "shared:skill:leadership_basic",
  "skillLevel": "advanced"
}
```

Validation:
- Hero exists ✓
- Skill exists ✓
- Hero already has "leadership" at "basic" ✓
- Hero has spare slot OR can replace existing tier ✓
- → Upgrade to advanced ✓

**Invalid: Assign advanced without learning basic:**
```json
{
  "kind": "ASSIGN_SKILL",
  "heroId": "warrior-hero-1",
  "skillId": "shared:skill:wisdom_fire_basic",
  "skillLevel": "advanced"
}
```

Validation fails:
- Hero has never learned `shared:skill:wisdom_fire_basic` ✗
- Must learn at "basic" first
- → ValidationError("Skill tier not available; learn basic first")

---

## Related Tasks

- `phase-2/01-spells-artifacts/04a-baseline-skill-pack.md` — define all 28 skills
- `phase-2/04-content-editor/` — UI for skill selection
- `phase-2/02-strategic-ai/` — AI skill selection heuristics
