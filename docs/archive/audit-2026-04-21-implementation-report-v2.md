# Audit 2026-04-21 — Implementation Report v2

Date: 2026-04-21
Audit source: [audit-2026-04-21-full-repo.md](./audit-2026-04-21-full-repo.md)
Prior pass:   [audit-2026-04-21-implementation-report.md](./audit-2026-04-21-implementation-report.md)

This report documents the second pass, which closes every Critical
and all but one Important finding from the audit. Each section names
the audit item, lists the files changed, and gives the one-line
rationale so a future reader can reconstruct the intent without
re-reading the audit.

## Critical (all closed)

### C1 — Neutral-stack template referenced a free-form formula string
Replaced `stackSizeFormula: string` with `stackSize: {$ref: formula.schema.json}` in
`content-schema/schemas/neutral-stack-template.schema.json`. Closed
`attitudeRules` and `spawnRules` as discriminated objects. Updated
`content-schema/examples/records/neutral-stack-templates/mine-guard-t2.neutral-stack-template.json`
to the AST form (op: add/mul/const/var). Rationale: deterministic
replay requires a parseable AST, not an interpreter.

### C2 — Adventure-side records had open shapes
Closed the four adventure-side schemas with
`additionalProperties: false` and discriminated unions:
- `adventure-building.schema.json`:
  `ownershipRules.kind ∈ {none,capturable,scripted}`;
  `economy.kind ∈ {none,daily_income,weekly_income,unit_growth}`
  (income uses `propertyNames: {$ref: resource-id}`);
  `visitRules.kind ∈ {unrestricted,once_per_turn,once_per_hero,guarded}`;
  closed `blockingShape` (tile pattern `^-?[0-9]+,-?[0-9]+$`),
  `stateMachine`, and `presentation`.
- `map-object.schema.json`:
  `category ∈ {reward,hazard,shrine,event,quest,utility}`;
  `cooldown.kind ∈ {none,turns,weekly}`;
  rewards are `{$ref: effect.schema.json}`.
- `world.schema.json`: closed root + presentation;
  `biomeIds`/`generatorPresetIds` `minItems: 1`.
- Examples updated in lockstep.

### C3 — `effect.condition` was free-form text
Created `content-schema/schemas/condition.schema.json` with a closed
discriminated AST (10 kinds: `always`, `adjacent_allies`,
`adjacent_enemies`, `target_hp_percent`, `target_has_status`,
`target_has_trait`, `caster_primary_stat`, `and`, `or`, `not`).
`effect.schema.json` now `$ref`s it. Example
`pack-hunt.ability.json` rewritten to `{kind:"adjacent_allies",op:"gte",value:1}`.

### C4 — AI generation paths lived under `src/generation/`
Task `tasks/phase-3/02-ai-generation/00-generation-io-schemas.md`
now specifies `src/ai/generation/` and `src/ai/providers/`. Added
forbidden pattern in the contract checker that fires on
`src/generation/(types|provider|validators|providers)`.

### C5 — Auto-resolve used a different formula than tactical combat
Task `tasks/mvp/05-adventure-map/06-auto-resolve-combat.md` rewritten
to reuse the ruleset-level constants (`atkBonusPerPoint*`,
`defReductionCap`, `autoResolveAttackerAdvantage*`) and the same
offense/survivability decomposition as tactical. Casualty formula is
now deterministic integer math.

### C6 — Morale probability table was self-inconsistent
Task `tasks/mvp/09-tactical-combat/06-morale-and-luck-rolls.md`
reconciled to the base-24 distribution: +1 → 1/24, +2 → 2/24, +3 →
3/24. Acceptance criterion: ≈12.5% over 24000 rolls for +3 morale.

### C7 — Unit stat schema had no maximums
`content-schema/schemas/unit.schema.json` now carries maxima on every
stat (hp ≤ 100000, attack/defense ≤ 100, speed ≤ 30, shots ≤ 64,
damageMin/Max ≤ 10000) and `growth.weekly` ≤ 1000.

## Important (11 of 12 closed)

