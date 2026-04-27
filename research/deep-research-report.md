# Baseline Stat Tables (Reference Corridor)

This file is the canonical source for **baseline numeric corridors**
used across the game: unit tier stats, weekly growth, building-tree
pricing, hero starting stats, and combat-math constants. Every
first-party faction (Emberwild, Necropolis, Sylvan, Stormspire,
Ashlord, Deepway) is built inside these corridors, and the
AI-generated factions are validated against them at auto-balance time.

All values are **original design targets for Heroes Reforged**, not
references to any specific prior art. They are intentionally close to
the feel of classic turn-based strategy tiers but are our own numbers,
owned by this repo, and tunable.

All values are integers. Fractional ratios are expressed as
`num/den` pairs so the combat math stays fixed-point.

---

## 1. Unit Tier Corridor

Seven tiers per faction. Each tier defines a **stat corridor** — a
low/median/high band. A unit must land inside its tier corridor for
every stat unless its ability explicitly justifies the outlier (and
the auto-balancer accepts the trade).

| Tier | HP (lo–med–hi) | ATK (lo–med–hi) | DEF (lo–med–hi) | DMG min–max (median) | Speed (lo–med–hi) | AI Value (median) |
|:----:|:--------------:|:---------------:|:---------------:|:--------------------:|:-----------------:|:-----------------:|
|  1   |   4 · 6 · 9    |   2 · 4 · 6     |   2 · 3 · 5     |        1–2           |    3 · 4 · 5      |         60        |
|  2   |  10 · 15 · 20  |   5 · 6 · 8     |   4 · 5 · 7     |        2–3           |    4 · 5 · 6      |        150        |
|  3   |  18 · 25 · 35  |   6 · 8 · 10    |   5 · 7 · 9     |        3–5           |    4 · 5 · 7      |        320        |
|  4   |  30 · 40 · 55  |   9 · 11 · 14   |   8 · 10 · 12   |        5–8           |    5 · 6 · 7      |        550        |
|  5   |  45 · 60 · 80  |  11 · 14 · 17   |  10 · 12 · 15   |        7–11          |    6 · 7 · 9      |        900        |
|  6   |  80 · 110 · 140|  14 · 17 · 20   |  13 · 15 · 18   |       10–16          |    6 · 8 · 10     |       1500        |
|  7   | 140 · 180 · 250|  18 · 22 · 27   |  17 · 20 · 24   |       18–30          |    7 · 9 · 11     |       2800        |

**Upgrade deltas** (upgraded unit vs base unit in same tier):

- HP:     +15 % (median)
- ATK:    +2
- DEF:    +2
- DMG:    +1 min, +2 max
- Speed:  +1 (tiers 1–4), +2 (tiers 5–7)
- Cost:   +20 % gold, sometimes adds a secondary resource

Upgrades that add a *new ability* (flight, breath, no-retal) may
reduce stat deltas by up to 30 % to stay inside the tier corridor.

---

## 2. Weekly Growth Corridor

Base weekly growth from the tier-dwelling (before upgrades or town
growth-boost buildings):

| Tier | Base Growth | With Growth Building | Notes |
|:----:|:-----------:|:--------------------:|:-----:|
|  1   |     14      |          21          | most numerous |
|  2   |      8      |          12          |       |
|  3   |      6      |           9          |       |
|  4   |      4      |           6          |       |
|  5   |      3      |           4          |       |
|  6   |      2      |           3          |       |
|  7   |      1      |           2          | capstone |

A town with the growth-boost building for every dwelling produces
roughly **57 / 36 / 27 / 18 / 13 / 9 / 4** units per week.

---

## 3. Building Tree Pricing (Town)

Base town buildings (not faction-specific):

