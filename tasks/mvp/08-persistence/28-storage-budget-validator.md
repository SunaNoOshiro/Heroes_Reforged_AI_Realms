# Storage Budget Validator

Module: [Persistence (M3 / M4)](../08-persistence.md)

Description:
Pin a CI gate that totals the per-store soft caps declared in
[`docs/architecture/storage-policy.md`](../../../docs/architecture/storage-policy.md)
§ Per-Store Byte Budgets and asserts the sum fits within the
[RR-05](../../../docs/architecture/runtime-requirements.md#rr-05-storage--indexeddb--50-mb-opfs-preferred-when-present)
IndexedDB-quota floor times a documented headroom multiplier.
Closes Plan 32 § PI-7 (Storage budget aggregator). Plans 21, 22,
23, 24 each added per-store budgets without an aggregator; this
task is the aggregator.

Read First:
- [`docs/architecture/storage-policy.md`](../../../docs/architecture/storage-policy.md)
- [`docs/architecture/runtime-requirements.md`](../../../docs/architecture/runtime-requirements.md)
  § RR-05
- [`docs/implementation-plans/32-cross-plan-conflict-resolution-plan.md`](../../../docs/implementation-plans/32-cross-plan-conflict-resolution-plan.md)
  § PI-7

Inputs:
- `docs/architecture/storage-policy.md` § Per-Store Byte Budgets table.
- `docs/architecture/runtime-requirements.md` RR-05 floor.

Outputs:
- [`scripts/check-storage-budget.mjs`](../../../scripts/check-storage-budget.mjs)
  — parses the table, sums numeric caps, fails when the total
  exceeds the documented headroom ceiling.
- `validate:storage-budget` npm script wired into
  `npm run validate`.
- One-line backlink in `runtime-requirements.md` RR-05 and
  `storage-policy.md` § Per-Store Byte Budgets pointing at the
  validator.

Owned Paths:
- `scripts/check-storage-budget.mjs`

Owned Paths (shared):
- `package.json` — primary owner is the repo root; this task adds
  the `validate:storage-budget` script entry **additively** and
  appends one segment to the `validate` aggregate.
- `docs/architecture/runtime-requirements.md` and
  `docs/architecture/storage-policy.md` — primary owners are the
  persistence and runtime-requirements modules; this task adds
  one-line backlinks pointing at the validator and must not
  rewrite the existing tables / floors.

Dependencies:
- mvp.08-persistence.01-indexeddb-wrapper

Acceptance Criteria:
- `npm run validate:storage-budget` passes against the current
  `storage-policy.md` table.
- Adding a fake 1 GB store to the table fails the validator with
  a clear "summed soft caps … exceed ceiling …" message.
- `runtime-requirements.md` RR-05 verification entry references
  the validator.
- `storage-policy.md` § Per-Store Byte Budgets table references
  the validator.
- The headroom multiplier is documented in the script header per
  Plan 32 § PI-7 Risk Notes; tightening it once real overhead
  numbers surface is a follow-up.

Owned Paths (shared) acceptance:
- `package.json` is **owned by** the repo root (the primary
  contract). This task is **additive**: only one new
  `validate:storage-budget` script entry plus one segment in the
  `validate` aggregate are appended; this task must not rewrite
  any existing entry.
- `runtime-requirements.md` and `storage-policy.md` are **owned
  by** the persistence module (the primary contract). This task
  is **additive**: one-line backlinks to the validator are
  appended to RR-05 and the per-store byte budgets table; this
  task must not rewrite the existing tables and floors.

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
