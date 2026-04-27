# 5. GAME MECHANICS COVERAGE

> Audit pass over the questions originally listed in this file. Each
> question is preserved verbatim and answered against the current repo
> state (planning + schemas + tasks; very little runtime code yet —
> `src/engine/` and `src/rules/` contain only `README.md` files).

---

### Q: 84. Is the full baseline-corridor mechanic set enumerated, and which are explicitly out of scope?

**Status:** ⚠ Partial

**Answer:**
The repo is intentionally framed as an **IP-neutral, pack-driven engine**, not as a clone of any legacy title. There is no single canonical legacy-mechanic enumeration. What is enumerated is a **baseline corridor** of mechanics chosen for the MVP+P2 scope, distributed across module READMEs and individual task files:

- MVP (M1–M2) — turn structure, hex map + A* + ZoC, hero movement, mines + daily income, town visit (recruit/build/learn), `RECRUIT_UNITS`, `BUILD_BUILDING`, `LEARN_SPELL`, `MARKETPLACE_TRADE`, `HIRE_HERO`, split/merge/transfer/upgrade, week/month events, victory/defeat conditions, fog of war, auto-resolve, full tactical combat (initiative, wait/defend, retaliation, ranged, morale/luck, abilities), heuristic AI.
- Phase 2 — hero leveling + skill assignment, full spell schools + mage guild offerings, artifact paper-doll + combos, siege state machine, catapult, university, war machines, hot-seat, second faction (Necropolis) with necromancy/undead immunity, caravans, campaign + cinematics, quest log.
- Phase 3 — strategic AI, AI generation, mod system depth, multiplayer.

**Explicitly out of scope** is fragmented across docs:

- Spell creation editor (`spells-and-mage-guild.md` §7) — Phase 2.
- Cross-school meta-magic (`spells-and-mage-guild.md` §7) — explicitly "not designed; explicitly out of scope until a ruleset pack adds capabilities".
- Faction-defined spell schools (`spells-and-mage-guild.md` §7) — schools are a closed enum.
- `breath_attack` and `resurrection` abilities marked "stub for future" in `07-unit-abilities-...md`.
- Diplomacy as a generic effect kind — research report routes it through a dedicated skill applier instead.

There is **no single "out of scope" register** equivalent to a baseline-corridor feature checklist; readers must reconstruct it from the `## Not in scope` / "stub" / "deferred" lines scattered across module and task files.

