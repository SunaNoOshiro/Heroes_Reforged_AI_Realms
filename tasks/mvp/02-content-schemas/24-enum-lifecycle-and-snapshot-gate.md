# Enum Lifecycle and Snapshot Gate

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Land the enum-value lifecycle policy and the CI snapshot gate that
backs it. Closed enums are pervasive
(`command.kind`, `manifest.capabilities`, `resource-id`, `stat-id`,
`status-id`, effect kinds, spell schools). Removing a value is
silently breaking for every save and replay that references it.
Today no procedure or check exists; a single PR can corrupt every
existing save with no failing CI gate. This task adds the policy doc
and the snapshot/check pair.

Source plan:
[`docs/implementation-plans/06-data-contracts-and-schema-plan.md`](../../../docs/implementation-plans/06-data-contracts-and-schema-plan.md)
(§ Enum-value lifecycle, T-13).

Read First:
- [`docs/implementation-plans/06-data-contracts-and-schema-plan.md`](../../../docs/implementation-plans/06-data-contracts-and-schema-plan.md)
- [`docs/architecture/enum-lifecycle-policy.md`](../../../docs/architecture/enum-lifecycle-policy.md)
- [`docs/architecture/schema-migration-policy.md`](../../../docs/architecture/schema-migration-policy.md)

Inputs:
- All `*.schema.json` files under
  [`content-schema/schemas/`](../../../content-schema/schemas/)
- The validation-error contract from
  [`tasks/mvp/02-content-schemas/22-validation-error-contract.md`](./22-validation-error-contract.md)
- The migration registry layout from
  [`tasks/mvp/02-content-schemas/23-schema-migration-policy-and-example.md`](./23-schema-migration-policy-and-example.md)

Outputs:
- `docs/architecture/enum-lifecycle-policy.md`
- `scripts/snapshot-enums.mjs`
- `scripts/check-enum-snapshot.mjs`
- `content-schema/enums.snapshot.json` (committed baseline)
- `package.json` exposes `npm run generate:enum-snapshot` and
  `npm run validate:enums`; the latter is wired into `npm run validate`

Owned Paths:
- `docs/architecture/enum-lifecycle-policy.md`
- `scripts/snapshot-enums.mjs`
- `scripts/check-enum-snapshot.mjs`
- `content-schema/enums.snapshot.json`

Owned Paths (shared):
- `package.json`
- `content-schema/schemas/README.md`

Dependencies:
- mvp.02-content-schemas.23-schema-migration-policy-and-example
- mvp.02-content-schemas.22-validation-error-contract

Acceptance Criteria:
- The shared edits to `package.json` and
  `content-schema/schemas/README.md` are **additive**: this task adds
  the `generate:enum-snapshot` and `validate:enums` scripts and the "Enum
  value lifecycle" section without rewriting unrelated scripts or
  removing existing schema-family prose. Their primary contracts
  remain owned by the repo-root tooling task and the schema-family
  README, respectively, and must not be rewritten by this task.
- `enum-lifecycle-policy.md` defines the four lifecycle states
  (additive, deprecated, aliased, removed) and the workflow per kind
  of change.
- `scripts/snapshot-enums.mjs` walks every `*.schema.json`, collects
  `enum` arrays and `const` values, and writes a sorted JSON file
  keyed by `<schemaId>#<jsonPointer>` → `string[]`.
- `scripts/check-enum-snapshot.mjs` rebuilds the snapshot in memory,
  diffs against the baseline, and fails on a removed value unless one
  of: (a) an alias entry exists in `<record>.aliases.json` paired
  with a migration entry under `src/content-schema/migrations/`, or
  (b) the value is listed in `content-schema/enums.removed.json` with
  a `since:` tag.
- `npm run generate:enum-snapshot && git diff --exit-code` is clean on a
  freshly checked-out tree.
- `npm run validate:enums` is wired into `npm run validate`.
- `content-schema/schemas/README.md` includes an "Enum value
  lifecycle" section pointing at the policy and the snapshot file.

Verify:
- npm run generate:enum-snapshot
- npm run validate:enums
- npm run validate:contracts
- npm run validate:tasks
- npm run validate

Estimated Time:
- 4 hours