### I1 — IP-unsafe references scrubbed from task docs
All occurrences of `classic fantasy strategy`, `legacy expansion`, and `original fantasy strategy` in
`tasks/` replaced with neutral "baseline corridor" language pointing
at `research/deep-research-report.md`. Remaining references live only
in:
- `docs/planning/` (historical audits — intentionally preserved)
- `CONTRIBUTING.md` (the forbidden-term list itself)
- `tasks/task-registry.json` (regenerated from the `.md` files)

A forbidden-pattern rule in the contract checker now enforces this
going forward, scoped to `tasks/`, `docs/architecture/`, `README.md`
(excluding policy docs and the regenerated registry).

### I2 — Resource IDs were stringly-typed
Created `content-schema/schemas/resource-id.schema.json` (enum of 7
canonical resources). Unit costs, map-object rewards, adventure-
building incomes, hero specialty bonuses, and scenario loss
conditions now use `propertyNames: {$ref: resource-id}` or a direct
`$ref`.

### I3 — Missing example records for core record types
Created canonical examples:
- `content-schema/examples/records/rulesets/baseline.ruleset.json`
- `content-schema/examples/records/hero-classes/cinder-knight.hero-class.json`
- `content-schema/examples/records/skills/pathfinding-basic.skill.json`
- `content-schema/examples/records/scenarios/emberwild-1v1.scenario.json`
- `content-schema/examples/packs/emberwild-faction/buildings/fort.building.json`
  (dependency anchor for the kennels→fort `requires` chain).

### I5 — No cross-reference integrity check
Added `scripts/check-cross-references.mjs`:
- Walks example packs and records, builds an `id → (type, file)` index.
- For every `factionId`/`unitId`/`heroId`/`abilityId`/`spellId`/
  `skillId`/`artifactId`/`heroClassId`/`worldId`/`rulesetId`/
  `scenarioId`/`dwellingBuildingId`/`guardNeutralStackTemplateId`/
  `target*Id` and array counterparts (`unitIds`, `heroIds`,
  `buildingIds`, `abilityIds`, `spellIds`, `skillIds`, `artifactIds`,
  `factionIds`, `startingSkillIds`, `startingHeroIds`,
  `candidateUnitIds`) plus building `requires[]`: flags unresolved
  refs, type mismatches, and duplicate IDs.
- Asset fields (`spriteAtlasId`, `portraitId`, `iconId`, ...) are
  deliberately not in the allow-list — they belong to the asset
  index, not the record index.
- Wired into `npm run validate` as `validate:cross-refs`.

### I6 — Stat IDs were stringly-typed
Created `content-schema/schemas/stat-id.schema.json` (enum of 9
combat/hero stats). `effect.modifyStat.stat`,
`hero.specialty.bonus.stat` now `$ref` it.

### I9 — `task-registry.json` was a required path but gitignored
Removed `tasks/task-registry.json` from `requiredPaths` in
`check-repo-contracts.mjs`. The registry is regenerated by
`validate` before any check runs, so CI is unaffected; fresh clones
no longer fail the contract check when run directly.

### I11 — Scenario defeat conditions under-specified
`scenario.schema.json` now enumerates defeat kinds:
`lose_all_towns`, `lose_all_heroes`, `hero_dies`,
`resource_depleted`, `day_limit_reached`. Resource fields use
`resource-id`.

### I12 (via C4) — generation path drift
Covered by the C4 fix plus the new `src/generation/` forbidden
pattern.

### Remaining (one open)
- **I4 — Recipe-level smoke test for the Emberwild pack.** Not
  implemented in this pass. The example pack validates against its
  schemas and passes cross-reference checks, but there is no
  end-to-end "load pack → instantiate one of every record → assert
  stats round-trip" test yet. Recommended next-session task.

## Nice-to-have (partial)

### N6 — Canonical pack examples location stable
Left under `content-schema/examples/packs/` per the audit
suggestion. No move.