| Building              | Gold | Wood | Ore | Crystal | Sulfur | Gem | Mercury | Prereq |
|-----------------------|:----:|:----:|:---:|:-------:|:------:|:---:|:-------:|:-------|
| Village Hall          |    0 |    0 |   0 |    0    |    0   |  0  |    0    | — |
| Town Hall             | 2500 |    5 |   5 |    0    |    0   |  0  |    0    | Village Hall |
| City Hall             | 5000 |   10 |  10 |    0    |    0   |  0  |    0    | Town Hall, Mage Guild 1 |
| Capitol               |10000 |   20 |  20 |    0    |    0   |  0  |    0    | City Hall, Castle |
| Fort                  | 5000 |   20 |  20 |    0    |    0   |  0  |    0    | — |
| Citadel               | 2500 |    0 |   0 |    5    |    5   |  5  |    5    | Fort |
| Keep                  | 5000 |   10 |  10 |    0    |    0   |  0  |    0    | Citadel |
| Mage Guild L1         | 2000 |    5 |   5 |    0    |    0   |  0  |    0    | — |
| Mage Guild L2         | 1000 |    5 |   5 |    4    |    4   |  4  |    4    | Mage Guild L1 |
| Mage Guild L3         | 1000 |    5 |   5 |    6    |    6   |  6  |    6    | Mage Guild L2 |
| Mage Guild L4         | 1000 |    5 |   5 |    8    |    8   |  8  |    8    | Mage Guild L3 |
| Mage Guild L5         | 1000 |    5 |   5 |   10    |   10   | 10  |   10    | Mage Guild L4 |
| Tavern                |  500 |    5 |   0 |    0    |    0   |  0  |    0    | — |
| Blacksmith            | 1000 |    5 |  10 |    0    |    0   |  0  |    0    | — |
| Marketplace           |  500 |    5 |   0 |    0    |    0   |  0  |    0    | — |
| Resource Silo         | 5000 |    0 |   0 |    0    |    0   |  0  |    0    | Marketplace |
| Shipyard              | 2000 |   20 |   0 |    0    |    0   |  0  |    0    | — |

Dwellings:

| Dwelling Tier | Base Gold | Base Wood | Base Ore | Base Special |
|:-------------:|:---------:|:---------:|:--------:|:-------------|
|       1       |    500    |     5     |     5    |      —       |
|       2       |   1000    |     5     |     5    |      —       |
|       3       |   1500    |     5     |    10    |      —       |
|       4       |   2500    |    10     |    10    | 2 of 1 exotic resource |
|       5       |   4000    |    20     |    15    | 3 of 2 exotic resources |
|       6       |   6000    |    20     |    20    | 5 of 2 exotic resources |
|       7       |  10000    |    20     |    20    | 10 of 2 exotic resources |

Upgrade cost is ~60 % of base dwelling cost.

---

## 4. Hero Starting Stats

By class role (six first-party classes cover these roles; AI
generation reuses the same shape):

| Class Role     | ATK | DEF | POW | KNW | Starting Skills         | Starting Spell |
|----------------|:---:|:---:|:---:|:---:|:------------------------|:---------------|
| Warrior        |  2  |  2  |  1  |  1  | Basic Leadership        | —              |
| Knight         |  1  |  3  |  1  |  1  | Basic Defense           | —              |
| Ranger         |  2  |  1  |  1  |  2  | Basic Archery           | —              |
| Druid          |  1  |  1  |  2  |  2  | Basic Wisdom            | Summon Boon    |
| Mage           |  0  |  0  |  3  |  3  | Basic Wisdom            | Magic Arrow    |
| Necromancer    |  1  |  0  |  2  |  3  | Basic Wisdom, Necromancy| Curse          |

**Primary-stat growth weights per level-up** (numerator over
denominator = 100):

| Class Role   | ATK | DEF | POW | KNW |
|--------------|:---:|:---:|:---:|:---:|
| Warrior      | 35  | 35  | 15  | 15  |
| Knight       | 25  | 45  | 15  | 15  |
| Ranger       | 35  | 25  | 20  | 20  |
| Druid        | 20  | 20  | 30  | 30  |
| Mage         | 10  | 10  | 40  | 40  |
| Necromancer  | 15  | 15  | 35  | 35  |

For each level the PRNG rolls a bucket via cumulative weight and
increments that primary stat by 1. After level 10 the class shifts
toward POW/KNW (50/50 for martial roles, 40/60 for caster roles).

---

## Secondary Skills

Secondary-skill records use stable IDs of the form
`shared:skill:<snake_slug>_basic`. The `_basic` suffix names the
record family for compatibility with the current shared-skill examples;
each record still contains three mastery entries: `basic`, `advanced`,
and `expert`. Do not mix this with extensionless IDs
(`shared:skill:leadership`) or hyphenated IDs
(`shared:skill:leadership-basic`). The existing
`shared:skill:wisdom_basic` record remains a compatibility alias for
early example packs; the full school-specific roster uses the
`wisdom_<school>_basic` IDs below.

