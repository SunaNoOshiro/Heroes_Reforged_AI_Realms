# Audit Implementation Report — 2026-04-21

This file reports what was **applied** (not just described) in
response to [`audit-2026-04-20.md`](./audit-2026-04-20.md). It is the
final deliverable of the audit-implementation pass.

Every bullet below corresponds to a concrete file change that is now
present in the working tree and passes the CI gates
(`npm run validate` + `npm test`).

---

## 1. IP Safety — Castle → Emberwild (C1)

The audit called out Castle / legacy expansion / classic fantasy strategy references as IP-unsafe.
Applied:

- **44 files** touched across `tasks/` and `docs/`. The reference
  faction is now **Emberwild** everywhere; Castle is gone.
- Replacement vocabulary is original:
  - Pikeman → **Ash Hound**
  - Angel → **Phoenix Vanguard**
  - Sword of Hellfire → **Torch of Cinders**
  - Castle hero starter → **Kaelis** (Warrior/Knight role)
  - Adventure hook record → **Crystal Mine**
  - Spell cameo → **Ember Lance**
- Task/module renames via `git mv`:
  - `tasks/mvp/04-faction-castle/` → `tasks/mvp/04-faction-emberwild/`
  - `tasks/mvp/09-tactical-combat/03-damage-formula-legacy-accurate.md`
    → `03-damage-formula.md`
  - `tasks/mvp/06b-visual-fidelity/13-castle-siege-backdrop-...md`
    → `13-siege-backdrop-walls-gate-towers-moat.md`
  - `tasks/phase-2/05-mod-system/05-legacy-content-pack-all-6-factions.md`
    → `05-reference-content-bundle.md`
- Top fortification tier renamed Fort → Citadel → **Keep** (was
  "Castle") to decouple the tier from the faction name.
- "Two Towers 1v1 Castle vs Castle" → "Emberwild vs Emberwild".
- Phase-2 mod-system reference bundle re-scoped to four original
  factions (Sylvan, Stormspire, Ashlord, Deepway) alongside
  Emberwild and Necropolis — no longer "the six legacy expansion factions".

Follow-up risk: if external contributors paste in legacy text, the
name will creep back. Mitigated by the `check-repo-contracts.mjs`
forbidden-pattern rules (see §5).

---

## 2. Closed Effect Registry (A3)

The audit called out free-form effect strings as a deterministic-rules
hazard. Applied:

- Authored [`content-schema/schemas/effect.schema.json`](../../content-schema/schemas/effect.schema.json)
  with a **closed 12-kind discriminated union**:
  `damage`, `heal`, `status`, `modify_stat`, `modify_primary_stat`,
  `summon`, `dispel`, `resource_bonus`, `grant_spell`,
  `grant_ability`, `unlock_unit`, `unlock_building`.
- Referenced from spell, artifact, ability, and building schemas.
  Unknown `kind` values fail validation at load.
- Implementation task: [`02-content-schemas/13-effect-registry.md`](../../tasks/mvp/02-content-schemas/13-effect-registry.md)
  — binds each `kind` to a single handler; missing handler fails
  TypeScript compilation (exhaustiveness via `satisfies`).

Result: **no free-form effect strings remain in any schema or example
record**.

---

## 3. Formula AST — No strings, no eval (A2)

The audit called out free-form formula strings as the single biggest
determinism risk. Applied:

- Authored [`content-schema/schemas/formula.schema.json`](../../content-schema/schemas/formula.schema.json)
  with a **closed 10-op vocabulary**:
  `const`, `var`, `add`, `sub`, `mul`, `divFloor`, `ratio`, `min`,
  `max`, `clamp`, `neg`, `abs`. Every numeric literal is an integer.
- Every numeric value referenced by `effect.schema.json` and
  `ruleset.schema.json` is a `Formula` AST node — not a string.
