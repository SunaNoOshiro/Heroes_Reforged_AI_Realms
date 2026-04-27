# Implementation Plan: 06 — Data Contracts & Schema

> Derived from [docs/readiness-audit/06-data-contracts-and-schema.md](../readiness-audit/06-data-contracts-and-schema.md).
> Original audit file is **not** modified. This plan converts the
> documented gaps (⚠ Partial, Missing Logic, Risks) into actionable
> implementation work.

---

## 1. Overview

This plan covers the seven gaps in the otherwise-mature data-contract
layer of Heroes Reforged: AI Realms. The audit confirms 33 closed JSON
Schemas, canonical-JSON + xxh64 specs, and a `validate:contracts` CI
gate are in place. What is missing is the connective tissue around
**schema evolution**, **enum lifecycle**, **defaults**, **view-model
contracts**, and **validation-error reporting**.

**Overall readiness state:** 8 / 10 (per audit). The contract layer is
the most AI-implementable subsystem in the repo. The fixes below are
finishing touches that prevent the first breaking change from setting
an ad-hoc precedent.

**In scope of this plan:**

- Schema migration policy + worked example.
- Version-mismatch decision matrix (one table, all contexts).
- Enum-value lifecycle policy + CI snapshot gate.
- `default` declarations in JSON Schema + Zod parity.
- `ValidationError` shape unified across CI and runtime.
- Per-screen view-model contract (TS types or schema).
- One-shot M2 engine-hash backfill task.
- Lint scope expansion for the float-ban rule.

**Explicitly out of scope (intentional non-gaps):**

- Per-command output schema. The reducer model defines outputs as
  state mutations — adding return-shape schemas would fight the
  determinism contract. No work item.

---

## 2. Critical Fixes (Must Do First)

These three items unblock the first non-trivial schema evolution and
the first multi-agent parallel work on schemas. They should land
before any breaking schema change.

### Issue: Schema migration policy is undocumented

**Source:** Q116, Q118 (⚠ Partial); Risks bullet 1.

**Problem:**
[`src/content-schema/migrate.ts`](../../src/content-schema/) is a stub
with an empty migration table. Policy is stated in
[`content-platform.md`](../architecture/content-platform.md) but there
is no procedure for bumping `schemaVersion`, naming a migration entry,
or defining the deprecation window. The first breaking change will
invent the pattern under pressure.

**Impact:**
- First migration becomes the load-bearing precedent regardless of
  quality.
- Parallel agents writing migrations will diverge on naming, file
  layout, and test expectations.
- "Keep deprecated fields readable for one migration cycle" is not
  enforceable without a definition of "cycle".

**Solution:**
Author a canonical migration policy doc and a fully worked example
migration in the empty registry, so future migrations have a template
to copy.

**Files to Update:**
- [docs/architecture/content-platform.md](../architecture/content-platform.md)
  — link the new policy from the "Update Safety" section.
- [docs/architecture/schema-matrix.md](../architecture/schema-matrix.md)
  — add a "Migrations" column or footer pointer.
- [tasks/mvp/02-content-schemas/11-schema-version-field-plus-migration-stub.md](../../tasks/mvp/02-content-schemas/11-schema-version-field-plus-migration-stub.md)
  — extend acceptance criteria to require the worked example.

**New Files (if needed):**
- `docs/architecture/schema-migration-policy.md`
- `src/content-schema/migrations/README.md`
- `src/content-schema/migrations/example-v1-to-v2-rename-field.ts`
  (illustrative, not yet wired)
- `src/content-schema/migrations/example-v1-to-v2-rename-field.test.ts`
- `tasks/mvp/02-content-schemas/12-schema-migration-policy-and-example.md`

**Implementation Steps:**
1. Draft `schema-migration-policy.md` covering: when to bump
   `schemaVersion`, file naming convention
   (`vN-to-vM-<short-purpose>.ts`), required exports
   (`migrate(record): record`, `from: number`, `to: number`,
   `appliesTo: string[]`), test convention
   (input fixture + expected output fixture), and a deprecation-window
   definition (e.g. "one minor release after migration lands").
2. Create `migrations/` directory with a `README.md` that lists the
   registry order and how `migrate.ts` consumes it.
3. Implement one example migration end-to-end (rename a field on a
   non-shipping example record) with input/output fixtures and a
   passing test. Mark it as illustrative-only in the registry header.
4. Update `migrate.ts` to discover entries from the registry rather
   than the inline empty array.