| Skill | Stable ID | Contract | Schema / Effect Expression |
|---|---|---|---|
| Leadership | `shared:skill:leadership_basic` | Data-only combat morale bonus | `modify_stat` (`morale`) |
| Luck | `shared:skill:luck_basic` | Runtime combat luck applier | Runtime handler reads skill ID; no generic effect yet |
| Archery | `shared:skill:archery_basic` | Runtime combat ranged-damage applier | Runtime handler; formula constants live in ruleset |
| Offense | `shared:skill:offense_basic` | Runtime combat melee-damage applier | Runtime handler; formula constants live in ruleset |
| Armorer | `shared:skill:armorer_basic` | Runtime combat damage mitigation applier | Runtime handler plus optional `modify_stat` defense components |
| Defense | `shared:skill:defense_basic` | Data-only defense stat bonus for first implementation | `modify_stat` (`defense`) |
| Necromancy | `shared:skill:necromancy_basic` | Deferred post-battle raise hook | Dedicated runtime task; no generic effect kind |
| Pathfinding | `shared:skill:pathfinding_basic` | Runtime adventure movement-cost applier | Runtime handler; current example uses schema-valid `modify_stat` speed |
| Wisdom (Fire) | `shared:skill:wisdom_fire_basic` | Runtime spell-school mastery | Spell-school handler invoked by `SPELL_CAST` / learn-spell gates |
| Wisdom (Water) | `shared:skill:wisdom_water_basic` | Runtime spell-school mastery | Spell-school handler invoked by `SPELL_CAST` / learn-spell gates |
| Wisdom (Earth) | `shared:skill:wisdom_earth_basic` | Runtime spell-school mastery | Spell-school handler invoked by `SPELL_CAST` / learn-spell gates |
| Wisdom (Air) | `shared:skill:wisdom_air_basic` | Runtime spell-school mastery | Spell-school handler invoked by `SPELL_CAST` / learn-spell gates |
| Wisdom (Light) | `shared:skill:wisdom_light_basic` | Runtime spell-school mastery | Spell-school handler invoked by `SPELL_CAST` / learn-spell gates |
| Wisdom (Dark) | `shared:skill:wisdom_dark_basic` | Runtime spell-school mastery | Spell-school handler invoked by `SPELL_CAST` / learn-spell gates |
| Wisdom (Arcane) | `shared:skill:wisdom_arcane_basic` | Runtime spell-school mastery | Spell-school handler invoked by `SPELL_CAST` / learn-spell gates |
| Wisdom (Nature) | `shared:skill:wisdom_nature_basic` | Runtime spell-school mastery | Spell-school handler invoked by `SPELL_CAST` / learn-spell gates |
| Scouting | `shared:skill:scouting_basic` | Runtime fog/sight-radius applier | Runtime adventure handler |
| Mysticism | `shared:skill:mysticism_basic` | Runtime mana-pool and regeneration applier | Runtime magic/economy handler |
| Sorcery | `shared:skill:sorcery_basic` | Runtime mana-cost and spell-value applier | Runtime magic handler |
| Interference | `shared:skill:interference_basic` | Runtime enemy-spell disruption applier | Runtime combat/magic handler |
| Diplomacy | `shared:skill:diplomacy_basic` | Deferred neutral-stack negotiation hook | Dedicated runtime task; no generic effect kind |
| Logistics | `shared:skill:logistics_basic` | Runtime movement-capacity applier | Runtime adventure handler |
| Navigation | `shared:skill:navigation_basic` | Runtime water-movement applier | Runtime adventure handler |
| Smuggling | `shared:skill:smuggling_basic` | Deferred enemy-zone stealth / passage hook | Dedicated runtime task; no generic effect kind |
| Conversion | `shared:skill:conversion_basic` | Deferred stack-conversion battle action | Dedicated runtime task; no generic effect kind |
| Discipline | `shared:skill:discipline_basic` | Runtime morale-floor applier | Runtime combat handler |
| Trading | `shared:skill:trading_basic` | Runtime marketplace-rate applier | Runtime economy handler |
| Learning | `shared:skill:learning_basic` | Runtime experience-gain applier | Runtime hero progression handler |