### N3 — `research/deep-research-report.md` rename
Deferred. Cross-references are too widespread to safely rename in
this pass; all task files instead use neutral phrasing ("baseline
corridor (`research/deep-research-report.md`)").

## Infrastructure

### Contract checker improvements
`scripts/check-repo-contracts.mjs`:
- Added `.ruleset.json` → `ruleset.schema.json` mapping.
- Rule list now supports per-rule `predicate`.
- New `defaultPredicate` excludes `.git/`, `node_modules/`, and
  `isPolicyDoc()` (CONTRIBUTING.md, AGENTS.md, docs/planning/,
  tasks/task-registry.json).
- New rules:
  - IP hygiene (`\blegacy expansion\b|\bclassic fantasy strategy\b|original fantasy strategy`), scoped via
    `taskDocsPredicate`.
  - `src/generation/(types|provider|validators|providers)` ownership
    check.
- Dropped `tasks/task-registry.json` from `requiredPaths` (I9).

### Cross-reference checker
`scripts/check-cross-references.mjs` added and wired into
`npm run validate`.

### Validation pipeline
`npm run validate` now runs, in order:
1. `generate:task-registry` — regenerate the task registry snapshot
2. `validate:links` — markdown link integrity
3. `validate:contracts` — schema + forbidden-pattern + required-path
   checks
4. `validate:cross-refs` — record-id cross-reference integrity

All four gates currently pass on `master`.

## Remaining risks

1. **Shared packs are not modeled.** Many records reference
   `shared:skill:*` / `shared:spell:*` IDs. The cross-ref checker
   treats these as unresolved because no `shared` pack exists under
   `content-schema/examples/`. The audit examples have been trimmed
   to reference only existing records, but the first real task that
   adds a shared pack will need to either (a) add example records
   for it or (b) extend the checker with an "allow external refs
   declared in manifest `dependencies`" mode.
2. **Formula AST validator is permissive at record-check time.** The
   minimal validator in `check-repo-contracts.mjs` does not descend
   into `oneOf` inside `formula.schema.json`. Runtime (Ajv) will
   enforce it correctly; the contract check is best-effort only.
3. **Auto-balancer formulas in `baseline.ruleset.json` are
   untested.** The formulas exist as AST data but there is no test
   yet that evaluates them against sample units to verify the
   numbers land inside the baseline corridor. I4 (next session) is
   the right place to add this.
4. **`task-registry.json` remains stale relative to `.md` edits
   until `npm run validate` runs.** This is acceptable for the
   current CI flow but means a contributor viewing the file on
   GitHub will see slightly outdated entries between edits. The
   audit (I9) accepts this trade-off.
5. **No Ajv in the pipeline yet.** The contract checker uses a
   hand-rolled validator that implements only the JSON Schema keywords
   we need today. A future task should replace it with Ajv once the
   schemas stabilize, so `propertyNames`, `minProperties`, and full
   draft-2020-12 keywords are enforced uniformly.

## Summary of changed files (this pass)

Schemas added: `condition`, `resource-id`, `stat-id`.
Schemas rewritten or tightened: `neutral-stack-template`,
`adventure-building`, `map-object`, `world`, `effect`, `unit`,
`hero`, `scenario`.
Example records added: `baseline.ruleset.json`,
`cinder-knight.hero-class.json`, `pathfinding-basic.skill.json`,
`emberwild-1v1.scenario.json`, `fort.building.json`.
Example records updated: `mine-guard-t2.neutral-stack-template.json`,
`crystal-mine.adventure-building.json`,
`treasure-chest.map-object.json`, `pack-hunt.ability.json`,
`emberwild.generated-faction.json`.
Tasks rewritten: `00-generation-io-schemas.md`,
`06-morale-and-luck-rolls.md`, `06-auto-resolve-combat.md`.
Task docs scrubbed (IP hygiene): all task files under
`tasks/mvp/06b-visual-fidelity/`, plus selected files in
`02-content-schemas/`, `03-map-system/`, `05-adventure-map/`,
`08-persistence/`, `09-tactical-combat/`,
`phase-2/01-spells-artifacts/`, `phase-2/03-second-faction/`,
`phase-2/05-mod-system/`, `phase-3/02-ai-generation/`.
Scripts added: `scripts/check-cross-references.mjs`.
Scripts updated: `scripts/check-repo-contracts.mjs`, `package.json`.
