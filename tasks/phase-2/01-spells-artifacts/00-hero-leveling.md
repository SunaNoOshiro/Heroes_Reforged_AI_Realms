# Hero Leveling — LEVEL_UP Command & Stat Growth

Status: planned

Module: [Spells & Artifacts (P2)](../01-spells-artifacts.md)

Description:
Implement hero leveling when they gain enough experience. Each level-up increases primary stats (attack, defense, power, knowledge) using probabilistic growth weights. Implement the `LEVEL_UP` command and the `assignExperience(hero, amount, rng)` function that triggers level-ups deterministically.

Read First:
- [`research/deep-research-report.md` Section 4](../../../research/deep-research-report.md) (hero starting stats and growth weights)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- Hero record (level, experience, primaryStats)
- Experience to assign (from combat victories, map events)
- Ruleset constants (experience table, growth weights per class role)
- RNG substream (rng("hero-levelup", heroId))

Outputs:
- `src/engine/commands/level-up.ts`
- `src/engine/hero-growth.ts`
- `assignExperience(hero: Hero, amount: number, ruleset: Ruleset, rng: Rng): { levelUpsTriggered: number, newLevel: number, newStats: PrimaryStats }`
- `LEVEL_UP` command: `{ kind: "LEVEL_UP", heroId: string, newLevel: number, newPrimaryStats: PrimaryStats }`

Reference Growth Mechanics:

**Experience Table (cumulative):**
```
Level 1: 0 XP
Level 2: 1,000 XP
Level 3: 3,000 XP
Level 4: 6,000 XP
Level 5: 10,000 XP
...
Level 20: 190,000 XP
Level 30: 790,000 XP
```

Formula: `xpForLevel(n) = n × (n - 1) × 500`

**Stat Growth (Probabilistic):**

Each level-up rolls a "bucket" based on the hero's class role weights
sourced from
`ruleset.heroLevelup.classWeights.<classId>`
(see
[`baseline.ruleset.json`](../../../content-schema/examples/records/rulesets/baseline.ruleset.json)
and
[`ruleset.schema.json` §`heroLevelup`](../../../content-schema/schemas/ruleset.schema.json)).

Per-class weight tuples (`[attack, defense, power, knowledge]`,
integer percentages summing to 100):

| Class | Pre-10 | Post-10 |
|---|---|---|
| `knight`      | `[35, 45, 10, 10]` | `[25, 30, 20, 25]` |
| `cleric`      | `[10, 10, 30, 50]` | `[10, 10, 40, 40]` |
| `ranger`      | `[30, 40, 15, 15]` | `[25, 25, 25, 25]` |
| `druid`       | `[15, 15, 40, 30]` | `[10, 10, 40, 40]` |
| `necromancer` | `[15, 15, 35, 35]` | `[10, 10, 40, 40]` |

Values are **placeholders pending a balance pass.** New classes ship
through pack content by adding a row under
`ruleset.heroLevelup.classWeights`; no engine change required.

On level-up:
1. Roll a random int [0, 100) using `rng("hero-levelup", heroId)`.
2. Determine which stat gets +1 (cumulative bucket sum from the
   active tuple).

**Post-Level-10 shift** is applied automatically: at hero-level
`> 10`, the runtime reads `post10` instead of `pre10`.

Owned Paths:
- `src/engine/commands/level-up.ts`
- `src/engine/hero-growth.ts`
- Ruleset table update through the shared ruleset path below

Owned Paths (shared):
- `resources/packs/baseline-ruleset/ruleset.json`

Dependencies:
- mvp.05-adventure-map.01-strategic-game-state-model
- mvp.02-content-schemas.07-hero-schema

Acceptance Criteria:
- All five baseline classes (knight, cleric, ranger, druid,
  necromancer) have validated weight tuples in
  `ruleset.heroLevelup.classWeights`; each tuple sums to 100
- Validation rejects any class entry whose tuple does not sum to 100
- Warrior gains 1000 XP → level 2 reaches
- LEVEL_UP command fires with new level 2 and new stats
- Level-up stat gain is deterministic (same seed → same rolls)
- Post-level-10, Mage class gains power/knowledge instead of balanced
- Assigning 0 XP does not trigger a level-up
- Hero at level 30 cannot level further (cap enforced)
- Experience overflow (XP beyond level 30) is discarded
- RNG substream (rng("hero-levelup", heroId)) keeps hero level-ups independent of combat RNG
- Shared path work is additive only: add leveling tables and growth
  weights without rewriting the primary baseline ruleset contract owned
  by `mvp.04-faction-emberwild.04-baseline-ruleset`

Verify:
- npm run validate
- npm test

Estimated Time:
- 4 hours

---

## Worked Example: Warrior Level-Up

**Initial state:**
```json
{
  "level": 1,
  "experience": 0,
  "primaryStats": { "attack": 2, "defense": 2, "power": 1, "knowledge": 1 }
}
```

**Assign 1000 XP:**
```
XP threshold for level 2 = 1000
Current XP = 0 + 1000 = 1000 (meets level 2)
→ LEVEL_UP triggered
```

**RNG Roll (using rng("hero-levelup", "warrior-hero-1") substream):**
```
Roll 1: 42 → [35, 70) → defense +1
```

**After LEVEL_UP:**
```json
{
  "level": 2,
  "experience": 0,
  "primaryStats": { "attack": 2, "defense": 3, "power": 1, "knowledge": 1 }
}
```

**Command:**
```json
{
  "kind": "LEVEL_UP",
  "heroId": "warrior-hero-1",
  "newLevel": 2,
  "newPrimaryStats": { "attack": 2, "defense": 3, "power": 1, "knowledge": 1 }
}
```

---

## Determinism Contract

- RNG substream `rng("hero-levelup", heroId)` is pinned per hero
- Experience assignment is deterministic (no variance in XP gain)
- Stat growth rolls use seeded RNG (same seed, same rolls)
- **Same seed + same game history → hero reaches exact same level and stats**
