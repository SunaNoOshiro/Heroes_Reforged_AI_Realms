# Worker Envelope Canary

Status: planned

Module: [Heuristic AI (M2)](../10-heuristic-ai.md)

Description:
Per-cluster canary task that **reserves the worker-envelope
contract** and asserts each closed `kind` round-trips through the
parser. Closes Plan 32 § PI-4 (Doctrine canary tasks per cluster)
for the AI worker cluster.

The canary round-trips a `COMPUTE_MOVE` and a `MOVE_RESULT`, plus
an `AI_ERROR` (per Plan 32 § CF-1) and asserts each is accepted.
The 8-kind enum
([`docs/architecture/ai-contract.md` § 3](../../../docs/architecture/ai-contract.md#3-worker-protocol))
is the contract this canary protects: any schema change that
breaks the canary fails CI before the consumer
([`tasks/phase-3/05-observability/02-worker-message-validation.md`](../../phase-3/05-observability/02-worker-message-validation.md))
can desync.

Read First:
- [`docs/architecture/ai-contract.md`](../../../docs/architecture/ai-contract.md)
  § 3 Worker Protocol
- [`content-schema/schemas/worker-message.schema.json`](../../../content-schema/schemas/worker-message.schema.json)
- [`tasks/mvp/02-content-schemas/46-worker-message-envelope-reconciliation.md`](../../mvp/02-content-schemas/46-worker-message-envelope-reconciliation.md)
- [`docs/implementation-plans/32-cross-plan-conflict-resolution-plan.md`](../../../docs/implementation-plans/32-cross-plan-conflict-resolution-plan.md)
  § PI-4

Inputs:
- Canonical examples under
  `content-schema/examples/worker-message/`.
- 8-kind enum from `worker-message.schema.json`.

Outputs:
- A canary test under
  `src/ai/worker/__tests__/envelope-canary.test.ts`
  (reserved today; populated when the runtime cluster lands).

Owned Paths:
- `src/ai/worker/__tests__/envelope-canary.test.ts`
  (reserved path)

Owned Paths (shared):
- `content-schema/schemas/worker-message.schema.json` — primary
  owner is
  [`tasks/mvp/02-content-schemas/46-worker-message-envelope-reconciliation.md`](../../mvp/02-content-schemas/46-worker-message-envelope-reconciliation.md);
  this canary treats it as an additive-extension point: any
  future schema change MUST keep the canary green; rewriting the
  schema in a way that breaks the canary fails CI.

Dependencies:
- mvp.02-content-schemas.46-worker-message-envelope-reconciliation

Acceptance Criteria:
- A canary test exists in this task's owned path (reserved today,
  populated when the runtime cluster lands).
- The canary round-trips at minimum `COMPUTE_MOVE`, `MOVE_RESULT`,
  and `AI_ERROR`; each canonical example parses successfully.
- The canary asserts the 8-kind enum matches
  [`ai-contract.md` § 3](../../../docs/architecture/ai-contract.md#3-worker-protocol).
- `validate:tasks` passes; the task is registered in
  `tasks/task-registry.json`.
- When the schema is changed in a way that breaks the canary's
  cluster contract, this test must fail before any consumer is
  affected.

Owned Paths (shared) acceptance:
- The worker-message schema is **owned by**
  `mvp.02-content-schemas.46-worker-message-envelope-reconciliation`
  for its envelope-reconciliation extension and by
  `phase-3.05-observability.02-worker-message-validation` for the
  validator surface (the primary contract). This canary is
  **additive**: it reserves a contract reference; this task must
  not rewrite the schema itself.

Verify:
- npm run validate
- npm test

Estimated Time:
- 2 hours
