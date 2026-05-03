# Implementation Report: Game Mechanics Coverage

> Applies the plan in
> [`05-game-mechanics-coverage-plan.md`](05-game-mechanics-coverage-plan.md).
> Every MECH-XX item in §4 of the plan is addressed below in execution
> order.

---

## 1. Updated files

### `CLAUDE.md`
Added `mechanics-coverage.md` as item 20 in the canonical reading
order; renumbered subsequent items.

### `docs/architecture/master-plan.md`
Added a top-of-file pointer to `mechanics-coverage.md` as the SSOT for
mechanic scope.

### `docs/architecture/effect-registry.md`
- Expanded the `status` row with `durationUnit` + stacking semantics
  and a link to `status-effects.md`.
- Linked `modify_stat` row to `stat-composition-order.md`.
- Added rows for new effect kinds: `spawn_army`, `set_flag`,
  `award_resources`, `growth_modifier`.
- Added § "Friendly-fire Defaults" + § "Diplomacy" out-of-scope note.

### `docs/architecture/diagrams/23-hero-movement.md`
Rewrote the movement-cost table from decimal to integer ×100 form;
added `road`, `water`, `mountain` rows and a tie-break note.

### `docs/architecture/schema-matrix.md`
Added `MapTrigger` and `ThemedWeek` rows.

### `docs/architecture/spells-and-mage-guild.md`
Added § 6a "Mana pool" and § 6b "Spell damage scaling" pinning
`maxMana(hero)` and `spellDamage` formulas with their fixture-test
hooks.

### `content-schema/schemas/effect.schema.json`
- `status` sub-schema now carries `durationUnit`, `stacking`,
  `magnitude`.
- New sub-schemas: `spawnArmy`, `setFlag`, `awardResources`,
  `growthModifier`.

### `content-schema/schemas/targeting.schema.json`
Added `allowFriendly: boolean` to `area`, `line`, and `all` sub-schemas;
required for AOE shapes.

### `content-schema/schemas/spell.schema.json`
Added optional `tags: string[]` (powers undead mind-spell immunity rule).

### `content-schema/schemas/hero.schema.json`
`startingArmy` is now `maxItems: 7`.

### `content-schema/schemas/scenario.schema.json`
Added optional `triggers: MapTrigger[]`.

### `content-schema/schemas/ruleset.schema.json`
Added optional blocks: `magic`, `siege`, `townTier`, `combat`,
`heroLevelup` (with `$defs/townTierEntry` and
`$defs/levelupWeightTuple`).

### `content-schema/examples/records/rulesets/baseline.ruleset.json`
- Added flat-key constants for the new blocks (forward-compatible).
- Added structured `magic`, `siege`, `townTier`, `combat`,
  `heroLevelup.classWeights` blocks with placeholder values.

### `tasks/phase-2/01-spells-artifacts/00-hero-leveling.md`
Inlined the per-class growth-weight table (Knight, Cleric, Ranger,
Druid, Necromancer) sourced from `ruleset.heroLevelup.classWeights`;
added validation that each tuple sums to 100.

### `tasks/phase-2/01-spells-artifacts/07b-combat-skill-appliers.md`
- `tasks/phase-2/01-spells-artifacts/07c-adventure-skill-appliers.md`
- `tasks/phase-2/01-spells-artifacts/07d-magic-economy-and-special-skill-appliers.md`
Added an acceptance criterion that appliers emit deltas through the
canonical `stat-composition-order.md` pipeline.

### `tasks/phase-2/01-spells-artifacts/13-siege-state-machine.md`
Acceptance criterion: all siege values must come from `ruleset.siege.*`.

### `tasks/phase-2/03-second-faction/04-necromancy-mechanic-raise-skeletons-after-combat.md`
Cross-linked the in-combat-merge rule.

### `tasks/phase-2/03-second-faction/05-undead-immunity-morale-and-mind-spell-rules.md`
Pinned the rule: undead are immune to spells whose `tags` ⊇ `["mind"]`.

