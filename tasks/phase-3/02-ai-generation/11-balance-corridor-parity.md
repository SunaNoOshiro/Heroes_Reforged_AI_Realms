# Balance-Corridor Parity (`corridor.json` SSOT)

Module: [AI Generation (M6 / M7)](../02-ai-generation.md)

Description:
Pin
[`content-schema/balance/corridor.json`](../../../content-schema/balance/corridor.json)
as the **single source of truth** for per-tier numeric bounds (hp,
attack, defense, damageMin, damageMax, speed). Closes NC-3 (Fold balance corridor data into one source).

The companion fixture
[`content-schema/examples/balance-constraints/canonical.balance-constraints.json`](../../../content-schema/examples/balance-constraints/canonical.balance-constraints.json)
remains shape-validatable against
[`balance-constraints.schema.json`](../../../content-schema/schemas/balance-constraints.schema.json),
but its `tierCorridors` block is now *generated* from
`corridor.json` by
[`scripts/build-balance-constraints.mjs`](../../../scripts/build-balance-constraints.mjs).
A new validator
[`scripts/check-balance-corridor-parity.mjs`](../../../scripts/check-balance-corridor-parity.mjs)
asserts the two files are numerically identical and is wired into
`npm run validate` via `validate:balance-corridor-parity`.

A pure JSON-Schema `$ref` from `balance-constraints.schema.json` to
`corridor.json` is incompatible with the AJV loader (canonical
data file, not a schema), so the generator-script approach was
chosen § Risk Notes.

Read First:
  § NC-3
- [`docs/architecture/content-system-policy.md`](../../../docs/architecture/content-system-policy.md)
  § balance corridor
- [`tasks/phase-3/02-ai-generation/00b-balance-constraints-schema.md`](./00b-balance-constraints-schema.md)

Inputs:
- [`content-schema/balance/corridor.json`](../../../content-schema/balance/corridor.json)
- [`content-schema/schemas/balance-constraints.schema.json`](../../../content-schema/schemas/balance-constraints.schema.json)
- [`content-schema/examples/balance-constraints/canonical.balance-constraints.json`](../../../content-schema/examples/balance-constraints/canonical.balance-constraints.json)

Outputs:
- [`scripts/build-balance-constraints.mjs`](../../../scripts/build-balance-constraints.mjs)
  — regenerates the canonical example from `corridor.json`.
- [`scripts/check-balance-corridor-parity.mjs`](../../../scripts/check-balance-corridor-parity.mjs)
  — read-only parity check; fails if the example drifted.
- `validate:balance-corridor-parity` npm script wired into
  `npm run validate`.
- `generate:balance-constraints` npm script for manual regeneration.

Owned Paths:
- `scripts/build-balance-constraints.mjs`
- `scripts/check-balance-corridor-parity.mjs`

Owned Paths (shared):
- `content-schema/examples/balance-constraints/canonical.balance-constraints.json`
  — primary owner is
  [`tasks/phase-3/02-ai-generation/00b-balance-constraints-schema.md`](./00b-balance-constraints-schema.md);
  this task generates the file from `corridor.json` and must not
  rewrite the `maxHp` / `maxAtk` / `maxDef` / `maxAbilitiesPerUnit`
  hard caps that ship in the fixture.
- `package.json` — primary owner is the repo root; this task adds
  the two npm script entries **additively** and appends one
  segment to the `validate` aggregate.

Dependencies:
- phase-3.02-ai-generation.00b-balance-constraints-schema

Acceptance Criteria:
- A grep for `"hp": { "lo":` (or any per-tier corridor numeric
  bound) inside `content-schema/schemas/` returns zero hits — the
  schema carries shape only.
- `corridor.json` carries the per-tier numbers; the canonical
  example duplicates them only because the generator emits them.
- `npm run generate:balance-constraints` regenerates the example with
  zero diff against the committed file.
- `npm run validate:balance-corridor-parity` exits 0 today.
- The validator exits non-zero when an editor changes the example's
  `tierCorridors` without re-running the generator.
- `npm run validate:balance` (existing balance gate) still passes.

Owned Paths (shared) acceptance:
- The balance-constraints canonical example is **owned by**
  `phase-3.02-ai-generation.00b-balance-constraints-schema` (the
  primary contract). This task is **additive**: the example is
  regenerated mechanically from `corridor.json`; this task must
  not rewrite the `maxHp` / `maxAtk` / `maxDef` /
  `maxAbilitiesPerUnit` hard caps.
- `package.json` is **owned by** the repo root. This task is
  **additive**: two new script entries plus one segment in the
  `validate` aggregate are appended; this task must not rewrite
  any existing entry.

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
