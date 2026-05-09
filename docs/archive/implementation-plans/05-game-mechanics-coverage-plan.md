# Implementation Plan: Game Mechanics Coverage

> Derived from [docs/archive/readiness-audit/05-game-mechanics-coverage.md](../readiness-audit/05-game-mechanics-coverage.md).
> Each fix is grounded in a specific audit Q/Status item; no new gameplay
> is invented — only missing rules are formalized so the engine can
> consume them as data.

---

## 1. Overview

The audit established that **scaffolding is strong** (schemas, RNG
substreams, command shapes, effect registry, deterministic
contracts) but **roughly a dozen first-class rules are missing or
ambiguous**. This plan converts every ❌ UNKNOWN and ⚠ Partial finding
in §5 into concrete spec/schema/task changes.

Readiness state on entry: **6 / 10** (per audit §AI-Readiness). Goal of
this plan: lift to **≈9 / 10** by closing the high-leverage gaps —
status semantics, stat composition order, edge-case policy, terrain-cost
unit normalization, mechanic register SSOT, baseline spell roster,
LoS + friendly-fire, simultaneous death, two-hero-per-town, siege
constants, themed-week content, mana/spell-power formulas.

What this plan does NOT do:
- It does not add Phase-3 features (multiplayer diplomacy is captured
  only as an explicit "out of scope" entry, not a system).
- It does not change any deterministic rule that the audit already
  marked ✔ Defined (turn order, retaliation count, morale formula,
  artifact slots, town once-per-day, luck/morale RNG substreams, A*
  pathfinder shape).
- It does not invent new gameplay — every numeric constant added is
  marked **ruleset-content** so it lands in `baseline.ruleset.json` for
  packs to override.

---

## 2. Critical Fixes (Must Do First)

These unblock determinism, replay, and cross-pack content authoring.
Land in this order:

1. [Issue: Status duration unit + stacking policy](#issue-status-duration-unit--stacking-policy)
2. [Issue: Stat composition order SSOT](#issue-stat-composition-order-ssot)
3. [Issue: Terrain-cost unit normalization](#issue-terrain-cost-unit-normalization)
4. [Issue: Edge-case policy file](#issue-edge-case-policy-file-0-stack-empty-army-simultaneous-death-stack-cap)
5. [Issue: LoS algorithm spec](#issue-los-algorithm-for-ranged-blocking)
6. [Issue: Friendly-fire policy](#issue-friendly-fire-policy-for-aoe--breath)
7. [Issue: Mechanic coverage register](#issue-mechanic-coverage-register-sso t-for-q84)

---

## 3. System Improvements

### Architecture

#### Issue: Mechanic coverage register (SSOT for Q84)

**Source:** Q84 — "no single 'out of scope' register".

**Problem:** Baseline-corridor mechanics + their in/out/deferred flags
are scattered across module READMEs, task files, and `## Not in scope`
lines. A reader (or AI agent) cannot enumerate scope without scanning
the whole repo.

**Impact:** Authors duplicate work, packs ship features the engine has
deliberately excluded, scope debates re-litigate per task.

**Solution:** Author a single SSOT table that lists every
baseline-corridor mechanic with `scope ∈ {mvp, phase-2, phase-3,
deferred, out-of-scope}`, owning task ID, and spec-status.

**Files to Update:**
- [docs/architecture/master-plan.md](../../architecture/master-plan.md) —
  add a top-of-file pointer to the new register.
- [CLAUDE.md](../../../CLAUDE.md) — list new file in the "Read first" set.

**New Files:**
- `docs/architecture/mechanics-coverage.md`

**Implementation Steps:**
1. Inventory every existing `## Not in scope`, "stub", and "deferred"
   line in `tasks/**/*.md` and `docs/architecture/*.md`.
2. Build a single Markdown table with columns:
   `Mechanic | Scope | Owning Task | Spec Status | Notes`.
3. Cross-link each row to its owning task or "deferred" rationale.
4. Add a generator script `scripts/generate-mechanics-coverage.ts` (lint
   step) that fails when a `## Not in scope` line lacks a register row.

**Dependencies:** none.

**Complexity:** M.

---

#### Issue: Stat composition order SSOT

**Source:** Q97 ⚠ — "no documented total stat composition order"; Risks
§"Stat composition order ... is not pinned globally".

**Problem:** Combat-time stats are derived from base + level-ups +
skills + specialty + artifacts + auras, but the order of those
applications is not pinned. Different appliers will produce different
final stats for the same inputs → breaks determinism across replays.

**Impact:** Replays diverge between machines/versions; auras vs.
artifacts ordering changes damage outputs; AI agents have no canonical
guide.

**Solution:** Author a canonical composition-order document and pin it
in the rules layer.

**Files to Update:**
- [docs/architecture/effect-registry.md](../../architecture/effect-registry.md) —
  reference the new file from the `modify_stat` row.
- [tasks/phase-2/01-spells-artifacts/07b-combat-skill-appliers.md](../../../tasks/phase-2/01-spells-artifacts/07b-combat-skill-appliers.md) —
  reference composition order under acceptance criteria.
- [tasks/phase-2/01-spells-artifacts/07c-adventure-skill-appliers.md](../../../tasks/phase-2/01-spells-artifacts/07c-adventure-skill-appliers.md)
- [tasks/phase-2/01-spells-artifacts/07d-magic-economy-and-special-skill-appliers.md](../../../tasks/phase-2/01-spells-artifacts/07d-magic-economy-and-special-skill-appliers.md)

**New Files:**
- `docs/architecture/stat-composition-order.md`

**Implementation Steps:**
1. Define the canonical pipeline:
   `base → permanent (level-up) → skill (additive) → specialty
   (multiplicative or replace) → artifact (additive after skills) →
   battlefield aura (additive last) → clamp`.
2. Specify: integers throughout, clamps applied only at the end, ties
   resolved by deterministic source-id ordering.
3. Add a unit-test plan: golden-fixture hero with stacked sources →
   exact final stat per pipeline step.
4. Add a new task `tasks/phase-2/01-spells-artifacts/07e-stat-composition-pipeline.md`
   that owns the `applyStatPipeline(hero, ctx) → DerivedStats` function.

**Dependencies:** Status stacking policy (next issue) — both pipelines
must agree on additive vs. replace semantics.

**Complexity:** M.

---

### Schemas

#### Issue: Status duration unit + stacking policy

**Source:** Q101 ⚠/❌ — "No `duration` unit pinned (rounds vs. turns vs.
days)" + "No status-stacking policy".

**Problem:** `effect.kind = "status"` carries an optional `duration` but
the unit is undefined; cross-pack content authored against different
assumptions desyncs. No rule says whether two casts of "+2 attack" stack
to +4, refresh duration only, or get clamped.

**Impact:** Pack content cannot be portable. Replay determinism breaks
when two packs co-exist that both assume different defaults.

**Solution:** Add `durationUnit` enum to status sub-schema; add a
default stacking policy with per-status overrides; pin both in the
effect registry.

**Files to Update:**
- [docs/architecture/effect-registry.md](../../architecture/effect-registry.md) —
  expand the `status` row with `durationUnit` + stacking section.
- `content-schema/schemas/effect.schema.json` (or wherever the `status`
  effect is defined; likely embedded in spell/ability schemas).

**New Files:**
- `docs/architecture/status-effects.md` — full lifecycle: apply, tick,
  expire, dispel order.

**Implementation Steps:**
1. Add `durationUnit: "rounds" | "turns" | "days"` to the `status`
   sub-schema; default = `"rounds"` for combat scope, `"days"` for
   adventure scope.
2. Define default stacking policy:
   `"highest_magnitude_refresh_duration"`. Add an optional
   `stacking: "stack" | "refresh" | "highest_magnitude_refresh_duration"
   | "ignore"` field to override per-status.
3. Pin dispel ordering: `dispel newest first; ties broken by source-id
   alphabetical`.
4. Add JSON-schema validation tests in `content-schema/`.
5. Add a tick test in tactical-combat tests.

**Dependencies:** none — must land before any spell-roster authoring
(below) so spells can declare correct units.

**Complexity:** M.

---

#### Issue: Siege constants in baseline ruleset

**Source:** Q94 ⚠ — "No siege constants in `baseline.ruleset.json`
example"; Improvements §"Add a `siege-constants` block".

**Problem:** Siege state machine references wall/tower/moat values from
the ruleset, but the ruleset has no `siege` block to consume.

**Impact:** Siege battles cannot be implemented; pack authors have
nothing to override.

**Solution:** Add a `siege` block to the baseline ruleset with explicit
keys; reference the block from the siege task acceptance criteria.

**Files to Update:**
- `resources/packs/baseline/baseline.ruleset.json` (or whichever path
  hosts the canonical ruleset; verify in `content-schema/`).
- `content-schema/schemas/ruleset.schema.json` — add `siege` object
  shape.
- [tasks/phase-2/01-spells-artifacts/13-siege-state-machine.md](../../../tasks/phase-2/01-spells-artifacts/13-siege-state-machine.md) —
  acceptance: "all siege values come from `ruleset.siege.*`".

**New Files:** none.

**Implementation Steps:**
1. Add ruleset block:
   ```json
   "siege": {
     "wallSegmentHp": 1500,
     "wallBreachThresholdNum": 1, "wallBreachThresholdDen": 2,
     "gateHp": 1000,
     "moatDamageNum": 70, "moatDamageDen": 1,
     "moatPassable": true,
     "towerDamage": 20,
     "towerShotsPerRound": 1,
     "drawbridgeRaisedDefaultRounds": 0
   }
   ```
   (Values are placeholders — must be playtest-tuned in a follow-up
   task; this issue lands the *shape*, not balance.)
2. Update `ruleset.schema.json` with the new optional block.
3. Reference the block from the siege task.
4. Open a follow-up balance task (M) for tuning.

**Dependencies:** none.

**Complexity:** S (shape only); the balance pass is tracked separately.

---

#### Issue: Map scripting / trigger schema

**Source:** Q105 ⚠/❌ — "no map-script / trigger schema"; Missing Logic
§"No general map-scripting / trigger schema".

**Problem:** Quests and scenario victory cover scripted goals, but
arbitrary "on day 30 spawn X army" triggers have no representation. Map
authors cannot write event chains.

**Impact:** Campaign and scenario authoring is severely limited; can't
match baseline-corridor expectations.

**Solution:** Introduce a `map-trigger.schema.json` record with closed
condition + closed effect lists.

**Files to Update:**
- [content-schema/schemas/scenario.schema.json](../../../content-schema/schemas/scenario.schema.json) —
  reference `triggers: MapTrigger[]` array.
- [docs/architecture/schema-matrix.md](../../architecture/schema-matrix.md) —
  add new schema row.
- [docs/architecture/effect-registry.md](../../architecture/effect-registry.md) —
  add `spawn_army`, `set_flag`, `award_resources` if not present.

**New Files:**
- `content-schema/schemas/map-trigger.schema.json`
- `content-schema/examples/records/map-triggers/` — at least one
  canonical example.
- `tasks/phase-2/08-meta-systems/07-map-trigger-engine.md` — new task
  owning the runtime evaluator.

**Implementation Steps:**
1. Define schema: `{ id, when: TriggerCondition, then: Effect[],
   once: boolean, repeatEveryDays?: int }`.
2. `TriggerCondition` is a discriminated union:
   `on_day`, `on_week_index`, `on_tile_visit`, `on_army_defeat`,
   `on_resource_threshold`, `on_flag_set`, `on_object_owned`.
3. Triggers fire deterministically at command-loop boundaries; the
   evaluator uses the seeded RNG substream `rng("map-triggers",
   scenarioId)`.
4. Add unit tests: replay-equivalent across machines.

**Dependencies:** Effect registry expansion may be needed if `spawn_*`
kinds don't exist yet.

**Complexity:** L.

---

### UI / Screens

No UI-only changes required by this audit; the `43-siege-combat`,
`52-artifact-combine-dialog`, and `58-week-month-popup` screens already
exist. UI updates land alongside the rules they consume.

---

### Data Contracts

#### Issue: Terrain-cost unit normalization

**Source:** Q86 ⚠ + Risks §"terrain-cost table appears in two units".

**Problem:** Two terrain-cost tables disagree:
- `tasks/.../03-hero-movement.md` uses integer ×100.
- `docs/architecture/diagrams/23-hero-movement.md` uses decimals.

Decimals violate the "no floats in deterministic paths" rule.

**Impact:** Copy-paste drift; whoever pulls from the diagram instead of
the task ships a non-deterministic pathfinder.

**Solution:** Rewrite the diagram table to integer ×100. Add a lint
check.

**Files to Update:**
- [docs/architecture/diagrams/23-hero-movement.md:42-51](../../architecture/diagrams/23-hero-movement.md#L42-L51) —
  rewrite the cost table to:
  `road:75, grass:100, sand:150, snow:200, swamp:200, water:9999, mountain:9999`
  with a note "all values are MP-cost ×100 integers".
- [tasks/mvp/05-adventure-map/03-hero-movement.md:50-72](../../../tasks/mvp/05-adventure-map/03-hero-movement.md#L50-L72) —
  add a one-line cross-link to the diagram.

**Implementation Steps:**
1. Edit the diagram file table.
2. Add a CI lint that fails if any pathfinder-related markdown contains
   `\d+\.\d+` near terrain keywords (`grass`, `swamp`, `road`, etc.).
3. Add the diagram to the `npm run validate:tasks` cross-ref check.

**Dependencies:** none.

**Complexity:** S.

---

#### Issue: Mana and spell-power formulas

**Source:** Q96 ⚠ — "No documented `mana(hero) = …` formula"; "No
documented `spell_damage(hero.power, base) = …` formula".

**Problem:** `knowledge` and `power` are stored on heroes but never
threaded through canonical formulas. Spells have an `effects[].amount`
formula AST but no rule says "scale by `hero.power`".

**Impact:** Spells cannot be balanced; mana cap is undefined; AI agents
authoring content must invent values that won't survive the next pack.

**Solution:** Pin two formulas in the rules layer + add ruleset
constants for the multipliers.

**Files to Update:**
- [docs/architecture/spells-and-mage-guild.md](../../architecture/spells-and-mage-guild.md) —
  add §"Mana pool" and §"Spell damage scaling".
- `resources/packs/baseline/baseline.ruleset.json` — add:
  ```json
  "magic": {
    "manaPerKnowledge": 10,
    "mysticismRegenBase": 1,
    "mysticismRegenPerLevel": 1,
    "spellPowerDamageMultiplier": 1
  }
  ```
- `content-schema/schemas/ruleset.schema.json` — schema for the new
  `magic` block.

**New Files:** none.

**Implementation Steps:**
1. Pin: `maxMana(hero) = hero.knowledge × ruleset.magic.manaPerKnowledge
   + Σ (mysticism bonuses from skill appliers)`.
2. Pin: `spellDamage = baseAmountAt(masteryTier) +
   hero.power × ruleset.magic.spellPowerDamageMultiplier`.
3. Reference both formulas from the formula-AST evaluator task.
4. Add a unit test: `hero{power:10, knowledge:8}` casting a fixed spell
   yields a fixed damage value.

**Dependencies:** Stat composition order SSOT (above) — `hero.power`
must already be the post-pipeline value.

**Complexity:** S.

---

#### Issue: Per-class stat-growth weight table

**Source:** Q98 ⚠ — "Only Warrior (martial) and Mage (caster) examples
are spelled out; full per-class weight table ... is referenced but not
enumerated".

**Problem:** Hero leveling depends on class weights; only two of the
classes have published values. Authors can't add new classes without
guessing.

**Impact:** Phase-2 hero classes (Knight, Cleric, Ranger, Druid,
Necromancer) cannot be implemented deterministically.

**Solution:** Promote the `research/deep-research-report.md` numbers
into a structured ruleset block; add per-class weights.

**Files to Update:**
- [tasks/phase-2/01-spells-artifacts/00-hero-leveling.md](../../../tasks/phase-2/01-spells-artifacts/00-hero-leveling.md) —
  table for all classes; replace the "see research report" reference.
- `resources/packs/baseline/baseline.ruleset.json` — add:
  ```json
  "heroLevelup": {
    "classWeights": {
      "knight":      { "pre10": [35,45,10,10], "post10": [25,30,20,25] },
      "cleric":      { "pre10": [10,10,30,50], "post10": [10,10,40,40] },
      "ranger":      { "pre10": [30,40,15,15], "post10": [25,25,25,25] },
      "druid":       { "pre10": [15,15,40,30], "post10": [10,10,40,40] },
      "necromancer": { "pre10": [15,15,35,35], "post10": [10,10,40,40] }
    }
  }
  ```
  (Values seeded from the research report; mark as **placeholder until
  balance pass**.)
- `content-schema/schemas/ruleset.schema.json` — add the block.

**Implementation Steps:**
1. Pull weights from `research/deep-research-report.md` into the table.
2. Validate that each weight tuple sums to 100.
3. Reference from the leveling task acceptance criteria.

**Dependencies:** none.

**Complexity:** S.

---

#### Issue: Per-tier town income enumeration

**Source:** Q103 ⚠ — "Concrete per-tier income numbers are not
enumerated".

**Problem:** Village/Town/City Hall/Capitol income values live nowhere
canonical; every faction's town tree has to either re-state them or
inherit them silently.

**Impact:** Faction packs ship inconsistent gold curves.

**Solution:** Add a `townTier` block to the baseline ruleset; reference
from each faction's town-tree task.

**Files to Update:**
- `resources/packs/baseline/baseline.ruleset.json` — add:
  ```json
  "townTier": {
    "village":  { "goldPerDay": 500 },
    "town":     { "goldPerDay": 1000 },
    "cityHall": { "goldPerDay": 2000 },
    "capitol":  { "goldPerDay": 4000 }
  }
  ```
- `content-schema/schemas/ruleset.schema.json` — add the block.
- [tasks/mvp/04-faction-emberwild/02-emberwild-town-building-tree.md](../../../tasks/mvp/04-faction-emberwild/02-emberwild-town-building-tree.md) —
  income refs.

**Implementation Steps:**
1. Add the block.
2. Update each town-tier `building.effects` to use
   `{ kind: "resource_bonus", resource: "gold", amount:
   ruleset.townTier.<tier>.goldPerDay, cadence: "daily" }` *or*
   document that the building runtime resolver reads from the ruleset
   at apply-time.

**Dependencies:** none.

**Complexity:** S.

---

#### Issue: Themed-week random-event content

**Source:** Q99 ⚠ + Q105 ⚠ — "WEEK_START hook exists; content does
not".

**Problem:** `WEEK_START` triggers but no `themedWeeks` table specifies
"Week of the Locust → ×2 growth for X". The hook is unused.

**Impact:** Strategic-layer flavor + pacing absent; campaign authors
can't reference themed weeks.

**Solution:** Add a `themed-week.schema.json` content kind; ship a
baseline pack of themed weeks; use a seeded RNG substream
`rng("themed-week", scenarioId, weekIndex)` to pick one.

**Files to Update:**
- [docs/architecture/schema-matrix.md](../../architecture/schema-matrix.md) —
  new schema row.
- [tasks/mvp/05-adventure-map/02-turn-structure.md](../../../tasks/mvp/05-adventure-map/02-turn-structure.md) —
  WEEK_START flow rolls a themed-week id.
- [tasks/mvp/05-adventure-map/15-acknowledge-week-month-event-command.md](../../../tasks/mvp/05-adventure-map/15-acknowledge-week-month-event-command.md) —
  payload includes themed-week id.

**New Files:**
- `content-schema/schemas/themed-week.schema.json`
- `content-schema/examples/records/themed-weeks/` — at least 6
  examples (Plague, Locust, Famine, Plenty, Promotion, Standard).
- `tasks/phase-2/08-meta-systems/08-themed-week-roller.md`

**Implementation Steps:**
1. Schema: `{ id, weights, effects: Effect[], description-i18n-key }`.
2. Roller: at WEEK_START, draw weighted from active-pack themed-weeks.
3. Effects use existing closed effect kinds (`growth_modifier` —
   already needed; add to registry).
4. UI hookup: `58-week-month-popup` displays the selected themed week's
   localized description.

**Dependencies:** Map scripting / trigger schema (above) — themed weeks
are a constrained subset of the trigger model. Land that first OR keep
themed-weeks as an independent simpler kind. Recommend: **independent**
(simpler, ships sooner).

**Complexity:** M.

---

#### Issue: Baseline spell roster

**Source:** Q100 ❌ — "No listed spell content yet".

**Problem:** `spell.schema.json` is ready but no spell records ship.
Combat tests have nothing to cast.

**Impact:** Mage-guild, spell-mastery, and most combat-spell tasks have
nothing to validate against.

**Solution:** Author ≥10 combat + 5 adventure baseline spells in
`content-schema/examples/records/spells/` covering all 8 schools. Use
the formula AST + closed effect kinds only.

**Files to Update:** none.

**New Files:**
- `content-schema/examples/records/spells/combat/*.json` — 10+ records.
- `content-schema/examples/records/spells/adventure/*.json` — 5+
  records.
- `tasks/phase-2/01-spells-artifacts/02-combat-spells.md` — change
  status from "planned" to "in-progress" once the issue is picked up.
- `tasks/phase-2/01-spells-artifacts/03-adventure-map-spells.md` — same.

**Implementation Steps:**
1. Pick a baseline corridor: Magic Arrow, Fireball, Bless, Curse,
   Slow, Haste, Cure, Resurrection (declared stub-only here),
   Counterstrike, Shield, Stone Skin, Dispel — 10 combat.
2. Adventure: Town Portal, Summon Boat, Visions, Disguise, View
   Earth — 5 adventure.
3. Each spell declares school, level, mana cost, masteryTiers,
   targeting, all using the now-pinned `durationUnit` and stacking
   policy from the status issue above.
4. Validate via `npm run validate`.

**Dependencies:**
- Status duration unit + stacking policy (must land first).
- Mana / spell-power formulas (must land first).

**Complexity:** L (volume).

---

### Tasks (new + modified)

#### Issue: Tactical-combat pathfinder

**Source:** Q87 ⚠ — "No tactical-combat pathfinder task — gap (relevant
to flying / `BATTLE_MOVE`)".

**Problem:** A* pathfinder exists for the adventure map; tactical
combat reuses "the same hex utilities" but has no dedicated pathfinder
task or test suite. Flying / obstacle-aware moves have no canonical
implementation.

**Impact:** `BATTLE_MOVE` reducer can't be implemented deterministically
without it.

**Solution:** Add a tactical-pathfinder task whose acceptance criteria
include: obstacle hexes, flying bypass, walls (LoS), wall-segment
navigation, deterministic ties.

**Files to Update:** none.

**New Files:**
- `tasks/mvp/09-tactical-combat/04a-tactical-pathfinder.md`

**Implementation Steps:**
1. Spec: `findBattlePath(battle, src, dst, abilities, mp): Hex[] | null`.
2. Reuse `axial-hex-coordinate-utilities` + A*.
3. `flying` skips obstacle hexes; non-flying treats them as `Infinity`.
4. Wall segments treated as obstacle for non-flying, blocked outright
   for ranged (LoS issue, below).
5. Tests in `tasks/mvp/03-map-system/07-unit-test-suite-for-pathfinder-edge-cases.md` —
   add a tactical-grid case.

**Dependencies:** LoS algorithm (below) — needed for the ranged-block
logic that this task references.

**Complexity:** M.

---

#### Issue: Pathfinding deterministic tie-break test

**Source:** Q88 ⚠ — "single line ... no documented order, no test".

**Problem:** "Consistent tie-breaking by hex coord" is the only spec.
No documented order; no test.

**Impact:** Replays may diverge between TS engines on different host
architectures.

**Solution:** Pin the tie-break order; add a hand-verified test.

**Files to Update:**
- [tasks/mvp/05-adventure-map/03-hero-movement.md:112](../../../tasks/mvp/05-adventure-map/03-hero-movement.md#L112) —
  expand to: "Ties broken by axial coord ascending: `q` first, then
  `r`. Implementation must round-trip stable through JSON."
- [tasks/mvp/03-map-system/07-unit-test-suite-for-pathfinder-edge-cases.md](../../../tasks/mvp/03-map-system/07-unit-test-suite-for-pathfinder-edge-cases.md) —
  add acceptance criterion: "deliberate-tie scenario with two equal-cost
  paths must select the path whose first divergent hex has lower
  `(q, r)`".

**Implementation Steps:**
1. Edit the hero-movement task line.
2. Add the test plan line.
3. Encode the test as a fixture in the test plan section.

**Dependencies:** none.

**Complexity:** S.

---

#### Issue: LoS algorithm for ranged blocking

**Source:** Q93 ❌ — "No LoS algorithm spec".

**Problem:** "Wall hexes block ranged shots" is stated; the algorithm
that decides whether a particular shooter→target line crosses a wall is
not defined. Generic battlefield obstacles have no LoS rule.

**Impact:** Ranged combat is non-deterministic / arbitrary; pack authors
can't predict whether obstacle X blocks shot Y.

**Solution:** Pick a hex-line algorithm; document it; reference from the
ranged-attack task.

**Files to Update:**
- [tasks/mvp/09-tactical-combat/04-ranged-attack-obstacle-check-range-limit.md](../../../tasks/mvp/09-tactical-combat/04-ranged-attack-obstacle-check-range-limit.md) —
  add §"Line of sight" pointing at the new doc.

**New Files:**
- `docs/architecture/line-of-sight.md`

**Implementation Steps:**
1. Choose **hex-line via cube interpolation** (deterministic integer
   math; no floats; standard reference).
2. Spec: line is `lerp(srcCube, dstCube, t)` for `t = 0..N` where
   `N = hexDistance(src, dst)`. Each interpolated hex tested for
   blocker membership; first blocker hit terminates the shot.
3. Tie rule: when interpolation lands exactly on a hex edge, prefer the
   hex with lower `q`, then `r`.
4. Integrate with `flying`: flying targets bypass obstacle hexes for
   their own movement but DO occlude shots passing through their hex
   (or define "non-occluding" — pin one).
5. Add tests in the ranged-attack task.

**Dependencies:** none.

**Complexity:** M.

---

#### Issue: Friendly-fire policy for AOE / breath

**Source:** Q93 ❌ — "No friendly-fire policy".

**Problem:** AOE spells (e.g. Fireball) and `breath_attack` could hit
own units. No rule.

**Impact:** Spell author has no idea whether a spell can hurt allies.
Breath attack is already a stub; landing it without a policy will pin
the wrong default.

**Solution:** Default = friendly fire ON for AOE-shaped spells, OFF for
single-target. Each spell can override via `targeting.allowFriendly:
boolean`. Breath attack defaults `allowFriendly: true`. Pin it.

**Files to Update:**
- `content-schema/schemas/targeting.schema.json` — add
  `allowFriendly: boolean` (default false; required for AOE shapes).
- [docs/architecture/effect-registry.md](../../architecture/effect-registry.md) —
  add §"Friendly-fire defaults" referencing targeting schema.
- [tasks/mvp/09-tactical-combat/07-unit-abilities-flying-double-strike-breath-no-retaliation.md](../../../tasks/mvp/09-tactical-combat/07-unit-abilities-flying-double-strike-breath-no-retaliation.md) —
  breath_attack: clarify "may damage allies in the line".

**Implementation Steps:**
1. Add field to targeting schema.
2. Add the doc section.
3. Update the breath_attack stub spec with the default.
4. Add tests: a 3-hex line breath where ally is the second hex damages
   the ally.

**Dependencies:** none.

**Complexity:** S.

---

#### Issue: Edge-case policy file (0-stack, empty army, simultaneous death, stack cap)

**Source:** Q110 ⚠/❌ — multiple unspecified edge cases; Improvements
§"Promote 'edge cases' ... into a single short policy file".

**Problem:**
- Empty hero army: can the hero move? exist? auto-defeat?
- Simultaneous death: does a defender killed by attacker still
  retaliate?
- Stack-count cap: "up to 7 stacks" is comment-only — not
  schema-enforced.
- Simultaneous game-end: scenario condition resolution order undefined.
- Combat HP overflow handling.

**Impact:** Pack authors and reducers will each invent their own
behavior; replays will desync.

**Solution:** Single short policy doc + schema enforcement of the
7-stack cap + a fuzz harness that triggers each edge case.

**Files to Update:**
- [tasks/mvp/05-adventure-map/01-strategic-game-state-model.md](../../../tasks/mvp/05-adventure-map/01-strategic-game-state-model.md) —
  change "up to 7 stacks" comment to a schema `maxItems: 7` constraint
  + a runtime invariant check.
- [tasks/mvp/09-tactical-combat/05-retaliation-once-per-round-nullification.md](../../../tasks/mvp/09-tactical-combat/05-retaliation-once-per-round-nullification.md) —
  add line: "A defender killed by the attacker's strike does NOT
  retaliate."
- [content-schema/schemas/hero.schema.json](../../../content-schema/schemas/hero.schema.json) —
  enforce `army.maxItems = 7`.

**New Files:**
- `docs/architecture/edge-case-policy.md` — single source: empty army,
  simultaneous death, stack cap, simultaneous game-end, HP overflow.
- `tasks/mvp/09-tactical-combat/12-edge-case-fuzz-harness.md` — new
  task owning the deterministic fuzz suite.

**Implementation Steps:**
1. Pin defaults:
   - **Empty hero army**: hero is auto-defeated at the start of the
     next combat resolution if they have zero stacks; on the
     adventure map they CAN move (recruit hero in town to refill).
   - **Simultaneous death**: if defender HP drops to 0 from the
     incoming strike before retaliation resolution, no retaliation.
   - **Stack cap**: schema-enforced 7. New stacks beyond the cap are
     rejected by the recruit/transfer reducer (raising
     `STACK_CAP_EXCEEDED`).
   - **Simultaneous game-end**: scenario conditions evaluated in a
     fixed order: `defeat → victory` (defeat takes precedence on a tie
     for the affected player).
   - **HP overflow**: damage clamped to remaining HP; no negative HP
     stored.
2. Add the schema constraint.
3. Author the fuzz harness task.
4. Reference the policy from each affected reducer task.

**Dependencies:** none.

**Complexity:** M.

---

#### Issue: Two-hero-per-town protocol

**Source:** Q109 ⚠ — "no visiting/garrisoned hero swap protocol; no
'town hosts up to two heroes' rule".

**Problem:** Town shape doesn't distinguish visiting vs. garrisoned hero
slots. Swap protocol unwritten.

**Impact:** Hot-seat / multiplayer UX flow undefined; UI screen
`22-garrison-structure` has no contract for dual-hero state.

**Solution:** Pin the rule explicitly. If the project chooses NOT to
support two heroes per town in MVP, declare it out-of-scope in the
mechanic register (above). Recommendation: support it — it's standard
baseline-corridor and the schema cost is one optional field.

**Files to Update:**
- [tasks/mvp/05-adventure-map/01-strategic-game-state-model.md:53-62](../../../tasks/mvp/05-adventure-map/01-strategic-game-state-model.md#L53-L62) —
  town shape gains `garrisonHeroId?: string | null` and
  `visitingHeroId?: string | null`.
- [tasks/mvp/05-adventure-map/18-transfer-stack-commands.md](../../../tasks/mvp/05-adventure-map/18-transfer-stack-commands.md) —
  add `SWAP_TOWN_HEROES` command.
- [content-schema/schemas/scenario.schema.json](../../../content-schema/schemas/scenario.schema.json) —
  if it embeds town shape, mirror the new fields.
- [docs/architecture/wiki/screens/22-garrison-structure/spec.md] —
  update bindings.

**Implementation Steps:**
1. Edit the strategic state shape.
2. Add the `SWAP_TOWN_HEROES` command kind + reducer spec (validate
   both heroes present, token cost = 0, deterministic).
3. UI binding update.
4. Test plan: swap, swap-back, swap during siege (allowed/denied?
   pin to "denied during active siege").

**Dependencies:** Edge-case policy (above) — siege-locked behavior is
referenced.

**Complexity:** M.

---

#### Issue: In-combat split / merge

**Source:** Q95 ⚠ — "In-combat split / in-combat merge ... not
designed".

**Problem:** `BattleState.stacks` is initialized once. There's no
command for splitting mid-combat (some baseline-corridor tactical
features assume it) or for merging resurrected/raised units into
existing stacks.

**Impact:** Necromancy + resurrection + summon spells have no canonical
target slot.

**Solution:** Pin a policy. Recommendation:
- **In-combat split**: explicitly OUT OF SCOPE (matches most baseline
  corridors).
- **In-combat merge**: define rules for `summon`/`raise`/`resurrect`
  effects: prefer existing same-unit stack, else create new stack
  (subject to a battlefield stack cap = 14).

**Files to Update:**
- [tasks/mvp/09-tactical-combat/01-battlestate-init-army-placement-plus-speed-order.md](../../../tasks/mvp/09-tactical-combat/01-battlestate-init-army-placement-plus-speed-order.md) —
  declare in-combat split out-of-scope.
- [tasks/phase-2/03-second-faction/04-necromancy-mechanic-raise-skeletons-after-combat.md](../../../tasks/phase-2/03-second-faction/04-necromancy-mechanic-raise-skeletons-after-combat.md) —
  cross-link the new merge rule.
- `docs/architecture/mechanics-coverage.md` — record the out-of-scope
  flag.

**New Files:**
- `docs/architecture/in-combat-stack-rules.md` — short policy.

**Implementation Steps:**
1. Author the policy doc.
2. Add `battlefield.maxStacks: 14` to the ruleset (extension of the
   `combat` block).
3. Update reducers' spec to reject excess stack creation per cap.

**Dependencies:** Edge-case policy (above) for stack-cap precedent.

**Complexity:** S.

---

#### Issue: Mind-spell immunity list (undead)

**Source:** Q107 ⚠ — "Mind-spell immunity list not enumerated".

**Problem:** Undead are immune to "a documented set of mind spells"; the
set isn't enumerated.

**Impact:** Once spells ship (issue: Baseline spell roster), packs need
to know which spells the undead immunity covers.

**Solution:** Define a `tag: "mind"` on spell records; declare undead
immune to all `mind`-tagged spells.

**Files to Update:**
- `content-schema/schemas/spell.schema.json` — add optional
  `tags: string[]`.
- [tasks/phase-2/03-second-faction/05-undead-immunity-morale-and-mind-spell-rules.md](../../../tasks/phase-2/03-second-faction/05-undead-immunity-morale-and-mind-spell-rules.md) —
  pin the rule: "undead are immune to any spell with `tags`
  containing `'mind'`."
- All baseline mind-school spells in the new roster — tag them.

**Implementation Steps:**
1. Add tags field.
2. Update task spec.
3. Tag spells: Curse (mind?), Blind, Forgetfulness, Hypnotize, Berserk —
   pick the canonical set when authoring.

**Dependencies:** Baseline spell roster (above).

**Complexity:** S.

---

#### Issue: Melee `double_strike` ability variant

**Source:** Q92 ⚠ — "No melee `double_strike` ability variant for
non-ranged double-hitters".

**Problem:** Only `double_shot` (ranged) exists. Melee double-hitters
have no ID.

**Impact:** Faction packs can't author a melee double-hitter without
inventing their own ability ID.

**Solution:** Add `double_strike` to the abilities catalog with a
clearly-pinned semantic.

**Files to Update:**
- [tasks/mvp/09-tactical-combat/07-unit-abilities-flying-double-strike-breath-no-retaliation.md](../../../tasks/mvp/09-tactical-combat/07-unit-abilities-flying-double-strike-breath-no-retaliation.md) —
  add `double_strike` row: "Melee unit attacks twice per turn; each
  strike resolves separately; retaliation triggers on the first strike
  only."

**Implementation Steps:**
1. Edit the ability catalog.
2. Add a unit test in the same task.

**Dependencies:** none.

**Complexity:** S.

---

#### Issue: Diplomacy explicit out-of-scope marker

**Source:** Q104 ❌ — "Player-vs-player diplomacy/treaty is not in
scope".

**Problem:** The audit confirms there is no PvP diplomacy. The risk is
that future readers re-litigate this question.

**Impact:** Wasted research cycles.

**Solution:** Add the explicit "out of scope until Phase 3" entry in the
mechanic register (above) plus a one-line note in the relevant adjacent
docs.

**Files to Update:**
- `docs/architecture/mechanics-coverage.md` (new file) — diplomacy row.
- [docs/architecture/effect-registry.md:42-48](../../architecture/effect-registry.md#L42-L48) —
  one-line note: "neutral-stack negotiation only; PvP diplomacy is out
  of scope through Phase 2."

**Implementation Steps:**
1. Add register row.
2. Add the one-liner.

**Dependencies:** Mechanic coverage register (above).

**Complexity:** S.

---

## 4. Suggested Task Breakdown

Convert the issues above into concrete tasks. Each `[ ]` becomes a
Markdown task file under `tasks/`, run through `npm run
generate:task-registry`.

- [ ] **MECH-01** Author `docs/architecture/mechanics-coverage.md` SSOT register.
- [ ] **MECH-02** Author `docs/architecture/stat-composition-order.md` + new task `07e-stat-composition-pipeline.md`.
- [ ] **MECH-03** Pin `effect.status.durationUnit` + stacking policy; new
      `docs/architecture/status-effects.md`.
- [ ] **MECH-04** Add `siege` block to `baseline.ruleset.json` + schema.
- [ ] **MECH-05** New `map-trigger.schema.json` + `tasks/phase-2/08-meta-systems/07-map-trigger-engine.md`.
- [ ] **MECH-06** Normalize terrain-cost units in
      `docs/architecture/diagrams/23-hero-movement.md`.
- [ ] **MECH-07** Pin `mana(hero)` and `spellDamage(hero, base)` formulas
      in `spells-and-mage-guild.md` + `magic` ruleset block.
- [ ] **MECH-08** Per-class hero-levelup weights → ruleset + leveling task.
- [ ] **MECH-09** Per-tier town income → ruleset.
- [ ] **MECH-10** New `themed-week.schema.json` + 6 example records +
      `tasks/phase-2/08-meta-systems/08-themed-week-roller.md`.
- [ ] **MECH-11** Author baseline spell roster (≥10 combat + 5 adventure).
- [ ] **MECH-12** New `tasks/mvp/09-tactical-combat/04a-tactical-pathfinder.md`.
- [ ] **MECH-13** Pin pathfinding tie-break order + add fixture test.
- [ ] **MECH-14** New `docs/architecture/line-of-sight.md` + ranged-attack
      task hookup.
- [ ] **MECH-15** Add `targeting.allowFriendly` + breath_attack default;
      new "Friendly-fire defaults" doc section.
- [ ] **MECH-16** New `docs/architecture/edge-case-policy.md` + new
      `tasks/mvp/09-tactical-combat/12-edge-case-fuzz-harness.md` +
      schema-enforce `hero.army.maxItems = 7`.
- [ ] **MECH-17** Two-hero-per-town: state-model edits + new
      `SWAP_TOWN_HEROES` command + UI spec update.
- [ ] **MECH-18** New `docs/architecture/in-combat-stack-rules.md` +
      `battlefield.maxStacks` ruleset constant.
- [ ] **MECH-19** `tags` field on `spell.schema.json` + undead mind-spell
      immunity rule pinned.
- [ ] **MECH-20** Add `double_strike` melee ability variant.
- [ ] **MECH-21** Diplomacy explicit out-of-scope row in register +
      effect-registry note.

---

## 5. Execution Order

Dependencies-first; group by what unblocks the next tier.

1. **MECH-01** — register (read by every later task).
2. **MECH-03** — status duration + stacking (blocks roster).
3. **MECH-02** — stat composition order (blocks magic formulas).
4. **MECH-07** — mana + spell-power formulas (blocks roster).
5. **MECH-06** — terrain-cost normalization (cheap, safety win).
6. **MECH-13** — pathfinding tie-break (cheap, replay-safety win).
7. **MECH-14** — LoS algorithm (blocks tactical pathfinder).
8. **MECH-12** — tactical-combat pathfinder.
9. **MECH-15** — friendly-fire policy.
10. **MECH-16** — edge-case policy + 7-stack cap + fuzz harness.
11. **MECH-04** — siege constants block.
12. **MECH-09** — per-tier town income.
13. **MECH-08** — per-class levelup weights.
14. **MECH-17** — two-hero-per-town.
15. **MECH-18** — in-combat stack rules.
16. **MECH-20** — `double_strike` variant.
17. **MECH-19** — spell `tags` + undead immunity.
18. **MECH-11** — baseline spell roster (depends on 03, 07, 19).
19. **MECH-05** — map-trigger engine.
20. **MECH-10** — themed-week roller (independent of 05; can parallel).
21. **MECH-21** — diplomacy out-of-scope marker (cleanup).

Parallelization opportunities: 06, 13, 21, 20 are independent and can
land alongside any other tier.

---

## 6. Risks if Not Implemented

- **Replay desync.** Without stat composition order, status duration
  units, and tie-break specs, replays will produce different outcomes
  on different machines or pack mixes. Saves and multiplayer cannot be
  trusted.
- **Pack incompatibility.** Two packs authored against different
  default assumptions (status stacking, friendly-fire) will produce
  contradictory runtime behavior when combined.
- **Edge-case crashes / inconsistencies.** Empty army, simultaneous
  death, stack overflow, and simultaneous game-end will surface as
  module-by-module ad-hoc behavior; the absence of a single policy
  guarantees inconsistencies.
- **Authoring debt.** Spell roster cannot ship until duration units
  and mana/power formulas are pinned; mage-guild + spell-mastery tasks
  are blocked.
- **Scope creep / re-litigation.** Without the mechanic register,
  diplomacy, mod-system depth, and similar Phase-3 questions will
  resurface inside MVP work.
- **Siege impossible.** Phase-2 siege task cannot be implemented
  without the ruleset constants block.
- **Themed-week dead hook.** `WEEK_START` fires today and reaches no
  content — silent waste of an event channel.

---

## 7. AI Implementation Readiness

**Score: 8 / 10** (after this plan lands).

Why it improves: every previously-❌ rule is converted into either a
schema field, a ruleset constant, or a closed enum — i.e. data the
engine can read without inventing. AI agents authoring spells, factions,
or scenarios stay inside declarative content. The two remaining points
(missing 9–10):
- The 14 newly-introduced numeric constants (siege HP, themed-week
  weights, levelup weights, town-tier income) are placeholders pending
  a balance-pass task. Until that task lands, content will pass schema
  but won't be playtest-verified.
- Map-trigger engine (MECH-05) is the only mechanic where an AI agent
  still has discretion over runtime evaluation — not over data shape,
  but over deterministic boundary conditions for fired triggers; that
  needs a follow-up "trigger-determinism golden suite" once initial
  triggers ship.

After balance-pass + trigger-determinism suite, score reaches **≈9.5
/ 10** — matching the audit's projected ceiling.