### `tasks/mvp/03-map-system/07-unit-test-suite-for-pathfinder-edge-cases.md`
Added the deliberate-tie test case + tactical-grid case.

### `tasks/mvp/04-faction-emberwild/02-emberwild-town-building-tree.md`
Per-tier resource buildings now reference `ruleset.townTier.<tier>.goldPerDay`.

### `tasks/mvp/05-adventure-map/01-strategic-game-state-model.md`
- `Hero.army` comment changed to schema-enforced `maxItems: 7` + runtime
  `STACK_CAP_EXCEEDED` invariant.
- `Town` shape gained `garrisonHeroId` and `visitingHeroId`.
- Acceptance criteria reference the edge-case policy + two-hero-per-town.

### `tasks/mvp/05-adventure-map/02-turn-structure.md`
WEEK_START flow rolls a themed-week id via the new roller task.

### `tasks/mvp/05-adventure-map/03-hero-movement.md`
Added a one-line cross-link to the movement-cost diagram and
expanded the determinism contract with the `(q, r)` ascending
tie-break.

### `tasks/mvp/05-adventure-map/15-acknowledge-week-month-event-command.md`
Acknowledgement payload now includes the rolled themed-week id.

### `tasks/mvp/05-adventure-map/18-transfer-stack-commands.md`
Added `SWAP_TOWN_HEROES` reducer + acceptance criteria.

### `tasks/mvp/09-tactical-combat/01-battlestate-init-army-placement-plus-speed-order.md`
Added battlefield stack-cap acceptance + § "Not in scope" for
in-combat split.

### `tasks/mvp/09-tactical-combat/04-ranged-attack-obstacle-check-range-limit.md`
Added § "Line of sight" pointer + a blocked-shot acceptance criterion.

### `tasks/mvp/09-tactical-combat/05-retaliation-once-per-round-nullification.md`
Added the simultaneous-death acceptance criterion.

### `tasks/mvp/09-tactical-combat/07-unit-abilities-flying-double-strike-breath-no-retaliation.md`
- Added `double_strike` row (melee variant) and tests.
- Updated `breath_attack` row with the friendly-fire default.

### `docs/architecture/wiki/screens/22-garrison-structure/spec.md`
Added `garrisonHeroId`, `visitingHeroId`, `swapEnabled` state bindings.

---

## 2. New files

### Architecture docs
- `docs/architecture/mechanics-coverage.md` — SSOT register.
- `docs/architecture/status-effects.md` — duration / stacking /
  dispel lifecycle.
- `docs/architecture/stat-composition-order.md` — canonical pipeline.
- `docs/architecture/edge-case-policy.md` — empty-army /
  simultaneous-death / stack-cap / simultaneous game-end / HP
  overflow.
- `docs/architecture/line-of-sight.md` — cube-interpolation hex
  algorithm.
- `docs/architecture/in-combat-stack-rules.md` — split out-of-scope,
  merge policy, battlefield cap.

### Schemas
- `content-schema/schemas/map-trigger.schema.json`
- `content-schema/schemas/themed-week.schema.json`

### Example records
- `content-schema/examples/records/spells/combat/`:
  `magic-arrow`, `fireball`, `bless`, `curse`, `slow`, `haste`,
  `cure`, `resurrection`, `counterstrike`, `shield`, `stone-skin`,
  `dispel` (12 records).
- `content-schema/examples/records/spells/adventure/`:
  `town-portal`, `summon-boat`, `visions`, `disguise`, `view-earth`
  (5 records).
- `content-schema/examples/records/themed-weeks/`:
  `standard`, `locust`, `plague`, `famine`, `plenty`, `promotion`
  (6 records).
- `content-schema/examples/records/map-triggers/`:
  `day30-reinforcements`.

