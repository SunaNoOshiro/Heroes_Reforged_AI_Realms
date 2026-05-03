# Implementation Report: 06 — Data Contracts & Schema

> Companion to
> [`docs/implementation-plans/06-data-contracts-and-schema-plan.md`](./06-data-contracts-and-schema-plan.md).
> Records what was actually applied to the repository on 2026-05-03.

---

## Summary

All eight items in the plan landed in this pass:

- **T-VM** — version-mismatch decision matrix consolidated into one
  doc; four source docs deduplicated.
- **T-15** — `ValidationError` schema, two example records, and a
  `--json`-flag refactor brief in the task file.
- **T-12** — schema-migration policy doc + worked example migration
  end-to-end (entry, fixtures, passing test).
- **T-13** — enum-value lifecycle policy + CI snapshot gate
  (snapshot script, check script, baseline `enums.snapshot.json`,
  `enums.removed.json`, wired into `npm run validate`).
- **T-14** — schema-defaults policy + Task 10 acceptance-criteria
  extension.
- **T-LINT** — float-ban ESLint task rescoped to
  `src/{engine,rules,content-runtime,content-schema}/**/*.ts`.
- **T-SVM** — screen view-model generation task authored under the UI
  shell module.
- **T-FB** — M2 engine-hash backfill task pre-authored (dormant
  until the engine reaches M2).

`npm run validate` is green: 320 tasks, 0 issues. The new enum
snapshot has 786 lines covering every closed `enum` and `const` in
the schema family.

The `node --test` run on
`src/content-schema/migrations/example-v1-to-v2-rename-field.test.ts`
passes 3/3 (metadata, rewrite, pass-through) under
`--experimental-strip-types`.

---

## 1. Updated files

### `docs/architecture/state-flow.md`

Replaced the `fail loud: contentHash mismatch` prose at the
`pack hashes match save?` decision with a pointer at the new
`version-policy.md` matrix; added a "Related docs" link to the same
file.

### `docs/architecture/pack-contract.md`

Replaced the per-mismatch prose under "Hash fields" with a pointer at
`version-policy.md`.

### `docs/architecture/content-platform.md`

Extended the "Update Safety" bullet list with a paragraph linking
`schema-migration-policy.md`, `enum-lifecycle-policy.md`,
`schema-defaults-policy.md`, and `version-policy.md` so all four new
policy docs are reachable from the source-of-truth page.

### `docs/architecture/schema-matrix.md`

Added a `ValidationError` row under the record table and a new
"Migrations" footer section pointing at all four policy docs.

### `tasks/mvp/08-persistence/02-log-only-save-format.md`

Replaced the line-50 "Content pack changed since save" prose with a
context-aware reference to the `version-policy.md` matrix.

### `tasks/mvp/02-content-schemas/11-schema-version-field-plus-migration-stub.md`

Extended Outputs and Acceptance Criteria so the migration runner
discovers entries from the `migrations/` registry (instead of an
inline empty array) and the worked-example test passes.

### `tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md`

Added two acceptance criteria: byte-identical canonical-JSON parity
between JSON Schema defaults and Zod `.default(...)`, and a
`toValidationErrors(zodError, ctx): ValidationError[]` adapter so
consumers never see raw Zod internals.

### `tasks/mvp/01-engine-core/05-eslint-rule-ban-math-random-and-floats-in-src-engine.md`

Renamed the title (dropped the `-in-src-engine` suffix), broadened
the file glob to `src/{engine,rules,content-runtime,content-schema}/**/*.ts`,
and added a fixture-based test acceptance criterion that the rule
fires on each newly-covered path.

### `tasks/mvp/02-content-schemas.md`

Listed the five new content-schema task files in the module index.

### `tasks/mvp/07-ui-shell.md`

Listed the new screen view-model generation task in the module index.

### `scripts/check-repo-contracts.mjs`

Added a `.error.json` suffix mapping pointing at
`validation-error.schema.json` so the new example records are
covered by `validate:contracts`.

### `package.json`

Added `npm run generate:enum-snapshot` and `npm run validate:enums`; wired
`validate:enums` into the `validate` aggregate.

### `content-schema/schemas/README.md`

Added the "Enum value lifecycle" section pointing at the policy and
the snapshot file.

### `docs/planning/implementation-log.md`

Recorded the data-contracts pass under a new
"Data Contracts & Schema Plan Implementation (2026-05-03)" section,
including links to every new doc, script, schema, example, and task
file plus the three extended task files.

---

## 2. New files

### Architecture docs

- `docs/architecture/version-policy.md`
  Single decision matrix for refuse / migrate / degrade across
  six mismatch kinds × three contexts (offline / multiplayer /
  trusted-replay).
- `docs/architecture/schema-migration-policy.md`
  Canonical procedure for schemaVersion bumps, migration entry
  filenames, required exports, deprecation window.
- `docs/architecture/enum-lifecycle-policy.md`
  Additive → deprecated → aliased → removed lifecycle plus how the
  CI snapshot gate consumes the alias and removed-values tables.