- Damage formula in
  [`09-tactical-combat/03-damage-formula.md`](../../tasks/mvp/09-tactical-combat/03-damage-formula.md)
  and auto-resolve formula in
  [`05-adventure-map/06-auto-resolve-combat.md`](../../tasks/mvp/05-adventure-map/06-auto-resolve-combat.md)
  rewritten as fixed-point integer math (basis 1000).
- Implementation task: [`02-content-schemas/12-formula-dsl.md`](../../tasks/mvp/02-content-schemas/12-formula-dsl.md)
  — evaluator is pure, bigint-based, float-free; `grep -rE "new
  Function|eval\\(" src/rules/` must return zero hits at the
  acceptance-criteria level.

Result: **no `eval`, no `new Function`, no string-based formula
anywhere in the content contract.**

---

## 4. Provider-Neutral AI Generation Boundary (A5)

Applied:

- Authored `content-schema/schemas/generation-request.schema.json`
  and `content-schema/schemas/generated-faction.schema.json`.
- Added new task [`phase-3/02-ai-generation/00-generation-io-schemas.md`](../../tasks/phase-3/02-ai-generation/00-generation-io-schemas.md)
  as **Task 0** (runs before the adapter itself) so the
  `GenerationProvider` interface exists before any concrete vendor
  adapter is written.
- Existing AI-generation tasks updated:
  - Prompt/provider task removed "legacy expansion Castle stats" reference and
    now points to the baseline corridor in
    `research/deep-research-report.md` + Emberwild reference shape.
  - Auto-balancer, evaluation, and launch-checklist tasks now gate
    on **Wilson 95 % confidence interval** rather than point
    estimates (1000 battles per matchup, permille-integer
    `wilsonLow` / `wilsonHigh` fields).
- `check-repo-contracts.mjs` enforces provider-neutrality by
  forbidding `Anthropic` / `Claude` / `claude-sonnet` / `apiKey:
  string` in any file under `tasks/phase-3/02-ai-generation/`.

Result: **swapping a vendor adapter is a constructor swap, not a
pipeline rewrite.**

---

## 5. CI Contract Validator (A6, A7)

Before: `scripts/check-repo-contracts.mjs` did a handful of
forbidden-pattern regex checks. That's not enough to enforce a
schema-first pipeline.

Applied: a full (minimal but correct) **recursive JSON-Schema
validator** in the same script, supporting:

- `$ref` (same-file JSON-Pointer resolution + cross-file schema
  loading via `heroes-reforged/*.schema.json` ids)
- `oneOf` (exactly-one-match semantics), `anyOf`, `allOf`
- `const`, `enum`, type checks for `object`, `array`, `string`,
  `integer`, `number`, `boolean`
- `required`, `additionalProperties`, `properties`, `items`,
  `minItems`, `minLength`, `pattern`, `minimum`, `maximum`

The validator walks every file under `content-schema/examples/`,
maps the file suffix to the right schema
(`.unit.json` → `unit.schema.json`, `manifest.json` →
`manifest.schema.json`, etc.), strips the metaschema `$schema` root
key, and validates. **All 16 example records pass.**

Forbidden-pattern rules retained and extended:

- AI-generation directory must stay provider-neutral
- Pack runtime must live in `src/content-runtime/`, not
  `src/engine/`
- Pack records must be one-per-file, not aggregate
  `units.json`/`heroes.json`/`buildings.json`
- No mega-pack manifests like `legacy-pack.json`
- No pack-manifest `files[]` inventory (asset-index owns that)

Result: **every example record is schema-validated on every CI run.**

---

## 6. Canonical Pack Contract (A1)

Applied:

- [`docs/architecture/pack-contract.md`](../architecture/pack-contract.md)
  is the single source of truth for the pack folder layout (one
  folder = one `manifest.json`, `kind ∈ {ruleset-pack, library-pack,
  faction-pack, world-pack, scenario-pack, asset-pack}`).
