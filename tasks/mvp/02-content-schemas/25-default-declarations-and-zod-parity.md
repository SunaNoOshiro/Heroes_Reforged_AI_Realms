# Default Declarations and Zod Parity

Module: [Content Schemas (M0/M1)](../02-content-schemas.md)

Description:
For every optional field whose prose documents a default ("if absent",
"defaults to", "derive from"), declare a `default` keyword in the
JSON Schema and mirror it with a `.default(...)` call in the Zod
validator. Without this, the JSON Schema walker in
[`scripts/check-repo-contracts.mjs`](../../../scripts/check-repo-contracts.mjs)
and the Zod adapter authored under Task 10 may fill defaults
differently, producing different canonical-JSON for the same input
record. Different canonical-JSON → different `contentHash` →
broken save/replay/multiplayer determinism.

Source plan:
[`docs/implementation-plans/06-data-contracts-and-schema-plan.md`](../../../docs/implementation-plans/06-data-contracts-and-schema-plan.md)
(§ default keyword missing, T-14).

Read First:
- [`docs/implementation-plans/06-data-contracts-and-schema-plan.md`](../../../docs/implementation-plans/06-data-contracts-and-schema-plan.md)
- [`docs/architecture/schema-defaults-policy.md`](../../../docs/architecture/schema-defaults-policy.md)
- [`docs/architecture/determinism.md`](../../../docs/architecture/determinism.md)

Inputs:
- All `*.schema.json` files under
  [`content-schema/schemas/`](../../../content-schema/schemas/)
- Zod adapter from
  [`tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md`](./10-zod-validators-for-all-schemas.md)

Outputs:
- `docs/architecture/schema-defaults-policy.md`
- `default` keywords added to every optional field in
  `content-schema/schemas/*.schema.json` whose prose documents a
  default value
- A grep audit recorded under this task showing every prose match for
  "if absent" / "defaults to" / "derive from" and which schema field
  resolved each

Owned Paths:
- `docs/architecture/schema-defaults-policy.md`

Owned Paths (shared):
- `content-schema/schemas/`
- `tasks/mvp/02-content-schemas/10-zod-validators-for-all-schemas.md`

Dependencies:
- mvp.02-content-schemas.10-zod-validators-for-all-schemas

Acceptance Criteria:
- The shared edits to `content-schema/schemas/` and Task 10's
  acceptance criteria are **additive**: this task only declares
  `default` keywords next to optional fields and extends Task 10's
  acceptance list. The primary contracts (each schema's record shape
  is owned by its authoring task; Task 10 owns the Zod adapter) — this
  task must not rewrite them.
- `schema-defaults-policy.md` covers when to declare a default, the
  Zod mirror requirement, the integers-only rule, and the
  fillable-defaults-forbidden-on-required-fields rule.
- Every optional field whose prose documents a default has a `default`
  keyword in the JSON Schema. The audit grep shows zero un-resolved
  prose-only defaults remaining.
- All declared defaults are integers, booleans, the empty array, the
  empty object, or strings matching the field's `pattern`/`enum`. No
  floats.
- Task 10 acceptance criteria include the round-trip-of-defaults
  parity test (already extended).
- `npm run validate:contracts` passes with the new `default` keywords
  in place.

Verify:
- npm run validate:contracts
- npm run validate:tasks
- npm run validate

Estimated Time:
- 4 hours
