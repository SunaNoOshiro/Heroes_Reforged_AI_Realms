# Supersession Annotations and Validator

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
Pin a machine-readable supersession convention for schemas under
`content-schema/schemas/` so superseded schemas surface failures at
CI time instead of at first runtime. Closes Plan 32 § NC-2 (Make
the supersession graph machine-readable).

The convention: each superseded schema carries a top-level
`"x-supersededBy": "<schema-id>"` annotation paired with
`"x-supersededReason": "<plan-id>"`. The companion validator
[`scripts/check-supersession.mjs`](../../../scripts/check-supersession.mjs)
fails when a task `Owned Paths` cites a superseded schema without
referencing the supersession authority, when a canonical example
fixture is authored under a superseded schema, or when an
annotation points at an unknown target.

Read First:
- [`docs/implementation-plans/32-cross-plan-conflict-resolution-plan.md`](../../../docs/implementation-plans/32-cross-plan-conflict-resolution-plan.md)
  § NC-2
- [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)
- [`docs/implementation-plans/26-replay-tampering-and-simulation-cheating-plan.md`](../../../docs/implementation-plans/26-replay-tampering-and-simulation-cheating-plan.md)

Inputs:
- Existing schemas under `content-schema/schemas/`.
- The supersession declarations in Plan 25 (TURN rotation, HTTP
  `/turn-credential` route) and Plan 26
  (`command-envelope.schema.json` →
  `lockstep-envelope.schema.json`).

Outputs:
- Top-level `x-supersededBy` and `x-supersededReason` annotations
  on every landed-but-replaced schema.
- [`scripts/check-supersession.mjs`](../../../scripts/check-supersession.mjs)
  validator with the three invariants above.
- `validate:supersession` npm script wired into `npm run validate`.
- Footer entry in
  [`docs/architecture/schema-matrix.md`](../../../docs/architecture/schema-matrix.md)
  documenting the convention and listing currently-superseded
  schemas.

Owned Paths:
- `scripts/check-supersession.mjs`

Owned Paths (shared):
- `content-schema/schemas/command-envelope.schema.json` — primary
  owner is
  [`tasks/mvp/02-content-schemas/43-multiplayer-trust-and-identity-schemas.md`](./43-multiplayer-trust-and-identity-schemas.md);
  this task adds the `x-supersededBy` and `x-supersededReason`
  annotations **additively** and does not rewrite any existing
  property.
- `docs/architecture/schema-matrix.md` — primary owner is the schema
  module; this task appends one footer section documenting the
  validator and annotation convention.
- `package.json` — primary owner is the repo root; this task adds
  the `validate:supersession` script entry **additively** and
  appends one segment to the `validate` aggregate.

Dependencies:
- mvp.02-content-schemas.10-zod-validators-for-all-schemas

Acceptance Criteria:
- `command-envelope.schema.json` carries `x-supersededBy =
  "heroes-reforged/lockstep-envelope.schema.json"` and
  `x-supersededReason = "plan-26"`.
- `npm run validate:supersession` exits 0 with the current schemas.
- `npm run validate:supersession` exits non-zero when an
  `x-supersededBy` target does not resolve to a known schema, when
  a canonical example is authored under a superseded schema folder,
  or when a task `Owned Paths` cites a superseded schema without
  referencing the supersession authority.
- The validator is documented in
  [`schema-matrix.md`](../../../docs/architecture/schema-matrix.md)
  Supersession section.
- The validator is wired into the `validate` aggregate.

Owned Paths (shared) acceptance:
- The command-envelope schema is **owned by**
  `mvp.02-content-schemas.43-multiplayer-trust-and-identity-schemas`
  (the primary contract). This task is **additive**: only the
  `x-supersededBy` and `x-supersededReason` annotations are
  appended; this task must not rewrite the existing required
  fields, properties, or patterns.
- The schema-matrix doc is **owned by** the schema module. This
  task is **additive**: a single Supersession footer section is
  appended; this task must not rewrite the existing tables.
- `package.json` is **owned by** the repo root. This task is
  **additive**: only the `validate:supersession` script entry and
  one segment in the `validate` aggregate are appended; this task
  must not rewrite any existing entry.

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
