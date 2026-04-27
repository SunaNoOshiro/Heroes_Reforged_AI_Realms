# Full Repository Audit — 2026-04-21

Independent audit after the 2026-04-20 audit, the 2026-04-21
implementation report, and the 2026-04-21 follow-up refactor. Scope:
architecture, game systems, content contracts, AI-generation surface,
backlog, repo-for-AI ergonomics. No runtime code exists yet — every
`src/*` folder is still a README stub.

The previous passes closed the loudest contract holes (Castle →
Emberwild, formula-as-string → AST, free-form effects → closed
registry, content hash reserved on manifest). This audit is about
what remains *underneath* those wins — regressions and quiet gaps
that the earlier passes did not reach.

---

## 1. Overall Scores (0–10)

| Dimension | Score | Delta vs 2026-04-20 | One-line verdict |
|---|---|---|---|
| Architecture (design) | 8.5 | +0.5 | Clean SOLID-style boundaries. One real path contradiction (`src/generation/` vs `src/ai/generation/`). |
| Game systems (specified) | 6.5 | +0.5 | Damage AST is solid. Auto-resolve and tactical combat use divergent curves. Morale table disagrees with the baseline corridor. |
| Content system (schemas) | 7.0 | — | Core gameplay schemas are closed; three schemas still leak `additionalProperties: true` and one schema carries a string-based formula. |
| AI generation readiness | 6.5 | +2.0 | Generation I/O schemas exist and are provider-neutral. The `condition` free-form string is now the biggest load-bearing DSL left. |
| Backlog quality | 7.5 | — | Good sizing, clear acceptance. IP hygiene drifted — forbidden terms still appear in ~20 task files despite the CONTRIBUTING ban. |
| AI-friendliness of repo | 7.5 | +0.5 | Excellent navigation + cookbook. Hurt by path contradictions and missing example records for five schema types. |

**Weighted verdict: ~7.2/10.** Real progress since the 2026-04-20
audit. The next compounding risks are not in the loud architecture
files — they are in the schemas that were *not* touched
(`adventure-building`, `map-object`, `world`, `neutral-stack-template`),
in cross-doc drift (morale table, auto-resolve vs tactical formula),
and in load-bearing free-form strings that survived the cleanup
(`effect.condition`, `neutral-stack-template.stackSizeFormula`).

---

## 2. Critical Issues (must fix)

