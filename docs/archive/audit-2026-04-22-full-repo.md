# Full Repository Audit — 2026-04-22

Independent audit after the 2026-04-21 full-repo audit, its v2
implementation pass, and the 2026-04-22 repo-hardening pass. Scope:
architecture, game systems, content contracts, AI-generation surface,
backlog quality, repo-for-AI ergonomics, scripts/CI.

No runtime code exists yet — every `src/*` folder is still a README
stub. `npm run validate` and `npm test` pass green; 173 tasks across
21 modules are indexed in the generated registry.

The earlier passes closed every Critical finding from the 2026-04-21
audit. This pass looks one layer deeper: cross-doc constant drift
that the earlier audits did not reconcile (ruleset caps, defense
math, morale penalties), pockets of regression against "closed by
default" (one schema cost field, one faction/manifest drift), and
structural debt that now blocks first-line runtime work (validator
subset, $schema paths, shared-pack model).

---

## 1. Overall Scores (0–10)

| Dimension | Score | Delta vs 2026-04-21 | One-line verdict |
|---|---|---|---|
| Architecture (design) | 9.0 | +0.5 | Path contradictions gone; SOLID boundaries crisp; one src/ layout. |
| Game systems (specified) | 5.5 | −1.0 | New finding: four sources disagree on combat constants and caps. |
| Content system (schemas) | 8.0 | +1.0 | All four adventure-side schemas closed; condition AST replaces string DSL; one `cost` field regressed on resource enum. |
| AI generation readiness | 7.5 | +1.0 | Generation I/O schemas + provider-neutral boundary holding; coherence check exists; still no `shared:*` pack to resolve refs. |
| Backlog quality | 8.0 | +0.5 | 2–6h rule CI-enforced; splits landed for oversized tasks. One baseline-ruleset task is out of sync with its own output example. |
| AI-friendliness of repo | 8.0 | +0.5 | Excellent navigation, cookbook, forbidden-pattern rules. $schema relative paths + absent `shared:*` packs still trip AI agents. |

**Weighted verdict: ~7.6/10.** The repo is now in the best shape of
any audit pass. The biggest remaining load-bearing failure is the
combat-math constants: four separate sources declare incompatible
values for `defBonusPerPoint`, `atkBonusCap`, `defReductionCap`, and
`moralePenaltyMissProb`. Whichever is wrong, a task will ship with
an acceptance test that baseline pipelines refuse.

---

## 2. Critical Issues (must fix)

### C1. Four sources disagree on combat-math constants
A single, authoritative set of balance constants is the whole point
of the ruleset + formula AST work. Right now the repo carries four
competing values:

