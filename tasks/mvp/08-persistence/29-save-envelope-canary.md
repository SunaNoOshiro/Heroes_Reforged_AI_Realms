# Save Envelope Canary

Module: [Persistence (M3 / M4)](../08-persistence.md)

Description:
Per-cluster canary task that **reserves the save-envelope contract**
and asserts the canonical refusal codes fire on each malformed
fixture. Closes Plan 32 § PI-4 (Doctrine canary tasks per cluster)
for the save cluster.

The canary parses a canonical `save-envelope` example, runs the
parser-hardening cap table from
[`tasks/mvp/08-persistence/16-parser-hardening.md`](./16-parser-hardening.md),
and asserts each malformed fixture produces the matching
`storage-error` code. Failing loudly here means a schema change
that desyncs from the loader can be caught before any UI surface
is touched.

Read First:
- [`docs/architecture/save-envelope-mac.md`](../../../docs/architecture/save-envelope-mac.md)
- [`content-schema/schemas/save-envelope.schema.json`](../../../content-schema/schemas/save-envelope.schema.json)
- [`tasks/mvp/08-persistence/16-parser-hardening.md`](./16-parser-hardening.md)
- [`docs/implementation-plans/32-cross-plan-conflict-resolution-plan.md`](../../../docs/implementation-plans/32-cross-plan-conflict-resolution-plan.md)
  § PI-4

Inputs:
- Canonical example under
  `content-schema/examples/save-envelope/` (when the schema's
  example landing task ships its example folder).
- Closed failure-code surface in
  [`content-schema/schemas/storage-error.schema.json`](../../../content-schema/schemas/storage-error.schema.json).
- Parser-hardening cap table from Task 16.

Outputs:
- A canary test under
  `src/persistence/__tests__/save-envelope-canary.test.ts`
  (reserved today; populated when the runtime cluster lands).

Owned Paths:
- `src/persistence/__tests__/save-envelope-canary.test.ts`
  (reserved path)

Owned Paths (shared):
- `content-schema/schemas/save-envelope.schema.json` — primary
  owner is the save-envelope schema task; this canary treats it
  as an additive-extension point: any future schema change MUST
  keep the canary green; rewriting the schema in a way that
  breaks the canary fails CI.

Dependencies:
- mvp.08-persistence.16-parser-hardening
- mvp.08-persistence.18-save-envelope-and-intent

Acceptance Criteria:
- A canary test exists in this task's owned path (reserved today,
  populated when the runtime cluster lands).
- The canary parses the canonical save-envelope example
  successfully and asserts the parser-hardening cap table
  refusal codes fire on each malformed fixture.
- `validate:tasks` passes; the task is registered in
  `tasks/task-registry.json`.
- When the schema is changed in a way that breaks the canary's
  cluster contract, this test must fail before any consumer is
  affected.

Owned Paths (shared) acceptance:
- The save-envelope schema is **owned by**
  `mvp.08-persistence.18-save-envelope-and-intent` (the primary
  contract). This canary is **additive**: it reserves a contract
  reference; this task must not rewrite the schema itself.

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