**Evidence:**
- [tasks/README.md](../../tasks/README.md) — top-level module list
- [tasks/mvp/](../../tasks/mvp/) — module folders 01–10
- [tasks/phase-2/](../../tasks/phase-2/) — module folders 01–08
- [docs/architecture/spells-and-mage-guild.md:101-108](../architecture/spells-and-mage-guild.md#L101-L108) — explicit non-scope list
- [tasks/mvp/09-tactical-combat/07-unit-abilities-flying-double-strike-breath-no-retaliation.md:33-34](../../tasks/mvp/09-tactical-combat/07-unit-abilities-flying-double-strike-breath-no-retaliation.md#L33-L34) — `breath_attack` / `resurrection` marked stub
- [docs/architecture/master-plan.md](../architecture/master-plan.md) — milestone summary
- ⚠ No file enumerates "baseline-corridor mechanics with in/out flags" — gap

---

### Q: 85. Is movement defined in terms of points, tiles, terrain cost, or a formula?

**Status:** ✔ Defined

**Answer:**
**All four, in this composition:** the unit is **movement points (MP)**. Each tile consumes a **terrain cost** drawn from the ruleset. The path is a sequence of **hex tiles**. Total cost is a sum (with road discount) — the formula is `total = Σ ceil(terrain_cost / road_factor)`. MP is stored on the hero (`hero.movementPoints`); tile costs come from the active ruleset; pathfinding sums them via A*. Tile stepping is hex-grid (axial coords), not square.

**Evidence:**
- [tasks/mvp/05-adventure-map/03-hero-movement.md:50-72](../../tasks/mvp/05-adventure-map/03-hero-movement.md#L50-L72) — MP, terrain costs JSON, road `ceil(baseCost/2)` rule
- [tasks/mvp/05-adventure-map/01-strategic-game-state-model.md:42-43](../../tasks/mvp/05-adventure-map/01-strategic-game-state-model.md#L42-L43) — `movementPoints: number` on `Hero`
- [docs/architecture/diagrams/23-hero-movement.md:42-51](../architecture/diagrams/23-hero-movement.md#L42-L51) — terrain cost table
- [tasks/mvp/03-map-system/01-axial-hex-coordinate-utilities.md](../../tasks/mvp/03-map-system/01-axial-hex-coordinate-utilities.md) — hex grid

---

### Q: 86. Is the movement-cost table per-terrain documented and balanced?

**Status:** ⚠ Partial

**Answer:**
**Documented, partly. Balanced — not validated.** Two tables exist, expressed in different units:

- `tasks/mvp/05-adventure-map/03-hero-movement.md` (worked example): `grass:100, sand:150, swamp:200, snow:150, water:9999, mountain:9999`, integer ×100 basis.
- `docs/architecture/diagrams/23-hero-movement.md`: `road:0.75, grass:1.0, sand:1.5, snow:2.0, swamp:2.0` (decimal, conflicts with the integer ruleset rule).

The integer ×100 form is the canonical one (matches the "no floats in deterministic paths" rule and the pathfinder acceptance criterion). The decimal table in the diagram should be rewritten in ×100 units. There is **no explicit balance review** — no AI-soaked playtest results, no reference per-day distance budget, no statement of "with 4500 MP a hero should clear N grass tiles per day".

**Evidence:**
- [tasks/mvp/05-adventure-map/03-hero-movement.md:50-72](../../tasks/mvp/05-adventure-map/03-hero-movement.md#L50-L72) — integer canonical
- [docs/architecture/diagrams/23-hero-movement.md:42-51](../architecture/diagrams/23-hero-movement.md#L42-L51) — decimal duplicate (inconsistent)
- [tasks/mvp/03-map-system/04-a-pathfinder-with-terrain-cost-plus-zoc.md:39](../../tasks/mvp/03-map-system/04-a-pathfinder-with-terrain-cost-plus-zoc.md#L39) — "All floating-point avoided (use integer costs ×100)"
- ❌ No balance/tuning task or playtest report

---

### Q: 87. How is pathfinding specified — A*, JPS, flowfield?

**Status:** ✔ Defined

**Answer:**
**A\* with terrain cost and Zone of Control (ZoC).** Adventure map pathfinder exposes two modes:

- `findPath(map, terrain, src, dst, mpBudget, zocTiles): HexCoord[] | null`
- `reachable(map, terrain, src, mpBudget, zocTiles): Map<HexCoord, number>`

ZoC: enemy hero presence on a tile blocks **diagonal** movement around that tile. Performance budget: 128×128 map < 5 ms. JPS and flowfields are **not** mentioned anywhere — only A*. There is no separate pathfinder spec for tactical combat (the tactical hex grid presumably reuses the same hex utilities; not explicit).

**Evidence:**
- [tasks/mvp/03-map-system/04-a-pathfinder-with-terrain-cost-plus-zoc.md](../../tasks/mvp/03-map-system/04-a-pathfinder-with-terrain-cost-plus-zoc.md) — A* spec
- [tasks/mvp/03-map-system/07-unit-test-suite-for-pathfinder-edge-cases.md](../../tasks/mvp/03-map-system/07-unit-test-suite-for-pathfinder-edge-cases.md) — edge-case test plan
- ⚠ No tactical-combat pathfinder task — gap (relevant to flying / `BATTLE_MOVE`)

---

### Q: 88. Are pathfinding ties broken deterministically?

**Status:** ⚠ Partial

**Answer:**
**Implied yes, never specified explicitly.** The hero-movement task states: *"Pathfinding is deterministic (A* with consistent tie-breaking by hex coord)"* — that single line is the entire tie-break rule. No documented order (e.g. axial `q` then `r`, attacker-side bias, lower-id-first), no test that hand-verifies a deliberate-tie scenario.

**Evidence:**
- [tasks/mvp/05-adventure-map/03-hero-movement.md:112](../../tasks/mvp/05-adventure-map/03-hero-movement.md#L112) — sole mention
- ⚠ No test in [tasks/mvp/03-map-system/07-unit-test-suite-for-pathfinder-edge-cases.md](../../tasks/mvp/03-map-system/07-unit-test-suite-for-pathfinder-edge-cases.md) calls out tie-break determinism as an acceptance criterion

---

### Q: 89. Is combat turn order defined precisely (initiative, speed, ties)?

**Status:** ✔ Defined

**Answer:**
**Yes, fully.** Each round: collect all alive stacks, sort by `speed` descending. On tie:

1. Side: attacker first
2. Position: top stack (smaller index) first
3. Unit ID: alphabetical fallback

WAIT moves the stack to the back of the current queue. Same seed produces the same order. Morale-positive proc inserts the stack again immediately after its current position (not at the end).

**Evidence:**
- [docs/architecture/diagrams/10-turn-order.md](../architecture/diagrams/10-turn-order.md) — tie-break rules + diagram
- [tasks/mvp/09-tactical-combat/01-battlestate-init-army-placement-plus-speed-order.md:46-48](../../tasks/mvp/09-tactical-combat/01-battlestate-init-army-placement-plus-speed-order.md#L46-L48) — acceptance criteria
- [tasks/mvp/09-tactical-combat/02-initiative-queue-speed-order-wait-defend-morale.md](../../tasks/mvp/09-tactical-combat/02-initiative-queue-speed-order-wait-defend-morale.md) — queue lifecycle
- [tasks/mvp/09-tactical-combat/06-morale-and-luck-rolls.md](../../tasks/mvp/09-tactical-combat/06-morale-and-luck-rolls.md) — morale extra-move position

---

### Q: 90. Are wait, defend, retaliation, and morale rules specified to the cycle?

**Status:** ✔ Defined

**Answer:**
**Yes.** Cycle-by-cycle:

- **WAIT:** `BATTLE_WAIT` — moves the active stack to the end of the *current* round's queue (after non-waited stacks). Re-WAITing the same round is implicitly disallowed by the queue model but not explicitly tested.
- **DEFEND:** `BATTLE_DEFEND` — sets a flag, applies a `−25 %` damage reduction (`750/1000`) to next incoming damage, flag cleared at the start of the stack's next action / next round.
- **Retaliation:** Once per round per stack, reset at round start; melee attack only; abilities can disable (`no_enemy_retaliation`) or grant unlimited (`unlimited_retaliation`); ranged attacks never trigger retaliation unless the attacker is adjacent.
- **Morale:** Rolled at the start of each unit's turn. Positive → extra move inserted at current queue position. Negative → unit loses turn. Probabilities `clamp(morale, -3, 3) / 24` per side. `immuneToMorale` units always roll neutral. Auras applied at `initBattle` before initiative ordering.

**Evidence:**
- [tasks/mvp/09-tactical-combat/02-initiative-queue-speed-order-wait-defend-morale.md](../../tasks/mvp/09-tactical-combat/02-initiative-queue-speed-order-wait-defend-morale.md) — WAIT/DEFEND
- [tasks/mvp/09-tactical-combat/02a-defend-damage-reduction.md](../../tasks/mvp/09-tactical-combat/02a-defend-damage-reduction.md) — defend math
- [tasks/mvp/09-tactical-combat/05-retaliation-once-per-round-nullification.md](../../tasks/mvp/09-tactical-combat/05-retaliation-once-per-round-nullification.md) — retaliation
- [tasks/mvp/09-tactical-combat/06-morale-and-luck-rolls.md](../../tasks/mvp/09-tactical-combat/06-morale-and-luck-rolls.md) — morale formula

---

### Q: 91. How many retaliations per round are allowed, per unit type?

**Status:** ✔ Defined

**Answer:**
**Default 1 per round per stack**, reset at round start. Modifiers via ability IDs:

- `no_enemy_retaliation` — defender cannot retaliate against the attacker's strike (e.g. example: Swordsmen, Champions).
- `unlimited_retaliation` — retaliates against every incoming attack (e.g. example: Griffins).

There is no explicit "+1 retaliation" granular ability; the only counts in scope are `1` and `unlimited`. Retaliation always uses melee even for ranged units.

**Evidence:**
- [tasks/mvp/09-tactical-combat/05-retaliation-once-per-round-nullification.md:26-31](../../tasks/mvp/09-tactical-combat/05-retaliation-once-per-round-nullification.md#L26-L31)
- [tasks/mvp/09-tactical-combat/07-unit-abilities-flying-double-strike-breath-no-retaliation.md](../../tasks/mvp/09-tactical-combat/07-unit-abilities-flying-double-strike-breath-no-retaliation.md) — ability table

---

### Q: 92. Are double-attack, no-retaliation, and ranged penalties specified?

**Status:** ✔ Defined

**Answer:**
**Yes, all three.**

- **Double-attack / double-shot:** ability `double_shot` — ranged unit fires twice per turn; second shot resolves before any retaliation. (No melee `double_strike` listed in MVP table — slight gap if intended.)
- **No retaliation:** `no_enemy_retaliation` — defender cannot retaliate.
- **Ranged penalties** (constants in ruleset, defaults in `baseline.ruleset.json`):
  - Short range (≤ `rangedShortRangeHexes`, default 10): no penalty.
  - Long range (> 10 hexes): ×`rangedLongRangePenaltyNum/Den` (default 1/2).
  - Melee penalty (enemy adjacent to a ranged attacker): ×`rangedMeleePenaltyNum/Den` (default 1/2).
  - Penalties stack multiplicatively (defaults → ×1/4).
- `no_melee_penalty` ability disables the adjacency penalty (e.g. Monks).
- Ammo: `shots` field on `unit.stats` depletes by 1 per ranged attack; at 0, must use melee.

**Evidence:**
- [tasks/mvp/09-tactical-combat/04-ranged-attack-obstacle-check-range-limit.md:23-30](../../tasks/mvp/09-tactical-combat/04-ranged-attack-obstacle-check-range-limit.md#L23-L30)
- [tasks/mvp/09-tactical-combat/07-unit-abilities-flying-double-strike-breath-no-retaliation.md:24-35](../../tasks/mvp/09-tactical-combat/07-unit-abilities-flying-double-strike-breath-no-retaliation.md#L24-L35)
- [content-schema/schemas/unit.schema.json:44](../../content-schema/schemas/unit.schema.json#L44) — `shots` field
- ⚠ No melee `double_strike` ability variant for non-ranged double-hitters

---

### Q: 93. Are obstacles, ranged blocking, and friendly-fire rules specified?

**Status:** ⚠ Partial

**Answer:**
- **Obstacles for movement:** `flying` ability bypasses obstacle hexes; non-flying ground movement blocked by obstacle hexes (battlefield obstacles authored as map content, not in a generation algorithm).
- **Ranged blocking:** "Wall / fortification hexes block ranged shots (line-of-sight check)" — present in the task file, but the LoS algorithm itself is **not described** (Bresenham? hex line? distance-weighted?). Generic battlefield obstacles don't have a documented LoS rule.
- **Friendly fire:** ❌ UNKNOWN. No mention of AOE spells hitting friendlies, friendly-fire on `breath_attack`, or selectable `target` enums beyond `ally` / `enemy` in the effect registry. Spells use the targeting schema (`targeting.schema.json`), but no rule states "fireball can hit own units".

**Evidence:**
- [tasks/mvp/09-tactical-combat/04-ranged-attack-obstacle-check-range-limit.md:21-22](../../tasks/mvp/09-tactical-combat/04-ranged-attack-obstacle-check-range-limit.md#L21-L22) — wall blocks shots
- [tasks/mvp/09-tactical-combat/07-unit-abilities-flying-double-strike-breath-no-retaliation.md:24](../../tasks/mvp/09-tactical-combat/07-unit-abilities-flying-double-strike-breath-no-retaliation.md#L24) — `flying`
- ❌ No LoS algorithm spec
- ❌ No friendly-fire policy

---

### Q: 94. Are siege mechanics (walls, towers, moat, gate) specified?

**Status:** ⚠ Partial

**Answer:**
**Specified at contract level, not in detail.** `phase-2.01-spells-artifacts.13-siege-state-machine` says siege battle init creates wall/gate/moat/tower state from content IDs and ruleset values; moat damage and passability apply on entry; tower auto-fire is deterministic by initiative/round timing; defender hero is locked into spell-only-mode while siege constraints hold; `BATTLE_RESOLVED` records siege outcome. Companion `phase-2.01-spells-artifacts.14-fire-catapult-command` covers attacker catapult.

**What's missing:** wall HP curves, tower damage formulas, moat damage values, breach geometry, drawbridge/gate state machine details, repair cost/mechanic, multi-segment wall topology — all deferred to ruleset content + task implementation. There is a `docs/architecture/wiki/screens/43-siege-combat/` UI package, but the runtime contract is intentionally thin.

**Evidence:**
- [tasks/phase-2/01-spells-artifacts/13-siege-state-machine.md](../../tasks/phase-2/01-spells-artifacts/13-siege-state-machine.md)
- [tasks/phase-2/01-spells-artifacts/14-fire-catapult-command.md](../../tasks/phase-2/01-spells-artifacts/14-fire-catapult-command.md)
- ⚠ No siege constants in `baseline.ruleset.json` example
- ⚠ No documented wall topology / damage states

---

### Q: 95. Are stack-splitting and merging rules in combat defined?

**Status:** ⚠ Partial

**Answer:**
**Adventure-map split is defined; in-combat split/merge is not.**

- `mvp.05-adventure-map.17-split-army-stack-command` defines `SPLIT_ARMY_STACK` for hero/town armies pre-combat: quantity in `1..source.count - 1`, empty or compatible target slot, deterministic stack ID, merge on compatible same-creature target.
- `mvp.05-adventure-map.18-transfer-stack-commands` covers cross-army transfer/swap/merge for hero ↔ hero / hero ↔ garrison.
- ❌ **In-combat split (e.g. mid-battle stack split)** is not designed — combat operates on `BattleState.stacks: UnitStack[]` initialized once at battle start.
- ❌ **In-combat merge** (e.g. resurrected/raised units merging into existing same-type stack) is implied for necromancy but not generalised.

**Evidence:**
- [tasks/mvp/05-adventure-map/17-split-army-stack-command.md](../../tasks/mvp/05-adventure-map/17-split-army-stack-command.md)
- [tasks/mvp/05-adventure-map/18-transfer-stack-commands.md](../../tasks/mvp/05-adventure-map/18-transfer-stack-commands.md)
- [tasks/phase-2/03-second-faction/04-necromancy-mechanic-raise-skeletons-after-combat.md:39-40](../../tasks/phase-2/03-second-faction/04-necromancy-mechanic-raise-skeletons-after-combat.md#L39-L40) — post-battle merge into existing skeleton stack
- ❌ No in-combat split/merge command kind

---

### Q: 96. Are hero stat formulas (attack/defense/spellpower/knowledge) specified end-to-end?

**Status:** ⚠ Partial

**Answer:**
**Stats are stored, growth is specified, application to combat is partial.**

- **Storage:** `hero.primaryStats: { attack, defense, power, knowledge }`, integers 0–99, schema-validated.
- **Growth (level-up):** `phase-2.01-spells-artifacts.00-hero-leveling` defines XP table `xp(n) = n × (n - 1) × 500`, capped at level 30; per-class weight buckets (e.g. Warrior `35/35/15/15`) with a post-level-10 shift (martial 25/25/25/25, caster 10/10/40/40); RNG substream `rng("hero-levelup", heroId)`.
- **Combat application:**
  - `attack`/`defense` flow into the damage formula via `attackBonus` / `defenseMitigation` (clamp on the differential, `1/20` per point, capped at 60 points → +300 % / ×0.25).
  - `power` (spellpower): not explicitly threaded — spell `effects[].amount` is a formula AST, but no pinned formula reads `hero.power` to scale spell damage.
  - `knowledge`: gates `LEARN_SPELL` ("hero must meet `knowledge` threshold for the spell's level") and presumably feeds mana pool via `Mysticism`-style skills, but the mana = `f(knowledge)` formula is not pinned.

**Evidence:**
- [content-schema/schemas/hero.schema.json:22-31](../../content-schema/schemas/hero.schema.json#L22-L31) — primaryStats shape
- [tasks/phase-2/01-spells-artifacts/00-hero-leveling.md:26-63](../../tasks/phase-2/01-spells-artifacts/00-hero-leveling.md#L26-L63) — XP / growth
- [tasks/mvp/09-tactical-combat/03-damage-formula.md:32-46](../../tasks/mvp/09-tactical-combat/03-damage-formula.md#L32-L46) — attack/defense in damage
- [docs/architecture/spells-and-mage-guild.md:91-99](../architecture/spells-and-mage-guild.md#L91-L99) — knowledge threshold for `LEARN_SPELL`
- ⚠ No documented `mana(hero) = …` formula
- ⚠ No documented `spell_damage(hero.power, base) = …` formula

---

### Q: 97. Are skill trees and secondary skills specified with stack interactions?

**Status:** ⚠ Partial

**Answer:**
**Roster, IDs, and tier rules are specified. Per-stack interaction depth varies by skill.**

- **Roster (28 skills):** Combat (Leadership, Defense, Archery, Offense, Armorer, Necromancy, Pathfinding, Luck), Magic (Wisdom × 8 schools), Special (Scouting, Mysticism, Sorcery, Interference, Diplomacy, Logistics, Navigation, Smuggling, Conversion, Discipline, Trading, Learning).
- **Tiering:** basic/advanced/expert.
- **Slots:** ⌈hero.level / 5⌉, capped at 10.
- **Upgrade rule:** must learn at basic before advanced; advanced before expert.
- **Stack interaction:** Leadership → unit morale aura; Defense → damage reduction; Archery → ranged damage bonus; Offense → melee damage bonus; Armorer → armor; Necromancy → post-battle skeleton raising; Wisdom → spell-mastery tier selection. Concrete numeric values + composition order live in `phase-2.01-spells-artifacts.07b-combat-skill-appliers` / `07c-adventure-skill-appliers` / `07d-magic-economy-and-special-skill-appliers`. Specialty composition order ("specialty after mastery-tier selection") is documented for spells but not for stat aggregation generally.
- ❌ No "skill tree" in the prerequisite-graph sense (skills are flat, not gated by other skills beyond tier-prerequisites).

**Evidence:**
- [tasks/phase-2/01-spells-artifacts/01a-hero-skill-assignment.md:28-71](../../tasks/phase-2/01-spells-artifacts/01a-hero-skill-assignment.md#L28-L71) — roster + tiering
- [tasks/phase-2/01-spells-artifacts/07b-combat-skill-appliers.md](../../tasks/phase-2/01-spells-artifacts/07b-combat-skill-appliers.md)
- [tasks/phase-2/01-spells-artifacts/07c-adventure-skill-appliers.md](../../tasks/phase-2/01-spells-artifacts/07c-adventure-skill-appliers.md)
- [docs/architecture/spells-and-mage-guild.md:81-87](../architecture/spells-and-mage-guild.md#L81-L87) — specialty/mastery composition
- ⚠ No documented total stat composition order across base + level-ups + skills + specialty + artifacts + auras

---

### Q: 98. Are level-up tables and stat probability tables defined?

**Status:** ✔ Defined

**Answer:**
**Yes.**

- **XP table:** `xpForLevel(n) = n × (n - 1) × 500`. Sample: L2=1 000, L3=3 000, L5=10 000, L20=190 000, L30=790 000. Cap at L30; overflow XP discarded.
- **Stat probability:** per-class weight bucket (numerator / 100). Warrior `attack/defense/power/knowledge = 35/35/15/15`; post-L10 martial = 25/25/25/25, caster = 10/10/40/40.
- **Roll:** `rng("hero-levelup", heroId).nextInt(0, 100)`; cumulative bucket sum picks the +1 stat.

⚠ Only Warrior (martial) and Mage (caster) examples are spelled out; the full per-class weight table for all hero classes (Knight, Cleric, Ranger, Druid, Necromancer, etc.) is referenced but not enumerated in the audited file.

**Evidence:**
- [tasks/phase-2/01-spells-artifacts/00-hero-leveling.md:26-63](../../tasks/phase-2/01-spells-artifacts/00-hero-leveling.md#L26-L63)
- [research/deep-research-report.md](../../research/deep-research-report.md) — referenced as source of full per-class weights

---

### Q: 99. Are creature growth, dwellings, and weekly events specified?

**Status:** ⚠ Partial

**Answer:**
- **Growth:** `unit.growth.weekly` and `unit.growth.baseWeekly` (integers, max 1000) on the unit schema; `unit.growth.dwellingBuildingId` ties a unit to a dwelling. Weekly recompute happens at `WEEK_START`.
- **Dwellings:** Each faction's town building tree (e.g. Emberwild — Scout Camp, Kennels, Archery Post, Cinder Stables, Ember Library, Warden Hall, Phoenix Roost) lists dwellings; built buildings emit `unlock_unit` effects; recruit pool grows weekly.
- **Weekly events:** `WEEK_START` event triggered on day 7 (and on day-1-of-week thereafter); `mvp.05-adventure-map.15-acknowledge-week-month-event-command` is the player-facing acknowledgement command. There is a `58-week-month-popup` UI screen.

❌ **Missing:** no enumerated week-event table (e.g. "Week of the Locust → ×2 growth for X", "Plague → no growth"). The hook exists; the content does not. `growth.weekly` task in baseline ruleset (referenced in task 04 acceptance) is also marked as "add when the runtime task lands".

**Evidence:**
- [content-schema/schemas/unit.schema.json:57-64](../../content-schema/schemas/unit.schema.json#L57-L64) — growth fields
- [tasks/mvp/05-adventure-map/02-turn-structure.md:32-33](../../tasks/mvp/05-adventure-map/02-turn-structure.md#L32-L33) — `WEEK_START` triggers town growth
- [tasks/mvp/05-adventure-map/15-acknowledge-week-month-event-command.md](../../tasks/mvp/05-adventure-map/15-acknowledge-week-month-event-command.md)
- [tasks/mvp/04-faction-emberwild/02-emberwild-town-building-tree.md:28-34](../../tasks/mvp/04-faction-emberwild/02-emberwild-town-building-tree.md#L28-L34) — dwellings list
- ❌ No week-event content table (themed weeks)

---

### Q: 100. Are all spells listed, with mana cost, school, level, and effect formula?

**Status:** ❌ UNKNOWN

**Answer:**
**Spell schema is defined; no concrete spell roster ships.** `spell.schema.json` requires `school` (closed enum 8), `level` 1–5, `scope` (combat/adventure/both), integer `manaCost`, `targeting`, and a `masteryTiers.{basic,advanced,expert}` triple where each tier carries an `effects: Effect[]` (effect amounts use the formula AST). Mage-guild offerings are seeded per-town. But:

- No spell records exist in `content-schema/examples/records/spells/` (or under any `resources/packs/.../spells/`) at audit time.
- `04a-baseline-skill-pack`, `01b-spell-school-loader-plus-mastery-scaling`, and `02-combat-spells` / `03-adventure-map-spells` are the planned authoring tasks — none enumerate specific spells, manas, levels.

**Evidence:**
- [content-schema/schemas/spell.schema.json](../../content-schema/schemas/spell.schema.json) — shape ✓
- [docs/architecture/spells-and-mage-guild.md](../architecture/spells-and-mage-guild.md) — design ✓
- [tasks/phase-2/01-spells-artifacts/02-combat-spells.md](../../tasks/phase-2/01-spells-artifacts/02-combat-spells.md) — planned roster task
- [tasks/phase-2/01-spells-artifacts/03-adventure-map-spells.md](../../tasks/phase-2/01-spells-artifacts/03-adventure-map-spells.md) — planned roster task
- ❌ No listed spell content yet

---

### Q: 101. Are spell durations, dispels, and stacking rules specified?

**Status:** ⚠ Partial

**Answer:**
- **Durations:** `effect.kind = "status"` carries an optional `duration` per the effect registry. The unit (rounds? turns? days?) is not pinned in the registry doc; rounds-of-combat is implied for combat spells but undefined for adventure-map spells.
- **Dispels:** `effect.kind = "dispel"` exists; `scope` filters positive vs. negative effects. The exact dispel ordering / priority (e.g. "dispel newest first" vs. "dispel highest-tier first") is not documented.
- **Stacking:** ❌ UNKNOWN. The repo defines no general "buff doesn't stack with itself" / "highest-magnitude wins" / "additive durations" rule. `modify_stat` is an integer delta with no stacking policy. Spell mastery tiers replace each other (basic → advanced → expert) for the casting hero; this is the only stacking rule pinned.

**Evidence:**
- [docs/architecture/effect-registry.md:23](../architecture/effect-registry.md#L23) — `status` with optional duration
- [docs/architecture/effect-registry.md:27](../architecture/effect-registry.md#L27) — `dispel` with `scope`
- [docs/architecture/spells-and-mage-guild.md:30-44](../architecture/spells-and-mage-guild.md#L30-L44) — mastery tier replacement
- ❌ No status-stacking policy
- ❌ No duration unit pinned (rounds vs. turns vs. days)

---

### Q: 102. Is town construction defined (prereqs, costs, build-once-per-day)?

**Status:** ✔ Defined

**Answer:**
**Yes.**

- **Prereqs:** `building.requires: string[]` — array of prerequisite building IDs; topological sort must pass (no cycles).
- **Costs:** `building.cost` — keyed by `resource-id` enum, integer values.
- **Once-per-day:** `BUILD_BUILDING` command sets a `BuildingBuiltToday` flag on the town; `END_DAY` resets it. Acceptance criterion: "Only one building can be constructed per town per day".
- **Effects on build:** restricted to closed effect-registry kinds (`unlock_unit`, `unlock_building`, `resource_bonus`, `grant_ability`).

**Evidence:**
- [content-schema/schemas/building.schema.json](../../content-schema/schemas/building.schema.json) — schema
- [tasks/mvp/05-adventure-map/05-town-visit-recruit-build-mage-guild.md:38-39](../../tasks/mvp/05-adventure-map/05-town-visit-recruit-build-mage-guild.md#L38-L39) — once-per-day rule
- [tasks/mvp/04-faction-emberwild/02-emberwild-town-building-tree.md:46-50](../../tasks/mvp/04-faction-emberwild/02-emberwild-town-building-tree.md#L46-L50) — DAG validation
- [tasks/mvp/05-adventure-map/01-strategic-game-state-model.md:235](../../tasks/mvp/05-adventure-map/01-strategic-game-state-model.md#L235) — flag reset on `END_DAY`

---

### Q: 103. Are resource economy formulas defined (income, mines, market rates)?

**Status:** ⚠ Partial

**Answer:**
- **Income — mines:** Default daily yields specified per mine type (Gold 1000, Ore 2, Wood 2, Sulfur 1, Crystal 1, Gem 1, Mercury 1) — values live in `baseline.ruleset.json`, per-pack overrides allowed. Applied at `END_DAY`.
- **Income — towns:** `resource_bonus` building effect with `cadence ∈ {once, daily, weekly}`. Building tree includes Village/Town/City Hall/Capitol chain (gold income) and a "Resource Vault (gold)". Concrete per-tier income numbers are not enumerated in the audited files (deferred to baseline ruleset content).
- **Market rates:** `MARKETPLACE_TRADE` command exists; rates come from a marketplace-rate content table (`content-schema/schemas/marketplace-rate-table.schema.json`) and are modulated by owned-marketplace count. The exact rate curve (e.g. "more marketplaces = better ratio") is not documented inline; it depends on the rate-table content + ruleset constants.
- ❌ No documented "treasury overflow / debt" rule, no inflation/scaling rule.

**Evidence:**
- [tasks/mvp/05-adventure-map/04-resource-mine-capture-plus-daily-income.md:21-30](../../tasks/mvp/05-adventure-map/04-resource-mine-capture-plus-daily-income.md#L21-L30) — mine yields
- [tasks/mvp/05-adventure-map/10-trade-resources-command.md](../../tasks/mvp/05-adventure-map/10-trade-resources-command.md) — market command
- [tasks/mvp/02-content-schemas/19-tavern-and-marketplace-tables.md](../../tasks/mvp/02-content-schemas/19-tavern-and-marketplace-tables.md) — rate table schema task
- [docs/architecture/effect-registry.md:28](../architecture/effect-registry.md#L28) — `resource_bonus` cadences
- ⚠ No enumerated per-tier town income values

---

### Q: 104. Are diplomacy and treaty mechanics specified, if present?

**Status:** ❌ UNKNOWN

**Answer:**
**Player-vs-player diplomacy/treaty is not in scope.** The only "diplomacy" surface in the repo is the secondary skill `shared:skill:diplomacy_basic`, framed as "deferred neutral-stack negotiation hook" (i.e. neutral creature stacks may join / surrender / be hired without combat — implementation deferred). There is **no peace/truce/alliance/cease-fire system**, no `DIPLOMATIC_PROPOSAL` command kind, no faction-relations matrix, and no team-sharing protocol.

**Evidence:**
- [research/deep-research-report.md:178](../../research/deep-research-report.md#L178) — "Diplomacy → Deferred neutral-stack negotiation hook"
- [docs/architecture/effect-registry.md:42-48](../architecture/effect-registry.md#L42-L48) — Diplomacy listed under runtime-handler-backed skills
- ❌ No multiplayer diplomacy spec
- ❌ No team / shared-vision system spec

---

### Q: 105. Are random events and map scripting hooks defined?

**Status:** ⚠ Partial

**Answer:**
- **Map objects** (treasure chest, shrine, event) ship as `map-object.schema.json` records with rewards expressed via the closed effect registry. Map-object visits dispatch `MAP_OBJECT_VISIT` commands (see `mvp.05-adventure-map.21-...`).
- **Quests:** `quest.schema.json` exists; `08-meta-systems.04-quest-log-engine` implements quest progression.
- **Campaigns:** `campaign.schema.json` + `campaign-graph-schema` + `campaign-runner` cover scripted campaign progression.
- **Scenario victory/defeat** uses a closed condition union (`defeat_all_enemies`, `capture_town`, `acquire_artifact`, `survive_days`, `accumulate_resource`, `lose_all_towns`, `lose_all_heroes`, `hero_dies`, `resource_depleted`, `day_limit_reached`). New condition kinds require a schema bump.
- ❌ **General-purpose map scripting** (e.g. "on day 30, spawn X army"; if-then triggers; per-tile event chains) is **not** defined. Random map templates exist (`random-map-template.schema.json`) but cover layout, not runtime triggers. There is no "trigger" / "script" record kind.
- ❌ **Random calendar events** (themed weeks/months in the baseline corridor) — hook exists (`WEEK_START`), content does not.

**Evidence:**
- [content-schema/schemas/map-object.schema.json](../../content-schema/schemas/map-object.schema.json)
- [content-schema/schemas/scenario.schema.json:80-157](../../content-schema/schemas/scenario.schema.json#L80-L157) — closed objective union
- [content-schema/schemas/world.schema.json](../../content-schema/schemas/world.schema.json)
- [tasks/phase-2/08-meta-systems/04-quest-log-engine.md](../../tasks/phase-2/08-meta-systems/04-quest-log-engine.md)
- ❌ No map-script / trigger schema

---

### Q: 106. Are luck and morale procs deterministic given seed?

**Status:** ✔ Defined

**Answer:**
**Yes.** Both rolls draw from the seeded RNG via `src/rules/rng.ts`. `rollMorale(stack, rng, ruleset)` and `rollLuck(stack, rng, ruleset)` use integer `rng.nextInt(0, 23)` with `1/24` per-point probabilities. Same seed + same command log → identical proc sequence. The acceptance test calls for ±2σ band over 24 000 rolls. Hero-leveling RNG is on a separate substream (`rng("hero-levelup", heroId)`) so leveling and combat rolls don't interfere, and the mage-guild draw is on yet another substream (`rng("mage-guild", townId)`).

**Evidence:**
- [tasks/mvp/09-tactical-combat/06-morale-and-luck-rolls.md:60-68](../../tasks/mvp/09-tactical-combat/06-morale-and-luck-rolls.md#L60-L68) — formula
- [docs/architecture/master-plan.md:48-56](../architecture/master-plan.md#L48-L56) — determinism stack
- [docs/architecture/spells-and-mage-guild.md:60-62](../architecture/spells-and-mage-guild.md#L60-L62) — substream isolation

---

### Q: 107. Are necromancy, resurrection, and undead mechanics specified?

**Status:** ⚠ Partial

**Answer:**
- **Necromancy** (post-battle skeleton raising): `phase-2.03-second-faction.04` — `skeletonsRaised = floor(totalEnemyHPKilled / skeletonHP × necromancyRate)` with `necromancyRate ∈ {Basic 0.10, Advanced 0.20, Expert 0.30}`. Non-undead enemies are eligible; undead are not. 7-stack army limit handled by merging into existing skeleton stack or discarding.
- **Undead immunities:** `phase-2.03-second-faction.05-undead-immunity-morale-and-mind-spell-rules` — undead are `immuneToMorale` and presumably immune to a documented set of mind spells. Concrete spell-immunity list not enumerated in the audited file (depends on the spell pack).
- **Resurrection:** ability `resurrection` — "On kill, resurrects some allied units at start of next round" — flagged as **stub for future**, not implemented in MVP.

**Evidence:**
- [tasks/phase-2/03-second-faction/04-necromancy-mechanic-raise-skeletons-after-combat.md](../../tasks/phase-2/03-second-faction/04-necromancy-mechanic-raise-skeletons-after-combat.md)
- [tasks/phase-2/03-second-faction/05-undead-immunity-morale-and-mind-spell-rules.md](../../tasks/phase-2/03-second-faction/05-undead-immunity-morale-and-mind-spell-rules.md)
- [tasks/mvp/09-tactical-combat/07-unit-abilities-flying-double-strike-breath-no-retaliation.md:34](../../tasks/mvp/09-tactical-combat/07-unit-abilities-flying-double-strike-breath-no-retaliation.md#L34) — `resurrection` stub
- ⚠ Mind-spell immunity list not enumerated

---

### Q: 108. Are artifact slots, sets, and assembly rules defined?

**Status:** ✔ Defined

**Answer:**
**Yes.**

- **Slots:** 14 artifact slots — head, neck, armor, cloak, boots, main hand, off hand, 2× ring, misc ×5. `artifact.slotIds: string[]` (≥1, unique). `equipArtifact(hero, artifact)` validates slot occupancy.
- **Sets / combos:** `artifact.combo = { setId, requires: string[] (≥2 unique), effects: Effect[] }`. Detected by `detectCombos(hero) → ArtifactCombo[]` whenever an item is equipped/unequipped. Bonus removed immediately when any piece is unequipped.
- **Restrictions:** `artifact.restrictions = { requiredFactionIds, forbiddenFactionIds, requiredHeroClassIds, forbiddenHeroClassIds }`.
- **Rarity tiers:** treasure, minor, major, relic.
- **Assembly UI:** there is a `52-artifact-combine-dialog` screen and `phase-2.01-spells-artifacts.15-combine-artifacts-command` for the combine flow.

**Evidence:**
- [content-schema/schemas/artifact.schema.json](../../content-schema/schemas/artifact.schema.json)
- [tasks/phase-2/01-spells-artifacts/05-artifact-paper-doll-system.md](../../tasks/phase-2/01-spells-artifacts/05-artifact-paper-doll-system.md)
- [tasks/phase-2/01-spells-artifacts/06-combination-artifacts-detect-set-apply-bonus.md](../../tasks/phase-2/01-spells-artifacts/06-combination-artifacts-detect-set-apply-bonus.md)
- [tasks/phase-2/01-spells-artifacts/15-combine-artifacts-command.md](../../tasks/phase-2/01-spells-artifacts/15-combine-artifacts-command.md)

---

### Q: 109. Are caravans, garrisons, and visiting heroes specified?

**Status:** ⚠ Partial

**Answer:**
- **Garrisons:** `Town.garrison: ArmyStack[]` lives on `AdventureState`. Transfer commands: `TRANSFER_GARRISON_STACK`, hero-meeting transfer, garrison-only-when-hero-at-town gating. UI: `22-garrison-structure` screen.
- **Visiting heroes:** `hero.visitedTownIds: string[]` on the strategic state. Town visit emits `TOWN_VISITED` event (morale bonus on re-visit). Same hero re-visit deduplication is implicit but not explicitly tested in the audited file.
- **Caravans:** `phase-2.08-meta-systems.06-caravan-transfer-command` defines `DISPATCH_CARAVAN`; deterministic per-turn-end advance; intercept by enemy hero on caravan's hex emits `CARAVAN_INTERCEPTED`; arrival merges into destination garrison.
- ⚠ **Visiting hero ↔ garrisoned hero swap protocol** ("visiting hero swap with garrison hero") is not explicitly written up.
- ⚠ Two-hero-in-town slot semantics (visiting + garrisoned) — town schema doesn't currently distinguish them explicitly in the audited state shape.

**Evidence:**
- [tasks/mvp/05-adventure-map/01-strategic-game-state-model.md:53-62](../../tasks/mvp/05-adventure-map/01-strategic-game-state-model.md#L53-L62) — town shape
- [tasks/mvp/05-adventure-map/18-transfer-stack-commands.md](../../tasks/mvp/05-adventure-map/18-transfer-stack-commands.md)
- [tasks/phase-2/08-meta-systems/06-caravan-transfer-command.md](../../tasks/phase-2/08-meta-systems/06-caravan-transfer-command.md)
- ⚠ No visiting/garrisoned hero swap protocol
- ⚠ No "town hosts up to two heroes" rule

---

### Q: 110. Are edge cases like 0-stack, full-stack, max-army, simultaneous death defined?

**Status:** ⚠ Partial

**Answer:**
- **0-stack / split lower bound:** `SPLIT_ARMY_STACK` requires `quantity ∈ 1..source.count - 1`, so a "split to zero" is rejected; `quantity = source.count` is also rejected (must leave the source non-empty).
- **Full-stack / merge upper bound:** "Splitting into a compatible stack merges counts without exceeding declared stack limits" — but the *declared stack limit* (e.g. unit-count cap or baseline soft cap) is **not enumerated** anywhere in the audited files. `unit.stats.hp` caps at 100 000, no count cap.
- **Max army:** `Hero.army: ArmyStack[]` "up to 7 stacks" (commented; not schema-enforced in the snapshot). Necromancy task explicitly handles "Hero at 7-stack army limit".
- **Empty hero army:** ❌ UNKNOWN — no rule about whether a hero with zero stacks can move, fight, or even exist.
- **Simultaneous death (mutual kill in retaliation):** ❌ UNKNOWN — not addressed. The retaliation task says "if `canRetaliate`, defender retaliates" but doesn't specify whether a defender that is killed by the attacker still gets its retaliation.
- **Simultaneous game-end** (last hero dies on the day they capture the last enemy town): ❌ UNKNOWN — scenario condition resolution order not pinned.
- **Negative MP / negative HP / overflow** beyond hp 100 000 / morale > 3: schema clamps morale/luck at ±3 and hero stats at 0–99, but combat HP/damage overflow handling is not documented.

**Evidence:**
- [tasks/mvp/05-adventure-map/17-split-army-stack-command.md:34-42](../../tasks/mvp/05-adventure-map/17-split-army-stack-command.md#L34-L42)
- [tasks/mvp/05-adventure-map/01-strategic-game-state-model.md:44](../../tasks/mvp/05-adventure-map/01-strategic-game-state-model.md#L44) — "up to 7 stacks"
- [tasks/phase-2/03-second-faction/04-necromancy-mechanic-raise-skeletons-after-combat.md:39](../../tasks/phase-2/03-second-faction/04-necromancy-mechanic-raise-skeletons-after-combat.md#L39) — 7-stack handling
- [content-schema/schemas/unit.schema.json:40-48](../../content-schema/schemas/unit.schema.json#L40-L48) — stat caps
- ❌ No simultaneous-death rule
- ❌ No empty-army rule
- ❌ No stack-count cap statement

---

## 🔍 Summary

### Missing Logic

- **No enumerated mechanic register** with explicit in-scope / out-of-scope flags — readers must reconstruct it from scattered task and module READMEs.
- **No per-class stat-growth weight table** beyond Warrior/Mage examples (Knight, Cleric, Ranger, Druid, Necromancer not enumerated).
- **No `mana(hero)` formula** (knowledge → mana pool relationship implied via Mysticism but not pinned).
- **No `spell_damage(hero.power, base)` formula** — spell `power` interaction with effect amounts is not pinned.
- **No status-stacking policy** (does the same buff stack? overwrite? take max?).
- **No `duration` unit** for `effect.kind = "status"` (rounds vs. turns vs. days).
- **No LoS algorithm** for ranged blocking (Bresenham? hex line?).
- **No friendly-fire policy** for AOE spells / breath attacks.
- **No simultaneous-death rule** in retaliation (can a dying defender still retaliate?).
- **No empty-hero-army rule** (movable? visible? auto-defeated?).
- **No two-hero-per-town protocol** (visiting vs. garrisoned slot semantics, swap rules).
- **No themed-week / random-event content** — `WEEK_START` hook exists, table does not.
- **No general map-scripting / trigger schema** (event tile triggers, conditional spawns).
- **No diplomacy / treaty system** between players (truce, alliance, cease-fire).
- **No siege constants** in `baseline.ruleset.json` (wall HP, tower damage, moat damage).
- **No spell roster** — schema is ready, no concrete spell records yet.
- **No melee `double_strike` ability** (only ranged `double_shot`).

### Risks

- The terrain-cost table appears in two units (decimal in diagrams, integer ×100 in tasks) — copy-paste drift risk; one of them must be normalized.
- Stat composition order (base → level → skill → specialty → artifact → aura) is not pinned globally — different appliers could compose in different orders, breaking determinism between snapshots and replays.
- Effect `status.duration` semantics ambiguous → cross-pack content authored against different unit assumptions will desync.
- Mage-guild is seeded on a `townId`-keyed substream, but there is no documented rule for what happens if a town's spell pool changes mid-game (faction conversion, capital transfer).
- Edge cases (simultaneous death, empty-army, stack overflow) are common baseline-corridor pitfalls; absence of rules likely produces inconsistent runtime behavior between modules.
- "Up to 7 stacks" is comment-only on the state shape, not schema-enforced — runtime can produce 8+-stack heroes if a recruit/transfer reducer forgets to cap.

### Improvements

- Author a single `docs/architecture/mechanics-coverage.md` table: `mechanic | scope: in/out/deferred | owning task | spec status`. Make it the SSOT for question 84.
- Add a `docs/architecture/stat-composition-order.md` pinning the order of operations for deriving combat-time stats.
- Pin `effect.status.duration` units in `effect-registry.md` (round vs. turn vs. day) and add the unit to the `status` subschema (`durationUnit` enum).
- Define a default status-stacking policy ("highest magnitude wins, refresh duration" or similar) and let individual statuses override.
- Promote "edge cases" — `0-stack`, `empty army`, `simultaneous death`, `stack count cap`, `negative MP` — into a single short policy file and a fuzz-harness suite.
- Convert the diagram terrain-cost table to integer ×100 to match the canonical ruleset basis.
- Add a `siege-constants` block to `baseline.ruleset.json` (wall HP, tower damage, moat damage, breach threshold) and reference it from `13-siege-state-machine.md`.
- Author at least a baseline spell roster (≥10 combat + 5 adventure spells) in `content-schema/examples/records/spells/` so question 100 stops being UNKNOWN.
- Document the 2-hero-per-town rule (visiting + garrisoned) — or explicitly declare it out of scope.
- Add a melee-double-strike ability variant if MVP factions want non-ranged double-hitters.

### AI-Readiness

Score: **6 / 10**

Reason: The **scaffolding** (schemas, command shapes, RNG substreams, ruleset-as-data, effect registry) is unusually disciplined and gives an AI agent solid rails to author content and reducers. **Combat math, turn order, retaliation, morale/luck, hero leveling, artifacts, and town construction** are pinned to a level where an LLM can implement deterministic reducers from the spec without inventing values. However, several **first-class baseline-corridor mechanics** are absent at the rule level: spell roster + power interaction, mana formula, status duration unit + stacking policy, stat composition order, friendly-fire policy, LoS algorithm, simultaneous-death and empty-army edge cases, themed-week table, multiplayer diplomacy, full siege constants. An AI agent attempting to flesh these out today would have to invent them, breaking the "engine pure, rules data" contract. Closing the eight to ten high-leverage gaps above would lift this to ~9 / 10.