| Constant | [research/deep-research-report.md:152-154](../../research/deep-research-report.md#L152-L154) | [tasks/mvp/04-faction-emberwild/04-baseline-ruleset.md:27-34](../../tasks/mvp/04-faction-emberwild/04-baseline-ruleset.md#L27-L34) | [tasks/mvp/09-tactical-combat/03-damage-formula.md:44-50](../../tasks/mvp/09-tactical-combat/03-damage-formula.md#L44-L50) | [content-schema/examples/records/rulesets/baseline.ruleset.json:11-12](../../content-schema/examples/records/rulesets/baseline.ruleset.json#L11-L12) |
|---|---|---|---|---|
| `atkBonusPerPoint` | 1/20 | 1/20 | (implied 1/20 via 1.5× at +10 pts) | 1/20 |
| `defBonusPerPoint` / `defReductionPerPoint` | 1/40 | 1/40 | (implied **1/25** via 0.714× at +10 pts) | **1/20** |
| `atkBonusCap` | **140/100** (% cap, at 28 pts) | **140/100** | **60** (points) in clamp | **60** (points) |
| `defReductionCap` | **30/100** (ratio floor) | **30/100** | **60** (points) in clamp | **60** (points) |
| `moralePenaltyMissProb` | 1/12 per point | — | — | absent |

Implications:

1. Whichever task runs first will hard-code acceptance tests that
   contradict a sibling task. The tactical-combat acceptance
   ("DEF−ATK=10 → ×0.714") only matches `defBonusPerPoint = 1/25`.
   Neither the corridor (1/40) nor the canonical example (1/20)
   reproduce it.
2. The canonical example `baseline.ruleset.json` uses point-based
   caps of 60, while the task that is supposed to **produce** that
   file ([04-baseline-ruleset.md](../../tasks/mvp/04-faction-emberwild/04-baseline-ruleset.md))
   describes caps as `140/100` and `30/100` — i.e. a completely
   different cap semantics (percent-of-base vs stat-differential
   points). These are not two forms of the same number; they cannot
   both validate.
3. The morale C6 fix in the v2 implementation pass chose 1/24 for
   the negative side too, but the corridor still lists
   `moralePenaltyMissProb = 1/12`. The task will ship at 1/24; the
   corridor will say 1/12; the auto-balancer trusts the corridor.

**Fix.** Pick one canonical semantic (point-based caps, 60/60)
because it's what already shipped as the example record and what the
auto-resolve task wires through the AST. Then:

- Rewrite [`research/deep-research-report.md` §5](../../research/deep-research-report.md#L143) to re-express all
  caps as point values and to match `defBonusPerPoint`. Move the
  "+140 % at ATK−DEF=28" phrasing into a *derived* worked example,
  not a constant.
- Rewrite [`04-baseline-ruleset.md:27-34`](../../tasks/mvp/04-faction-emberwild/04-baseline-ruleset.md#L27-L34) to emit the 60/60 + 1/20
  shape that the existing example already uses. The task's
  acceptance vectors must be recomputed against the chosen constants
  or the task will fail CI on first implementation.
- Rewrite [`03-damage-formula.md:48-50`](../../tasks/mvp/09-tactical-combat/03-damage-formula.md#L48-L50) acceptance to match the
  chosen `defBonusPerPoint`. With 1/20 at DEF−ATK=10, the multiplier
  is `1000 / (1000 + 500) = 2/3` (×0.667), not 0.714.
- Add `moralePenaltyMissProb = 1/24` to `baseline.ruleset.json` **and**
  the corridor to close C6 end-to-end (the v2 pass only touched the
  task file).

Gate this with a ruleset-sanity test under
`scripts/__tests__/` that evaluates the formula ASTs against the
canonical example record and asserts the published acceptance
vectors.

### C2. `building.cost` regressed against the resource-id enum
[`building.schema.json:25-28`](../../content-schema/schemas/building.schema.json#L25-L28)
declares `cost` as
`{"additionalProperties": {"type": "integer", "minimum": 0}}`
— open string keys. `unit.schema.json:51-56` already uses
`"propertyNames": {"$ref": "heroes-reforged/resource-id.schema.json"}`
after the I2 fix. An AI-generated building can pass validation with
`cost.sulphur` or `cost.mana`; the economy loop will silently drop
the entry.

Also regressed against the fix: [`scenario.schema.json`](../../content-schema/schemas/scenario.schema.json)
uses `propertyNames` correctly on `startingResources`, but
[`adventure-building.schema.json`](../../content-schema/schemas/adventure-building.schema.json)
should be audited for the same pattern on its `economy.incomePerTurn`
sub-object.

**Fix.** Add `"propertyNames": {"$ref": "heroes-reforged/resource-id.schema.json"}`
to `building.cost` (and verify every income/cost/reward map across
schemas the same way). One-line change per site.

### C3. Canonical pack has a drifting faction/manifest/buildings set
The Emberwild pack carries two buildings —
[`kennels.building.json`](../../content-schema/examples/packs/emberwild-faction/buildings/kennels.building.json)
and [`fort.building.json`](../../content-schema/examples/packs/emberwild-faction/buildings/fort.building.json)
— but:

- [`faction.json:13-15`](../../content-schema/examples/packs/emberwild-faction/faction.json#L13-L15)
  lists only `emberwild:building:kennels` in `buildingIds`. Fort is
  missing.
- [`manifest.json:32-34`](../../content-schema/examples/packs/emberwild-faction/manifest.json#L32-L34)
  lists only `emberwild:building:kennels` under
  `provides.buildings`. Fort is missing here too.

Kennels `requires: ["emberwild:building:fort"]`, so the graph needs
Fort — that's exactly why the v2 pass added the example — but the
two adjacent index files weren't updated. This is the first real
incoherence between record and its owning pack. It passes cross-ref
today because `buildingIds`/`provides.buildings` aren't themselves
validated against filesystem presence.

**Fix.**
- Add `emberwild:building:fort` to `faction.json` `buildingIds` and
  to `manifest.json` `provides.buildings`.
- Extend [`scripts/check-cross-references.mjs`](../../scripts/check-cross-references.mjs)
  with a "provides-completeness" check: every record found under a
  pack must appear in `manifest.provides.<kind>`, and vice versa.
  This is the inverse of the current ref-resolution check and closes
  an otherwise-silent class of drift.

### C4. Baseline corridor is still not authoritative
The 2026-04-21 audit N3 recommended moving `deep-research-report.md`
to `docs/architecture/baseline-corridor.md`; the v2 pass deferred it.
The file is now actively stale in §5 (C1 above). While it lives in
`research/` it reads as reference material — but task files name it
as the canonical trust region for the auto-balancer
([`tasks/phase-3/02-ai-generation/02-schema-validation-plus-coherence-check.md`](../../tasks/phase-3/02-ai-generation/02-schema-validation-plus-coherence-check.md))
and the repo-contract checker lists it under `requiredPaths`
([`scripts/check-repo-contracts.mjs:308-318`](../../scripts/check-repo-contracts.mjs#L308-L318)).

A required, trust-region document that is *not* the canonical source
is the exact precondition for the C1 divergence: each editor fixed
one file and did not propagate.

**Fix.** Either (a) relocate + rename to
`docs/architecture/baseline-corridor.md` and update the four
references (`check-repo-contracts.mjs:315`,
`tasks/mvp/04-faction-emberwild/04-baseline-ruleset.md:18`,
`tasks/mvp/09-tactical-combat/06-morale-and-luck-rolls.md:12`,
`tasks/phase-3/02-ai-generation/02-schema-validation-plus-coherence-check.md`),
or (b) make `baseline.ruleset.json` itself the single source and
reduce the corridor doc to stat-band tables only. Option (b) is
less churn.

---

## 3. Important Improvements

### I1. Hand-rolled validator masks real schema errors
[`scripts/check-repo-contracts.mjs:65-218`](../../scripts/check-repo-contracts.mjs#L65-L218)
implements a minimal JSON-Schema subset. It does not honor
`propertyNames`, `minProperties`, `maxItems`, `uniqueItems`,
`dependentRequired`, `if/then/else`, or conditional `oneOf` inside
`$defs` when the parent is not explicitly `type: object`. The author
[`audit-2026-04-21-implementation-report-v2.md:213-216`](./audit-2026-04-21-implementation-report-v2.md#L213-L216)
flags this explicitly. Consequence: the very closed-enum fixes the
last audit landed (C2 `propertyNames`, I2 resource-id `$ref`) are
*not* being enforced at CI. A regression on `cost.sulphur` would pass.

**Fix.** Vendor Ajv 2020 (pure-ESM, draft-2020-12). Replace the
local validator with an Ajv harness that compiles every schema once
and validates every example. ~50 LOC + one dev-dep. Until it lands,
the schema fixes are policy, not contract.

### I2. `spell.school` vs `effect.damage.damageType` still unmapped
Same finding as 2026-04-21 I4. `spell.school` is
`fire|water|earth|air|light|dark|arcane|nature`; damage.damageType is
`physical|fire|cold|lightning|earth|air|holy|shadow|pure`. An AI
generating a water spell with cold damage has no canonical school →
damage-type mapping. This wasn't closed in v2.

**Fix.** Publish the mapping in
[`docs/architecture/effect-registry.md`](../architecture/effect-registry.md)
as a table. Optionally add a `school.schema.json` enum and $ref it,
but docs alone remove the ambiguity for both authors and AI.

### I3. `$schema` still uses fragile relative paths
Every example record carries e.g.
`"$schema": "../../../../../schemas/unit.schema.json"`. The
repo-contract validator strips the field
([`check-repo-contracts.mjs:395-398`](../../scripts/check-repo-contracts.mjs#L395-L398))
so CI doesn't care, but any IDE/tooling that resolves the pointer
breaks the moment `examples/` moves. This was I7 in the 2026-04-20
audit and I7 in the 2026-04-21 audit. Still unfixed.

**Fix.** Replace all 17 occurrences with the `$id` form
(`"$schema": "heroes-reforged/unit.schema.json"`) or drop the field
entirely — the filename-suffix mapping is already the real contract.
One `sed` + test run.

### I4. Shared packs are referenced but not authored
Kaelis references `shared:skill:pathfinding_basic`
([`kaelis.hero.json:18`](../../content-schema/examples/packs/emberwild-faction/heroes/kaelis.hero.json#L18));
the skill exists as a standalone record
(`content-schema/examples/records/skills/pathfinding-basic.skill.json` — later promoted to `content-schema/examples/packs/shared-skills/skills/pathfinding-basic.skill.json`)
but there is no `shared_skills` pack with a manifest. The
2026-04-21-v2 remaining-risks note acknowledges this but defers the
fix.

This breaks the pack-contract promise: every gameplay id is supposed
to be resolvable through a pack manifest. Today the example faction's
`manifest.dependencies` lists `shared_abilities`, `shared_spells`,
`emberwild_assets`, but none of those packs exist in the repo.

**Fix.** Author at least two tiny packs under
`content-schema/examples/packs/`:
- `shared-skills/` with `manifest.json` (type: `library-pack`) and
  `skills/pathfinding-basic.skill.json`.
- `shared-abilities/` with `manifest.json` and
  `abilities/<one>.ability.json`.

Move (or symlink) the standalone records under
`examples/records/skills/` into the shared pack. Fix Emberwild
`manifest.dependencies` to point at the real pack IDs. This turns
`shared:*` from a naming convention into a verified contract.

### I5. `06b-visual-fidelity` is still cumbersome (15 tasks, ~46h)
2026-04-21 N4 called this out. 06b is tagged M1/M2 but is larger
than any MVP module and is explicitly a solo-build defer
([`docs/planning/solo-build-lane.md:75-79`](../planning/solo-build-lane.md#L75-L79)).
Carrying the "b" suffix in the module index still confuses reading
order.

**Fix.** Either move `06b` to `phase-2/06-visual-fidelity/` and
renumber, or trim 06b to 3–4 tasks that must land with 06-renderer
and move the rest. The index's "deferred until playable" note helps,
but structurally the module still reads as part of MVP.

### I6. Services still stubs; required paths enforce them anyway
[`check-repo-contracts.mjs:316-317`](../../scripts/check-repo-contracts.mjs#L316-L317)
lists `services/ai-gateway/README.md` and
`services/signaling/README.md` as required paths. Both are
placeholder READMEs with no task coverage in phase-3. Either they
matter for M6/M7 (put a task on them in phase-3/01-multiplayer or
phase-3/02-ai-generation), or they don't (remove the `requiredPaths`
entries).

**Fix.** Drop the two service-README required paths until the
matching tasks exist. Placeholders that are CI-mandatory create the
impression the feature is tracked when it isn't.

### I7. `faction.schema.json` lacks `minLength` on id/name
[`faction.schema.json:20-25`](../../content-schema/schemas/faction.schema.json#L20-L25)
declares `id` and `name` as `{"type": "string"}` — no `minLength`.
Every other core schema uses `minLength: 1`. An empty-string id
would pass. Trivial but this is the schema the entire pack graph
hangs off of.

**Fix.** One-line add: `"minLength": 1` on `faction.id` and
`faction.name`.

### I8. Generation-request/generated-faction skip the resource enum
[`generated-faction.schema.json`](../../content-schema/schemas/generated-faction.schema.json)
embeds full `unit.schema.json`, `hero.schema.json`, and
`building.schema.json` records, which inherit `propertyNames` on
`cost`. So the enum flows through — **but** C2 above is still a hole
because `building.cost` doesn't use `propertyNames` yet. Fix C2 and
this propagates.

### I9. `scenario.defeat` is still optional + unbounded length
[`scenario.schema.json:47-62`](../../content-schema/schemas/scenario.schema.json#L47-L62)
requires `victory` (minItems 1) but `defeat` is optional with no
`minItems`. In practice a playable scenario must have at least one
defeat condition (usually `lose_all_towns`). An AI generator will
emit scenarios with only `victory` and the engine will have to
invent a default.

**Fix.** Make `objectives.defeat` required with `minItems: 1`, or add
an explicit `defaultDefeatConditions` array at root and require it
instead. Either way, don't leave the engine to guess.

### I10. Morale/luck constants in corridor are in four places
Beyond C1, `luckMultiplier`, `luckMax`, `moraleMax` live in
`baseline.ruleset.json` but the corridor still describes them in
prose. If the ruleset is SSOT (preferred), the corridor should point
at it: "All combat math constants authored in
`content-schema/examples/records/rulesets/baseline.ruleset.json`;
this file lists only the stat corridors." One edit closes the
duplication class.

### I11. Task registry is gitignored but CI-generated on every run
The v2 pass removed `tasks/task-registry.json` from `requiredPaths`
and this audit confirms the CI flow is clean. But the README in
`tasks/` still promises "a machine-readable task view" for AI
agents. An AI reading the repo on GitHub sees `.gitignore` hide the
file.

**Fix.** One of:
(a) Re-commit `tasks/task-registry.json` and let CI fail on
stale content instead of regenerating. Solves the GitHub-browse
experience.
(b) Generate it into `docs/planning/` so agents reading the tree
always have a copy.

Option (a) is simpler and matches the CI's existing regenerate-first
posture.

### I12. Task `05-mod-system` depends on features not yet scoped
[`tasks/phase-2/05-mod-system/05a-baseline-ruleset-and-shared-library-packs.md`](../../tasks/phase-2/05-mod-system/05a-baseline-ruleset-and-shared-library-packs.md)
promises "baseline ruleset and shared library packs" but the
Emberwild example already references shared packs that don't exist
(I4). Either 05a belongs in MVP-02b-asset-pipeline (when the
shared-pack skeleton becomes a dependency), or the Emberwild
example currently relies on vaporware.

**Fix.** Move the shared-skeleton subset of 05a (author
`shared-skills` and `shared-abilities` manifests + one record each)
into `mvp/02b-asset-pipeline/`. 05a's remaining work (signing, full
reference packs) stays in phase-2.

---

## 4. Nice-to-Have Optimizations

- **N1.** Audit/refactor docs are piling up at `docs/planning/`
  (six files, including this one). 2026-04-21 N1 recommended an
  `audits/` subfolder; still unapplied. Move all `audit-*` and
  `refactor-*` files under `docs/planning/audits/`, keep only the
  *current* operating docs at the planning root.
- **N2.** Add a `ruleset-sanity.test.mjs` under `scripts/__tests__/`
  that loads `baseline.ruleset.json`, evaluates `attackBonus` at
  ATK−DEF=10 and `defenseMitigation` at DEF−ATK=10, and asserts the
  documented vectors. Gates C1 from ever re-opening.
- **N3.** `content-schema/schemas/README.md` should carry a one-line
  "how to add a new schema" pointer to `CONTRIBUTING.md`. Today the
  README is an inventory; an AI landing there needs one more hop.
- **N4.** `targeting.schema.json` has 7 kinds; MVP likely needs 3
  (`single_unit`, `self`, `hex`). The 2026-04-21 audit I12
  recommended marking the rest "reserved". Add
  `"description": "Reserved; engine support lands in phase-2"` to
  `area`, `line`, `unit_or_hex`, `all`. Cheap signal to AI agents.
- **N5.** `effect.condition` is now structured (C3 of last audit is
  closed), but `effect.status` still carries `status: { type:
  "string" }` with no enum. Promote to an enum or a $ref to a
  `status-id.schema.json`. Same exact class of risk as the
  `condition` string was before — an AI will guess `"frozen"` vs
  `"freeze"` and nothing will fail loudly.
- **N6.** `targeting.damage.target` enum in effect.schema.json and
  `target` across `heal`/`status`/`modifyStat` are slightly
  different enums. Publish a single `target-scope.schema.json` enum
  and $ref it from all five effect kinds. Same DRY class as
  stat-id / resource-id.
- **N7.** The `$schema` field on manifest records
  ([`manifest.schema.json:18`](../../content-schema/schemas/manifest.schema.json#L18))
  allows any string. If examples use the `heroes-reforged/...` $id
  form (I3), tighten the manifest field's pattern to match.
- **N8.** `package.json` declares `packageManager: pnpm@9.15.0` but
  `package-lock.json` exists and CI runs `npm run validate`. Pick
  one (pnpm or npm) and remove the other lockfile, or accept that
  `pnpm-workspace.yaml` is aspirational — either way, document it.

---

## 5. Specific Fixes (actionable diff list)

### Schemas

1. `building.schema.json:25-28` — add
   `"propertyNames": {"$ref": "heroes-reforged/resource-id.schema.json"}`
   to `cost`. (C2)
2. `faction.schema.json:21-25` — add `minLength: 1` to `id` and
   `name`. (I7)
3. `scenario.schema.json:56-59` — mark `objectives.defeat` as
   required with `minItems: 1`. (I9)
4. `effect.schema.json:46-57` — replace `status: { type: "string" }`
   in the `status` effect with `{ "$ref":
   "heroes-reforged/status-id.schema.json" }` (or an inline enum).
   (N5)
5. New `content-schema/schemas/status-id.schema.json` — canonical
   status enum. (N5)
6. New `content-schema/schemas/target-scope.schema.json` — shared
   target enum. (N6)

### Rulesets / balance

7. `research/deep-research-report.md:143-170` — re-derive §5 from
   `baseline.ruleset.json` (point-based caps 60/60 + 1/20 defense),
   and add the missing `moralePenaltyMissProbNum/Den` at 1/24. (C1,
   C6-followthrough)
8. `baseline.ruleset.json:14-20` — add
   `moralePenaltyMissProbNum: 1`, `moralePenaltyMissProbDen: 24`.
   (C1)
9. `tasks/mvp/04-faction-emberwild/04-baseline-ruleset.md:25-34` —
   rewrite constants to match the example record (60-point caps,
   not 140/100 percent caps). Recompute acceptance vectors. (C1)
10. `tasks/mvp/09-tactical-combat/03-damage-formula.md:47-51` —
    recompute "DEF−ATK=10 → ×0.714" to the chosen defense constant
    (×0.667 if 1/20). (C1)

### Examples / packs

11. `emberwild-faction/faction.json:13-15` — add
    `emberwild:building:fort` to `buildingIds`. (C3)
12. `emberwild-faction/manifest.json:32-34` — add
    `emberwild:building:fort` to `provides.buildings`. (C3)
13. All 17 example records — replace
    `"$schema": "../../../../../schemas/..."` with the `$id` URI
    form or delete the field. (I3)
14. New `content-schema/examples/packs/shared-skills/` and
    `shared-abilities/` with a manifest each. Move
    `pathfinding-basic.skill.json` into the first. Update Kaelis's
    dependency chain. (I4)

### Scripts / CI

15. Vendor Ajv 2020 and rewrite `check-repo-contracts.mjs` validator
    path to use it. (I1)
16. Add `scripts/__tests__/ruleset-sanity.test.mjs`. (N2)
17. Extend `scripts/check-cross-references.mjs` with
    "provides-completeness" check. (C3)
18. Drop `services/ai-gateway/README.md` and
    `services/signaling/README.md` from `requiredPaths`. (I6)
19. Decide `tasks/task-registry.json` — commit it or stop promising
    it. (I11)

### Task / module edits

20. Move the shared-skeleton subset of `phase-2/05-mod-system/05a`
    into `mvp/02b-asset-pipeline/`. (I12)
21. Decide `06b-visual-fidelity`: move to `phase-2/` or trim to
    3–4 tasks. (I5)
22. Move all `audit-*` and `refactor-*` files under
    `docs/planning/audits/`. (N1)

---

## 6. AI-Friendliness Score

**8.0 / 10** (up from 7.5 in 2026-04-21).

### What improved
- Every task file now has required sections enforced by CI;
  structure is reliable.
- Closed effect registry + condition AST + formula AST + stat-id +
  resource-id enums cover the schemas most likely to be AI-authored.
- Forbidden-pattern rules catch the two historical regressions
  (`src/generation/` fork and IP-unsafe references) automatically.
- Generation-I/O schemas + the coherence cross-ref checker give
  an AI a two-stage "schema valid → graph valid" pipeline.
- Markdown-link validator keeps `tasks/` crosslinks honest.

### What will still frustrate an AI
- **Combat-math ambiguity (C1).** An AI asked to produce acceptance
  vectors for a damage task has to guess which of the four sources
  is authoritative.
- **Shared-pack vapor (I4).** Cross-references resolve because the
  records exist, but the pack-dependency graph doesn't — an AI
  trying to author a new pack that depends on `shared_abilities`
  has no reference to copy from.
- **Validator subset (I1).** The CI's "passed" signal is weaker
  than the schemas claim. AI-generated content can ship with
  typos in resource keys or missing `propertyNames` enforcement.
- **Baseline corridor duplication (C4/I10).** Two canonical sources
  for the same numbers guarantees future drift.

### One-line AI verdict
An AI can now pick any schema-level task, author records that pass
CI, and rely on the cookbook for patterns. It should avoid tasks in
the ruleset/combat-math family until C1 is closed, because the
acceptance criteria it will be graded against actively disagree with
the example data it will be generating.

---

## 7. Top Risks

1. **Combat constants fork (C1).** The single most load-bearing
   failure in the repo. Every task in 04-faction-emberwild and
   09-tactical-combat lands against one of four incompatible
   truths. The auto-balancer trust region is built on whichever
   version happened to land first.
2. **Schema-closure theater (I1).** The closed enums and
   `propertyNames` constraints exist as contract *promise* but not
   as CI-enforced reality. The validator's hand-rolled subset
   silently skips them.
3. **Pack-graph non-closure (C3, I4).** Individual records pass
   cross-ref checks; pack manifests and `buildingIds` arrays drift
   from the filesystem. First real pack loader will surface these
   holes at runtime.
4. **Baseline-corridor authority (C4).** Required, trusted, stale,
   and in the wrong folder. Every audit has moved it down one
   priority level; every audit has it come back.
5. **Module dependency-bleed (I12).** Emberwild example depends on
   phase-2 infrastructure (`shared_*` packs) that nobody has agreed
   belongs in MVP. First runtime task will either import phase-2
   early or invent new packs to paper over the reference.
6. **`06b-visual-fidelity` MVP drag (I5).** 15 tasks ~46h that the
   solo-build-lane explicitly defers. Still technically part of
   MVP; still a trap for linear-scheduling AI agents.
7. **Service-stub mandate (I6).** CI blocks commits that delete two
   placeholder READMEs nobody has a task for. Cheap to miscue a
   contributor.

---

## 8. Suggested Order Of Operations

Paper-only edits (zero runtime code required):

1. **C1 + C4.** Reconcile the combat constants. Pick
   `baseline.ruleset.json` as SSOT. Rewrite the corridor, the
   baseline-ruleset task, and the damage-formula acceptance
   vectors in a single PR. Add the ruleset-sanity test (N2) to
   lock it.
2. **C2.** One-line fix to `building.schema.json` + extend any
   income/reward maps that still leak open keys.
3. **C3.** Fix Emberwild faction + manifest to include Fort; extend
   cross-ref checker with provides-completeness.
4. **I1.** Swap the hand-rolled validator for Ajv. This is the
   single-largest contract improvement available and it finally
   makes the last two passes' schema closures real.
5. **I4 + I12.** Author the two `shared_*` packs under
   `examples/packs/`. Move the "shared-skeleton" task out of
   phase-2/05a into MVP/02b.
6. **I3.** Sed-replace the 17 `$schema` relative paths.
7. **I5 + N1.** Decide 06b placement. Move audit/refactor docs to
   `docs/planning/audits/`.

After that, the repo is genuinely consistent and the first
`src/engine/` line can land against a trusted contract layer.

---

## Bottom Line

The 2026-04-21 v2 pass and the 2026-04-22 hardening pass did their
job: the repo now passes every contract check it has defined for
itself and the backlog is well-shaped. The remaining failures are
of a different class — *cross-document inconsistency among sources
that all claim to be authoritative for the same numbers*. The
combat-math constants sit at that intersection: the research
corridor says one thing, the baseline-ruleset task says another,
the tactical-combat task bakes in a third, and the canonical
example record publishes a fourth.

None of this blocks `npm run validate` from turning green, because
the validator doesn't know these four sources should agree. That is
the tell: the repo has exhausted what its current CI can prove about
itself. Landing Ajv (I1) and the ruleset-sanity test (N2) is the
cheapest way to keep auditing the repo honest after this pass.

Everything else (pack-graph closure, shared-pack authoring, corridor
relocation, 06b decision) is follow-through work, not structural
rewrites. If the next pass lands C1 + I1, the `src/engine/` runtime
can start against a contract layer it can finally trust.