5. Add a new task file `12-schema-migration-policy-and-example.md`
   with `verifyCommands` that run the example migration's test.

**Dependencies:**
- Existing Task 11 stub (`migrate.ts`) must remain in place.

**Complexity:** M

---

### Issue: No consolidated version-mismatch decision matrix

**Source:** Q117, Q118 (⚠ Partial); Missing Logic bullet 3.

**Problem:**
The behaviour on mismatch (refuse / migrate / degrade) is correct in
intent but reconstructed across four docs:
[state-flow.md:13-15](../architecture/state-flow.md#L13-L15),
[pack-contract.md:32-42](../architecture/pack-contract.md#L32-L42),
[content-platform.md](../architecture/content-platform.md), and
[persistence task 02:50](../../tasks/mvp/08-persistence/02-log-only-save-format.md#L50).
Six mismatch kinds × three contexts (offline / multiplayer / replay)
× three actions (refuse / migrate / degrade) is 18 cells, none of
which lives in one table.

**Impact:**
- Engineers have to grep four docs to answer "what does the loader do
  if `engineHash` is missing in MP?".
- UI copy for "warn and load" vs "refuse loud" cannot be specified
  consistently because the policy is fragmented.
- Audit identifies the same save loaded in offline-vs-online producing
  different outcomes; this surprises users without a documented
  rationale.

**Solution:**
Add a single decision-matrix table to a new `version-policy.md` (or
extend `state-flow.md`) covering all six mismatch kinds × all three
contexts. Point all four existing docs at the new table; remove
duplicated prose.

**Files to Update:**
- [docs/architecture/state-flow.md](../architecture/state-flow.md)
  — replace prose at lines 13-15 with link to matrix.
- [docs/architecture/pack-contract.md](../architecture/pack-contract.md)
  — replace lines 32-42 with link to matrix.
- [docs/architecture/content-platform.md](../architecture/content-platform.md)
  — link from "Update Safety" section.
- [tasks/mvp/08-persistence/02-log-only-save-format.md](../../tasks/mvp/08-persistence/02-log-only-save-format.md)
  — link line 50 reference to the matrix.

**New Files:**
- `docs/architecture/version-policy.md`

**Implementation Steps:**
1. Author the matrix as a single Markdown table:
   rows = mismatch kinds (`schemaVersion older`, `schemaVersion
   newer`, `contentHash`, `contentPackHashes`, `engineHash`,
   `validation error`); columns = contexts (`offline-singleplayer`,
   `multiplayer`, `trusted-replay`); cells = action + UI message.
2. Add a "rationale" footnote per cell explaining trusted-vs-untrusted
   distinction.
3. Replace duplicated prose in the four source docs with a single
   sentence + link.
4. Run `npm run validate:cross-refs` to confirm no broken links.

**Dependencies:** None.

**Complexity:** S

---

### Issue: Enum-value lifecycle has no policy or CI gate

**Source:** Q119 (⚠ Partial); Missing Logic bullet 4; Risks bullet 2.

**Problem:**
Closed enums are pervasive (`command.kind`, `manifest.capabilities`,
`resource-id`, `stat-id`, `status-id`, effect kinds, spell schools).
Removal of any value is silently breaking for saves/replays that
reference it. The audit confirms no deprecation procedure, no
rename-aliasing scheme, and no CI gate.

**Impact:**
- A PR that removes a single enum value can corrupt every existing
  save/replay without any check failing.
- Multi-agent execution: two agents could redefine the same enum
  inconsistently with no detection.

**Solution:**
Define an enum-value lifecycle (additive, deprecated, aliased,
removed) and add a CI gate that snapshots the union of all enum values
across all schemas. Removals require an explicit alias entry in the
migration registry.

**Files to Update:**
- [content-schema/schemas/README.md](../../content-schema/schemas/README.md)
  — add "Enum value lifecycle" section.
- [docs/architecture/content-platform.md](../architecture/content-platform.md)
  — link from "Update Safety".
- [package.json](../../package.json) — wire new CI script into
  `validate:contracts` (or sibling `validate:enums`).

**New Files:**
- `docs/architecture/enum-lifecycle-policy.md`
- `scripts/snapshot-enums.mjs` — emits `content-schema/enums.snapshot.json`
- `scripts/check-enum-snapshot.mjs` — fails if a value present in
  snapshot is missing from current schemas without a registered alias
- `content-schema/enums.snapshot.json` (committed artifact)
- `tasks/mvp/02-content-schemas/13-enum-lifecycle-and-snapshot-gate.md`

**Implementation Steps:**
1. Walk every `*.schema.json` collecting `enum` arrays and `const`
   values inside discriminated unions.
2. Snapshot to a sorted, canonical-JSON file
   `content-schema/enums.snapshot.json` keyed by
   `<schemaId>#<jsonPointer>` → `string[]`.
3. Implement `check-enum-snapshot.mjs`: re-walk, diff against
   snapshot. Removed values must be either (a) annotated as alias in
   the migration registry, or (b) explicitly listed in a
   `removed.json` exception file with a `since:` version. Otherwise
   fail.
4. Add `npm run snapshot:enums` (regenerate) and
   `npm run validate:enums` (check) scripts. Wire the check script
   into `npm run validate`.
5. Author `enum-lifecycle-policy.md` covering: how to deprecate
   (annotate but keep accepting), how to alias rename (entry in
   `migrate.ts`), how to remove (after one deprecation cycle, with
   migration entry).
6. Add task `13-enum-lifecycle-and-snapshot-gate.md` with verify
   commands `npm run snapshot:enums && git diff --exit-code` and
   `npm run validate:enums`.

**Dependencies:**
- Migration policy issue above must land first (alias entries live in
  the migration registry).

**Complexity:** M

---

## 3. System Improvements

### Data Contracts

#### Issue: `default` keyword missing from JSON Schemas

**Source:** Q120 (⚠ Partial); Missing Logic bullet 5.

**Problem:**
Spot-checked schemas (`unit`, `manifest`, `command`) contain no
`"default":` keywords. Defaults are documented in prose only (e.g.
"if `growth.weekly` absent, derive from `baseWeekly`"). Zod and JSON
Schema validators could fill differently with no CI catching the
divergence.

**Impact:**
- Two validators (JSON Schema and Zod) producing different "filled"
  records breaks the canonical-JSON guarantee, which breaks
  `contentHash`, which breaks save/replay/MP determinism.
- Prose-only defaults are invisible to AI implementers reading
  schemas first.

**Solution:**
For every optional field with a documented default, add a `default`
keyword to the JSON Schema and a matching `.default(...)` to the Zod
validator. Add a CI round-trip test that asserts JSON-Schema-default
output equals Zod-default output for every example.

**Files to Update:**
- All `content-schema/schemas/*.schema.json` files where prose
  documents a default. (Audit-time grep candidates: `unit`, `hero`,
  `building`, `spell`, `manifest`, `ruleset`.)
- [src/content-schema/](../../src/content-schema/) Zod validator
  modules (when implemented per Task 10).
- [tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md](../../tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md)
  — add round-trip-of-defaults acceptance criterion.

**New Files:**
- `docs/architecture/schema-defaults-policy.md`
- `tasks/mvp/02-content-schemas/14-default-declarations-and-zod-parity.md`

**Implementation Steps:**
1. Grep all schema files + companion docs for "if absent", "defaults
   to", "derive from" — produce a list of fields that should declare
   `default`.
2. Author `schema-defaults-policy.md` covering: when to declare a
   default, how Zod must mirror it, that defaults must be canonical
   (integers, no floats), and that fillable defaults are forbidden in
   gameplay-required fields (defaults must not paper over missing
   required content).
3. Add `default` keywords to schemas; update canonical examples to
   either omit the field or emit the default explicitly.
4. Extend Task 10's acceptance criteria with: "for every example, the
   Zod-defaulted output and the JSON-Schema-defaulted output produce
   byte-identical canonical-JSON".
5. Add task `14-default-declarations-and-zod-parity.md`.

**Dependencies:**
- Task 10 (Zod validators) — defaults parity test is added there;
  Task 14 enforces the schema authoring side.

**Complexity:** M

---

#### Issue: No unified `ValidationError` shape

**Source:** Q124 (⚠ Partial); Missing Logic bullet 7; Improvements
bullet 5.

**Problem:**
Path-in-error is required by Task 10 for Zod validators, but the
project has no cross-cutting `ValidationError` contract. The CI
script
[`scripts/check-repo-contracts.mjs`](../../scripts/check-repo-contracts.mjs),
runtime loaders, and engine pre-dispatch validation all log in their
own format. Downstream tooling (editor surfacing, AI feedback loop)
cannot consume errors generically.

**Impact:**
- Editor and IDE integrations can't render errors with consistent
  jump-to-source.
- AI generation feedback loop (Phase-3) needs a structured shape to
  pass back to the model; ad-hoc strings are not parseable.
- Two agents implementing two validators may produce incompatible
  error formats.

**Solution:**
Define `ValidationError` once. Route every validator through it.

**Files to Update:**
- [scripts/check-repo-contracts.mjs](../../scripts/check-repo-contracts.mjs)
  — refactor to emit `ValidationError[]`.
- [src/content-schema/](../../src/content-schema/) — Zod adapter
  produces `ValidationError`.
- [tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md](../../tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md)
  — replace ad-hoc "human-readable" criterion with the typed shape.

**New Files:**
- `content-schema/schemas/validation-error.schema.json`
- `src/content-schema/validation-error.ts` (TS type + Zod schema
  mirror)
- `tasks/mvp/02-content-schemas/15-validation-error-contract.md`

**Implementation Steps:**
1. Author `validation-error.schema.json` with required fields:
   `packId` (string, optional for repo-wide errors), `recordId`
   (string, optional), `schemaId` (string), `jsonPointer` (string,
   RFC 6901), `rule` (string — `enum`, `required`, `additional`,
   `type`, `minimum`, `format`, `custom`), `expected` (any),
   `actual` (any), `message` (string, human-readable).
2. Refactor `check-repo-contracts.mjs` to emit `ValidationError[]`,
   pretty-print for humans but expose `--json` flag for tooling.
3. Update Task 10 to require Zod adapter to produce
   `ValidationError[]` directly (not raw Zod errors).
4. Add `15-validation-error-contract.md` task with verify command
   that runs both validators on a malformed fixture and asserts the
   error JSON matches a snapshot.

**Dependencies:** None.

**Complexity:** S

---

### Schemas

#### Issue: Per-screen view-model contract is missing

**Source:** Q111 (⚠ Partial); Missing Logic bullet 1; Improvements
bullet 8.

**Problem:**
Each screen package's `data-contracts.md` lists which content schemas
and selectors it consumes by name only. The shape of the props/DTO
that the screen renderer actually receives is not formally typed.
Selector value-shapes are referenced but not schema-typed.

**Impact:**
- A screen rewrite (allowed by the "UI evolution policy") cannot be
  contract-checked against the previous renderer's input.
- AI agents implementing UI screens have no machine-checkable input
  contract; two agents may shape the same selector differently.
- Future TypeScript-first refactor cannot generate types for the
  60+ screen renderers.

**Solution:**
Per the audit, two acceptable approaches: (a) full
`screen-view-model.schema.json` family, or (b) generated TypeScript
types from `data-contracts.md`. Pick (b) — lower friction, no
authoring duplication, and matches the existing JSON-Schema-as-source
canonicality rule.

**Files to Update:**
- [docs/architecture/wiki/README.md](../architecture/wiki/README.md)
  — document the generation step and the contract.
- [package.json](../../package.json) — add `generate:screen-types`
  script.

**New Files:**
- `scripts/generate-screen-types.mjs`
- `src/ui/screen-view-models.generated.ts` (machine-generated; checked
  in for diff visibility)
- `tasks/mvp/03-ui-shell/screen-view-model-types-generation.md`
  (placement under existing UI shell task group; exact path adjusted
  to the next free task ID by `tasks:next`)

**Implementation Steps:**
1. Define a parseable section in each screen's `data-contracts.md`
   ("Selectors:" table with columns `name`, `type-ref`, `required`).
   Most packages already have this; the change is enforcing the
   format.
2. Implement `generate-screen-types.mjs` that reads each screen's
   `data-contracts.md`, resolves type refs against existing JSON
   Schemas, and emits `ScreenViewModel<<id>>` interfaces to
   `src/ui/screen-view-models.generated.ts`.
3. Wire into `npm run validate` so a diff fails CI.
4. Add a lint convention that screen renderers import the generated
   type, not an ad-hoc inline shape.
5. Author the task file under the UI shell group.

**Dependencies:**
- Validation-error contract (above) — generator emits structured
  errors when a `data-contracts.md` selector references an unknown
  schema.

**Complexity:** L

---

### Architecture

#### Issue: `engineHash` backfill at M2 is unscheduled

**Source:** Risks bullet 3.

**Problem:**
`engineHash` is "optional pre-M2" in pack manifests. Once the engine
ships at M2, every existing pack manifest needs a one-time
engine-hash backfill. The audit notes the migration for that
transition is not scheduled as a task.

**Impact:**
- M2 ships, every existing pack instantly fails the "refuse loud" gate
  for `engineHash` mismatch (now non-empty vs missing).
- Without a scheduled backfill task, the engine-hash transition lands
  ad-hoc, possibly skipping content-pack hash recompute.

**Solution:**
Pre-author a one-shot M2 migration task now, even though it cannot
run until the engine exists.

**Files to Update:**
- [tasks/mvp/](../../tasks/mvp/) — new task under appropriate phase.
- [docs/planning/implementation-log.md](../planning/implementation-log.md)
  — record the scheduled backfill.

**New Files:**
- `tasks/mvp/02-content-schemas/16-m2-engine-hash-backfill.md`

**Implementation Steps:**
1. Draft the task with: dependencies (`engine M2 ship`),
   `ownedPaths` covering manifest files in `resources/`,
   `verifyCommands` running `scripts/hash-pack.mjs --check` after
   backfill, and acceptance criteria "every shipped manifest has a
   non-empty `engineHash`".
2. Document the backfill procedure: regenerate engine bundle hash,
   write into manifests, recompute `contentHash` (since manifest
   changed), re-emit canonical-JSON.
3. Cross-link from `pack-contract.md`'s engineHash discussion.

**Dependencies:**
- Engine M2 ship — task is dormant until then.

**Complexity:** S (authoring); M (when actually executed at M2).

---

#### Issue: Float-ban ESLint rule is scoped to `src/engine` only

**Source:** Risks bullet 5; Improvements bullet 7.

**Problem:**
[Task 5](../../tasks/mvp/01-engine-core/05-eslint-rule-ban-math-random-and-floats-in-src-engine.md)
bans `Math.random` and floats only in `src/engine`. Formula
evaluators in `src/rules/`, content-runtime helpers, and schema-side
validators can reintroduce floats and break determinism.

**Impact:**
- A formula evaluator producing `0.5` instead of an integer
  numerator/denominator silently breaks the canonical-JSON contract.
- Content-runtime helpers reading numbers from packs could float-cast
  on JSON parse.

**Solution:**
Extend the existing ESLint rule's `files` glob to cover all
deterministic-adjacent paths.

**Files to Update:**
- [tasks/mvp/01-engine-core/05-eslint-rule-ban-math-random-and-floats-in-src-engine.md](../../tasks/mvp/01-engine-core/05-eslint-rule-ban-math-random-and-floats-in-src-engine.md)
  — broaden scope in acceptance criteria; rename internal references.
- `.eslintrc` (or equivalent config when src lands).

**Implementation Steps:**
1. Extend the rule's file glob to `src/{engine,rules,content-runtime,
   content-schema}/**/*.ts`.
2. Update task title/body to reflect broader scope (consider renaming
   the task file to drop the `-in-src-engine` suffix; or supersede
   with a new task ID per `validate:tasks`).
3. Add a fixture-based test asserting the rule fires on each
   newly-covered path.

**Dependencies:**
- ESLint config exists (currently planned alongside Task 5).

**Complexity:** S

---

### Tasks

The work above introduces the following new task files. All follow
the existing task-system contract (frontmatter, ownedPaths,
dependencies, verifyCommands). All must be picked via
`npm run tasks:next` once the registry is regenerated.

- `tasks/mvp/02-content-schemas/12-schema-migration-policy-and-example.md`
- `tasks/mvp/02-content-schemas/13-enum-lifecycle-and-snapshot-gate.md`
- `tasks/mvp/02-content-schemas/14-default-declarations-and-zod-parity.md`
- `tasks/mvp/02-content-schemas/15-validation-error-contract.md`
- `tasks/mvp/02-content-schemas/16-m2-engine-hash-backfill.md` (dormant
  until M2)
- `tasks/mvp/03-ui-shell/screen-view-model-types-generation.md`
  (exact ID assigned by `tasks:next` to avoid collision)

After authoring the task files, run:

```
npm run generate:task-registry
npm run validate:tasks
npm run validate
```

---

## 4. Suggested Task Breakdown

- [ ] T-12: Author `schema-migration-policy.md` + worked example
      migration in `migrations/` registry; wire `migrate.ts` to
      discover entries.
- [ ] T-13: Implement `snapshot-enums.mjs` + `check-enum-snapshot.mjs`,
      commit baseline `enums.snapshot.json`, author
      `enum-lifecycle-policy.md`.
- [ ] T-14: Add `default` keywords to schemas where prose declares a
      default; mirror in Zod; add round-trip-of-defaults CI test.
- [ ] T-15: Author `validation-error.schema.json` + TS type; refactor
      `check-repo-contracts.mjs` and Zod adapter to emit it.
- [ ] T-VM: Author `version-policy.md` with consolidated decision
      matrix; replace duplicated prose in four source docs.
- [ ] T-SVM: Implement `generate-screen-types.mjs`; emit
      `screen-view-models.generated.ts`; wire into `validate`.
- [ ] T-FB: Pre-author M2 engine-hash backfill task (dormant).
- [ ] T-LINT: Broaden float-ban ESLint rule scope to `src/rules/`,
      `src/content-runtime/`, `src/content-schema/`.

Each checkbox above maps to one task file under `tasks/`.

---

## 5. Execution Order

Sequenced by dependency and by "first breaking change blocker"
priority. Items marked **[dormant]** are authored now but execute
later.

1. **T-VM — Version-mismatch decision matrix** *(unblocks all docs;
   pure documentation; zero dependencies)*
2. **T-15 — `ValidationError` contract** *(prerequisite for T-13's
   structured failures and T-SVM's generator errors)*
3. **T-12 — Schema migration policy + worked example** *(prerequisite
   for T-13's alias mechanism)*
4. **T-13 — Enum lifecycle + CI snapshot gate** *(depends on T-12 for
   the alias entries)*
5. **T-14 — `default` declarations + Zod parity** *(depends on Task 10
   Zod validators existing in some form; can run in parallel with T-13
   once Task 10 is in flight)*
6. **T-LINT — Broaden float-ban ESLint scope** *(independent; can run
   any time after ESLint config exists)*
7. **T-SVM — Screen view-model type generation** *(depends on T-15 for
   error reporting; largest single item; can be deferred until
   `data-contracts.md` files are stable)*
8. **T-FB — M2 engine-hash backfill** *(authored now; **[dormant]**
   until engine M2 ships)*

---

## 6. Risks if Not Implemented

- **First breaking schema change becomes the load-bearing precedent**
  — without T-12, the first migration is invented under deadline
  pressure and copied forever.
- **Silent enum removal** — without T-13, a one-line PR can corrupt
  every existing save/replay with no failing CI check.
- **Validator divergence on defaults** — without T-14, JSON-Schema
  and Zod validators can produce different canonical-JSON for the
  same input record, breaking `contentHash` and therefore breaking
  save/replay/MP determinism.
- **Tooling cannot consume errors** — without T-15, editor surfacing
  and the Phase-3 AI generation feedback loop have no structured
  shape; both end up parsing strings.
- **UI rewrite cannot be contract-checked** — without T-SVM, the
  documented "UI evolution policy" cannot guarantee the new renderer
  consumes the same data shape as the old.
- **Confusing user-facing behaviour** — without T-VM, the same save
  succeeding offline but failing online has no documented rationale
  to surface in UI copy.
- **Determinism leak outside `src/engine`** — without T-LINT, a
  formula evaluator or content-runtime helper can reintroduce floats
  and break canonical-JSON without any test catching it.
- **M2 ship-day breakage** — without T-FB pre-authored, the
  engine-hash backfill races the engine release.

---

## 7. AI Implementation Readiness

**Score: 8 / 10** *(matches audit; this plan is the path from 8 → 10)*

**Why 8 today:**
- 33 closed JSON Schemas with canonical examples per record kind.
- Single discovery index (`schema-matrix.md`).
- Canonical-JSON spec, xxh64 spec, and `hash-pack.mjs` CI gate.
- Closed command vocabulary with `additionalProperties: false`.
- Round-trip tests as acceptance criteria — implementations are
  mechanically verifiable.

**What blocks 9 / 10:**
- T-12 (migration precedent) and T-13 (enum gate) — together close
  the "first breaking change" hole.
- T-14, T-15, T-SVM — close the multi-agent parallel-execution gap
  where two agents could implement the same contract differently
  with no detection.

**After this plan ships:**
- Migration runner has a worked example to clone.
- Enum removals fail CI loudly.
- Defaults parity is mechanically tested.
- Errors are structured and machine-consumable.
- Screen renderers have generated types.
- All deterministic-adjacent code is under the float-ban lint.

That puts the data-contract layer at **10 / 10** for AI-driven
execution: every gap the audit named has either a passing test, a
CI gate, or a worked example to copy from.