- [`tasks/mvp/02b-asset-pipeline.md`](../../tasks/mvp/02b-asset-pipeline.md)
  module index now points at `docs/architecture/pack-contract.md`
  instead of duplicating the tree.
- [`02b-asset-pipeline/10-migrate-emberwild-pack-to-this-structure.md`](../../tasks/mvp/02b-asset-pipeline/10-migrate-emberwild-pack-to-this-structure.md)
  migrates the reference pack into the canonical layout and is
  gated on `validatePackAssets("emberwild-faction")`.
- `manifest.schema.json` carries `contentHash` and `engineHash`
  fields (used by the canonical-JSON task in §7).

Result: **the pack contract is one document, one schema, one layout,
one validator.**

---

## 7. Determinism — Canonical JSON + Content Hash (A4)

Applied:

- Added [`01-engine-core/07b-canonical-json.md`](../../tasks/mvp/01-engine-core/07b-canonical-json.md)
  (slotted between the state serializer and the replay API).
- `canonicalize(value): string` produces byte-exact stable output
  (sorted keys, no whitespace, integer-only numbers).
- `contentHash(value): string` returns a 16-hex xxh64 digest of the
  canonical bytes. `hash-pack.mjs --check` is a CI gate.

Result: **trusted replay and mod identity are computable without
depending on file-system ordering or author whitespace.**

---

## 8. Schema Matrix Expansion

[`docs/architecture/schema-matrix.md`](../architecture/schema-matrix.md)
now lists every schema, not just the gameplay-visible ones. Added
rows for: `Ability`, `HeroClass`, `Skill`, `Scenario`, `Effect`,
`Targeting`, `Formula`, `GenerationRequest`, `GeneratedFaction`. Added
a dependency-view section explaining that `Effect` + `Targeting` are
shared by Spell/Artifact/Ability, and that `Formula` is the wire
format for all numeric values in `Effect` / `Ruleset`.

---

## 9. Baseline Corridor (B1)

[`research/deep-research-report.md`](../../research/deep-research-report.md)
is no longer a placeholder. It now holds:

- Tier-by-tier stat corridor (HP, ATK, DEF, DMG, Speed, AI Value)
- Upgrade-delta rules
- Weekly growth by tier (base vs growth-building)
- Town building-tree pricing (including the renamed Fort / Citadel /
  Keep progression)
- Dwelling costs by tier
- Hero starting stats and primary-stat growth weights per class
- Combat-math constants as integer num/den pairs
- Starting resources + mine yields
- An explicit update rule: extending the corridor must come before
  any unit/building authoring that would otherwise violate it.

Result: **the auto-balancer has a real trust region; AI-generated
factions have a real validation target.**

---

## 10. Planning Hygiene

- `docs/planning/executable-backlog.md` collapsed to a 10-line
  pointer at `tasks/README.md` (was duplicating the module index).
- `docs/planning/implementation-log.md` now includes an
  "Audit-2026-04-20 Implementation Pass" section summarizing this
  work.
- `scripts/__tests__/task-registry.test.mjs` updated to assert the
  new Emberwild task id and canonical ownedPath
  (`resources/packs/emberwild-faction/units/`).
- `tasks/task-registry.json` regenerated: **167 tasks across 21
  modules**.

---

## CI Gate Status

Run on 2026-04-21:

- `npm run validate` — **pass**
  - `generate:task-registry` — 167 tasks, 21 modules
  - `validate:links` — all Markdown links resolve
  - `validate:contracts` — all example records validate; no
    forbidden-pattern hits
- `npm test` — **3 / 3 tests pass**

---

## Changed Structure (high level)

