# Baseline Skill Pack — 28 Secondary Skills

Status: planned

Module: [Spells & Artifacts (P2)](../01-spells-artifacts.md)

Description:
Author the canonical secondary-skill roster: 28 skills across 8 categories. Each skill has 3 mastery tiers (basic, advanced, expert) with distinct effects. Skills are data-driven effects (not hardcoded mechanics).

Read First:
- [`docs/architecture/effect-registry.md`](../../../docs/architecture/effect-registry.md)
- [`content-schema/schemas/skill.schema.json`](../../../content-schema/schemas/skill.schema.json)
- [`research/deep-research-report.md`](../../../research/deep-research-report.md)

Inputs:
- Skill schema (fully defined in content-schema/)
- Effect kinds (12 registered effect kinds)
- Ruleset (for numeric values)
- Canonical secondary-skill source in `research/deep-research-report.md`,
  section "Secondary Skills"

Outputs:
- `content-schema/examples/packs/shared-skills/skills/` (28 .skill.json files)
- Update `content-schema/examples/packs/shared-skills/manifest.json` with all 28 skill IDs
- One file per skill (no aggregates like `all-skills.json`)

Skill Roster (28 Total):

### Combat Skills (8)

1. **Leadership** — morale bonus to entire army
   - Basic: +1 morale
   - Advanced: +1 morale, +1 to random unit's ATK
   - Expert: +2 morale, all units get +1 ATK

2. **Defense** — damage reduction in combat
   - Basic: defender takes -15 % damage (in DEFEND action)
   - Advanced: -20 % damage
   - Expert: -25 % damage + cannot be critically hit

3. **Archery** — ranged attack bonus
   - Basic: ranged attacks do +25 % damage
   - Advanced: +50 % damage, ignore 50 % of range penalty
   - Expert: +75 % damage, no range penalty

4. **Offense** — melee damage bonus
   - Basic: melee attacks do +25 % damage
   - Advanced: +50 % damage, extra attack roll (20 % chance)
   - Expert: +75 % damage, extra attack always triggers (stacks can attack twice)

5. **Armorer** — armor class improvement (reduce damage from spell effects)
   - Basic: -10 % spell damage
   - Advanced: -20 % spell damage, +1 DEF stat
   - Expert: -30 % spell damage, +2 DEF stat, immunity to status effects

6. **Necromancy** — raise undead from fallen units
   - Basic: raise 10 % of fallen units as zombies (hp/2)
   - Advanced: raise 20 % as skeletons (hp/3, ATK+1)
   - Expert: raise 30 % as specters (hp/4, ATK+2, flying)

7. **Pathfinding** — movement cost reduction
   - Basic: -20 % movement cost
   - Advanced: -40 % movement cost, +1 speed to all units
   - Expert: -60 % movement cost, +2 speed to all units

8. **Luck** — critical hit chance
   - Basic: 10 % chance for double damage on attack
   - Advanced: 20 % chance
   - Expert: 30 % chance + double gold from captured mines

### Magic Skills (8 schools)

9–16. **Wisdom (Fire, Water, Earth, Air, Light, Dark, Arcane, Nature)**

Each school has one skill (8 total):

```
Wisdom (Fire) — fire magic mastery
  - Basic: learn fire spells, +10 % fire damage
  - Advanced: +20 % fire damage, -10 % mana cost
  - Expert: +30 % fire damage, -20 % mana cost, fire spells apply burn status
```

Same structure for all 8 schools (water, earth, air, light, dark, arcane, nature).

### Special Skills (12)

17. **Scouting** — extended fog of war
   - Basic: +2 tile sight range
   - Advanced: +4 tile sight range, see enemy movement
   - Expert: +6 tile sight range, see all enemy heroes through fog

18. **Mysticism** — increased mana pool
   - Basic: +25 % mana
   - Advanced: +50 % mana
   - Expert: +100 % mana, regenerate 5 % mana per turn

19. **Sorcery** — spell cost reduction
   - Basic: -10 % mana cost on all spells
   - Advanced: -20 % mana cost
   - Expert: -30 % mana cost, spells cost no mana (once per day max)

20. **Interference** — enemy spell disruption
   - Basic: 20 % chance to block enemy spell (counters magical attack)
   - Advanced: 40 % chance
   - Expert: 60 % chance, reflected spell damages caster

21. **Diplomacy** — hired troops morale bonus
   - Basic: +1 morale to hired stacks
   - Advanced: +2 morale, hired units don't cost upkeep
   - Expert: +3 morale, hired units gain +1 ATK/DEF