- `docs/architecture/schema-defaults-policy.md`
  When to declare `default`, how Zod must mirror, integers-only rule,
  fillable-defaults-forbidden-on-required-fields rule.

### Schemas + examples

- `content-schema/schemas/validation-error.schema.json`
  Closed `ValidationError` shape with `rule` enum covering every
  validator the project ships.
- `content-schema/examples/records/validation-error/missing-required.error.json`
- `content-schema/examples/records/validation-error/unknown-enum.error.json`

### Migration registry

- `src/content-schema/migrations/README.md`
- `src/content-schema/migrations/example-v1-to-v2-rename-field.ts`
- `src/content-schema/migrations/example-v1-to-v2-rename-field.test.ts`
- `src/content-schema/migrations/fixtures/example-v1-to-v2-rename-field.input.json`
- `src/content-schema/migrations/fixtures/example-v1-to-v2-rename-field.expected.json`

### CI scripts + baselines

- `scripts/snapshot-enums.mjs`
  Walks every `*.schema.json`, collects `enum` arrays + `const`
  values, writes a sorted JSON snapshot.
- `scripts/check-enum-snapshot.mjs`
  Diffs current enums against the baseline; fails on a removed value
  not authorised by an alias entry + matching migration, or by an
  explicit removed-values entry.
- `content-schema/enums.snapshot.json`
  Committed baseline (786 lines) covering every closed enum at
  authoring time.
- `content-schema/enums.removed.json`
  Empty-object placeholder for future tombstones.

### New task files

- `tasks/mvp/02-content-schemas/22-validation-error-contract.md`
- `tasks/mvp/02-content-schemas/23-schema-migration-policy-and-example.md`
- `tasks/mvp/02-content-schemas/24-enum-lifecycle-and-snapshot-gate.md`
- `tasks/mvp/02-content-schemas/25-default-declarations-and-zod-parity.md`
- `tasks/mvp/02-content-schemas/26-m2-engine-hash-backfill.md` (dormant)
- `tasks/mvp/07-ui-shell/21-screen-view-model-types-generation.md`

---

## 3. Assumptions

- **Task IDs renumbered to avoid collision.** The plan named new
  task files `12-…` through `16-…` under `tasks/mvp/02-content-schemas/`,
  but those IDs already belong to existing tasks (formula-dsl,
  effect-registry, localization-schema, world-schema, etc., up to
  `21-error-state-schema.md`). I followed the plan's own §3 Tasks
  guidance ("exact ID assigned by `tasks:next` to avoid collision")
  and used the next free IDs `22`–`26`. The semantic mapping is
  preserved verbatim:
  - T-12 → `23-schema-migration-policy-and-example.md`
  - T-13 → `24-enum-lifecycle-and-snapshot-gate.md`
  - T-14 → `25-default-declarations-and-zod-parity.md`
  - T-15 → `22-validation-error-contract.md`
  - T-FB → `26-m2-engine-hash-backfill.md`
- **UI-shell task ID for T-SVM.** The plan said
  `tasks/mvp/03-ui-shell/screen-view-model-types-generation.md`
  with the bracketed note "exact ID assigned by `tasks:next`". The
  actual UI shell module lives at `tasks/mvp/07-ui-shell/`
  (group 03 is `03-map-system`), so the file landed at
  `tasks/mvp/07-ui-shell/21-screen-view-model-types-generation.md`.
- **Worked-example test runner.** The TypeScript workspace is not yet
  scaffolded (Task 1 of `01-engine-core` is still planned). I made
  the migration test importable with `.ts` extensions so it runs
  today under `node --experimental-strip-types --test …`. When the
  workspace lands and a bundler/test-runner is configured, the
  imports should be retargeted per whatever convention that
  workspace adopts.
- **`engine-m2-ship` lint surrogate.** The plan asked for an
  `engine M2 ship` dependency on the dormant backfill task, but the
  task lint requires real task or `module:` IDs. I used
  `module:mvp.01-engine-core` as the closest scheduler-actionable
  surrogate; the prose in the description still says "dormant until
  M2".
- **Empty `enums.removed.json` baseline.** The lifecycle policy
  needs the file to exist for the check script to read; nothing has
  been removed yet, so it ships as `{}`.

---

## 4. Blockers

None. `npm run validate` is green and the worked-example test
passes 3/3 under `node --experimental-strip-types`.

---

## 5. Verification

```
$ npm test
…
# tests 32
# pass 32

$ npm run validate
…
Task lint passed: 320 tasks, 0 issues.
Module-graph check passed.
Screen component coverage check passed.
animation-budget validator: ok
Enum snapshot check passed.

$ node --experimental-strip-types --test \
    src/content-schema/migrations/example-v1-to-v2-rename-field.test.ts
…
# tests 3
# pass 3
# fail 0

$ npm run generate:enum-snapshot && git diff --exit-code content-schema/enums.snapshot.json
Wrote content-schema/enums.snapshot.json.
(no diff)
```