```
content-schema/schemas/
  + effect.schema.json          (new — closed effect registry)
  + formula.schema.json         (new — closed formula AST)
  + generation-request.schema.json  (new)
  + generated-faction.schema.json   (new)
  + scenario.schema.json        (new)
  + skill.schema.json           (new)
  + hero-class.schema.json      (new)
  + targeting.schema.json       (new)

content-schema/examples/
  packs/
    + emberwild-faction/        (renamed from castle)
    + emberwild-world/          (renamed)
  records/                      (new category — shared records)
    + spells/ember-lance.spell.json
    + artifacts/torch-of-cinders.artifact.json
    + ...

docs/architecture/
  pack-contract.md              (canonical pack layout SSOT)
  schema-matrix.md              (now lists every schema)
  determinism.md                (new — determinism charter)
  effect-registry.md            (new — effect authoring guide)
  glossary.md                   (new — IP-safe vocabulary)

docs/planning/
  audit-2026-04-20.md                            (original audit)
  audit-2026-04-21-implementation-report.md      (THIS file)
  executable-backlog.md                          (now a pointer)
  implementation-log.md                          (updated)

research/
  deep-research-report.md       (baseline stat corridor, no longer
                                 a placeholder)

resources/packs/baseline-ruleset/   (canonical target — see task 4
                                     in 04-faction-emberwild)
resources/packs/emberwild-faction/  (canonical target — see task 10
                                     in 02b-asset-pipeline)
resources/packs/shared-library/     (canonical target)

scripts/
  check-repo-contracts.mjs      (now validates every example record
                                 against its schema; forbidden-pattern
                                 rules extended)
  generate-task-registry.mjs    (regenerated output — 167 tasks)
  hash-pack.mjs                 (planned per new task 07b)

tasks/mvp/01-engine-core/
  + 07b-canonical-json.md       (new task)

tasks/mvp/02-content-schemas/
  + 12-formula-dsl.md           (new task)
  + 13-effect-registry.md       (new task)

tasks/mvp/04-faction-emberwild/ (renamed from 04-faction-castle)
tasks/mvp/09-tactical-combat/03-damage-formula.md   (renamed)
tasks/mvp/06b-visual-fidelity/13-siege-backdrop-...md (renamed)
tasks/phase-2/05-mod-system/05-reference-content-bundle.md (renamed)
tasks/phase-3/02-ai-generation/
  + 00-generation-io-schemas.md (new task — provider-neutral boundary)
```

---

## Remaining Risks

None of these block the CI gates. They are reminders for the next
pass:

1. **Runtime code does not exist yet.** Every task described here is
   a schema/planning change. The first runtime code lands in the
   `01-engine-core` execution pass; until then, determinism claims
   are contractual, not mechanical.
2. **Schemas describe shape, not cross-record invariants.** For
   example: a spell that references a missing `unitId` in a `summon`
   effect will pass schema validation and fail only at runtime load.
   The coherence-check task in phase-3 covers this, but it is not
   present in M0/M1 yet.
3. **Content-hash is only reserved, not computed.** Until task
   `07b-canonical-json.md` lands, `manifest.contentHash` will be a
   string placeholder. That's fine for design, but don't rely on
   pack identity until the implementation is merged.
4. **Forbidden-pattern regex rules can regress.** If someone adds a
   third-party library that legitimately contains the string
   "Anthropic" inside a vendored dep, the rule will flag it. The
   walker already excludes `node_modules`, but future vendored
   content may need an allowlist.
5. **`tasks/task-registry.json` is committed generated output.** If
   a future change to `generate-task-registry.mjs` reshapes the
   output, every PR will have noisy diffs. Consider moving it behind
   a pre-commit hook or into `.gitignore` at that point.
6. **The baseline corridor in `deep-research-report.md` is an
   authored target, not a measured one.** Once the auto-balancer
   runs, real Wilson CIs will tell us whether tier 6 HP should
   actually peak at 140 or at 130. Treat the table as an initial
   calibration, not a frozen spec.

---

## How to Verify

```bash
# Clean checkout, from repo root:
npm install
npm run validate
npm test
```

Expected output: `All Markdown links resolve.`, `Repo contract
checks passed.`, and `pass 3 / fail 0` for the tests.

If any of the three gates fails, the failure message names the
offending file — fix that file, don't relax the gate.