Runtime-handler-backed skills are intentionally not encoded as ad hoc
free-form effects. If a behavior should become reusable across spells,
artifacts, abilities, and skills, add a new effect kind through
`content-schema/schemas/effect.schema.json`,
`docs/architecture/effect-registry.md`, and a dedicated handler task
before content records depend on it.

---

## 5. Combat Math Constants

**This section is a reader's guide, not a source of truth.** The
authoritative constants live in
[`content-schema/examples/records/rulesets/baseline.ruleset.json`](../content-schema/examples/records/rulesets/baseline.ruleset.json)
and are gated by
[`scripts/__tests__/ruleset-sanity.test.mjs`](../scripts/__tests__/ruleset-sanity.test.mjs).
If this prose ever disagrees with the JSON, the JSON wins — update
the JSON first, re-run `npm test`, then update this section.

The ruleset carries integer `num/den` pairs for every ratio
(`atkBonusPerPoint`, `defReductionPerPoint`, `luckDoubleProb`,
`moraleExtraTurnProb`, `moralePenaltyMissProb`) plus integer
caps/clamps (`atkBonusCap`, `defReductionCap`, `luckMax`,
`moraleMax`) and the `fixedPointBasis = 1000`. To learn a current
value, open the JSON — don't re-derive it from the discussion below.

The **design intent** this repo encodes (stable, not redundant with
the JSON):

- Caps are in **stat-differential points**, not percent of base.
  Clamping happens before the per-point ratio is applied, so
  `clamp(ATK−DEF, 0, atkBonusCap) × atkBonusPerPoint` is a permille
  in `[0, atkBonusCap × 1000 × num/den]`.
- Attacker-side multiplier:
  `(value × (1000 + bonusPermille)) // 1000`.
- Defender-side multiplier (harmonic form to keep +ATK and +DEF
  symmetric in outcome space):
  `(value × 1000) // (1000 + reductionPermille)`.
- Luck and morale both roll once per attack/turn; the permille is
  clamped by `luckMax` / `moraleMax` before sampling.
- Auto-resolve applies a small attacker advantage
  (`autoResolveAttackerAdvantage`) so that AI-vs-AI auto-resolves
  match live combat within noise.

Worked examples (derived from the current JSON; re-derive, don't
quote, if you change the ruleset):

- ATK = 10, DEF = 0. `bonusPermille = clamp(10, 0, 60) × 1000/20 = 500`.
  A 100-damage hit becomes `100 × 1500 // 1000 = 150`.
- ATK = 0, DEF = 10. `reductionPermille = clamp(10, 0, 60) × 1000/20 = 500`.
  A 100-damage hit becomes `100 × 1000 // 1500 ≈ 66` (×0.667).
- ATK − DEF = 80 (above the cap). Clamps to 60 → bonusPermille = 3000
  → hit × 4.00 (+300 %).
- ATK − DEF = 28 (historical "% cap" anchor). `bonusPermille = 28 × 50 = 1400`
  → hit × 2.40 (+140 %). This is a *derived* anchor, not a constant.

---

## 6. Resources and Economy

Starting day-1 resources (standard difficulty):

| Gold | Wood | Ore | Crystal | Sulfur | Gem | Mercury |
|:----:|:----:|:---:|:-------:|:------:|:---:|:-------:|
|20000 |  20  |  20 |    5    |    5   |  5  |    5    |

Mine yields (per day):

| Mine      | Gold | Wood | Ore | Crystal | Sulfur | Gem | Mercury |
|-----------|:----:|:----:|:---:|:-------:|:------:|:---:|:-------:|
| Gold Mine |1000  |   0  |  0  |    0    |    0   |  0  |    0    |
| Sawmill   |   0  |   2  |  0  |    0    |    0   |  0  |    0    |
| Ore Pit   |   0  |   0  |  2  |    0    |    0   |  0  |    0    |
| Crystal   |   0  |   0  |  0  |    1    |    0   |  0  |    0    |
| Sulfur    |   0  |   0  |  0  |    0    |    1   |  0  |    0    |
| Gem Mine  |   0  |   0  |  0  |    0    |    0   |  1  |    0    |
| Alchemist |   0  |   0  |  0  |    0    |    0   |  0  |    1    |

---

## Update Rule

When any new first-party or generated faction requires a value
outside these corridors, **extend the corridor here first** with the
new range, justify it in a short paragraph, and only then author the
unit / building / hero. The auto-balancer uses the values in this file
as its trust region; widening the corridor silently would break the
balance gate.
