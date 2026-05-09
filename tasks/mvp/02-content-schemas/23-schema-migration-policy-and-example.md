# Schema Migration Policy and Worked Example

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Author the canonical schema-migration policy and ship one
end-to-end worked example so the first real schema-evolution PR has
a template to clone instead of inventing one under deadline pressure.
Today
[`src/content-schema/migrate.ts`](../../../src/content-schema/) is a
stub with an empty migration table and the only stated policy lives
in prose under
[`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md).
Without a concrete file-layout convention and a passing fixture, two
parallel agents writing migrations will diverge on naming, required
exports, and test conventions.

Read First:
- [`docs/architecture/schema-migration-policy.md`](../../../docs/architecture/schema-migration-policy.md)
- [`docs/architecture/content-platform.md`](../../../docs/architecture/content-platform.md)
- [`docs/architecture/version-policy.md`](../../../docs/architecture/version-policy.md)

Inputs:
- Existing migration stub task
  [`tasks/mvp/02-content-schemas/11-schema-version-field-plus-migration-stub.md`](./11-schema-version-field-plus-migration-stub.md)
- Schema list under
  [`content-schema/schemas/`](../../../content-schema/schemas/)

Outputs:
- `docs/architecture/schema-migration-policy.md`
- `src/content-schema/migrations/README.md`
- `src/content-schema/migrations/example-v1-to-v2-rename-field.ts`
- `src/content-schema/migrations/example-v1-to-v2-rename-field.test.ts`
- `src/content-schema/migrations/fixtures/example-v1-to-v2-rename-field.input.json`
- `src/content-schema/migrations/fixtures/example-v1-to-v2-rename-field.expected.json`

Owned Paths:
- `docs/architecture/schema-migration-policy.md`
- `src/content-schema/migrations/README.md`
- `src/content-schema/migrations/example-v1-to-v2-rename-field.ts`
- `src/content-schema/migrations/example-v1-to-v2-rename-field.test.ts`
- `src/content-schema/migrations/fixtures/`

Dependencies:
- mvp.02-content-schemas.11-schema-version-field-plus-migration-stub

Acceptance Criteria:
- `schema-migration-policy.md` covers when to bump `schemaVersion`,
  the canonical filename `v<N>-to-v<M>-<short-purpose>.ts`, the
  required exports (`from`, `to`, `appliesTo`, `migrate`), the
  test convention (input/expected fixtures), and the deprecation
  window definition.
- `migrations/README.md` lists the entry conventions and explains how
  the runner discovers entries.
- `example-v1-to-v2-rename-field.ts` exports `from = 1`, `to = 2`,
  an `appliesTo` array containing only the placeholder
  `heroes-reforged/_example-only.schema.json` (so the runner never
  applies it to a shipping schema), and a pure `migrate` function.
- `example-v1-to-v2-rename-field.test.ts` runs under `node --test`
  and asserts: deep-equal of `migrate(input.json) === expected.json`,
  pass-through of non-matching records, and the `to === from + 1`
  invariant.
- `docs/architecture/content-platform.md` "Update Safety" section
  links to `schema-migration-policy.md`.
- `docs/architecture/schema-matrix.md` references the policy via a
  Migrations footnote.

Verify:
- npm run validate:contracts
- npm run validate:tasks
- npm run validate

Estimated Time:
- 4 hours