### C1. `neutral-stack-template.schema.json` stores a formula as a string
[`content-schema/schemas/neutral-stack-template.schema.json:15`](../../content-schema/schemas/neutral-stack-template.schema.json#L15)
declares `"stackSizeFormula": { "type": "string" }`. The entire
determinism charter and the `formula.schema.json` work exists to
eliminate string formulas. This field is a direct regression: an AI
or mod will put `"stackSize * 1.5"` there, the validator will pass,
and the engine must either `eval` it (security hole) or invent a
second mini-DSL (determinism hole).

**Fix.** Replace with `{ "$ref": "heroes-reforged/formula.schema.json" }`
and rename the field `stackSize` for consistency with the effect
registry's `count`/`amount` usage.

### C2. Three gameplay schemas still allow open objects
These schemas have `additionalProperties: true` on the root and on
multiple gameplay sub-objects:

- [`adventure-building.schema.json`](../../content-schema/schemas/adventure-building.schema.json)
  — root, `ownershipRules`, `economy`, `visitRules`, `blockingShape`,
  `stateMachine`, `presentation`.
- [`map-object.schema.json`](../../content-schema/schemas/map-object.schema.json)
  — root, `cooldown`, `placementRules`, `rewards[]` items,
  `presentation`.
- [`world.schema.json`](../../content-schema/schemas/world.schema.json)
  — root, `presentation`.
- [`neutral-stack-template.schema.json`](../../content-schema/schemas/neutral-stack-template.schema.json)
  — root, `attitudeRules`, `spawnRules`, `presentation`.

These are the exact contract holes that audit-2026-04-20 C4 called
out for spells/abilities/artifacts and that the follow-up closed.
They survived because the previous pass focused on effect/formula
work. An AI-generated adventure building can pass validation with
any shape it invents.

**Fix.** Lock roots and gameplay sub-objects to
`additionalProperties: false` with explicit field lists. Use
discriminated unions (`kind`-based) for `ownershipRules`,
`economy.kind`, `visitRules.kind`, `rewards[].kind` — mirror the
effect-registry pattern.

### C3. `effect.condition` is a free-form string DSL
[`effect.schema.json`](../../content-schema/schemas/effect.schema.json)
declares `condition: { "type": "string" }` on `damage`, `heal`,
`status`, and `modifyStat`. The canonical Pack Hunt example uses
`"condition": "adjacent_allies>=1"`
([`pack-hunt.ability.json:14`](../../content-schema/examples/packs/emberwild-faction/abilities/pack-hunt.ability.json#L14)).

This is the same pattern the project already closed for formulas.
Any condition string needs a parser; any parser adds a second DSL;
two DSLs desynchronize across engines. An AI will put
`"hp<0.5*maxHp"` here and validation will pass.

**Fix.** Introduce a closed `Condition` AST (or a closed enum of
condition kinds: `{kind: "adjacent_allies_gte", value: 1}`). Add a
`condition.schema.json` with the same discipline as `effect` and
`formula`. The handler registry dispatches on `condition.kind`.

### C4. `src/generation/` contradicts the declared `src/ai/` layout
- [`docs/architecture/ai-integration.md`](../architecture/ai-integration.md)
  declares `src/ai/contracts/`, `src/ai/providers/`,
  `src/ai/generation/`.
- [`docs/architecture/overview.md`](../architecture/overview.md)
  lists `src/ai/` with the same sub-folders.
- [`src/ai/contracts/README.md`](../../src/ai/contracts/README.md)
  and [`src/ai/providers/README.md`](../../src/ai/providers/README.md)
  already reserve those paths.
- But [`tasks/phase-3/02-ai-generation/00-generation-io-schemas.md`](../../tasks/phase-3/02-ai-generation/00-generation-io-schemas.md)
  outputs `src/generation/types.ts`, `src/generation/provider.ts`,
  `src/generation/validators.ts`, and puts vendor adapters in
  `src/generation/providers/`.

The first contributor to execute that task will create a parallel
namespace and the codebase will carry two AI roots forever.

**Fix.** Rewrite task 00 paths to `src/ai/generation/`,
`src/ai/contracts/`, `src/ai/providers/`. Add a forbidden-pattern
rule blocking `src/generation/` under tasks so regression is
impossible.

### C5. Auto-resolve and tactical-combat formulas use different curves
- Tactical damage (`09-tactical-combat/03-damage-formula.md`):
  ATK−DEF clamped to 60, fixed-point basis 1000,
  `atkBonusPerPoint = 1/20` (+5 %/pt), capped at +140 %.
- Auto-resolve (`05-adventure-map/06-auto-resolve-combat.md`):
  `unitPower = (hp × (1000 + 50×atk) × (1000 + 50×def)) / 1_000_000`,
  no clamp, no cap, and both attack and defense feed the same
  multiplicative side of the formula.

Implications: a stack that wins tactical combat can lose auto-resolve
(and vice versa). Task 9 of the tactical module (`09-replace-auto-resolve-with-real-battle.md`)
silently replaces the formula, so live games will see the math flip
mid-session.

**Fix.** Express both formulas with the same ruleset constants
(`atkBonusPerPoint`, `defBonusPerPoint`, `atkBonusCap`,
`defReductionCap`). Auto-resolve should call into the same AST
evaluator, just with aggregated stack-level inputs.

### C6. Morale table contradicts the baseline corridor
- [`research/deep-research-report.md`](../../research/deep-research-report.md)
  declares `moraleExtraTurnProb = 1/24` per positive morale point
  (capped at 3) — so +3 morale = 3/24 = **1/8** chance.
- [`tasks/mvp/09-tactical-combat/06-morale-and-luck-rolls.md`](../../tasks/mvp/09-tactical-combat/06-morale-and-luck-rolls.md)
  table says +3 morale = **1/4** chance.

The acceptance criteria on the task ("~25 % over 10 000 rolls") will
fail the corridor constant. Whichever source is correct, the other
is wrong, and the auto-balancer trust region is derived from the
corridor — so the task will ship shipping broken.

**Fix.** Pick one. Recommended: keep the corridor's 1/24-per-point
(milder morale = better balance surface) and rewrite the task table
to `+1 → 1/24`, `+2 → 2/24`, `+3 → 3/24`.

### C7. Unit stats have `minimum: 0` but no `maximum`
[`unit.schema.json`](../../content-schema/schemas/unit.schema.json)
declares all stats as `integer, minimum: 0` — unbounded above. Caps
only exist in
[`tasks/phase-2/05-mod-system/03-sandbox-mode-for-ai-generated-packs.md`](../../tasks/phase-2/05-mod-system/03-sandbox-mode-for-ai-generated-packs.md)
(runtime, sandboxed-only). That means:
- First-party packs can author `hp: 1_000_000`, pass schema, and
  silently break the auto-balancer (power budget overflows; integer
  fixed-point intermediates overflow `Number.MAX_SAFE_INTEGER` when
  stackSize is large).
- `research/deep-research-report.md` declares tier-7 HP ≤ 250, but
  the schema does not enforce it.

**Fix.** Add an `integer, maximum: 100_000` cap per stat (or tighter
per-tier via conditional schema). Couple it with a CI check that
tier-per-unit matches the corridor.

---

## 3. Important Improvements

### I1. IP hygiene regressed — 20+ files still reference classic fantasy strategy / legacy expansion
CONTRIBUTING.md "Definition of Done" lists classic fantasy strategy / legacy expansion / original fantasy strategy as forbidden. `scripts/check-repo-contracts.mjs` does
not enforce this — the only text-pattern rule for IP is the
`Anthropic|Claude` check, scoped to
`tasks/phase-3/02-ai-generation/` only.

Files still containing the forbidden terms
(grep `\blegacy expansion\b|classic fantasy strategy|original fantasy strategy`):

- [`tasks/mvp/03-map-system/02-tile-type-registry.md`](../../tasks/mvp/03-map-system/02-tile-type-registry.md)
  — "legacy expansion ruleset JSON", "classic fantasy strategy terrain types"
- [`tasks/mvp/02-content-schemas/03-spell-schema.md`](../../tasks/mvp/02-content-schemas/03-spell-schema.md),
  [`04-artifact-schema.md`](../../tasks/mvp/02-content-schemas/04-artifact-schema.md),
  [`06-ruleset-schema.md`](../../tasks/mvp/02-content-schemas/06-ruleset-schema.md)
  — "classic fantasy strategy spell list", "classic fantasy strategy artifact list",
  "classic fantasy strategy legacy expansion formulas"
- [`tasks/mvp/09-tactical-combat/04-ranged-attack-obstacle-check-range-limit.md`](../../tasks/mvp/09-tactical-combat/04-ranged-attack-obstacle-check-range-limit.md),
  [`06-morale-and-luck-rolls.md`](../../tasks/mvp/09-tactical-combat/06-morale-and-luck-rolls.md)
  — "legacy expansion ranged rules", "Morale probability table (legacy expansion)"
- All 15 task files under
  [`tasks/phase-2/06-visual-fidelity/`](../../tasks/phase-2/06-visual-fidelity/)
  (at the time of this audit the path was
  `tasks/mvp/06b-visual-fidelity/`; moved to phase-2 on 2026-04-22
  per audit I5) — module subtitle still "classic fantasy strategy-style presentation
  polish"; several tasks reference "classic fantasy strategy feel" / "classic fantasy strategy layout" /
  "classic fantasy strategy style".
- [`tasks/phase-3/02-ai-generation/01-prompt-provider-structured-output-raw-json.md`](../../tasks/phase-3/02-ai-generation/01-prompt-provider-structured-output-raw-json.md),
  [`02-schema-validation-plus-coherence-check.md`](../../tasks/phase-3/02-ai-generation/02-schema-validation-plus-coherence-check.md)
  — "legacy expansion reference data", "No unit ID collision with existing legacy expansion units"
- [`tasks/phase-2/03-second-faction/02-necropolis-building-tree-json.md`](../../tasks/phase-2/03-second-faction/02-necropolis-building-tree-json.md),
  [`tasks/phase-2/01-spells-artifacts/06-combination-artifacts-detect-set-apply-bonus.md`](../../tasks/phase-2/01-spells-artifacts/06-combination-artifacts-detect-set-apply-bonus.md)
- [`tasks/mvp/08-persistence/04-scenario-loader.md`](../../tasks/mvp/08-persistence/04-scenario-loader.md),
  [`tasks/README.md`](../../tasks/README.md)
  — "classic fantasy strategy scenario maps", "classic fantasy strategy-style presentation polish"

**Fix.** (a) Add a forbidden-pattern rule in
`scripts/check-repo-contracts.mjs` scoped to `tasks/` +
`docs/architecture/` + `README.md` + `CONTRIBUTING.md` that flags
`/\blegacy expansion\b|\bclassic fantasy strategy\b|original fantasy strategy/i` outside the audit/history
files in `docs/planning/`. (b) Rename `06b-visual-fidelity` module
to "Overland Strategy Look & Feel" (already done in the module
header — propagate through task bodies). (c) Replace prose
references with phrases like "classic turn-based reference" or
"baseline corridor in research/deep-research-report.md".

Without (a), this will drift again.

### I2. Resource names have no closed enum
Multiple schemas carry free-form resource strings:

- `unit.cost` ([`unit.schema.json:51`](../../content-schema/schemas/unit.schema.json#L51))
  — `additionalProperties: integer`.
- `building.cost`, `scenario.players[].startingResources`,
  `effect.resourceBonus.resource`, `hero.specialty.targetResource` —
  all open strings.

`research/deep-research-report.md` enumerates 7 canonical resources
(gold, wood, ore, crystal, sulfur, gem, mercury). A closed enum
prevents typos (`sulphur` vs `sulfur`) that would silently fail to
match in the runtime economy loop.

**Fix.** Author a single `content-schema/schemas/resource-id.schema.json`
(enum) and `$ref` it from every cost/resource field. Allow pack
authors to extend the enum only via a new `library-pack` that
declares the new resource.

### I3. Missing example records for five declared schemas
The schema matrix has rows for `Ruleset`, `HeroClass`, `Skill`,
`Scenario`, and `Targeting`, but the "Example" column says *"use
schema as current contract"*. An AI agent generating a scenario or
a hero class has no canonical starting point.

**Fix.** Add one canonical example per schema under
`content-schema/examples/records/`:
- `rulesets/baseline.ruleset.json` (promote from the Task 4 target).
- `hero-classes/cinder-knight.hero-class.json` (already referenced
  as an id).
- `skills/pathfinding-basic.skill.json` (already referenced from
  Kaelis).
- `scenarios/emberwild-1v1.scenario.json`.
- Targeting is embedded-only — skip or leave as "embedded".

The CI validator will validate these automatically.

### I4. `spell.school` enum and `effect.damage.damageType` enum do not align
- `spell.school`: `fire, water, earth, air, light, dark, arcane, nature`.
- `effect.damage.damageType`: `physical, fire, cold, lightning, earth, air, holy, shadow, pure`.

A spell has `school: "water"` but no `cold` school-equivalent on the
damage side; `light` ≠ `holy`; `dark` ≠ `shadow`. Authoring a water
spell that does cold damage means the schema is fine but the AI cannot
map school → damage type without a hidden lookup table.

**Fix.** Either collapse to one axis, or publish the school → damage
type mapping in [`effect-registry.md`](../architecture/effect-registry.md).

### I5. No cross-record (coherence) validation in CI
Schemas validate shape only. A spell that references a non-existent
`unitId` in `summon`, a hero that points at a missing `factionId`, a
faction that lists missing `unitIds` — all pass CI today. The
coherence check is called out as phase-3 work but the first pack load
will hit the runtime wall.

**Fix.** Add a `scripts/check-cross-references.mjs` gate that walks
the example packs, builds an id index, and fails on unresolved
references. Cheap (< 50 LOC), immediately useful, no engine code
needed.

### I6. `hero.specialty.bonus.stat` is a free-form string
[`hero.schema.json:67`](../../content-schema/schemas/hero.schema.json#L67)
declares `bonus.stat: { type: "string", minLength: 1 }`. The
`effect.modifyStat.stat` field is a closed enum. Heroes and effects
should use the same stat vocabulary.

**Fix.** `$ref` a shared `stat-id.schema.json` enum from both schemas.

### I7. `$schema` references in example records are relative paths
Every example uses
`"$schema": "../../../../../schemas/unit.schema.json"`. The validator
strips and ignores it (`check-repo-contracts.mjs:358`), but these
paths are fragile: moving the examples folder silently breaks IDE
schema hints. The 2026-04-20 audit I9 flagged this; it was not
addressed.

**Fix.** Replace with `$id`-based URIs
(`"heroes-reforged/unit.schema.json"`) or drop the `$schema` field
entirely from examples and rely on filename-suffix mapping.

### I8. CONTRIBUTING forbids things the validator does not enforce
The Definition-of-Done list in
[`CONTRIBUTING.md:138`](../../CONTRIBUTING.md#L138) bans IP-unsafe
names and `eval` / `new Function`. None of these are actually CI-
enforced for `src/` (which doesn't exist yet) or `tasks/` (where
they still appear — see I1).

**Fix.** For every Definition-of-Done bullet, either add a CI rule
or remove the bullet. "Forbidden but unenforced" is worse than
"unmentioned."

### I9. `tasks/task-registry.json` is a CI required path but gitignored
[`check-repo-contracts.mjs:280`](../../scripts/check-repo-contracts.mjs#L280)
lists `tasks/task-registry.json` as a required path. It is
gitignored (`refactor-2026-04-21-report.md` §2.1). CI is fine
because `validate` regenerates first. But any contributor who runs
`node scripts/check-repo-contracts.mjs` directly on a fresh clone
sees `tasks/task-registry.json: required path is missing` — a
confusing failure mode.

**Fix.** Either drop it from `requiredPaths` (the generator is the
actual gate) or have `check-repo-contracts.mjs` regenerate lazily
if missing.

### I10. `effect-registry.md` and `effect.schema.json` drifted
[`docs/architecture/effect-registry.md`](../architecture/effect-registry.md)
lists 12 effect kinds. The schema also has 12. But `modifyStat` in
docs is spelled `modify_stat` in the schema `const` — consistent.
However, the docs table lists the required fields for `damage` as
just `amount`, while the schema also requires `kind`. Minor, but
the schema should be pointed at as SSOT in the doc preamble (it's
not).

**Fix.** Add a single sentence at the top of `effect-registry.md`:
"The schema is the source of truth. If this doc disagrees, the
schema wins."

### I11. `scenario.schema.json` has five closed victory kinds but no defeat list
The `condition` subschema `oneOf` block only contains the five
victory shapes. `objectives.defeat` reuses the same `condition`
definition, so "defeat if you lose your last town" cannot be
expressed. The obvious defeat conditions (`lose_all_towns`,
`hero_dies`, `resource_depleted`) are missing.

**Fix.** Extend the `condition` oneOf with defeat-typical kinds, or
split `victoryCondition` and `defeatCondition` with separate closed
unions.

### I12. `targeting.schema.json` has 7 kinds; MVP probably needs 3–4
`self`, `single_unit`, `hex`, `unit_or_hex`, `area`, `line`, `all`.
Ember-Lance uses `unit_or_hex` + `line`. MVP combat only needs
`single_unit`, `hex`, and `all`. Over-broad surface area; AI will
generate `area` spells without a matching runtime handler.

**Fix.** Mark 4 kinds as "reserved, not supported until Phase-2" in
the schema description. Cheaper than removing and re-adding later.

---

## 4. Nice-to-Have Optimizations

- **N1.** Audit/refactor file count is climbing: `audit-2026-04-20.md`,
  `audit-2026-04-21-implementation-report.md`,
  `refactor-2026-04-21-report.md`, and now this file. Introduce a
  rolling `docs/planning/audits/` folder and keep only the latest at
  the planning root.
- **N2.** `.github/workflows/validate.yml` runs `npm run validate` +
  `npm test`. Add a `schema-coherence` gate (the cross-reference
  script from I5) behind the same workflow.
- **N3.** `research/deep-research-report.md` is authoritative for the
  baseline corridor — the file name "deep-research-report" is
  misleading. Rename to `baseline-corridor.md` or move into
  `docs/architecture/baseline-corridor.md` and have the validator
  forbid authoring unit stats outside the corridor.
- **N4.** `06b-visual-fidelity` is still tagged M1/M2 but has 46
  hours and 15 tasks — heavier than any MVP module. Either move it
  entirely to phase-2 (as the module itself admits it may be), or
  pull 2–3 must-have polish items into `06-renderer`. Carrying a
  "b" module suffix is still confusing for new contributors.
- **N5.** Task marker legend is in `tasks/README.md`; embed it in
  `tasks/task-registry.json` as a `legend` field so machine consumers
  (AI agents) do not have to parse Markdown.
- **N6.** Canonical pack examples are under
  `content-schema/examples/packs/`. At some point
  `resources/packs/` becomes authoritative. Decide which is the
  "hello-world" example before the first runtime loads anything —
  otherwise duplication is inevitable.
- **N7.** Every schema declares
  `"$schema": "https://json-schema.org/draft/2020-12/schema"` but the
  validator in `check-repo-contracts.mjs` implements only a minimal
  subset. Either vendor Ajv (or similar) or document the supported
  subset in the script header so contributors know what not to rely
  on.
- **N8.** `effect.condition` will eventually need a condition-AST. An
  explicit TODO placeholder schema (`condition.schema.json` with
  `enum: []`, `description: "reserved, placeholder"`) signals intent
  and prevents a third mini-DSL.

---

## 5. Specific Fixes (actionable diff list)

### Schema edits

1. `neutral-stack-template.schema.json`: replace `stackSizeFormula:
   string` with `stackSize: {$ref: "heroes-reforged/formula.schema.json"}`.
   Lock `additionalProperties: false` on root, `attitudeRules`,
   `spawnRules`, `presentation`.
2. `adventure-building.schema.json`: close root + five sub-objects
   (see C2). Introduce `ownershipRules.kind`, `economy.kind`,
   `visitRules.kind` closed enums.
3. `map-object.schema.json`: close root + `cooldown`, `placementRules`,
   `presentation`. Make `rewards[]` items `{$ref: "heroes-reforged/effect.schema.json"}`
   so the same closed registry is reused.
4. `world.schema.json`: close root + `presentation`.
5. `unit.schema.json`: add `maximum: 100_000` to all stat fields.
6. `effect.schema.json`: either add `condition: {$ref: "heroes-reforged/condition.schema.json"}`
   (preferred) or tighten `condition: { pattern: "^[a-z_]+(>=|<=|==|!=|>|<)[0-9]+$" }`
   (stop-gap until the condition AST lands).
7. `hero.schema.json`: replace `bonus.stat: string` with `{$ref:
   "heroes-reforged/stat-id.schema.json"}`.
8. `spell.schema.json` & `effect.schema.json`: document the
   school → damageType mapping in `effect-registry.md` (pure-doc
   fix; no schema churn).

### New schema files

9. `content-schema/schemas/stat-id.schema.json` — enum of combat
   stats shared by `effect.modifyStat.stat` and
   `hero.specialty.bonus.stat`.
10. `content-schema/schemas/resource-id.schema.json` — enum of the
    seven canonical resources.
11. `content-schema/schemas/condition.schema.json` — closed
    discriminated union for combat/ability/effect conditions.

### New example records

12. `content-schema/examples/records/hero-classes/cinder-knight.hero-class.json`.
13. `content-schema/examples/records/skills/pathfinding-basic.skill.json`.
14. `content-schema/examples/records/rulesets/baseline.ruleset.json`
    (canonical AST-only ruleset — de-duplicates research corridor
    into a real record).
15. `content-schema/examples/records/scenarios/emberwild-1v1.scenario.json`.

### Task edits

16. `tasks/phase-3/02-ai-generation/00-generation-io-schemas.md` —
    rewrite output paths to `src/ai/generation/types.ts`,
    `src/ai/generation/provider.ts`, `src/ai/generation/validators.ts`,
    `src/ai/providers/`.
17. `tasks/mvp/09-tactical-combat/06-morale-and-luck-rolls.md` —
    replace the probability table with the corridor's
    `moraleExtraTurnProb = 1/24 per point` formulation; restate the
    acceptance criteria (~12.5 % at +3 morale, not 25 %).
18. `tasks/mvp/05-adventure-map/06-auto-resolve-combat.md` — rewrite
    the power formula to reuse the baseline ruleset constants
    (`atkBonusPerPoint`, `defBonusPerPoint`, `atkBonusCap`,
    `defReductionCap`) through the formula AST. No bespoke 50× ratio.
19. Sweep `tasks/` for `\blegacy expansion\b|\bclassic fantasy strategy\b` and replace with
    "classic turn-based reference" or a concrete pointer to the
    corridor file. Same for `tasks/README.md:83`.
20. Add task `tasks/mvp/02-content-schemas/14-condition-registry.md`
    (~3h) to design the closed condition AST before any
    effect/ability implementation starts.
21. Add task `tasks/mvp/02-content-schemas/15-close-gameplay-schema-roots.md`
    (~2h) to lock `additionalProperties: false` on the four
    adventure-side schemas (C2).

### Script / CI edits

22. `scripts/check-repo-contracts.mjs` — add a forbidden-pattern
    rule: `/\blegacy expansion\b|\bclassic fantasy strategy\b|original fantasy strategy/gi` scoped to `tasks/`,
    `docs/architecture/`, `README.md`, `CONTRIBUTING.md`. Excludes
    `docs/planning/` so historical audits stay honest.
23. `scripts/check-repo-contracts.mjs` — add a forbidden-pattern rule
    `/src\/generation\//g` in `tasks/` and `docs/` to prevent the
    `src/ai/generation/` path from splitting again (C4).
24. Add `scripts/check-cross-references.mjs` — walks example packs,
    builds an id map, asserts every `unitId`/`factionId`/`heroId`/
    `spellId` reference resolves. Wire into `npm run validate`.
25. Fix `requiredPaths` include of `tasks/task-registry.json` — remove
    or regenerate lazily (I9).

### Formula / balance

26. `research/deep-research-report.md` — rename and relocate to
    `docs/architecture/baseline-corridor.md` (N3). Update all
    `../../research/deep-research-report.md` links.
27. Add a worked integer test vector for morale: at `morale = 3` and
    `moraleExtraTurnProb = 1/24`, running 24 000 rolls should produce
    ≈ 3 000 extra turns (±2σ). Put the expected count in the task.
28. Add an explicit test vector for the clamped-cap damage case
    (ATK−DEF = 30 → clamped to 28 → ×2.40). The task references the
    cap but the acceptance criteria only test at differentials 0/10.

---

## 6. AI-Friendliness Score

**7.5 / 10** (up from 7.0 in the 2026-04-20 audit).

### What improved
- Closed effect registry + formula AST eliminate the two biggest
  "AI invents its own mini-DSL" hazards.
- `CONTRIBUTING.md` cookbook gives a real starting point for
  schema/effect/task/formula additions.
- Provider-neutral generation boundary exists in schema form.
- `tasks/task-registry.json` gives a machine view (but see I9).

### What will still frustrate an AI
- `effect.condition` is a free-form string right in the middle of the
  one schema the AI is most likely to author — an AI will guess a
  grammar and the validator will accept it (C3).
- Four gameplay schemas still have open roots (C2).
- Conflicting module paths (`src/generation/` vs `src/ai/generation/`)
  will fork the codebase the first time a task is executed (C4).
- Two resource vocabularies (`spell.school` vs `damage.damageType`)
  with no published mapping.
- Scenario and hero-class schemas exist but no canonical example —
  the "copy this" pattern breaks.
- Morale/auto-resolve/tactical-combat number disagreements will get
  baked into tests that then fail against each other.

### One-line AI verdict
An AI agent can now pick a task, generate spell/effect JSON that
validates cleanly, and stay inside the formula AST. It will still
trip on `condition` strings, open adventure-side schemas, and the
path split — but those are concrete, local fixes, not structural
rewrites.

---

## 7. Top Risks

1. **Silent desync via stack formulas (C1).** `stackSizeFormula:
   string` is today's direct path to `eval` or a second DSL. Same
   class of risk as audit-2026-04-20 C3.
2. **Condition-DSL injection (C3).** Same shape as above, one level
   deeper — `condition` strings ride inside every effect. An unsafe
   parser eats them; a safe parser requires a third DSL.
3. **Contract drift on adventure-side schemas (C2).** The schemas
   the previous audit did not touch are still open. New content will
   land shapes the engine does not recognize, validation will say
   "pass", and the runtime will fail loudly — but only after a real
   map loads.
4. **IP regression (I1).** CONTRIBUTING claims a rule the validator
   does not enforce. Twenty+ files already violate it. Every future
   PR adds friction.
5. **Combat-math inconsistency (C5, C6).** Two formulas for combat
   power, two conflicting morale tables. Ships directly into the
   auto-balancer trust region.
6. **Namespace fork (C4).** First task execution creates
   `src/generation/`; docs and architecture say `src/ai/generation/`.
   Both will exist for years unless caught up front.
7. **"3-minute playable faction" SLA (M6 exit).** Already flagged by
   the prior audit; still unmodified in the roadmap. The auto-
   balancer's 1 000 battles × 2 LLM calls × image gen budget makes
   this demo-embarrassing at minimum.

---

## 8. Suggested Order Of Operations

Paper-only edits (zero runtime code required):

1. **C1 + C2.** Close all adventure-side schemas; replace
   `stackSizeFormula: string` with an AST $ref. One schema PR.
2. **C6.** Reconcile the morale table with the corridor. One-line
   task edit + one research note.
3. **I1 + script rule #22.** Strip remaining classic fantasy strategy/legacy expansion text; lock it
   with a forbidden-pattern rule.
4. **C4.** Rewrite task 00 output paths to `src/ai/generation/`.
   One task edit + one forbidden-pattern rule (script #23).
5. **I5.** Add the cross-reference script. Cheapest high-leverage
   gate in the repo.
6. **C3 + N8.** Publish a reserved `condition.schema.json`
   placeholder and link it from `effect.schema.json` — even if it
   is `enum: []` today, agents stop inventing their own grammar.
7. **C5.** Re-author the auto-resolve formula on top of the
   baseline ruleset constants. One task edit.

After those are green, pick up the example records (I3), resource
enum (I2), and the stat-id shared enum (I6).

---

## Bottom Line

The repo is no longer a B+ plan with A+ packaging — the 2026-04-21
implementation pass closed the three contracts audit-2026-04-20
called out as "where projects like this go to die" (effects,
formulas, generation I/O). What remains is a tier below: schemas
that were not in scope last time (adventure-building, map-object,
world, neutral-stack-template) now carry the same open-object
failure mode that the gameplay schemas used to; one schema still
stores a formula as a string; one free-form DSL (`condition`)
survived; auto-resolve and tactical combat use different curves;
two doc-level number tables disagree.

All of these are schema-and-Markdown-level fixes. None require
writing engine code. If the next pass closes them before the first
`src/engine/` line lands, the engine will be able to trust the
content layer on day one — which is the only way a project of this
shape survives its first real content drop.