22. **Logistics** — army carrying capacity
   - Basic: carry 2 extra stacks (total 9 instead of 7)
   - Advanced: carry 3 extra stacks (total 10)
   - Expert: carry 4 extra stacks (total 11) + doubled resource capacity

23. **Navigation** — travel cost reduction on water
   - Basic: water terrain cost 50 % (100 MP instead of 200)
   - Advanced: water terrain cost 25 % (50 MP)
   - Expert: water travel is free, can traverse any water tile

24. **Smuggling** — movement through enemy zones
   - Basic: can move through enemy territory without triggering battle
   - Advanced: +30 % movement speed in enemy territory
   - Expert: invisible to enemy fog of war (can't be seen)

25. **Conversion** — stack conversion ability
   - Basic: once per battle, convert 1 enemy stack to own side (HP/2, morale -1)
   - Advanced: once per battle, convert up to 3 stacks
   - Expert: once per battle, convert up to 5 stacks (full HP)

26. **Discipline** — morale stability
   - Basic: morale penalties reduced by 50 %
   - Advanced: immunity to morale penalties (morale never decreases)
   - Expert: morale never goes below 0, immunity to panic

27. **Trading** — resource exchange rates
   - Basic: marketplace rates 10 % better (sell high, buy low)
   - Advanced: rates 20 % better
   - Expert: rates 50 % better, can transmute resources 1:1 (2 of one → 1 of another)

28. **Learning** — bonus experience gain
   - Basic: +25 % XP from all sources
   - Advanced: +50 % XP
   - Expert: +100 % XP, hero levels up automatically when army reaches 1000 XP

Owned Paths:
- `content-schema/examples/packs/shared-skills/skills/` (28 files)
- `content-schema/examples/packs/shared-skills/manifest.json`

Dependencies:
- module:mvp.02-content-schemas
- mvp.02-content-schemas.13-effect-registry

Acceptance Criteria:
- All 28 skills are defined (one .skill.json per skill, no aggregates)
- Each skill has 3 tiers: basic, advanced, expert
- Each tier has at least 1 effect (no empty effect arrays)
- Effects reference only closed effect kinds (no typos)
- All numeric values (morale, damage %, etc.) match ruleset constants or are literal
- Manifest lists all 28 skills and their IDs are stable (no renames mid-implementation)
- IDs use the canonical snake-case compatibility style from research,
  e.g. `shared:skill:leadership_basic`,
  `shared:skill:wisdom_fire_basic`, and
  `shared:skill:pathfinding_basic`
- Runtime-handler-backed or deferred behaviors are documented through
  stable IDs and task dependencies; the pack does not invent
  unregistered effect kinds to express them
- All skills validate against skill.schema.json (`npm run validate`)

Verify:
- npm run validate (all 28 skills pass schema)
- npm test (effect kinds are valid)

Estimated Time:
- 6 hours

---

## File Organization

```
shared-skills/
  manifest.json
  skills/
    leadership.skill.json
    defense.skill.json
    archery.skill.json
    offense.skill.json
    armorer.skill.json
    necromancy.skill.json
    pathfinding.skill.json
    luck.skill.json
    wisdom-fire-basic.skill.json
    wisdom-water-basic.skill.json
    ... (8 schools)
    scouting.skill.json
    mysticism.skill.json
    sorcery.skill.json
    ... (12 special skills total)
```

---

## Example Skill Record

```json
{
  "$schema": "heroes-reforged/skill.schema.json",
  "schemaVersion": 1,
  "id": "shared:skill:leadership_basic",
  "name": "Leadership",
  "description": "Inspires nearby units with increased morale and combat prowess",
  "tags": ["combat", "morale", "core"],
  "levels": [
    {
      "mastery": "basic",
      "effects": [
        {
          "kind": "modify_stat",
          "stat": "morale",
          "value": 1
        }
      ]
    },
    {
      "mastery": "advanced",
      "effects": [
        {
          "kind": "modify_stat",
          "stat": "morale",
          "value": 1
        },
        {
          "kind": "modify_stat",
          "stat": "attack",
          "value": 1
        }
      ]
    },
    {
      "mastery": "expert",
      "effects": [
        {
          "kind": "modify_stat",
          "stat": "morale",
          "value": 2
        },
        {
          "kind": "modify_stat",
          "stat": "attack",
          "value": 1
        }
      ]
    }
  ],
  "presentation": {
    "iconId": "icon:skill:leadership"
  }
}
```

---

## Integration with Hero Leveling

Once both `00-hero-leveling.md` and `01a-hero-skill-assignment.md` are implemented, heroes can learn from this skill pack. The hero panel (Phase 2 UI task) will present available skills as a dropdown during level-up.