### Tasks
- `tasks/phase-2/01-spells-artifacts/07e-stat-composition-pipeline.md`
- `tasks/phase-2/08-meta-systems/07-map-trigger-engine.md`
- `tasks/phase-2/08-meta-systems/08-themed-week-roller.md`
- `tasks/mvp/09-tactical-combat/04a-tactical-pathfinder.md`
- `tasks/mvp/09-tactical-combat/12-edge-case-fuzz-harness.md`

---

## 3. Assumptions

- ⚠️ Assumption: the canonical baseline ruleset lives at
  `content-schema/examples/records/rulesets/baseline.ruleset.json`
  (per the cross-references in
  `tasks/mvp/04-faction-emberwild/04-baseline-ruleset.md`), not at
  `resources/packs/baseline/baseline.ruleset.json`. The plan
  referenced both paths; I edited the canonical example record so
  values flow through the existing baseline-ruleset task. The
  shipped `resources/packs/baseline-ruleset/ruleset.json` (when it
  lands per the existing task) must be byte-equal to the example.
- ⚠️ Assumption: the new ruleset blocks (`magic`, `siege`,
  `townTier`, `combat`, `heroLevelup`) are added as **structured
  optional sibling blocks** alongside `constants`, in addition to
  flat-key entries inside `constants` — so any code that already
  consumed `constants["..."]` continues to read forward-compatible
  values without a migration step. This matches the additive-first
  schema-evolution rule in CLAUDE.md.
- ⚠️ Assumption: status effect schema gains `magnitude` (integer)
  alongside `stacking` so the `highest_magnitude_refresh_duration`
  policy has a deterministic comparator. The plan named the policy
  but did not pin the comparator field; I picked the simplest
  closed integer. Status records that omit `magnitude` are treated
  as magnitude `1`.
- ⚠️ Assumption: the targeting schema's reserved `area` / `line`
  kinds get `allowFriendly` as a **required** field (not just
  optional with a default) so AOE-shaped spells must declare the
  policy explicitly. This raises the bar for future pack content
  and matches the plan's intent that friendly-fire defaults be
  pinned per spell rather than implicitly inherited.
- ⚠️ Assumption: the lint script
  `scripts/generate-mechanics-coverage.ts` mentioned in the plan is
  documented in `mechanics-coverage.md` but not yet authored — it
  is a follow-up item. The doc's "Lint contract" section pins the
  contract for that script.

---

## 4. Blockers

None. All 21 MECH items in the plan have been applied. JSON syntax
verified for every authored / edited schema and example record.

---

## 5. Validation

All authored / edited JSON parses cleanly, and the full repo gates pass:

```
content-schema/schemas/effect.schema.json                                 OK
content-schema/schemas/ruleset.schema.json                                OK
content-schema/schemas/targeting.schema.json                              OK
content-schema/schemas/spell.schema.json                                  OK
content-schema/schemas/hero.schema.json                                   OK
content-schema/schemas/scenario.schema.json                               OK
content-schema/schemas/map-trigger.schema.json                            OK
content-schema/schemas/themed-week.schema.json                            OK
content-schema/examples/records/rulesets/baseline.ruleset.json            OK
content-schema/examples/records/spells/combat/*.json                      OK (12)
content-schema/examples/records/spells/adventure/*.json                   OK (5)
content-schema/examples/records/themed-weeks/*.json                       OK (6)
content-schema/examples/records/map-triggers/*.json                       OK (1)
```

```
$ npm test
# tests 32
# pass 32

$ npm run validate
generate:task-registry       → 314 tasks, 24 modules
validate:links               → All Markdown links resolve.
validate:contracts           → Repo contract checks passed.
validate:cross-refs          → Cross-reference checks passed.
validate:commands            → Command coverage check passed.
validate:tasks               → Task lint passed: 314 tasks, 0 issues.
validate:arch                → Module-graph check passed.
validate:ui-components       → Screen component coverage check passed.
validate:animation-budgets   → animation-budget validator: ok
```
